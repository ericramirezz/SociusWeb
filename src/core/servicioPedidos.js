// PATRÓN: Facade (estructural).
// Una sola puerta de entrada para las pantallas: cotizar, comprar, cancelar,
// devolver, listar. Por dentro coordina fábrica de productos, estrategias de
// entrega y cobro, pasarela de pago, máquina de estados, repositorio y eventos.
// Todas sus dependencias llegan por el constructor (inyección de dependencias),
// así las pruebas le pasan un repositorio en memoria y un reloj fijo.
import { calendarioServicio, resolverFechaCliente } from './entrega'
import { ESTADOS, puede, transicionar } from './estadoOrden'
import { EVENTOS } from './eventos'
import { aISO, deISO } from './fechas'
import { crearProducto } from './productos'

const ACTIVAS = [ESTADOS.AGENDADA, ESTADOS.EN_CURSO]

export class ServicioPedidos {
  constructor({ repoPedidos, fabricaPasarelas, bus, config, catalogo, reloj = () => new Date() }) {
    Object.assign(this, { repoPedidos, fabricaPasarelas, bus, config, catalogo, reloj })
  }

  // Cuántos arranques hay ya agendados por día: { '2026-12-01': 2, ... }
  ocupacion() {
    const cuenta = {}
    for (const o of this.repoPedidos.listar()) {
      if (ACTIVAS.includes(o.estado) && o.fechaArranque) cuenta[o.fechaArranque] = (cuenta[o.fechaArranque] ?? 0) + 1
    }
    return cuenta
  }

  // Cotiza uno o varios productos. No guarda nada.
  cotizar(ids) {
    const hoy = this.reloj()
    const ocupacion = this.ocupacion()
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
  revisarFecha(fechaISO) {
    return resolverFechaCliente(fechaISO, this.reloj(), this.config, this.ocupacion())
  }

  // Compra completa: crea la orden, cobra, y la agenda (servicio) o la entrega (digital).
  async comprar({ ids, cliente, pasarela = this.config.pasarelaPorDefecto, tarjeta, fechaCliente, ordenId }) {
    const cot = this.cotizar(ids)
    if (cot.partidas.length === 0) throw new Error('La cotización está vacía')

    // Reintento tras un rechazo: se reutiliza la misma orden cotizada.
    let orden = ordenId ? this.repoPedidos.obtener(ordenId) : null
    if (!orden || orden.estado !== ESTADOS.COTIZADA) {
      const ahora = this.reloj()
      orden = {
        id: `SOC-${String(ahora.getTime()).slice(-6)}`,
        estado: ESTADOS.COTIZADA,
        historial: [{ estado: ESTADOS.COTIZADA, evento: 'cotizar', fecha: ahora.toISOString() }],
        fechaOrden: ahora.toISOString(),
      }
      this.bus.publicar(EVENTOS.COTIZADA, orden)
    }
    orden = {
      ...orden,
      cliente,
      partidas: cot.partidas.map(({ producto, cobro }) => ({
        id: producto.id, nombre: producto.nombre, tipo: producto.tipo, precio: producto.precio,
        cobroHoy: cobro.hoy, totalContrato: cobro.totalContrato, detalleCobro: cobro.detalle,
      })),
      totalHoy: cot.totalHoy,
      totalContrato: cot.totalContrato,
      moneda: this.config.moneda,
      requiereAgenda: cot.requiereAgenda,
    }
    this.repoPedidos.guardar(orden)

    const cobro = await this.fabricaPasarelas.crearPasarela(pasarela).cobrar({
      monto: orden.totalHoy, moneda: orden.moneda, referencia: orden.id, tarjeta,
    })
    if (!cobro.ok) {
      this.bus.publicar(EVENTOS.PAGO_RECHAZADO, { orden, mensaje: cobro.mensaje })
      return { ok: false, orden, mensaje: cobro.mensaje }
    }

    orden = transicionar(orden, 'pagar', this.reloj())
    orden.pago = { pasarela: cobro.pasarela, idTransaccion: cobro.idTransaccion, monto: orden.totalHoy }
    this.bus.publicar(EVENTOS.PAGADA, orden)

    if (orden.requiereAgenda) {
      const fecha = this.revisarFecha(fechaCliente ?? cot.entregaPropuesta.fechaArranque)
      orden = { ...transicionar(orden, 'agendar', this.reloj()), ...calendarioServicio(deISO(fecha.fecha), this.config), fechaAjustada: !fecha.confirmada }
      this.bus.publicar(EVENTOS.AGENDADA, orden)
    } else {
      // Producto digital: acceso inmediato una vez confirmado el pago.
      orden = { ...transicionar(orden, 'completar', this.reloj()), fechaEntrega: aISO(this.reloj()) }
    }
    this.repoPedidos.guardar(orden)
    return { ok: true, orden }
  }

  // Cancelación: antes de que el servicio arranque. Si ya había pago, se reembolsa.
  async cancelar(id) {
    let orden = this.#obtener(id)
    orden = transicionar(orden, 'cancelar', this.reloj())
    this.repoPedidos.guardar(orden)
    this.bus.publicar(EVENTOS.CANCELADA, orden)
    return orden.pago ? this.#reembolsar(orden) : orden
  }

  // Devolución: orden en curso o completada.
  async solicitarDevolucion(id) {
    return this.#reembolsar(this.#obtener(id))
  }

  puedeCancelar = (orden) => puede(orden, 'cancelar')
  puedeDevolver = (orden) => Boolean(orden.pago) && puede(orden, 'reembolsar') && !puede(orden, 'cancelar')

  // Lista las órdenes, avanzando las que ya llegaron a su fecha (agendada → en curso → completada).
  listar() {
    const hoy = aISO(this.reloj())
    return this.repoPedidos.listar().map((o) => {
      let orden = o
      if (orden.estado === ESTADOS.AGENDADA && orden.fechaArranque <= hoy) orden = transicionar(orden, 'iniciar', this.reloj())
      if (orden.estado === ESTADOS.EN_CURSO && orden.fechaFin <= hoy) orden = transicionar(orden, 'completar', this.reloj())
      if (orden !== o) this.repoPedidos.guardar(orden)
      return orden
    })
  }

  obtener(id) {
    return this.repoPedidos.obtener(id)
  }

  #obtener(id) {
    const orden = this.repoPedidos.obtener(id)
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
    const reembolsada = { ...transicionar(orden, 'reembolsar', this.reloj()), reembolso: { idReembolso: r.idReembolso, monto: orden.pago.monto } }
    this.repoPedidos.guardar(reembolsada)
    this.bus.publicar(EVENTOS.REEMBOLSADA, reembolsada)
    return reembolsada
  }
}
