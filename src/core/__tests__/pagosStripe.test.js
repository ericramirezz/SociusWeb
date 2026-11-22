// Sprint 7: pago con la página de Stripe (Stripe Checkout).
// Stripe no se llama de verdad: un fetch falso guarda lo que se le habría mandado.
import { describe, expect, it } from 'vitest'
import { programas } from '../../data/programas'
import { ConfigApp } from '../config'
import { ESTADOS } from '../estadoOrden'
import { BusEventos } from '../eventos'
import { FabricaPasarelas } from '../pagos/fabricaPasarelas'
import { aCentavos, crearPago, origenPermitido, parametrosSesion } from '../pagos/checkoutStripe'
import { crearSdks } from '../pagos/sdkSimulados'
import { RepositorioMemoria } from '../repositorio'
import { ServicioPedidos } from '../servicioPedidos'

const AHORA = new Date(2026, 10, 16, 10, 0)
const ORIGEN = 'http://localhost:5173'
const cliente = { nombre: 'Ana', empresa: 'Demo', email: 'ana@demo.mx', telefono: '5500000000' }
const ordenCotizada = (extra = {}) => ({
  id: 'SOC-100005', estado: 'cotizada', moneda: 'MXN', totalHoy: 35000, cliente,
  partidas: [{ nombre: 'Nexus IA' }], ...extra,
})

function fetchFalso(respuesta = { id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' }, ok = true) {
  const llamadas = []
  const fetch = async (url, opciones) => {
    llamadas.push({ url, ...opciones, params: new URLSearchParams(opciones.body) })
    return { ok, json: async () => respuesta }
  }
  return { fetch, llamadas }
}

const repoCon = (orden) => ({ obtener: async (id) => (orden && id === orden.id ? orden : null) })

describe('Pago con la página de Stripe (Sprint 7)', () => {
  it('CP-42 la sesión lleva el monto de la orden en centavos y el número de orden para el webhook', () => {
    const p = parametrosSesion(ordenCotizada({ totalHoy: 17500.5 }), ORIGEN)
    expect(p.get('mode')).toBe('payment')
    expect(p.get('line_items[0][price_data][currency]')).toBe('mxn')
    expect(p.get('line_items[0][price_data][unit_amount]')).toBe('1750050')
    // El traductor de webhooks (Función 2) lee payment_intent.metadata.orden_id.
    expect(p.get('payment_intent_data[metadata][orden_id]')).toBe('SOC-100005')
    expect(p.get('success_url')).toBe(`${ORIGEN}/confirmacion?orden=SOC-100005`)
    expect(p.get('cancel_url')).toBe(`${ORIGEN}/checkout?cancelado=SOC-100005`)
    expect(p.get('customer_email')).toBe('ana@demo.mx')
    expect(aCentavos(0.1 + 0.2)).toBe(30)
  })

  it('CP-43 crear-pago pide la sesión a Stripe con la llave secreta y una llave de idempotencia', async () => {
    const { fetch, llamadas } = fetchFalso()
    const r = await crearPago({
      ordenId: 'SOC-100005', origen: ORIGEN, repo: repoCon(ordenCotizada()),
      llaveSecreta: 'sk_test_x', origenesPermitidos: [ORIGEN], fetch,
    })
    expect(r).toEqual({ status: 200, cuerpo: { id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' } })
    expect(llamadas).toHaveLength(1)
    expect(llamadas[0].url).toBe('https://api.stripe.com/v1/checkout/sessions')
    expect(llamadas[0].headers.Authorization).toBe('Bearer sk_test_x')
    expect(llamadas[0].headers['Idempotency-Key']).toBe(`checkout-SOC-100005-3500000-${ORIGEN}`)
    expect(llamadas[0].params.get('line_items[0][price_data][unit_amount]')).toBe('3500000')
  })

  it('CP-44 crear-pago rechaza órdenes ajenas o pagadas, sitios no permitidos y errores de Stripe sin llamar de más', async () => {
    const base = { ordenId: 'SOC-100005', origen: ORIGEN, llaveSecreta: 'sk_test_x', origenesPermitidos: [ORIGEN] }
    const { fetch, llamadas } = fetchFalso()
    // La seguridad por fila hace que una orden de otro cliente simplemente no exista para este.
    expect(await crearPago({ ...base, repo: repoCon(null), fetch })).toEqual({ status: 404, cuerpo: { error: 'orden_no_encontrada' } })
    expect(await crearPago({ ...base, repo: repoCon(ordenCotizada({ estado: 'pagada' })), fetch })).toEqual({ status: 409, cuerpo: { error: 'orden_ya_pagada' } })
    expect(await crearPago({ ...base, origen: 'https://sitio-falso.com', repo: repoCon(ordenCotizada()), fetch })).toEqual({ status: 400, cuerpo: { error: 'origen_no_permitido' } })
    expect(await crearPago({ ...base, llaveSecreta: undefined, repo: repoCon(ordenCotizada()), fetch })).toEqual({ status: 500, cuerpo: { error: 'sin_llave_stripe' } })
    expect(llamadas).toHaveLength(0)

    const conError = fetchFalso({ error: { message: 'Invalid API Key provided' } }, false)
    expect(await crearPago({ ...base, repo: repoCon(ordenCotizada()), fetch: conError.fetch })).toEqual({ status: 502, cuerpo: { error: 'Invalid API Key provided' } })

    expect(origenPermitido('http://localhost:5173/', ['http://localhost:5173'])).toBe(true)
    expect(origenPermitido(undefined, ['http://localhost:5173'])).toBe(false)
  })

  it('CP-45 el checkout deja la orden cotizada, no cobra y reutiliza la orden si el cliente vuelve sin pagar', async () => {
    const pedidas = []
    const sesionesPago = {
      soporta: (p) => p === 'stripe',
      crear: async ({ ordenId, origen }) => {
        pedidas.push({ ordenId, origen })
        return { url: `https://checkout.stripe.com/c/pay/${ordenId}` }
      },
    }
    const fabrica = new FabricaPasarelas(crearSdks(0), () => {})
    const servicio = new ServicioPedidos({
      repoPedidos: new RepositorioMemoria(), fabricaPasarelas: fabrica, bus: new BusEventos(),
      config: ConfigApp.obtener(), catalogo: programas, reloj: () => AHORA, sesionesPago,
    })
    expect(servicio.usaPaginaDePago('stripe')).toBe(true)
    expect(servicio.usaPaginaDePago('mercadopago')).toBe(false)

    const datos = { ids: ['nexus-ia'], cliente, pasarela: 'stripe', fechaCliente: '2026-11-25', origen: ORIGEN }
    const r1 = await servicio.iniciarPagoEnPasarela(datos)
    expect(r1.orden.estado).toBe(ESTADOS.COTIZADA)
    expect(r1.orden.pago ?? null).toBeNull()
    expect(r1.orden.fechaPreferida).toBe('2026-11-25')
    expect(r1.url).toBe(`https://checkout.stripe.com/c/pay/${r1.orden.id}`)

    // Regresa de Stripe con "cancelado": se reintenta sobre la misma orden, no se crea otra.
    const r2 = await servicio.iniciarPagoEnPasarela({ ...datos, ordenId: r1.orden.id })
    expect(r2.orden.id).toBe(r1.orden.id)
    expect(await servicio.listar()).toHaveLength(1)
    expect(pedidas).toEqual([{ ordenId: r1.orden.id, origen: ORIGEN }, { ordenId: r1.orden.id, origen: ORIGEN }])

    await expect(servicio.iniciarPagoEnPasarela({ ...datos, pasarela: 'paypal' })).rejects.toThrow(/no tiene página de pago/)
  })
})
