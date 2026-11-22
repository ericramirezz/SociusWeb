// Sprint 7: cobro REAL (modo prueba, "sandbox") con PayPal Checkout (Orders v2).
// Igual que Stripe y Mercado Pago, la página la aloja PayPal y la arma el servidor
// (Edge Function crear-pago) con el Client ID y el Secret, que nunca llegan al navegador.
//
// Diferencia con los otros dos: en PayPal el cliente solo APRUEBA el pago; el cobro lo
// hace nuestro servidor al "capturar" la orden. Camino completo:
//   checkout → crear-pago → PayPal crea la orden → el cliente la aprueba en PayPal
//   → aviso CHECKOUT.ORDER.APPROVED → el consumidor captura (cobra) → orden pagada
//   → PayPal manda además PAYMENT.CAPTURE.COMPLETED (ya no cambia nada: es idempotente).
// El número de orden viaja en custom_id para reconocer la orden en cada aviso.
//
// Las credenciales llegan como { clientId, secreto } (secretos PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET).

export const API_PAYPAL = 'https://api-m.sandbox.paypal.com' // en producción: https://api-m.paypal.com

// PayPal no usa la llave directo: con ella se pide un token que dura ~9 horas.
const tokens = new Map() // clientId → { token, vence }

export async function tokenPayPal({ clientId, secreto }, { fetch = globalThis.fetch, ahora = Date.now() } = {}) {
  if (!clientId || !secreto) throw new Error('Faltan PAYPAL_CLIENT_ID o PAYPAL_CLIENT_SECRET')
  const guardado = tokens.get(clientId)
  if (guardado && guardado.vence > ahora) return guardado.token
  const r = await fetch(`${API_PAYPAL}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${btoa(`${clientId}:${secreto}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  })
  const datos = await r.json().catch(() => ({}))
  if (!r.ok || !datos.access_token) {
    const error = new Error(`PayPal no aceptó las credenciales: ${datos?.error_description ?? r.status}`)
    error.status = 502
    throw error
  }
  // Se renueva un minuto antes de que venza.
  tokens.set(clientId, { token: datos.access_token, vence: ahora + (Number(datos.expires_in ?? 0) - 60) * 1000 })
  return datos.access_token
}

// Cuerpo de la orden de PayPal (JSON; el monto va como texto con 2 decimales, en pesos).
export function parametrosOrden(orden, origen) {
  const moneda = String(orden.moneda ?? 'MXN').toUpperCase()
  return {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: orden.id,
        custom_id: orden.id,
        description: `Socius · Orden ${orden.id}: ${(orden.partidas ?? []).map((x) => x.nombre).join(', ') || 'Programas Socius'}`.slice(0, 127),
        amount: { currency_code: moneda, value: Number(orden.totalHoy).toFixed(2) },
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: 'Socius',
          locale: 'es-MX',
          shipping_preference: 'NO_SHIPPING', // no se envía nada físico
          user_action: 'PAY_NOW', // el botón de PayPal dice "Pagar ahora"
          return_url: `${origen}/confirmacion?orden=${encodeURIComponent(orden.id)}`,
          cancel_url: `${origen}/checkout?cancelado=${encodeURIComponent(orden.id)}`,
        },
      },
    },
  }
}

// Crea la orden en PayPal y devuelve la URL donde el cliente la aprueba.
export async function crearOrdenPayPal({ orden, origen, llaveSecreta, fetch = globalThis.fetch }) {
  const token = await tokenPayPal(llaveSecreta, { fetch })
  const r = await fetch(`${API_PAYPAL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      // Idempotencia: si el navegador repite la petición, PayPal devuelve la misma orden.
      'PayPal-Request-Id': `orden-${orden.id}-${Math.round(Number(orden.totalHoy) * 100)}-${origen}`.slice(0, 108),
    },
    body: JSON.stringify(parametrosOrden(orden, origen)),
  })
  const datos = await r.json().catch(() => ({}))
  const url = datos.links?.find((l) => l.rel === 'payer-action' || l.rel === 'approve')?.href
  if (!r.ok || !url) {
    const error = new Error(datos?.details?.[0]?.description ?? datos?.message ?? 'paypal_sin_respuesta')
    error.status = 502
    throw error
  }
  return { id: datos.id, url }
}

// Lee el resultado de una orden capturada → { estado, referencia, idTransaccion, monto }.
const ESTADOS_CAPTURA = { COMPLETED: 'aprobado', DECLINED: 'rechazado', FAILED: 'rechazado', REFUNDED: 'reembolsado' }

function leerCaptura(datos, idOrden) {
  const unidad = datos.purchase_units?.[0] ?? {}
  const captura = unidad.payments?.captures?.[0]
  return {
    estado: ESTADOS_CAPTURA[captura?.status] ?? 'pendiente',
    referencia: captura?.custom_id ?? unidad.custom_id ?? unidad.reference_id ?? null,
    idTransaccion: captura?.id ?? idOrden, // el id de la captura es el que se usa para reembolsar
    monto: captura?.amount?.value != null ? Number(captura.amount.value) : null,
  }
}

// Cobra una orden ya aprobada por el cliente (lo hace el consumidor de webhooks).
// Si ya estaba capturada (aviso repetido), solo consulta el resultado.
export async function capturarOrdenPayPal(idOrden, { credenciales, fetch = globalThis.fetch }) {
  const token = await tokenPayPal(credenciales, { fetch })
  const encabezados = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const r = await fetch(`${API_PAYPAL}/v2/checkout/orders/${encodeURIComponent(idOrden)}/capture`, {
    method: 'POST',
    headers: { ...encabezados, 'PayPal-Request-Id': `captura-${idOrden}` },
  })
  let datos = await r.json().catch(() => ({}))
  if (!r.ok && datos?.details?.some((d) => d.issue === 'ORDER_ALREADY_CAPTURED')) {
    const consulta = await fetch(`${API_PAYPAL}/v2/checkout/orders/${encodeURIComponent(idOrden)}`, { headers: encabezados })
    datos = await consulta.json().catch(() => ({}))
    if (!consulta.ok) throw new Error(`PayPal no encontró la orden ${idOrden}: ${consulta.status}`)
  } else if (!r.ok) {
    throw new Error(`PayPal no pudo capturar la orden ${idOrden}: ${datos?.details?.[0]?.issue ?? datos?.message ?? r.status}`)
  }
  return leerCaptura(datos, idOrden)
}

// PayPal no firma con una clave compartida: se le pregunta a su API si el aviso es suyo,
// mandándole los encabezados paypal-* tal cual llegaron y el Webhook ID registrado.
// Ojo: los avisos del simulador del panel de PayPal NO pasan esta revisión; hay que probar
// con un pago real de sandbox.
export async function verificarAvisoPayPal(cuerpo, encabezados, { clientId, secreto, webhookId }, { fetch = globalThis.fetch } = {}) {
  const campos = {
    auth_algo: encabezados['paypal-auth-algo'],
    cert_url: encabezados['paypal-cert-url'],
    transmission_id: encabezados['paypal-transmission-id'],
    transmission_sig: encabezados['paypal-transmission-sig'],
    transmission_time: encabezados['paypal-transmission-time'],
  }
  if (Object.values(campos).some((v) => !v)) return { ok: false, motivo: 'sin_firma' }
  if (!webhookId) return { ok: false, motivo: 'sin_webhook_id' }
  let evento
  try {
    evento = JSON.parse(cuerpo)
  } catch {
    return { ok: false, motivo: 'json_invalido' }
  }
  const token = await tokenPayPal({ clientId, secreto }, { fetch })
  const r = await fetch(`${API_PAYPAL}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...campos, webhook_id: webhookId, webhook_event: evento }),
  })
  const datos = await r.json().catch(() => ({}))
  if (!r.ok) return { ok: false, motivo: 'verificacion_no_disponible' }
  return datos.verification_status === 'SUCCESS' ? { ok: true } : { ok: false, motivo: 'firma_invalida' }
}
