// Sprint 7: cobro REAL (modo prueba) con Stripe Checkout.
// La página de pago la aloja Stripe: la tarjeta nunca pasa por nuestro código
// (PCI mínimo). Este archivo corre solo en el servidor (Edge Function crear-pago),
// porque necesita la llave secreta de Stripe. Las reglas comunes con Mercado Pago
// (quién puede pedir la página, a dónde regresa) están en paginasDePago.js.
//
// Camino completo:
//   checkout (app) → crear-pago → Stripe crea la sesión → el cliente paga en Stripe
//   → Stripe manda payment_intent.succeeded firmado → webhook-pagos (Función 2) → orden pagada.
// Por eso el número de orden viaja en payment_intent_data.metadata.orden_id:
// es lo que el traductor de webhooks lee para saber qué orden confirmar.

export const API_STRIPE = 'https://api.stripe.com/v1'

// Stripe cobra en la unidad mínima de la moneda: centavos de peso.
export const aCentavos = (pesos) => Math.round(Number(pesos) * 100)

// Parámetros de la sesión (Stripe recibe formularios, no JSON).
// El monto sale de la orden guardada en la base, nunca de lo que mande el navegador.
export function parametrosSesion(orden, origen) {
  const p = new URLSearchParams({
    mode: 'payment',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': String(orden.moneda ?? 'MXN').toLowerCase(),
    'line_items[0][price_data][unit_amount]': String(aCentavos(orden.totalHoy)),
    'line_items[0][price_data][product_data][name]': `Socius · Orden ${orden.id}`,
    'line_items[0][price_data][product_data][description]': (orden.partidas ?? []).map((x) => x.nombre).join(', ').slice(0, 500) || 'Programas Socius',
    client_reference_id: orden.id,
    'metadata[orden_id]': orden.id,
    'payment_intent_data[metadata][orden_id]': orden.id,
    success_url: `${origen}/confirmacion?orden=${encodeURIComponent(orden.id)}`,
    cancel_url: `${origen}/checkout?cancelado=${encodeURIComponent(orden.id)}`,
    locale: 'es-419',
  })
  if (orden.cliente?.email) p.set('customer_email', orden.cliente.email)
  return p
}

// Crea la sesión en Stripe y devuelve la URL de su página de pago.
export async function crearSesionCheckout({ orden, origen, llaveSecreta, fetch = globalThis.fetch }) {
  const cuerpo = parametrosSesion(orden, origen)
  const r = await fetch(`${API_STRIPE}/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${llaveSecreta}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      // Idempotencia (Tema 3): si el navegador repite la petición, Stripe devuelve la
      // misma sesión en lugar de crear otra. Cambia si cambia el monto o el sitio.
      'Idempotency-Key': `checkout-${orden.id}-${aCentavos(orden.totalHoy)}-${origen}`,
    },
    body: cuerpo.toString(),
  })
  const datos = await r.json().catch(() => ({}))
  if (!r.ok || !datos.url) {
    const error = new Error(datos?.error?.message ?? 'stripe_sin_respuesta')
    error.status = 502
    throw error
  }
  return { id: datos.id, url: datos.url }
}
