// Edge Function: el consumidor por separado. Procesa los avisos que quedaron
// pendientes (por ejemplo, los que fallaron y esperan su reintento).
// Se llama con la llave de servicio, a mano o con un cron de Supabase:
//   POST https://<proyecto>.supabase.co/functions/v1/procesar-eventos
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { ColaEventosSupabase, capturarOrdenPayPal, consultarPagoMercadoPago, crearServicioServidor, procesarPendientes } from '../_shared/webhooks.js'

const consultores = {
  mercadopago: (idPago: string) => consultarPagoMercadoPago(idPago, { llaveSecreta: Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') }),
  // PayPal: la orden aprobada se captura (se cobra) y se lee el resultado.
  paypal: (idOrden: string) => capturarOrdenPayPal(idOrden, { credenciales: { clientId: Deno.env.get('PAYPAL_CLIENT_ID'), secreto: Deno.env.get('PAYPAL_CLIENT_SECRET') } }),
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Método no permitido', { status: 405 })
  const cliente = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })
  const resumen = await procesarPendientes({
    cola: new ColaEventosSupabase(cliente),
    servicio: crearServicioServidor(cliente),
    consultores,
  })
  return Response.json(resumen)
})
