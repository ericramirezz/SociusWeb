// Sprint 7: cobro REAL (modo prueba) con Mercado Pago Checkout Pro.
// Igual que con Stripe, la página de pago la aloja la pasarela y la arma el servidor
// (Edge Function crear-pago) con el Access Token, que nunca llega al navegador.
//
// Diferencia con Stripe: el aviso de Mercado Pago solo dice "cambió el pago 123".
// El consumidor (procesador.js) pregunta a su API el estado y el número de orden
// con consultarPagoMercadoPago(); por eso la orden viaja en external_reference.

export const API_MERCADOPAGO = 'https://api.mercadopago.com'

// Cuerpo de la "preferencia" (Mercado Pago recibe JSON y montos en pesos, no centavos).
export function parametrosPreferencia(orden, origen) {
  const volver = `${origen}/confirmacion?orden=${encodeURIComponent(orden.id)}`
  const p = {
    items: [
      {
        id: orden.id,
        title: `Socius · Orden ${orden.id}`,
        description: (orden.partidas ?? []).map((x) => x.nombre).join(', ').slice(0, 250) || 'Programas Socius',
        quantity: 1,
        currency_id: String(orden.moneda ?? 'MXN').toUpperCase(),
        unit_price: Number(orden.totalHoy),
      },
    ],
    external_reference: orden.id,
    metadata: { orden_id: orden.id },
    back_urls: {
      success: volver,
      pending: volver, // p. ej. pago en OXXO: la confirmación espera al aviso
      failure: `${origen}/checkout?cancelado=${encodeURIComponent(orden.id)}`,
    },
    statement_descriptor: 'SOCIUS',
  }
  // No se manda payer.email: si ese correo es una cuenta real de Mercado Pago y las
  // credenciales son de prueba, Mercado Pago rechaza el pago ("una de las partes es de
  // prueba"). El comprador escribe su correo en la página de Mercado Pago.
  // El regreso automático solo se acepta con sitios https; en localhost el cliente
  // da clic en "Volver al sitio" después de pagar.
  if (origen.startsWith('https://')) p.auto_return = 'approved'
  return p
}

// Crea la preferencia y devuelve la URL de la página de pago de Mercado Pago.
export async function crearPreferencia({ orden, origen, llaveSecreta, fetch = globalThis.fetch }) {
  const r = await fetch(`${API_MERCADOPAGO}/checkout/preferences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${llaveSecreta}`,
      'Content-Type': 'application/json',
      // Idempotencia: si el navegador repite la petición, no se crea otra preferencia.
      'X-Idempotency-Key': `preferencia-${orden.id}-${Math.round(Number(orden.totalHoy) * 100)}-${origen}`,
    },
    body: JSON.stringify(parametrosPreferencia(orden, origen)),
  })
  const datos = await r.json().catch(() => ({}))
  // Las credenciales antiguas de prueba (TEST-…) usan la página "sandbox".
  const url = llaveSecreta?.startsWith('TEST-') ? datos.sandbox_init_point ?? datos.init_point : datos.init_point ?? datos.sandbox_init_point
  if (!r.ok || !url) {
    const error = new Error(datos?.message ?? 'mercadopago_sin_respuesta')
    error.status = 502
    throw error
  }
  return { id: datos.id, url }
}

// Consulta un pago en la API de Mercado Pago (lo usa el consumidor de webhooks).
//   → { estado: 'aprobado' | 'rechazado' | 'reembolsado' | 'pendiente', referencia, idTransaccion, monto, idReembolso }
const ESTADOS_MP = { approved: 'aprobado', rejected: 'rechazado', refunded: 'reembolsado', cancelled: 'rechazado' }

export async function consultarPagoMercadoPago(idPago, { llaveSecreta, fetch = globalThis.fetch }) {
  if (!llaveSecreta) throw new Error('Falta MERCADOPAGO_ACCESS_TOKEN para consultar el pago')
  const r = await fetch(`${API_MERCADOPAGO}/v1/payments/${encodeURIComponent(idPago)}`, {
    headers: { Authorization: `Bearer ${llaveSecreta}` },
  })
  const p = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`Mercado Pago no encontró el pago ${idPago}: ${p?.message ?? r.status}`)
  const estado = ESTADOS_MP[p.status] ?? 'pendiente'
  return {
    estado,
    referencia: p.external_reference ?? p.metadata?.orden_id ?? null,
    idTransaccion: String(p.id ?? idPago),
    // En un reembolso cuenta lo devuelto; en un pago, lo cobrado.
    monto: estado === 'reembolsado' ? Number(p.transaction_amount_refunded ?? p.transaction_amount) : Number(p.transaction_amount),
    idReembolso: p.refunds?.[0]?.id != null ? String(p.refunds[0].id) : null,
  }
}
