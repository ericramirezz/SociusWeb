// Función 2: webhooks de pago firmados (productor, cola y consumidor).
// Todo corre en memoria: no hace falta Supabase ni cuentas de las pasarelas.
import { describe, expect, it } from 'vitest'
import { programas } from '../../data/programas'
import { ConfigApp } from '../config'
import { ESTADOS } from '../estadoOrden'
import { BusEventos, EVENTOS } from '../eventos'
import { FabricaPasarelas } from '../pagos/fabricaPasarelas'
import { crearSdks, TARJETA_RECHAZADA } from '../pagos/sdkSimulados'
import { RepositorioMemoria } from '../repositorio'
import { ServicioPedidos } from '../servicioPedidos'
import { ColaEventosMemoria, ESTADOS_EVENTO } from '../webhooks/colaEventos'
import { firmarMercadoPago, firmarStripe } from '../webhooks/firmas'
import { procesarPendientes } from '../webhooks/procesador'
import { recibirWebhook } from '../webhooks/receptor'

const AHORA = new Date(2026, 10, 16, 10, 0) // lunes 16 de noviembre de 2026
const reloj = () => AHORA
const SECRETOS = { stripe: 'whsec_prueba', mercadopago: 'mp_secreto_prueba' }
const cliente = { nombre: 'Ana', empresa: 'Demo', email: 'ana@demo.mx', telefono: '5500000000' }

// Una orden que se quedó cotizada (la tarjeta se rechazó en el checkout) y que la pasarela confirma después.
async function preparar({ ids = ['nexus-ia'], fechaCliente = '2026-11-25', repo = new RepositorioMemoria() } = {}) {
  const bus = new BusEventos()
  const eventos = []
  bus.suscribir(EVENTOS.PAGADA, (o) => eventos.push(['pagada', o.id]))
  const servicio = new ServicioPedidos({
    repoPedidos: repo, fabricaPasarelas: new FabricaPasarelas(crearSdks(0), () => {}),
    bus, config: ConfigApp.obtener(), catalogo: programas, reloj,
  })
  const { orden } = await servicio.comprar({ ids, cliente, tarjeta: TARJETA_RECHAZADA, fechaCliente })
  return { servicio, orden, eventos, cola: new ColaEventosMemoria() }
}

const avisoStripe = (orden, { id = 'evt_1', tipo = 'payment_intent.succeeded', centavos = orden.totalHoy * 100 } = {}) =>
  JSON.stringify({ id, type: tipo, data: { object: { id: 'pi_123', amount: centavos, metadata: { orden_id: orden.id } } } })

async function enviarStripe(cola, cuerpo, { secreto = SECRETOS.stripe, cuando = AHORA } = {}) {
  return recibirWebhook({ pasarela: 'stripe', cuerpo, encabezados: await firmarStripe(cuerpo, secreto, cuando), secretos: SECRETOS, cola, reloj })
}

describe('Webhooks de pago firmados', () => {
  it('CP-37 un aviso con firma válida se guarda y, al procesarlo, la orden queda pagada y agendada en la fecha del cliente', async () => {
    const { servicio, orden, eventos, cola } = await preparar()
    expect(orden.estado).toBe(ESTADOS.COTIZADA)

    const r = await enviarStripe(cola, avisoStripe(orden))
    expect(r).toEqual({ status: 200, motivo: 'recibido' })
    expect(await cola.listar()).toMatchObject([{ eventoId: 'evt_1', estado: ESTADOS_EVENTO.PENDIENTE }])
    expect((await servicio.obtener(orden.id)).estado).toBe(ESTADOS.COTIZADA) // recibir no toca la orden

    expect(await procesarPendientes({ cola, servicio })).toEqual({ procesados: 1, fallidos: 0 })
    const pagada = await servicio.obtener(orden.id)
    expect(pagada).toMatchObject({
      estado: ESTADOS.AGENDADA, fechaArranque: '2026-11-25', fechaAjustada: false,
      pago: { pasarela: 'stripe', idTransaccion: 'pi_123', monto: 35000 },
    })
    expect(eventos).toEqual([['pagada', orden.id]])
    expect((await cola.listar())[0].estado).toBe(ESTADOS_EVENTO.PROCESADO)
  })

  it('CP-38 un aviso con firma inválida, sin firma o vencido se rechaza con 400 y no se guarda', async () => {
    const { orden, cola } = await preparar()
    const cuerpo = avisoStripe(orden)
    expect(await enviarStripe(cola, cuerpo, { secreto: 'otro_secreto' })).toEqual({ status: 400, motivo: 'firma_invalida' })
    expect(await recibirWebhook({ pasarela: 'stripe', cuerpo, secretos: SECRETOS, cola, reloj })).toEqual({ status: 400, motivo: 'sin_firma' })
    const haceUnaHora = new Date(AHORA.getTime() - 60 * 60 * 1000)
    expect(await enviarStripe(cola, cuerpo, { cuando: haceUnaHora })).toEqual({ status: 400, motivo: 'firma_vencida' })
    // Cambiar el monto después de firmar invalida la firma.
    const { 'stripe-signature': firma } = await firmarStripe(cuerpo, SECRETOS.stripe, AHORA)
    const alterado = cuerpo.replace(String(orden.totalHoy * 100), '100')
    expect(await recibirWebhook({ pasarela: 'stripe', cuerpo: alterado, encabezados: { 'Stripe-Signature': firma }, secretos: SECRETOS, cola, reloj }))
      .toEqual({ status: 400, motivo: 'firma_invalida' })
    expect(await recibirWebhook({ pasarela: 'conekta', cuerpo, secretos: SECRETOS, cola, reloj })).toEqual({ status: 404, motivo: 'pasarela_desconocida' })
    expect(await cola.listar()).toHaveLength(0)
  })

  it('CP-39 el mismo aviso enviado dos veces, u otro aviso de un pago ya aplicado, no cambia nada', async () => {
    const { servicio, orden, eventos, cola } = await preparar()
    const cuerpo = avisoStripe(orden)
    await enviarStripe(cola, cuerpo)
    expect(await enviarStripe(cola, cuerpo)).toEqual({ status: 200, motivo: 'duplicado' })
    expect(await cola.listar()).toHaveLength(1)
    await procesarPendientes({ cola, servicio })
    const despues = await servicio.obtener(orden.id)

    // Un aviso distinto del mismo pago (la pasarela a veces manda varios) se procesa sin efecto.
    await enviarStripe(cola, avisoStripe(orden, { id: 'evt_2' }))
    expect(await procesarPendientes({ cola, servicio })).toEqual({ procesados: 1, fallidos: 0 })
    expect(await servicio.obtener(orden.id)).toEqual(despues)
    expect(eventos).toHaveLength(1) // se publicó "pagada" una sola vez
  })

  it('CP-40 si el consumidor falla, el aviso vuelve a la cola y al tercer intento queda en error; un monto distinto nunca se aplica', async () => {
    const repo = new RepositorioMemoria()
    const { servicio, orden, cola } = await preparar({ repo })
    await enviarStripe(cola, avisoStripe(orden))

    const obtener = repo.obtener.bind(repo)
    repo.obtener = async () => { throw new Error('La base no responde') }
    for (let i = 1; i <= 3; i++) expect(await procesarPendientes({ cola, servicio })).toEqual({ procesados: 0, fallidos: 1 })
    expect((await cola.listar())[0]).toMatchObject({ estado: ESTADOS_EVENTO.ERROR, intentos: 3, ultimoError: 'La base no responde' })
    expect(await procesarPendientes({ cola, servicio })).toEqual({ procesados: 0, fallidos: 0 }) // ya no se reintenta
    repo.obtener = obtener

    await enviarStripe(cola, avisoStripe(orden, { id: 'evt_barato', centavos: 100 }))
    await procesarPendientes({ cola, servicio })
    expect((await cola.listar())[1].ultimoError).toMatch(/no coincide/)
    expect((await servicio.obtener(orden.id)).estado).toBe(ESTADOS.COTIZADA)
  })

  it('CP-41 Mercado Pago: se verifica su firma y el pago se consulta en su API antes de aplicarlo', async () => {
    const { servicio, orden, cola } = await preparar({ ids: ['avi'] })
    const cuerpo = JSON.stringify({ id: 9001, type: 'payment', action: 'payment.updated', data: { id: '555' } })
    const encabezados = await firmarMercadoPago(cuerpo, SECRETOS.mercadopago, 'req-1', AHORA)
    expect(await recibirWebhook({ pasarela: 'mercadopago', cuerpo, encabezados, secretos: SECRETOS, cola, reloj })).toEqual({ status: 200, motivo: 'recibido' })

    // Sin la consulta a la API (llega en el Sprint 7) el aviso espera en la cola, no se pierde.
    await procesarPendientes({ cola, servicio })
    expect((await cola.listar())[0]).toMatchObject({ estado: ESTADOS_EVENTO.PENDIENTE, intentos: 1 })

    const consultores = { mercadopago: async (id) => ({ estado: 'aprobado', referencia: orden.id, idTransaccion: id, monto: 7000 }) }
    await procesarPendientes({ cola, servicio, consultores })
    expect(await servicio.obtener(orden.id)).toMatchObject({ estado: ESTADOS.COMPLETADA, pago: { pasarela: 'mercadopago', idTransaccion: '555' } })
  })
})
