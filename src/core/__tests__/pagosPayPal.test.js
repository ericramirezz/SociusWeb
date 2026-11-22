// Sprint 7: pago con la página de PayPal (Orders v2, sandbox).
// PayPal no se llama de verdad: un fetch falso responde como su API.
import { describe, expect, it } from 'vitest'
import { programas } from '../../data/programas'
import { ConfigApp } from '../config'
import { ESTADOS } from '../estadoOrden'
import { BusEventos } from '../eventos'
import { FabricaPasarelas } from '../pagos/fabricaPasarelas'
import { capturarOrdenPayPal, parametrosOrden } from '../pagos/checkoutPayPal'
import { crearPago, esPagoReal } from '../pagos/paginasDePago'
import { crearSdks } from '../pagos/sdkSimulados'
import { RepositorioMemoria } from '../repositorio'
import { ServicioPedidos } from '../servicioPedidos'
import { ColaEventosMemoria, ESTADOS_EVENTO } from '../webhooks/colaEventos'
import { procesarPendientes } from '../webhooks/procesador'
import { recibirWebhook } from '../webhooks/receptor'

const AHORA = new Date(2026, 10, 16, 10, 0)
const ORIGEN = 'http://localhost:5173'
const cliente = { nombre: 'Ana', empresa: 'Demo', email: 'ana@demo.mx', telefono: '5500000000' }
// Cada prueba usa su propio clientId: el token de PayPal se guarda en memoria por clientId.
const credenciales = (clientId) => ({ clientId, secreto: 'secreto-sandbox' })
const ENCABEZADOS_PAYPAL = {
  'PayPal-Auth-Algo': 'SHA256withRSA',
  'PayPal-Cert-Url': 'https://api-m.sandbox.paypal.com/v1/notifications/certs/CERT-1',
  'PayPal-Transmission-Id': 'tx-1',
  'PayPal-Transmission-Sig': 'firma-base64',
  'PayPal-Transmission-Time': '2026-11-16T16:00:00Z',
}

function fetchFalso(rutas) {
  const llamadas = []
  const fetch = async (url, opciones = {}) => {
    llamadas.push({ url, ...opciones })
    const [, respuesta] = Object.entries(rutas).find(([parte]) => url.endsWith(parte)) ?? []
    const { ok = true, cuerpo } = typeof respuesta === 'function' ? respuesta(url, opciones) : respuesta ?? { ok: false, cuerpo: {} }
    return { ok, status: ok ? 200 : 422, json: async () => cuerpo }
  }
  return { fetch, llamadas }
}

const TOKEN = { '/v1/oauth2/token': { cuerpo: { access_token: 'A21-token', expires_in: 32400 } } }

function servicioConPagina() {
  return new ServicioPedidos({
    repoPedidos: new RepositorioMemoria(), fabricaPasarelas: new FabricaPasarelas(crearSdks(0), () => {}), bus: new BusEventos(),
    config: ConfigApp.obtener(), catalogo: programas, reloj: () => AHORA,
    sesionesPago: { soporta: () => true, crear: async () => ({ url: 'https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T' }) },
  })
}

describe('Pago con la página de PayPal (Sprint 7)', () => {
  it('CP-50 crear-pago arma la orden de PayPal con el monto de la base y la orden en custom_id', async () => {
    const orden = { id: 'SOC-100010', estado: 'cotizada', moneda: 'MXN', totalHoy: 35000, cliente, partidas: [{ nombre: 'Nexus Growth Split' }] }
    const p = parametrosOrden(orden, ORIGEN)
    expect(p.intent).toBe('CAPTURE')
    expect(p.purchase_units[0]).toMatchObject({ custom_id: 'SOC-100010', amount: { currency_code: 'MXN', value: '35000.00' } }) // texto con 2 decimales
    expect(p.payment_source.paypal.experience_context).toMatchObject({
      return_url: `${ORIGEN}/confirmacion?orden=SOC-100010`,
      cancel_url: `${ORIGEN}/checkout?cancelado=SOC-100010`,
      shipping_preference: 'NO_SHIPPING',
    })

    const { fetch, llamadas } = fetchFalso({
      ...TOKEN,
      '/v2/checkout/orders': {
        cuerpo: { id: '5O190127TN364715T', links: [{ rel: 'payer-action', href: 'https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T' }] },
      },
    })
    const r = await crearPago({
      ordenId: orden.id, origen: ORIGEN, pasarela: 'paypal', repo: { obtener: async () => orden },
      llaves: { paypal: credenciales('cp50') }, origenesPermitidos: [ORIGEN], fetch,
    })
    expect(r).toEqual({ status: 200, cuerpo: { id: '5O190127TN364715T', url: 'https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T' } })
    expect(llamadas[0].headers.Authorization).toBe(`Basic ${btoa('cp50:secreto-sandbox')}`)
    expect(llamadas[1].url).toBe('https://api-m.sandbox.paypal.com/v2/checkout/orders')
    expect(llamadas[1].headers.Authorization).toBe('Bearer A21-token')
    expect(llamadas[1].headers['PayPal-Request-Id']).toBe(`orden-SOC-100010-3500000-${ORIGEN}`)

    const sinLlave = await crearPago({ ordenId: orden.id, origen: ORIGEN, pasarela: 'paypal', repo: { obtener: async () => orden }, llaves: {}, origenesPermitidos: [ORIGEN], fetch })
    expect(sinLlave).toEqual({ status: 500, cuerpo: { error: 'sin_llave_paypal' } })
  })

  it('CP-51 aviso verificado con la API: aprobada → se captura → pagada; reembolso de Socius → reembolsada', async () => {
    const servicio = servicioConPagina()
    const { orden } = await servicio.iniciarPagoEnPasarela({ ids: ['avi'], cliente, pasarela: 'paypal', origen: ORIGEN })
    expect(orden.estado).toBe(ESTADOS.COTIZADA)

    let firmaValida = true
    let yaCapturada = false
    const capturada = {
      id: '5O190127TN364715T', status: 'COMPLETED',
      purchase_units: [{ reference_id: orden.id, payments: { captures: [{ id: '3C679366HH908993F', status: 'COMPLETED', custom_id: orden.id, amount: { value: '7000.00' } }] } }],
    }
    const { fetch, llamadas } = fetchFalso({
      ...TOKEN,
      '/v1/notifications/verify-webhook-signature': () => ({ cuerpo: { verification_status: firmaValida ? 'SUCCESS' : 'FAILURE' } }),
      '/capture': () => (yaCapturada ? { ok: false, cuerpo: { details: [{ issue: 'ORDER_ALREADY_CAPTURED' }] } } : { cuerpo: capturada }),
      '/v2/checkout/orders/5O190127TN364715T': { cuerpo: capturada },
    })
    const creds = { ...credenciales('cp51'), webhookId: '66N18617VY938530P' }
    const consultores = { paypal: (id) => capturarOrdenPayPal(id, { credenciales: creds, fetch }) }
    const cola = new ColaEventosMemoria()
    const avisar = (id, event_type, resource, encabezados = ENCABEZADOS_PAYPAL) =>
      recibirWebhook({ pasarela: 'paypal', cuerpo: JSON.stringify({ id, event_type, resource }), encabezados, secretos: { paypal: creds }, cola, fetch })

    // Sin encabezados de PayPal, o si su API dice que no es suyo, se rechaza.
    expect(await avisar('WH-0', 'CHECKOUT.ORDER.APPROVED', {}, {})).toEqual({ status: 400, motivo: 'sin_firma' })
    firmaValida = false
    expect(await avisar('WH-0', 'CHECKOUT.ORDER.APPROVED', {})).toEqual({ status: 400, motivo: 'firma_invalida' })
    firmaValida = true
    const verificacion = llamadas.find((l) => l.url.endsWith('/verify-webhook-signature'))
    expect(JSON.parse(verificacion.body)).toMatchObject({ webhook_id: '66N18617VY938530P', transmission_id: 'tx-1', auth_algo: 'SHA256withRSA' })

    // 1. El cliente aprobó: el consumidor captura la orden y el producto digital queda completado.
    const aprobada = { id: '5O190127TN364715T', status: 'APPROVED', purchase_units: [{ reference_id: orden.id, custom_id: orden.id }] }
    expect((await avisar('WH-1', 'CHECKOUT.ORDER.APPROVED', aprobada)).motivo).toBe('recibido')
    expect(await procesarPendientes({ cola, servicio, consultores })).toEqual({ procesados: 1, fallidos: 0 })
    const pagada = await servicio.obtener(orden.id)
    expect(pagada).toMatchObject({ estado: ESTADOS.COMPLETADA, pago: { pasarela: 'paypal', idTransaccion: '3C679366HH908993F', monto: 7000 } })
    expect(esPagoReal(pagada.pago)).toBe(true)
    expect(esPagoReal({ pasarela: 'paypal', idTransaccion: 'PP-abc123def4' })).toBe(false) // id del simulador

    // 2. PayPal avisa la captura y repite la aprobación: no cambia nada ni falla.
    yaCapturada = true
    await avisar('WH-2', 'PAYMENT.CAPTURE.COMPLETED', capturada.purchase_units[0].payments.captures[0])
    await avisar('WH-3', 'CHECKOUT.ORDER.APPROVED', aprobada)
    expect(await procesarPendientes({ cola, servicio, consultores })).toEqual({ procesados: 2, fallidos: 0 })
    expect((await servicio.obtener(orden.id)).estado).toBe(ESTADOS.COMPLETADA)

    // 3. El cliente pide devolución y Socius reembolsa en PayPal: el aviso trae el reembolso,
    //    que apunta a la captura con su liga "up".
    await servicio.solicitarDevolucion(orden.id)
    await avisar('WH-4', 'PAYMENT.CAPTURE.REFUNDED', {
      id: '1JU08902781691411', status: 'COMPLETED', amount: { value: '7000.00' },
      links: [{ rel: 'up', href: 'https://api-m.sandbox.paypal.com/v2/payments/captures/3C679366HH908993F' }],
    })
    await procesarPendientes({ cola, servicio, consultores })
    const final = await servicio.obtener(orden.id)
    expect(final.estado).toBe(ESTADOS.REEMBOLSADA)
    expect(final.reembolso).toMatchObject({ estado: 'emitido', tipo: 'devolucion', idReembolso: '1JU08902781691411', monto: 7000 })
    expect((await cola.listar()).every((e) => e.estado === ESTADOS_EVENTO.PROCESADO)).toBe(true)
  })
})
