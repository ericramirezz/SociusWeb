// Verificación de firmas de los webhooks (autenticación entre servidores, Tarea 04).
//
// La pasarela y nuestro servidor comparten una clave secreta. En cada aviso la
// pasarela calcula HMAC-SHA256(clave, mensaje) y lo manda en un encabezado; aquí
// se calcula lo mismo y, si no coincide, el aviso se rechaza. Sin la clave nadie
// puede fabricar un aviso válido ni cambiar uno en el camino.
//
// Usa Web Crypto (crypto.subtle), que existe igual en Node, en el navegador y en
// las Edge Functions de Supabase (Deno).

const texto = new TextEncoder()

export async function hmacHex(secreto, mensaje) {
  const llave = await crypto.subtle.importKey('raw', texto.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const firma = await crypto.subtle.sign('HMAC', llave, texto.encode(mensaje))
  return [...new Uint8Array(firma)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Compara sin salir antes en la primera diferencia, para no dar pistas por el tiempo de respuesta.
export function igualSeguro(a = '', b = '') {
  if (a.length !== b.length) return false
  let diferencia = 0
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diferencia === 0
}

// "t=1700000000,v1=abc,v1=def" → { t: ['1700000000'], v1: ['abc', 'def'] }
function partes(encabezado = '') {
  const r = {}
  for (const par of encabezado.split(',')) {
    const [k, ...v] = par.trim().split('=')
    if (k && v.length) (r[k] ??= []).push(v.join('='))
  }
  return r
}

const mal = (motivo) => ({ ok: false, motivo })
export const TOLERANCIA_SEGUNDOS = 300 // un aviso con más de 5 minutos se rechaza (evita que reenvíen uno viejo)

// Stripe: encabezado Stripe-Signature = "t=<segundos>,v1=<hmac de `${t}.${cuerpo}`>".
async function verificarStripe(cuerpo, encabezados, secreto, ahora) {
  const p = partes(encabezados['stripe-signature'])
  const t = p.t?.[0]
  if (!t || !p.v1) return mal('sin_firma')
  if (Math.abs(ahora.getTime() / 1000 - Number(t)) > TOLERANCIA_SEGUNDOS) return mal('firma_vencida')
  const esperada = await hmacHex(secreto, `${t}.${cuerpo}`)
  return p.v1.some((v) => igualSeguro(v, esperada)) ? { ok: true } : mal('firma_invalida')
}

// Mercado Pago: x-signature = "ts=<...>,v1=<hmac>" sobre el texto
// "id:<data.id>;request-id:<x-request-id>;ts:<ts>;".
async function verificarMercadoPago(cuerpo, encabezados, secreto) {
  const p = partes(encabezados['x-signature'])
  const ts = p.ts?.[0]
  const v1 = p.v1?.[0]
  if (!ts || !v1) return mal('sin_firma')
  let dataId
  try {
    dataId = String(JSON.parse(cuerpo)?.data?.id ?? '')
  } catch {
    return mal('json_invalido')
  }
  const idFirmado = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId
  const esperada = await hmacHex(secreto, `id:${idFirmado};request-id:${encabezados['x-request-id'] ?? ''};ts:${ts};`)
  return igualSeguro(v1, esperada) ? { ok: true } : mal('firma_invalida')
}

// PayPal no firma con una clave compartida: hay que preguntarle a su API si el aviso es suyo.
// Se conecta en el Sprint 7, junto con las cuentas reales.
export const VERIFICADORES = {
  stripe: verificarStripe,
  mercadopago: verificarMercadoPago,
}

// Lo que hace la pasarela al mandar un aviso; lo usan las pruebas y scripts/simular-webhook.mjs.
export async function firmarStripe(cuerpo, secreto, ahora = new Date()) {
  const t = Math.floor(ahora.getTime() / 1000)
  return { 'stripe-signature': `t=${t},v1=${await hmacHex(secreto, `${t}.${cuerpo}`)}` }
}

export async function firmarMercadoPago(cuerpo, secreto, requestId, ahora = new Date()) {
  const ts = String(ahora.getTime())
  const dataId = String(JSON.parse(cuerpo).data.id).toLowerCase()
  const v1 = await hmacHex(secreto, `id:${dataId};request-id:${requestId};ts:${ts};`)
  return { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': requestId }
}
