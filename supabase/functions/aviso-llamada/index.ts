// Edge Function: avisa a Socius por correo cuando alguien agenda una llamada.
// La llama un Database Webhook de Supabase (tabla llamadas, evento INSERT) con el
// encabezado x-aviso-secreto. Se publica con --no-verify-jwt: lo que la autentica
// es ese secreto, que se revisa en avisarLlamada().
//
// La lógica vive en src/core/avisos/avisoLlamada.js (pruebas CP-52 a CP-55) y llega
// aquí empaquetada en ../_shared/webhooks.js con `npm run build:funciones`.
//
// Secretos: AVISO_LLAMADA_SECRETO, RESEND_API_KEY y, opcionales,
// AVISO_LLAMADA_PARA (por defecto team@sociusrealestate.com) y AVISO_LLAMADA_DE.
import { avisarLlamada } from '../_shared/webhooks.js'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Método no permitido', { status: 405 })

  const r = await avisarLlamada({
    cuerpo: await req.text(),
    encabezados: Object.fromEntries(req.headers),
    config: {
      secreto: Deno.env.get('AVISO_LLAMADA_SECRETO'),
      llaveResend: Deno.env.get('RESEND_API_KEY'),
      para: Deno.env.get('AVISO_LLAMADA_PARA') ?? 'team@sociusrealestate.com',
      de: Deno.env.get('AVISO_LLAMADA_DE') ?? 'Socius <avisos@correo.sociusrealestate.com>',
    },
  })

  if (r.status >= 400) console.warn('[aviso-llamada]', r.status, r.motivo, r.detalle ?? '')
  return Response.json({ motivo: r.motivo }, { status: r.status === 204 ? 200 : r.status })
})
