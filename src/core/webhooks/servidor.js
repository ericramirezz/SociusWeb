// Todo lo que necesitan las Edge Functions de supabase/functions/
// (webhook-pagos, procesar-eventos y crear-pago).
// `npm run build:funciones` empaqueta este archivo (y lo que importa) en
// supabase/functions/_shared/webhooks.js, porque Supabase solo publica lo que
// está dentro de supabase/functions.
import { ConfigApp } from '../config'
import { BusEventos } from '../eventos'
import { RepositorioPedidosSupabase } from '../repositorioSupabase'
import { ServicioPedidos } from '../servicioPedidos'
import { programas } from '../../data/programas'

export { recibirWebhook } from './receptor'
export { procesarPendientes } from './procesador'
export { ColaEventosSupabase } from './colaEventos'
export { crearPago } from '../pagos/paginasDePago'
export { consultarPagoMercadoPago } from '../pagos/checkoutMercadoPago'
export { capturarOrdenPayPal } from '../pagos/checkoutPayPal'
export { RepositorioPedidosSupabase }

// El mismo ServicioPedidos de la app, pero con el cliente de Supabase del servidor
// (llave de servicio). No cobra nada: solo aplica pagos ya confirmados.
export function crearServicioServidor(cliente) {
  const repo = new RepositorioPedidosSupabase(cliente)
  return new ServicioPedidos({
    repoPedidos: repo,
    fabricaPasarelas: null,
    bus: new BusEventos(),
    config: ConfigApp.obtener(),
    catalogo: programas,
    fuenteOcupacion: (desde) => repo.arranquesPorDia(desde),
  })
}
