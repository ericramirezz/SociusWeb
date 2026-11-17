// PATRÓN: Adapter (estructural), ahora para los avisos de entrada.
// Cada pasarela describe un pago a su manera; aquí todos quedan como
//   { eventoId, tipo, referencia, idTransaccion, monto }
// con tipo = 'pago_aprobado' | 'pago_rechazado' | 'consultar_pago' | 'otro'
// y monto en pesos. `referencia` es nuestro número de orden (SOC-100001).

export const TIPOS = Object.freeze({
  APROBADO: 'pago_aprobado',
  RECHAZADO: 'pago_rechazado',
  CONSULTAR: 'consultar_pago',
  OTRO: 'otro',
})

// Stripe manda el pago completo dentro del aviso; el monto viene en centavos.
function traducirStripe(datos) {
  const objeto = datos?.data?.object ?? {}
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
    eventoId: String(datos?.id ?? `${datos?.action}:${idPago}`),
    tipo: datos?.type === 'payment' && idPago ? TIPOS.CONSULTAR : TIPOS.OTRO,
    idPago,
    referencia: null,
    idTransaccion: idPago,
    monto: null,
  }
}

export const TRADUCTORES = {
  stripe: traducirStripe,
  mercadopago: traducirMercadoPago,
}
