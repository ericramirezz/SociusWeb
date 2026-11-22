// PATRÓN: Facade (estructural).
// Una sola puerta de entrada para las pantallas: cotizar, comprar, cancelar,
// devolver, listar. Por dentro coordina fábrica de productos, estrategias de
// entrega y cobro, pasarela de pago, máquina de estados, repositorio y eventos.
// Todas sus dependencias llegan por el constructor (inyección de dependencias),
// así las pruebas le pasan un repositorio en memoria y un reloj fijo.
//
// Cálculo y datos van separados:
//   - cotizar() y revisarFecha() son síncronos y puros: reciben la ocupación.
//   - ocupacion(), comprar(), listar()… son asíncronos: hablan con el repositorio,
//     que puede ser una base remota.
import { calendarioServicio, resolverFechaCliente } from './entrega'
import { ESTADOS, puede, transicionar } from './estadoOrden'
import { EVENTOS } from './eventos'
import { aISO, deISO } from './fechas'
import { esPagoReal } from './pagos/paginasDePago'
import { crearProducto } from './productos'

const ACTIVAS = [ESTADOS.AGENDADA, ESTADOS.EN_CURSO]
export const ESTADO_REEMBOLSO = Object.freeze({ SOLICITADO: 'solicitado', EMITIDO: 'emitido' })

export class ServicioPedidos {
  // fuenteOcupacion (opcional): async (desdeISO) => { 'YYYY-MM-DD': arranques }.
  // Con Supabase la da la base (el cliente no ve las órdenes de otros);
  // sin ella se cuenta sobre las órdenes del repositorio.
  // sesionesPago (opcional): pasarelas con página de pago propia (Stripe Checkout, Sprint 7).
  constructor({ repoPedidos, fabricaPasarelas, bus, config, catalogo, reloj = () => new Date(), fuenteOcupacion = null, sesionesPago = null }) {
    Object.assign(this, { repoPedidos, fabricaPasarelas, bus, config, catalogo, reloj, fuenteOcupacion, sesionesPago })
  }

  // Cuántos arranques hay ya agendados por día: { '2026-12-01': 2, ... }
  async ocupacion() {
    if (this.fuenteOcupacion) return this.fuenteOcupacion(aISO(this.reloj()))
    const cuenta = {}
    for (const o of await this.repoPedidos.listar()) {
      if (ACTIVAS.includes(o.estado) && o.fechaArranque) cuenta[o.fechaArranque] = (cuenta[o.fechaArranque] ?? 0) + 1
    }
    return cuenta
  }

  // Cotiza uno o varios productos con la ocupación dada. No guarda nada.
  cotizar(ids, ocupacion = {}) {
    const hoy = this.reloj()
    const partidas = this.catalogo
      .filter((p) => ids.includes(p.id))
      .map((datos) => {
        const producto = crearProducto(datos)
        return { producto, cobro: producto.cobro(this.config), entrega: producto.entrega(hoy, this.config, ocupacion) }
      })
    const servicios = partidas.filter((x) => x.producto.requiereAgenda)
    return {
      partidas,
      totalHoy: partidas.reduce((s, x) => s + x.cobro.hoy, 0),
      totalContrato: partidas.reduce((s, x) => s + x.cobro.totalContrato, 0),
      requiereAgenda: servicios.length > 0,
      // Todos los servicios de una orden arrancan el mismo día.
      entregaPropuesta: servicios[0]?.entrega ?? partidas[0]?.entrega ?? null,
    }
  }

  // El cliente propone fecha de arranque: se confirma o se sugiere la más cercana.
  revisarFecha(fechaISO, ocupacion = {}) {
    return resolverFechaCliente(fechaISO, this.reloj(), this.config, ocupacion)
  }

  // Compra completa: crea la orden, cobra, y la agenda (servicio) o la entrega (digital).
  async comprar({ ids, cliente, pasarela = this.config.pasarelaPorDefecto, tarjeta, fechaCliente, ordenId }) {
    const { orden: guardada, cot, ocupacion } = await this.#prepararOrden({ ids, cliente, fechaCliente, ordenId })
    let orden = guardada

    const cobro = await this.fabricaPasarelas.crearPasarela(pasarela).cobrar({
      monto: orden.totalHoy, moneda: orden.moneda, referencia: orden.id, tarjeta,
    })
    if (!cobro.ok) {
      this.bus.publicar(EVENTOS.PAGO_RECHAZADO, { orden, mensaje: cobro.mensaje })
      return { ok: false, orden, mensaje: cobro.mensaje }
    }

    const pago = { pasarela: cobro.pasarela, idTransaccion: cobro.idTransaccion, monto: orden.totalHoy }
    orden = await this.#aplicarPago(orden, pago, fechaCliente ?? cot.entregaPropuesta.fechaArranque, ocupacion)
    return { ok: true, orden }
  }

  // ¿Esta pasarela cobra en su propia página (Stripe Checkout) en lugar de con el SDK simulado?
  usaPaginaDePago(pasarela) {
    return Boolean(this.sesionesPago?.soporta(pasarela))
  }

  // Pago en la página de la pasarela: deja la orden cotizada y devuelve la URL a donde
  // mandar al cliente. Aquí no se cobra ni se marca nada como pagado: eso lo hace el
  // webhook firmado de la pasarela (confirmarPago), aunque el cliente cierre la pestaña.
  async iniciarPagoEnPasarela({ ids, cliente, pasarela = this.config.pasarelaPorDefecto, fechaCliente, ordenId, origen }) {
    if (!this.usaPaginaDePago(pasarela)) throw new Error(`La pasarela ${pasarela} no tiene página de pago conectada`)
    const { orden } = await this.#prepararOrden({ ids, cliente, fechaCliente, ordenId })
    try {
      const { url } = await this.sesionesPago.crear({ ordenId: orden.id, pasarela, origen })
      return { orden, url }
    } catch (e) {
      // La orden ya existe: el checkout la usa para reintentar sin crear otra.
      e.orden = orden
      throw e
    }
  }

  // Crea (o reutiliza, tras un rechazo o una cancelación) la orden cotizada y la guarda.
  async #prepararOrden({ ids, cliente, fechaCliente, ordenId }) {
    const ocupacion = await this.ocupacion()
    const cot = this.cotizar(ids, ocupacion)
    if (cot.partidas.length === 0) throw new Error('La cotización está vacía')

    // Reintento tras un rechazo: se reutiliza la misma orden cotizada.
    let orden = ordenId ? await this.repoPedidos.obtener(ordenId) : null
    const nueva = !orden || orden.estado !== ESTADOS.COTIZADA
    if (nueva) {
      const ahora = this.reloj()
      orden = {
        estado: ESTADOS.COTIZADA,
        historial: [{ estado: ESTADOS.COTIZADA, evento: 'cotizar', fecha: ahora.toISOString() }],
        fechaOrden: ahora.toISOString(),
      }
    }
    orden = {
      ...orden,
      cliente,
      partidas: cot.partidas.map(({ producto, cobro }) => ({
        id: producto.id, nombre: producto.nombre, tipo: producto.tipo, precio: producto.precio,
        cobroHoy: cobro.hoy, totalContrato: cobro.totalContrato,
      })),
      totalHoy: cot.totalHoy,
      totalContrato: cot.totalContrato,
      moneda: this.config.moneda,
      requiereAgenda: cot.requiereAgenda,
      // Se guarda para que, si el pago lo confirma después un webhook, se respete la fecha que eligió el cliente.
      fechaPreferida: fechaCliente ?? null,
    }
    // El repositorio asigna el número de orden (SOC-100001…) la primera vez.
    orden = await this.repoPedidos.guardar(orden)
    if (nueva) this.bus.publicar(EVENTOS.COTIZADA, orden)
    return { orden, cot, ocupacion }
  }

  // Pago confirmado por la pasarela desde su servidor (webhook), no por el navegador.
  // Es idempotente: si la orden ya no está cotizada, el pago ya se había aplicado y no cambia nada.
  async confirmarPago(id, pago) {
    const orden = await this.#obtener(id)
    if (orden.estado !== ESTADOS.COTIZADA) return { aplicado: false, orden }
    if (Number(pago.monto) !== Number(orden.totalHoy)) {
      throw new Error(`El monto pagado (${pago.monto}) no coincide con el de la orden ${id} (${orden.totalHoy})`)
    }
    const ocupacion = await this.ocupacion()
    const propuesta = orden.fechaPreferida ?? this.cotizar(orden.partidas.map((p) => p.id), ocupacion).entregaPropuesta?.fechaArranque
    return { aplicado: true, orden: await this.#aplicarPago(orden, pago, propuesta, ocupacion) }
  }

  // Lo que pasa después de un cobro aprobado, venga del checkout o de un webhook:
  // la orden queda pagada y luego agendada (servicio) o completada (digital).
  async #aplicarPago(orden, pago, fechaPropuesta, ocupacion) {
    orden = { ...transicionar(orden, 'pagar', this.reloj()), pago }
    this.bus.publicar(EVENTOS.PAGADA, orden)

    if (orden.requiereAgenda) {
      const fecha = this.revisarFecha(fechaPropuesta, ocupacion)
      orden = { ...transicionar(orden, 'agendar', this.reloj()), ...calendarioServicio(deISO(fecha.fecha), this.config), fechaAjustada: !fecha.confirmada }
      this.bus.publicar(EVENTOS.AGENDADA, orden)
    } else {
      // Producto digital: acceso inmediato una vez confirmado el pago.
      orden = { ...transicionar(orden, 'completar', this.reloj()), fechaEntrega: aISO(this.reloj()) }
    }
    return this.repoPedidos.guardar(orden)
  }

  // Cancelación: antes de que el servicio arranque. Si ya había pago, se reembolsa;
  // si lo cobró la pasarela de verdad, se deja la solicitud para Socius (ver reembolsoManual).
  async cancelar(id) {
    let orden = await this.#obtener(id)
    orden = transicionar(orden, 'cancelar', this.reloj())
    if (this.reembolsoManual(orden)) orden = { ...orden, reembolso: this.#solicitud('cancelacion', orden) }
    orden = await this.repoPedidos.guardar(orden)
    this.bus.publicar(EVENTOS.CANCELADA, orden)
    if (!orden.pago) return orden
    if (orden.reembolso?.estado === ESTADO_REEMBOLSO.SOLICITADO) {
      this.bus.publicar(EVENTOS.REEMBOLSO_SOLICITADO, orden)
      return orden
    }
    return this.#reembolsar(orden)
  }

  // Devolución: orden en curso o completada.
  async solicitarDevolucion(id) {
    const orden = await this.#obtener(id)
    if (!this.reembolsoManual(orden)) return this.#reembolsar(orden)
    if (!this.puedeDevolver(orden)) throw new Error(`La orden ${id} no admite devolución`)
    const conSolicitud = await this.repoPedidos.guardar({ ...orden, reembolso: this.#solicitud('devolucion', orden) })
    this.bus.publicar(EVENTOS.REEMBOLSO_SOLICITADO, conSolicitud)
    return conSolicitud
  }

  // Opción B del Sprint 7: un pago real (Stripe o Mercado Pago) no lo reembolsa la app.
  // El cliente deja la solicitud, Socius decide y reembolsa desde el panel de la pasarela,
  // y su webhook marca la orden como reembolsada (registrarReembolso).
  reembolsoManual = (orden) => esPagoReal(orden.pago)

  #solicitud(tipo, orden) {
    return { estado: ESTADO_REEMBOLSO.SOLICITADO, tipo, monto: orden.pago.monto, fecha: this.reloj().toISOString() }
  }

  // Reembolso confirmado por la pasarela desde su servidor (webhook), venga o no de una solicitud.
  // Idempotente como confirmarPago: si ya estaba reembolsada, no cambia nada.
  async registrarReembolso(id, { idReembolso, monto }) {
    const orden = await this.#obtener(id)
    if (orden.estado === ESTADOS.REEMBOLSADA) return { aplicado: false, orden }
    const reembolsada = await this.repoPedidos.guardar({
      ...transicionar(orden, 'reembolsar', this.reloj()),
      reembolso: { estado: ESTADO_REEMBOLSO.EMITIDO, tipo: orden.reembolso?.tipo ?? 'directo', idReembolso: idReembolso ?? null, monto },
    })
    this.bus.publicar(EVENTOS.REEMBOLSADA, reembolsada)
    return { aplicado: true, orden: reembolsada }
  }

  // Número de orden a partir del pago (el aviso de reembolso de Stripe solo trae el pago).
  ordenPorTransaccion(pasarela, idTransaccion) {
    return this.repoPedidos.ordenPorTransaccion(pasarela, idTransaccion)
  }

  puedeCancelar = (orden) => puede(orden, 'cancelar')
  puedeDevolver = (orden) =>
    Boolean(orden.pago) && puede(orden, 'reembolsar') && !puede(orden, 'cancelar') && orden.reembolso?.estado !== ESTADO_REEMBOLSO.SOLICITADO

  // Lista las órdenes, avanzando las que ya llegaron a su fecha (agendada → en curso → completada).
  async listar() {
    const hoy = aISO(this.reloj())
    const ordenes = await this.repoPedidos.listar()
    return Promise.all(ordenes.map(async (o) => {
      let orden = o
      if (orden.estado === ESTADOS.AGENDADA && orden.fechaArranque <= hoy) orden = transicionar(orden, 'iniciar', this.reloj())
      if (orden.estado === ESTADOS.EN_CURSO && orden.fechaFin <= hoy) orden = transicionar(orden, 'completar', this.reloj())
      return orden !== o ? this.repoPedidos.guardar(orden) : orden
    }))
  }

  obtener(id) {
    return this.repoPedidos.obtener(id)
  }

  async #obtener(id) {
    const orden = await this.repoPedidos.obtener(id)
    if (!orden) throw new Error(`No existe la orden ${id}`)
    return orden
  }

  async #reembolsar(orden) {
    if (!orden.pago) throw new Error('La orden no tiene un pago que reembolsar')
    if (!puede(orden, 'reembolsar')) transicionar(orden, 'reembolsar') // lanza el error de transición
    const r = await this.fabricaPasarelas.crearPasarela(orden.pago.pasarela).reembolsar({
      idTransaccion: orden.pago.idTransaccion, monto: orden.pago.monto, moneda: orden.moneda,
    })
    if (!r.ok) throw new Error('La pasarela no pudo emitir el reembolso')
    let reembolsada = { ...transicionar(orden, 'reembolsar', this.reloj()), reembolso: { estado: ESTADO_REEMBOLSO.EMITIDO, idReembolso: r.idReembolso, monto: orden.pago.monto } }
    reembolsada = await this.repoPedidos.guardar(reembolsada)
    this.bus.publicar(EVENTOS.REEMBOLSADA, reembolsada)
    return reembolsada
  }
}
