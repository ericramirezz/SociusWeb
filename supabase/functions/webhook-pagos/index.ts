// Edge Function: recibe los avisos de las pasarelas (webhooks).
// URL: https://<proyecto>.supabase.co/functions/v1/webhook-pagos/<pasarela>
//      (<pasarela> = stripe o mercadopago)
// Se publica con --no-verify-jwt: la pasarela no tiene sesión de Supabase; lo que
// la autentica es la firma del aviso, que se revisa en recibirWebhook().
//
// La lógica vive en src/core/webhooks/ (con pruebas CP-37 a CP-41) y llega aquí
// empaquetada en ../_shared/webhooks.js con `npm run build:funciones`.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { ColaEventosSupabase, consultarPagoMercadoPago, crearServicioServidor, procesarPendientes, recibirWebhook } from '../_shared/webhooks.js'

// Mercado Pago solo avisa "cambió el pago X": el consumidor le pregunta a su API.
const consultores = {
  mercadopago: (idPago: string) => consultarPagoMercadoPago(idPago, { llaveSecreta: Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') }),
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Método no permitido', { status: 405 })

  const pasarela = new URL(req.url).pathname.split('/').filter(Boolean).pop()
  const cuerpo = await req.text() // el texto tal cual llegó: la firma se calcula sobre él
  const cliente = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })
  const cola = new ColaEventosSupabase(cliente)

  const r = await recibirWebhook({
    pasarela,
    cuerpo,
    encabezados: Object.fromEntries(req.headers),
    secretos: {
      stripe: Deno.env.get('STRIPE_WEBHOOK_SECRET'),
      mercadopago: Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET'),
    },
    cola,
  })

  // Se responde ya; el consumidor corre después en segundo plano.
  if (r.status === 200) {
    EdgeRuntime.waitUntil(
      procesarPendientes({ cola, servicio: crearServicioServidor(cliente), consultores }).catch((e) => console.error('[webhook] al procesar', e)),
    )
  }
  if (r.status !== 200) console.warn('[webhook] rechazado', pasarela, r.motivo)
  return Response.json({ motivo: r.motivo }, { status: r.status })
})
