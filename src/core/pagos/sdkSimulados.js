// SDKs SIMULADOS. Imitan la FORMA de las respuestas de cada proveedor (cada uno
// habla distinto: centavos vs. pesos, "succeeded" vs. "approved" vs. "COMPLETED")
// para que los adaptadores ya estén escritos contra esa forma.
// En la fase de pruebas se sustituyen por llamadas a nuestro backend, que es
// quien usa las llaves secretas reales. NUNCA van llaves secretas en el front.
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
const id = (prefijo) => `${prefijo}${Math.random().toString(36).slice(2, 12)}`

// Tarjetas de prueba (mismas convenciones que el modo test de Stripe)
export const TARJETA_APROBADA = '4242424242424242'
export const TARJETA_RECHAZADA = '4000000000000002'
const rechazada = (numero) => String(numero ?? '').replace(/\s/g, '') === TARJETA_RECHAZADA

export const crearSdks = (latenciaMs = 900) => ({
  stripe: {
    paymentIntents: {
      async create({ amount, currency, metadata, card }) {
        await espera(latenciaMs)
        if (rechazada(card)) return { id: id('pi_'), status: 'requires_payment_method', last_payment_error: { message: 'Your card was declined.' } }
        return { id: id('pi_'), status: 'succeeded', amount, currency, metadata }
      },
    },
    refunds: {
      async create({ payment_intent, amount }) {
        await espera(latenciaMs)
        return { id: id('re_'), status: 'succeeded', payment_intent, amount }
      },
    },
  },
  mercadopago: {
    payment: {
      async create({ transaction_amount, external_reference, card_number }) {
        await espera(latenciaMs)
        if (rechazada(card_number)) return { id: Date.now(), status: 'rejected', status_detail: 'cc_rejected_other_reason' }
        return { id: Date.now(), status: 'approved', status_detail: 'accredited', transaction_amount, external_reference }
      },
      async refund({ payment_id, amount }) {
        await espera(latenciaMs)
        return { id: Date.now(), payment_id, amount, status: 'approved' }
      },
    },
  },
  paypal: {
    orders: {
      async capture({ purchase_units, card }) {
        await espera(latenciaMs)
        if (rechazada(card)) return { id: id('PP-'), status: 'DECLINED', details: [{ description: 'Instrument declined' }] }
        return { id: id('PP-'), status: 'COMPLETED', purchase_units }
      },
    },
    payments: {
      async refundCapture({ capture_id, amount }) {
        await espera(latenciaMs)
        return { id: id('RF-'), status: 'COMPLETED', capture_id, amount }
      },
    },
  },
})
