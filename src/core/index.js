// Composición de la aplicación: aquí (y solo aquí) se crean las instancias
// reales y se conectan entre sí. Las pantallas importan `pedidos`, `agenda` y `bus`.
import { programas } from '../data/programas'
import { AgendaLlamadas } from './agendaLlamadas'
import { ConfigApp } from './config'
import { BusEventos, EVENTOS } from './eventos'
import { FabricaPasarelas } from './pagos/fabricaPasarelas'
import { RepositorioLocalStorage } from './repositorio'
import { ServicioPedidos } from './servicioPedidos'

export const config = ConfigApp.obtener()
export const bus = new BusEventos()
export const fabricaPasarelas = new FabricaPasarelas()

export const pedidos = new ServicioPedidos({
  repoPedidos: new RepositorioLocalStorage('socius_pedidos_v2'),
  fabricaPasarelas,
  bus,
  config,
  catalogo: programas,
})

export const agenda = new AgendaLlamadas({ repoLlamadas: new RepositorioLocalStorage('socius_llamadas'), bus })

// Observador de bitácora: escucha TODOS los eventos. Aquí se conectarían después
// el correo de confirmación, la factura o el webhook al CRM de Socius.
bus.suscribir('*', (datos, evento) => console.info(`[evento] ${evento}`, datos?.id ?? datos?.orden?.id ?? ''))

export { EVENTOS }
export { ESTADOS, ETIQUETAS } from './estadoOrden'
export { seleccion } from './seleccion'
export { formatoLargo, formatoMoneda, aISO } from './fechas'
export { TARJETA_APROBADA, TARJETA_RECHAZADA } from './pagos/sdkSimulados'
