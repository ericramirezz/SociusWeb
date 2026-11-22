// Edge Function: crea la página de pago de la pasarela para una orden
// (Stripe Checkout o Mercado Pago Checkout Pro).
// URL: https://<proyecto>.supabase.co/functions/v1/crear-pago   (la llama el checkout)
// Cuerpo: { ordenId: 'SOC-100005', origen: 'http://localhost:5173', pasarela: 'stripe' | 'mercadopago' }
// Respuesta: { id, url } → el navegador manda al cliente a `url`.
//
// Se publica con --no-verify-jwt y la sesión se revisa aquí con getUser(): así funciona
// también con las llaves nuevas de Supabase. La orden se lee con la sesión del cliente,
// de modo que la seguridad por fila impide pedir la página de pago de una orden ajena.
// El monto sale de la base, nunca del navegador.
//
// Secretos: STRIPE_SECRET_KEY (sk_test_…), MERCADOPAGO_ACCESS_TOKEN y, para la versión publicada del sitio,
// ORIGENES_PERMITIDOS (lista separada por comas; por defecto solo localhost:5173).
//
// La lógica vive en src/core/pagos/ (paginasDePago.js, con pruebas) y llega aquí
// empaquetada en ../_shared/webhooks.js con `npm run build:funciones`.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { crearPago, RepositorioPedidosSupabase } from '../_shared/webhooks.js'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const responder = (cuerpo: unknown, status: number) => Response.json(cuerpo, { status, headers: CORS })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return responder({ error: 'metodo_no_permitido' }, 405)

  const autorizacion = req.headers.get('Authorization') ?? ''
  const cliente = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: autorizacion } },
    auth: { persistSession: false },
  })
  const { data: sesion, error: errorSesion } = await cliente.auth.getUser(autorizacion.replace(/^Bearer\s+/i, ''))
  if (errorSesion || !sesion?.user) return responder({ error: 'sin_sesion' }, 401)

  const { ordenId, origen, pasarela = 'stripe' } = await req.json().catch(() => ({}))
  const r = await crearPago({
    ordenId,
    origen,
    pasarela,
    repo: new RepositorioPedidosSupabase(cliente),
    llaves: {
      stripe: Deno.env.get('STRIPE_SECRET_KEY'),
      mercadopago: Deno.env.get('MERCADOPAGO_ACCESS_TOKEN'),
    },
    urlsAvisos: { mercadopago: `${Deno.env.get('SUPABASE_URL')}/functions/v1/webhook-pagos/mercadopago` },
    origenesPermitidos: (Deno.env.get('ORIGENES_PERMITIDOS') ?? 'http://localhost:5173').split(','),
  })
  if (r.status !== 200) console.warn('[crear-pago]', pasarela, ordenId, r.cuerpo)
  return responder(r.cuerpo, r.status)
})
