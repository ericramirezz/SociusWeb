// Sprint 7: lo que comparten las pasarelas que cobran en su propia página
// (Stripe Checkout y Mercado Pago Checkout Pro). Corre en la Edge Function crear-pago.
//
// PATRÓN: Strategy. Cada pasarela aporta su forma de crear la página de pago;
// las reglas comunes (quién puede pedirla, por qué monto, a dónde regresa) viven aquí una vez.
import { crearSesionCheckout } from './checkoutStripe'
import { crearPreferencia } from './checkoutMercadoPago'

export const CREADORES = {
  stripe: crearSesionCheckout,
  mercadopago: crearPreferencia,
}

// Error con el código HTTP que debe responder la Edge Function.
export class ErrorPago extends Error {
  constructor(motivo, status) {
    super(motivo)
    this.motivo = motivo
    this.status = status
  }
}

// A dónde puede regresar la pasarela al cliente. Sin esta lista, cualquiera podría usar
// nuestra cuenta para mandar gente a otro sitio después de pagar.
export function origenPermitido(origen, permitidos) {
  return typeof origen === 'string' && permitidos.map((p) => p.trim().replace(/\/$/, '')).includes(origen.replace(/\/$/, ''))
}

// ¿El pago lo cobró la pasarela de verdad o el SDK simulado? Decide si el reembolso
// lo hace la app (simulado) o Socius desde el panel de la pasarela (real).
//   Stripe: los PaymentIntent reales traen 24 caracteres después de "pi_"; los simulados, 10.
//   Mercado Pago: los ids reales tienen hasta 12 dígitos; el simulado usa Date.now() (13).
export function esPagoReal(pago) {
  const id = String(pago?.idTransaccion ?? '')
  if (pago?.pasarela === 'stripe') return /^pi_[A-Za-z0-9]{20,}$/.test(id)
  if (pago?.pasarela === 'mercadopago') return /^\d{6,12}$/.test(id)
  return false
}

// Lo que hace la Edge Function crear-pago, sin nada de Deno para poder probarlo.
// `repo` usa la sesión del cliente: por la seguridad por fila, solo ve sus propias órdenes.
// El monto sale de la orden guardada en la base, nunca de lo que mande el navegador.
export async function crearPago({ ordenId, origen, pasarela = 'stripe', repo, llaves = {}, origenesPermitidos, fetch }) {
  try {
    const crear = CREADORES[pasarela]
    if (!crear) throw new ErrorPago('pasarela_sin_pagina', 400)
    const llaveSecreta = llaves[pasarela]
    if (!llaveSecreta) throw new ErrorPago(`sin_llave_${pasarela}`, 500)
    if (!origenPermitido(origen, origenesPermitidos)) throw new ErrorPago('origen_no_permitido', 400)
    if (!ordenId) throw new ErrorPago('sin_orden', 400)
    const orden = await repo.obtener(ordenId)
    if (!orden) throw new ErrorPago('orden_no_encontrada', 404)
    if (orden.estado !== 'cotizada') throw new ErrorPago('orden_ya_pagada', 409)
    if (!(orden.totalHoy > 0)) throw new ErrorPago('monto_invalido', 400)
    const pagina = await crear({ orden, origen: origen.replace(/\/$/, ''), llaveSecreta, fetch })
    return { status: 200, cuerpo: pagina }
  } catch (e) {
    if (e instanceof ErrorPago) return { status: e.status, cuerpo: { error: e.motivo } }
    return { status: e.status ?? 500, cuerpo: { error: e.message } }
  }
}
