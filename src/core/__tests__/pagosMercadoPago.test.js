// Sprint 7: pago con la página de Mercado Pago (Checkout Pro).
// Mercado Pago no se llama de verdad: un fetch falso responde como su API.
import { describe, expect, it } from 'vitest'
import { programas } from '../../data/programas'
import { ConfigApp } from '../config'
import { ESTADOS } from '../estadoOrden'
import { BusEventos } from '../eventos'
import { FabricaPasarelas } from '../pagos/fabricaPasarelas'
import { consultarPagoMercadoPago, parametrosPreferencia } from '../pagos/checkoutMercadoPago'
import { crearPago, esPagoReal } from '../pagos/paginasDePago'
import { crearSdks } from '../pagos/sdkSimulados'
import { RepositorioMemoria } from '../repositorio'
import { ServicioPedidos } from '../servicioPedidos'
import { ColaEventosMemoria, ESTADOS_EVENTO } from '../webhooks/colaEventos'
import { firmarMercadoPago } from '../webhooks/firmas'
import { procesarPendientes } from '../webhooks/procesador'
import { recibirWebhook } from '../webhooks/receptor'

const AHORA = new Date(2026, 10, 16, 10, 0)
const ORIGEN = 'http://localhost:5173'
const SECRETOS = { mercadopago: 'mp_secreto_prueba' }
const cliente = { nombre: 'Ana', empresa: 'Demo', email: 'ana@demo.mx', telefono: '5500000000' }

function fetchFalso(rutas) {
  const llamadas = []
  const fetch = async (url, opciones = {}) => {
    llamadas.push({ url, ...opciones })
    const [, respuesta] = Object.entries(rutas).find(([parte]) => url.includes(parte)) ?? []
    const { ok = true, cuerpo } = typeof respuesta === 'function' ? respuesta(url) : respuesta ?? { ok: false, cuerpo: {} }
    return { ok, status: ok ? 200 : 404, json: async () => cuerpo }
  }
  return { fetch, llamadas }
}

function servicioConPagina() {
  return new ServicioPedidos({
    repoPedidos: new RepositorioMemoria(), fabricaPasarelas: new FabricaPasarelas(crearSdks(0), () => {}), bus: new BusEventos(),
    config: ConfigApp.obtener(), catalogo: programas, reloj: () => AHORA,
    sesionesPago: { soporta: () => true, crear: async ({ ordenId }) => ({ url: `https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=${ordenId}` }) },
  })
}

// Aviso de Mercado Pago, firmado como lo hace él: solo trae el id del pago.
async function avisar(cola, idNotificacion, idPago) {
  const cuerpo = JSON.stringify({ id: idNotificacion, type: 'payment', action: 'payment.updated', data: { id: idPago } })
  const encabezados = await firmarMercadoPago(cuerpo, SECRETOS.mercadopago, `req-${idNotificacion}`, AHORA)
  return recibirWebhook({ pasarela: 'mercadopago', cuerpo, encabezados, secretos: SECRETOS, cola, reloj: () => AHORA })
}

describe('Pago con la página de Mercado Pago (Sprint 7)', () => {
  it('CP-48 crear-pago arma la preferencia con el monto de la base y la orden en external_reference', async () => {
    const orden = { id: 'SOC-100009', estado: 'cotizada', moneda: 'MXN', totalHoy: 35000, cliente, partidas: [{ nombre: 'Nexus Growth Split' }] }
    const p = parametrosPreferencia(orden, ORIGEN)
    expect(p.items[0]).toMatchObject({ quantity: 1, currency_id: 'MXN', unit_price: 35000 }) // en pesos, no centavos
    expect(p.external_reference).toBe('SOC-100009')
    expect(p.back_urls).toEqual({
      success: `${ORIGEN}/confirmacion?orden=SOC-100009`,
      pending: `${ORIGEN}/confirmacion?orden=SOC-100009`,
      failure: `${ORIGEN}/checkout?cancelado=SOC-100009`,
    })
    expect(p.auto_return).toBeUndefined() // en localhost no; con https sí
    expect(p.payer).toBeUndefined() // un correo real con credenciales de prueba hace fallar el pago
    expect(parametrosPreferencia(orden, 'https://socius.mx').auto_return).toBe('approved')

    const { fetch, llamadas } = fetchFalso({
      '/checkout/preferences': { cuerpo: { id: 'pref_1', init_point: 'https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=pref_1' } },
    })
    const r = await crearPago({
      ordenId: orden.id, origen: ORIGEN, pasarela: 'mercadopago', repo: { obtener: async () => orden },
      llaves: { mercadopago: 'APP_USR-prueba' }, origenesPermitidos: [ORIGEN], fetch,
    })
    expect(r).toEqual({ status: 200, cuerpo: { id: 'pref_1', url: 'https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=pref_1' } })
    expect(llamadas[0].url).toBe('https://api.mercadopago.com/checkout/preferences')
    expect(llamadas[0].headers.Authorization).toBe('Bearer APP_USR-prueba')
    expect(llamadas[0].headers['X-Idempotency-Key']).toBe(`preferencia-SOC-100009-3500000-${ORIGEN}`)
    expect(JSON.parse(llamadas[0].body).items[0].unit_price).toBe(35000)

    // Sin Access Token no se llama a Mercado Pago.
    const sinLlave = await crearPago({ ordenId: orden.id, origen: ORIGEN, pasarela: 'mercadopago', repo: { obtener: async () => orden }, llaves: {}, origenesPermitidos: [ORIGEN], fetch })
    expect(sinLlave).toEqual({ status: 500, cuerpo: { error: 'sin_llave_mercadopago' } })
    expect(llamadas).toHaveLength(1)
  })

  it('CP-49 el aviso firmado se confirma consultando la API: aprobado → pagada; reembolsado por Socius → reembolsada', async () => {
    const servicio = servicioConPagina()
    const { orden } = await servicio.iniciarPagoEnPasarela({ ids: ['avi'], cliente, pasarela: 'mercadopago', origen: ORIGEN })
    expect(orden.estado).toBe(ESTADOS.COTIZADA)

    let estadoPago = 'approved'
    const { fetch } = fetchFalso({
      '/v1/payments/1325468790': () => ({
        cuerpo: {
          id: 1325468790, status: estadoPago, external_reference: orden.id, transaction_amount: 7000,
          transaction_amount_refunded: estadoPago === 'refunded' ? 7000 : 0, refunds: estadoPago === 'refunded' ? [{ id: 9988 }] : [],
        },
      }),
    })
    const consultores = { mercadopago: (id) => consultarPagoMercadoPago(id, { llaveSecreta: 'APP_USR-prueba', fetch }) }
    const cola = new ColaEventosMemoria()

    // 1. Pago aprobado: el producto digital queda completado.
    expect((await avisar(cola, 101, '1325468790')).motivo).toBe('recibido')
    expect(await procesarPendientes({ cola, servicio, consultores })).toEqual({ procesados: 1, fallidos: 0 })
    const pagada = await servicio.obtener(orden.id)
    expect(pagada).toMatchObject({ estado: ESTADOS.COMPLETADA, pago: { pasarela: 'mercadopago', idTransaccion: '1325468790', monto: 7000 } })
    expect(esPagoReal(pagada.pago)).toBe(true)
    expect(esPagoReal({ pasarela: 'mercadopago', idTransaccion: String(Date.now()) })).toBe(false) // id del simulador

    // 2. El cliente pide la devolución: queda la solicitud, la app no reembolsa sola.
    const conSolicitud = await servicio.solicitarDevolucion(orden.id)
    expect(conSolicitud.reembolso).toMatchObject({ estado: 'solicitado', tipo: 'devolucion' })

    // 3. Socius reembolsa en Mercado Pago → nuevo aviso del mismo pago → la API dice "refunded".
    estadoPago = 'refunded'
    await avisar(cola, 102, '1325468790')
    await procesarPendientes({ cola, servicio, consultores })
    const final = await servicio.obtener(orden.id)
    expect(final.estado).toBe(ESTADOS.REEMBOLSADA)
    expect(final.reembolso).toMatchObject({ estado: 'emitido', tipo: 'devolucion', idReembolso: '9988', monto: 7000 })
    expect((await cola.listar()).every((e) => e.estado === ESTADOS_EVENTO.PROCESADO)).toBe(true)
  })
})
