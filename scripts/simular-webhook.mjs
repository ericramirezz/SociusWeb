// Manda un aviso de pago FIRMADO a la Edge Function, como lo haría Stripe.
// Sirve para probar todo el camino sin cuentas de las pasarelas.
//
// Uso:
//   node scripts/simular-webhook.mjs --url <URL de webhook-pagos>/stripe --secreto <STRIPE_WEBHOOK_SECRET> \
//        --orden SOC-100003 --monto 7000 [--repetir] [--firma-mala] [--rechazado]
//
//   --repetir    manda el mismo aviso dos veces (la segunda debe responder "duplicado")
//   --firma-mala firma con otro secreto (debe responder 400)
//   --rechazado  manda un pago rechazado en lugar de aprobado
import { firmarStripe } from '../src/core/webhooks/firmas.js'

const args = process.argv.slice(2)
const valor = (n) => {
  const i = args.indexOf(`--${n}`)
  return i >= 0 ? args[i + 1] : undefined
}
const bandera = (n) => args.includes(`--${n}`)

const url = valor('url')
const secreto = valor('secreto')
const orden = valor('orden')
const monto = Number(valor('monto'))
if (!url || !secreto || !orden || !monto) {
  console.error('Faltan datos. Ejemplo:\n  node scripts/simular-webhook.mjs --url https://xxxx.supabase.co/functions/v1/webhook-pagos/stripe --secreto whsec_prueba --orden SOC-100003 --monto 7000')
  process.exit(1)
}

const marca = Date.now()
const cuerpo = JSON.stringify({
  id: `evt_sim_${marca}`,
  type: bandera('rechazado') ? 'payment_intent.payment_failed' : 'payment_intent.succeeded',
  data: { object: { id: `pi_sim_${marca}`, amount: Math.round(monto * 100), currency: 'mxn', metadata: { orden_id: orden } } },
})
const encabezados = await firmarStripe(cuerpo, bandera('firma-mala') ? 'secreto_equivocado' : secreto)

for (let i = 1; i <= (bandera('repetir') ? 2 : 1); i++) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...encabezados }, body: cuerpo })
  console.log(`Envío ${i}: ${r.status}`, await r.text())
}
