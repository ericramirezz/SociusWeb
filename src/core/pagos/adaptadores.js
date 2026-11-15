// PATRÓN: Adapter (estructural).
// Stripe, Mercado Pago y PayPal responden distinto; cada adaptador los expone
// bajo el MISMO contrato que usa el resto de la app:
//
//   cobrar({ monto, moneda, referencia, tarjeta })
//     -> { ok, idTransaccion, pasarela, mensaje }
//   reembolsar({ idTransaccion, monto, moneda })
//     -> { ok, idReembolso, pasarela, mensaje }
//
// `monto` siempre llega en pesos. El adaptador absorbe las diferencias.

export class AdaptadorStripe {
  nombre = 'stripe'
  etiqueta = 'Stripe'
  constructor(sdk) {
    this.sdk = sdk
  }
  async cobrar({ monto, moneda, referencia, tarjeta }) {
    const r = await this.sdk.paymentIntents.create({
      amount: Math.round(monto * 100), // Stripe trabaja en centavos
      currency: moneda.toLowerCase(),
      metadata: { referencia },
      card: tarjeta,
    })
    const ok = r.status === 'succeeded'
    return { ok, idTransaccion: r.id, pasarela: this.nombre, mensaje: ok ? 'Pago aprobado' : 'Tarjeta rechazada' }
  }
  async reembolsar({ idTransaccion, monto }) {
    const r = await this.sdk.refunds.create({ payment_intent: idTransaccion, amount: Math.round(monto * 100) })
    return { ok: r.status === 'succeeded', idReembolso: r.id, pasarela: this.nombre, mensaje: 'Reembolso emitido' }
  }
}

export class AdaptadorMercadoPago {
  nombre = 'mercadopago'
  etiqueta = 'Mercado Pago'
  constructor(sdk) {
    this.sdk = sdk
  }
  async cobrar({ monto, referencia, tarjeta }) {
    const r = await this.sdk.payment.create({
      transaction_amount: monto, // Mercado Pago trabaja en pesos
      external_reference: referencia,
      card_number: tarjeta,
    })
    const ok = r.status === 'approved'
    return { ok, idTransaccion: String(r.id), pasarela: this.nombre, mensaje: ok ? 'Pago aprobado' : 'Tarjeta rechazada' }
  }
  async reembolsar({ idTransaccion, monto }) {
    const r = await this.sdk.payment.refund({ payment_id: idTransaccion, amount: monto })
    return { ok: r.status === 'approved', idReembolso: String(r.id), pasarela: this.nombre, mensaje: 'Reembolso emitido' }
  }
}

export class AdaptadorPayPal {
  nombre = 'paypal'
  etiqueta = 'PayPal'
  constructor(sdk) {
    this.sdk = sdk
  }
  async cobrar({ monto, moneda, referencia, tarjeta }) {
    const r = await this.sdk.orders.capture({
      purchase_units: [{ reference_id: referencia, amount: { currency_code: moneda, value: monto.toFixed(2) } }], // PayPal usa texto con 2 decimales
      card: tarjeta,
    })
    const ok = r.status === 'COMPLETED'
    return { ok, idTransaccion: r.id, pasarela: this.nombre, mensaje: ok ? 'Pago aprobado' : 'Tarjeta rechazada' }
  }
  async reembolsar({ idTransaccion, monto, moneda }) {
    const r = await this.sdk.payments.refundCapture({ capture_id: idTransaccion, amount: { currency_code: moneda, value: monto.toFixed(2) } })
    return { ok: r.status === 'COMPLETED', idReembolso: r.id, pasarela: this.nombre, mensaje: 'Reembolso emitido' }
  }
}
