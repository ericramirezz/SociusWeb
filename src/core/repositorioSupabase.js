// PATRÓN: Repository, implementación con Supabase.
// Misma interfaz que repositorio.js; el resto de la app no sabe que los datos
// viven en Postgres. Aquí se traduce entre el objeto `orden` del núcleo
// (camelCase, partidas y pago anidados) y las tablas ordenes / partidas / pagos
// de supabase/migrations/001_esquema.sql.
//
// Qué filas ve cada quien lo decide la seguridad por fila de la base, no este código.

const SELECCION_ORDEN = '*, partidas(*), pagos(*)'
const num = (v) => (v == null ? v : Number(v))

// Fila de la base → orden del núcleo.
export function aOrden(fila) {
  const pago = fila.pagos?.[0]
  return {
    id: fila.id,
    estado: fila.estado,
    historial: fila.historial ?? [],
    cliente: fila.cliente,
    partidas: (fila.partidas ?? [])
      .slice()
      .sort((a, b) => a.id - b.id)
      .map((p) => ({
        id: p.programa_id,
        nombre: p.nombre,
        tipo: p.tipo,
        precio: num(p.precio),
        cobroHoy: num(p.cobro_hoy),
        totalContrato: num(p.total_contrato),
      })),
    totalHoy: num(fila.total_hoy),
    totalContrato: num(fila.total_contrato),
    moneda: fila.moneda,
    requiereAgenda: fila.requiere_agenda,
    pago: pago ? { pasarela: pago.pasarela, idTransaccion: pago.id_transaccion, monto: num(pago.monto) } : null,
    fechaArranque: fila.fecha_arranque,
    fechaEntrega: fila.fecha_entrega,
    fechaFin: fila.fecha_fin,
    fechaAjustada: fila.fecha_ajustada,
    fechaPreferida: fila.fecha_preferida ?? null,
    reembolso: fila.reembolso,
    fechaOrden: fila.fecha_orden,
  }
}

// Orden del núcleo → columnas que el cliente puede actualizar (ver los "grant update").
export function aFilaEditable(orden) {
  return {
    cliente: orden.cliente,
    estado: orden.estado,
    historial: orden.historial ?? [],
    total_hoy: orden.totalHoy,
    total_contrato: orden.totalContrato,
    requiere_agenda: Boolean(orden.requiereAgenda),
    fecha_arranque: orden.fechaArranque ?? null,
    fecha_entrega: orden.fechaEntrega ?? null,
    fecha_fin: orden.fechaFin ?? null,
    fecha_ajustada: Boolean(orden.fechaAjustada),
    fecha_preferida: orden.fechaPreferida ?? null,
    reembolso: orden.reembolso ?? null,
  }
}

export const aFilasPartidas = (ordenId, partidas = []) =>
  partidas.map((p) => ({
    orden_id: ordenId,
    programa_id: p.id,
    nombre: p.nombre,
    tipo: p.tipo,
    precio: p.precio,
    cobro_hoy: p.cobroHoy,
    total_contrato: p.totalContrato,
  }))

// Errores de la base con un mensaje entendible; el original queda en `causa`.
function errorDeBase(error, mensaje) {
  const e = new Error(mensaje)
  e.causa = error
  e.codigo = error?.code
  return e
}

export class RepositorioPedidosSupabase {
  constructor(cliente) {
    this.cliente = cliente
  }

  async listar() {
    const { data, error } = await this.cliente.from('ordenes').select(SELECCION_ORDEN).order('fecha_orden', { ascending: false })
    if (error) throw errorDeBase(error, 'No se pudieron cargar los pedidos')
    return data.map(aOrden)
  }

  async obtener(id) {
    if (!id) return null
    const { data, error } = await this.cliente.from('ordenes').select(SELECCION_ORDEN).eq('id', id).maybeSingle()
    if (error) throw errorDeBase(error, 'No se pudo cargar el pedido')
    return data ? aOrden(data) : null
  }

  async guardar(orden) {
    const id = orden.id ? await this.#actualizar(orden) : await this.#crear(orden)
    if (orden.pago) await this.#registrarPago(id, orden.pago)
    return { ...orden, id }
  }

  async borrar() {
    throw new Error('Las órdenes no se borran: se cancelan')
  }

  // Cupo de arranques por día de TODOS los clientes, sin datos personales
  // (función arranques_por_dia de la migración 002). Devuelve { 'YYYY-MM-DD': n }.
  async arranquesPorDia(desde) {
    const { data, error } = await this.cliente.rpc('arranques_por_dia', { desde })
    if (error) throw errorDeBase(error, 'No se pudo consultar la disponibilidad')
    return Object.fromEntries(data.map((r) => [r.fecha, r.arranques]))
  }

  async #crear(orden) {
    const { data: sesion } = await this.cliente.auth.getSession()
    const uid = sesion.session?.user?.id
    if (!uid) throw new Error('Necesitas iniciar sesión para comprar')

    const fila = { ...aFilaEditable(orden), cliente_id: uid, moneda: orden.moneda ?? 'MXN' }
    if (orden.fechaOrden) fila.fecha_orden = orden.fechaOrden
    const { data, error } = await this.cliente.from('ordenes').insert(fila).select('id').single()
    if (error) throw errorDeBase(error, 'No se pudo crear el pedido')
    await this.#reemplazarPartidas(data.id, orden.partidas)
    return data.id
  }

  async #actualizar(orden) {
    // Las partidas solo se reemplazan mientras la orden sigue cotizada (reintento de pago);
    // después de pagar la base ya no deja tocarlas.
    if (orden.estado === 'cotizada' && orden.partidas) await this.#reemplazarPartidas(orden.id, orden.partidas)
    const { error } = await this.cliente.from('ordenes').update(aFilaEditable(orden)).eq('id', orden.id)
    if (error) throw errorDeBase(error, 'No se pudo actualizar el pedido')
    return orden.id
  }

  async #reemplazarPartidas(ordenId, partidas) {
    const borrado = await this.cliente.from('partidas').delete().eq('orden_id', ordenId)
    if (borrado.error) throw errorDeBase(borrado.error, 'No se pudieron guardar los programas del pedido')
    const filas = aFilasPartidas(ordenId, partidas)
    if (filas.length === 0) return
    const { error } = await this.cliente.from('partidas').insert(filas)
    if (error) throw errorDeBase(error, 'No se pudieron guardar los programas del pedido')
  }

  async #registrarPago(ordenId, pago) {
    // Si ya estaba registrado (mismo proveedor e id de transacción), no se duplica.
    const { error } = await this.cliente.from('pagos').upsert(
      { orden_id: ordenId, pasarela: pago.pasarela, id_transaccion: pago.idTransaccion, monto: pago.monto },
      { onConflict: 'pasarela,id_transaccion', ignoreDuplicates: true }
    )
    if (error) throw errorDeBase(error, 'No se pudo registrar el pago')
  }
}

export class RepositorioLlamadasSupabase {
  constructor(cliente) {
    this.cliente = cliente
  }

  // Solo fecha y hora de los horarios tomados (función horarios_ocupados).
  async ocupados(desde, hasta) {
    const { data, error } = await this.cliente.rpc('horarios_ocupados', { desde, hasta })
    if (error) throw errorDeBase(error, 'No se pudieron consultar los horarios')
    return data
  }

  async guardar(llamada) {
    const c = llamada.cliente ?? {}
    // Sin .select(): el navegador no puede leer la tabla de llamadas, solo agregar.
    const { error } = await this.cliente.from('llamadas').insert({
      fecha: llamada.fecha,
      hora: llamada.hora,
      nombre: c.nombre,
      empresa: c.empresa,
      email: c.email,
      telefono: c.telefono,
      mensaje: c.mensaje || null,
    })
    if (error) throw errorDeBase(error, 'No se pudo agendar la llamada') // 23505 = horario ya tomado
    return llamada
  }
}
