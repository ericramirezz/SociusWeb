// Edge Function: el consumidor por separado. Procesa los avisos que quedaron
// pendientes (por ejemplo, los que fallaron y esperan su reintento).
// Se llama con la llave de servicio, a mano o con un cron de Supabase:
//   POST https://<proyecto>.supabase.co/functions/v1/procesar-eventos
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { ColaEventosSupabase, crearServicioServidor, procesarPendientes } from '../_shared/webhooks.js'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Método no permitido', { status: 405 })
  const cliente = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })
  const resumen = await procesarPendientes({
    cola: new ColaEventosSupabase(cliente),
    servicio: crearServicioServidor(cliente),
  })
  return Response.json(resumen)
})
