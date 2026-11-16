// Composición de la aplicación: aquí (y solo aquí) se crean las instancias
// reales y se conectan entre sí. Las pantallas importan `pedidos`, `agenda`, `sesion` y `bus`.
// Con Supabase configurado (.env.local) los datos viven en la base; sin él, en el navegador.
import { programas } from '../data/programas'
import { AgendaLlamadas } from './agendaLlamadas'
import { ConfigApp } from './config'
import { BusEventos, EVENTOS } from './eventos'
import { FabricaPasarelas } from './pagos/fabricaPasarelas'
import { RepositorioLocalStorage } from './repositorio'
import { RepositorioLlamadasSupabase, RepositorioPedidosSupabase } from './repositorioSupabase'
import { ServicioPedidos } from './servicioPedidos'
import { ServicioSesion } from './sesion'
import { supabase } from './supabase'

export const config = ConfigApp.obtener()
export const bus = new BusEventos()
export const fabricaPasarelas = new FabricaPasarelas()

const repoPedidos = supabase ? new RepositorioPedidosSupabase(supabase) : new RepositorioLocalStorage('socius_pedidos_v2')
const repoLlamadas = supabase ? new RepositorioLlamadasSupabase(supabase) : new RepositorioLocalStorage('socius_llamadas')

export const usaSupabase = Boolean(supabase)

export const pedidos = new ServicioPedidos({
  repoPedidos,
  fabricaPasarelas,
  bus,
  config,
  catalogo: programas,
  fuenteOcupacion: supabase ? (desde) => repoPedidos.arranquesPorDia(desde) : null,
})

export const sesion = new ServicioSesion({ cliente: supabase })

export const agenda = new AgendaLlamadas({
  repoLlamadas,
  bus,
  fuenteOcupados: supabase ? (desde, hasta) => repoLlamadas.ocupados(desde, hasta) : null,
})

// Observador de bitácora: escucha TODOS los eventos. Aquí se conectarían después
// el correo de confirmación, la factura o el webhook al CRM de Socius.
bus.suscribir('*', (datos, evento) => console.info(`[evento] ${evento}`, datos?.id ?? datos?.orden?.id ?? ''))

export { EVENTOS }
export { ESTADOS, ETIQUETAS } from './estadoOrden'
export { seleccion } from './seleccion'
export { ERRORES_SESION } from './sesion'
export { HORARIO_OCUPADO } from './agendaLlamadas'
export { formatoLargo, formatoMoneda, aISO } from './fechas'
export { TARJETA_APROBADA, TARJETA_RECHAZADA } from './pagos/sdkSimulados'
