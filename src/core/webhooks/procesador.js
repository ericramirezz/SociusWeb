// PATRÓN: Productor/Consumidor (Tarea 03), lado del CONSUMIDOR.
// Toma los avisos pendientes de la cola y los aplica a la orden con la misma
// lógica del resto de la app (ServicioPedidos.confirmarPago → tabla de estados).
// Si algo falla, el aviso vuelve a la cola; al tercer fallo queda en 'error'.
import { MAX_INTENTOS } from './colaEventos'
import { TIPOS, TRADUCTORES } from './traductores'

// consultores[pasarela](idPago) → { estado: 'aprobado' | 'rechazado' | ..., referencia, idTransaccion, monto }
// Lo necesitan las pasarelas que no mandan el pago completo en el aviso (Mercado Pago).
export async function procesarPendientes({ cola, servicio, consultores = {}, limite = 10, maxIntentos = MAX_INTENTOS }) {
  const resumen = { procesados: 0, fallidos: 0 }
  for (const evento of await cola.tomar(limite)) {
    try {
      await aplicar(evento, servicio, consultores)
      await cola.marcarProcesado(evento)
      resumen.procesados++
    } catch (e) {
      await cola.registrarFallo(evento, e.message, maxIntentos)
      resumen.fallidos++
    }
  }
  return resumen
}

async function aplicar(evento, servicio, consultores) {
  let datos = TRADUCTORES[evento.pasarela](evento.contenido)

  if (datos.tipo === TIPOS.CONSULTAR) {
    const consultar = consultores[evento.pasarela]
    if (!consultar) throw new Error(`Falta conectar la consulta a la API de ${evento.pasarela} (Sprint 7)`)
    const pago = await consultar(datos.idPago)
    const tipo = { aprobado: TIPOS.APROBADO, reembolsado: TIPOS.REEMBOLSADO }[pago.estado] ?? TIPOS.OTRO
    datos = { ...pago, tipo }
  }

  if (datos.tipo === TIPOS.REEMBOLSADO) {
    const id = datos.referencia ?? (await servicio.ordenPorTransaccion(evento.pasarela, datos.idTransaccion))
    if (!id) throw new Error(`El reembolso del pago ${datos.idTransaccion} no corresponde a ninguna orden`)
    await servicio.registrarReembolso(id, { idReembolso: datos.idReembolso, monto: datos.monto })
    return
  }

  // Rechazos y otros avisos solo quedan registrados: la orden sigue cotizada y el cliente puede reintentar.
  if (datos.tipo !== TIPOS.APROBADO) return
  if (!datos.referencia) throw new Error('El aviso no trae el número de orden')
  await servicio.confirmarPago(datos.referencia, {
    pasarela: evento.pasarela,
    idTransaccion: datos.idTransaccion,
    monto: datos.monto,
  })
}
