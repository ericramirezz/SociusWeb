// PATRÓN: Adapter (estructural), ahora para los avisos de entrada.
// Cada pasarela describe un pago a su manera; aquí todos quedan como
//   { eventoId, tipo, referencia, idTransaccion, monto }
// con tipo = 'pago_aprobado' | 'pago_rechazado' | 'consultar_pago' | 'otro'
// y monto en pesos. `referencia` es nuestro número de orden (SOC-100001).

export const TIPOS = Object.freeze({
  APROBADO: 'pago_aprobado',
  RECHAZADO: 'pago_rechazado',
  REEMBOLSADO: 'pago_reembolsado',
  CONSULTAR: 'consultar_pago',
  OTRO: 'otro',
})

// Stripe manda el pago completo dentro del aviso; el monto viene en centavos.
function traducirStripe(datos) {
  const objeto = datos?.data?.object ?? {}
  // Reembolso hecho por Socius desde el panel de Stripe: el aviso trae el cargo (ch_…),
  // que apunta al pago (pi_…); con él se encuentra la orden.
  if (datos?.type === 'charge.refunded') {
    return {
      eventoId: datos?.id,
      tipo: TIPOS.REEMBOLSADO,
      referencia: objeto.metadata?.orden_id ?? null,
      idTransaccion: objeto.payment_intent ?? null,
      idReembolso: objeto.refunds?.data?.[0]?.id ?? null,
      monto: objeto.amount_refunded != null ? objeto.amount_refunded / 100 : null,
    }
  }
  const tipo = {
    'payment_intent.succeeded': TIPOS.APROBADO,
    'payment_intent.payment_failed': TIPOS.RECHAZADO,
  }[datos?.type] ?? TIPOS.OTRO
  return {
    eventoId: datos?.id,
    tipo,
    referencia: objeto.metadata?.orden_id ?? null,
    idTransaccion: objeto.id ?? null,
    monto: objeto.amount != null ? objeto.amount / 100 : null,
  }
}

// Mercado Pago solo avisa "cambió el pago 123": el estado y el monto se consultan
// después en su API con ese id (lo hace el consumidor).
function traducirMercadoPago(datos) {
  const idPago = datos?.data?.id != null ? String(datos.data.id) : null
  return {
    // Número de aviso + pago: un reenvío del mismo aviso sigue siendo duplicado, pero dos
    // avisos con el mismo número y distinto pago no chocan (el simulador del panel usa
    // siempre "id": "123456").
    eventoId: `${datos?.id ?? datos?.action}:${idPago}`,
    tipo: datos?.type === 'payment' && idPago ? TIPOS.CONSULTAR : TIPOS.OTRO,
    idPago,
    referencia: null,
    idTransaccion: idPago,
    monto: null,
  }
}

// PayPal manda el recurso completo. Cuando el cliente aprueba, la orden aún no está
// cobrada: el consumidor la captura (su "consultor" de PayPal es capturarOrdenPayPal).
function traducirPayPal(datos) {
  const r = datos?.resource ?? {}
  const base = { eventoId: datos?.id, referencia: r.custom_id ?? null, idTransaccion: r.id ?? null, monto: r.amount?.value != null ? Number(r.amount.value) : null }
  switch (datos?.event_type) {
    case 'CHECKOUT.ORDER.APPROVED': {
      const unidad = r.purchase_units?.[0] ?? {}
      return { ...base, tipo: TIPOS.CONSULTAR, idPago: r.id ?? null, referencia: unidad.custom_id ?? unidad.reference_id ?? null, monto: null }
    }
    case 'PAYMENT.CAPTURE.COMPLETED':
      return { ...base, tipo: TIPOS.APROBADO }
    case 'PAYMENT.CAPTURE.DENIED':
    case 'PAYMENT.CAPTURE.DECLINED':
      return { ...base, tipo: TIPOS.RECHAZADO }
    case 'PAYMENT.CAPTURE.REFUNDED': {
      // El recurso es el reembolso; su liga "up" apunta a la captura que se devolvió.
      const captura = r.links?.find((l) => l.rel === 'up')?.href?.split('/').pop() ?? null
      return { ...base, tipo: TIPOS.REEMBOLSADO, idTransaccion: captura, idReembolso: r.id ?? null }
    }
    default:
      return { ...base, tipo: TIPOS.OTRO }
  }
}

export const TRADUCTORES = {
  stripe: traducirStripe,
  mercadopago: traducirMercadoPago,
  paypal: traducirPayPal,
}
