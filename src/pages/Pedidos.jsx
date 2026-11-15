import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Package, Calendar, AlertTriangle, XCircle, ChevronDown, ChevronUp, ShoppingBag, RotateCcw, CreditCard } from 'lucide-react'
import Modal from '../components/Modal'
import EstadoBadge from '../components/EstadoBadge'
import { pedidos as servicio, ESTADOS, ETIQUETAS, formatoLargo, formatoMoneda } from '../core'

const fechaCorta = (iso) => new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
const fechaHora = (iso) => new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function Dato({ titulo, children }) {
  return (
    <div>
      <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">{titulo}</p>
      <div className="text-navy text-sm">{children}</div>
    </div>
  )
}

function PedidoRow({ pedido, onAccion }) {
  const [expanded, setExpanded] = useState(false)
  const inactiva = [ESTADOS.CANCELADA, ESTADOS.REEMBOLSADA].includes(pedido.estado)

  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden ${inactiva ? 'opacity-75' : ''}`}>
      <button
        type="button"
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
          <Package size={18} className="text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
            <span className="text-brand font-mono font-bold text-sm">{pedido.id}</span>
            <EstadoBadge estado={pedido.estado} />
          </div>
          <p className="text-slate-600 text-xs truncate">{pedido.partidas.map((p) => p.nombre).join(' + ')}</p>
        </div>
        <div className="hidden sm:block text-right">
          <p className="text-navy font-bold">{formatoMoneda(pedido.totalHoy)} MXN</p>
          <p className="text-slate-500 text-xs mt-0.5">{fechaCorta(pedido.fechaOrden)}</p>
        </div>
        <span className="text-slate-500 ml-2">{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
      </button>

      {expanded && (
        <div className="border-t border-slate-200 p-5 bg-slate-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-5">
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-3">Productos y servicios</p>
              <div className="space-y-2">
                {pedido.partidas.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-white border border-slate-200">
                    <div>
                      <p className="text-navy text-sm">{p.nombre}</p>
                      <p className="text-slate-500 text-xs">{p.detalleCobro}</p>
                    </div>
                    <span className="text-brand text-sm font-bold whitespace-nowrap">{formatoMoneda(p.cobroHoy)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {pedido.fechaArranque ? (
                <Dato titulo="Calendario del servicio">
                  <p className="flex items-center gap-2"><Calendar size={13} className="text-brand" /> Arranque: {formatoLargo(pedido.fechaArranque)}</p>
                  <p className="text-slate-600 text-xs mt-1">Primera versión operando: {formatoLargo(pedido.fechaEntrega)}</p>
                  <p className="text-slate-600 text-xs">Fin del programa: {formatoLargo(pedido.fechaFin)}</p>
                </Dato>
              ) : pedido.fechaEntrega ? (
                <Dato titulo="Entrega">Acceso inmediato desde el {formatoLargo(pedido.fechaEntrega)}</Dato>
              ) : null}
              {pedido.pago && (
                <Dato titulo="Pago">
                  <p className="flex items-center gap-2"><CreditCard size={13} className="text-brand" /> {formatoMoneda(pedido.pago.monto)} MXN vía {pedido.pago.pasarela}</p>
                  <p className="text-slate-500 text-xs font-mono mt-1 break-all">{pedido.pago.idTransaccion}</p>
                  {pedido.reembolso && <p className="text-amber-800 text-xs mt-1">Reembolsado: {formatoMoneda(pedido.reembolso.monto)} MXN</p>}
                </Dato>
              )}
              <Dato titulo="Cliente">
                <p>{pedido.cliente.nombre}</p>
                <p className="text-slate-600 text-xs">{pedido.cliente.empresa}</p>
              </Dato>
            </div>
          </div>

          <div className="mb-5">
            <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">Seguimiento</p>
            <ol className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-600">
              {pedido.historial.map((h, i) => (
                <li key={i} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden="true">→</span>}
                  <span><strong className="text-navy">{ETIQUETAS[h.estado]}</strong> · {fechaHora(h.fecha)}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-wrap gap-3">
            {pedido.estado === ESTADOS.COTIZADA && (
              <Link to="/cotizador" className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                Volver a cotizar
              </Link>
            )}
            {servicio.puedeCancelar(pedido) && (
              <button onClick={() => onAccion('cancelar', pedido)} className="flex items-center gap-2 text-red-600 hover:bg-red-50 text-sm font-medium border border-red-200 px-4 py-2 rounded-lg transition-colors">
                <XCircle size={15} />
                {pedido.pago ? 'Cancelar pedido y reembolsar' : 'Cancelar pedido'}
              </button>
            )}
            {servicio.puedeDevolver(pedido) && (
              <button onClick={() => onAccion('devolver', pedido)} className="flex items-center gap-2 text-amber-800 hover:bg-amber-50 text-sm font-medium border border-amber-300 px-4 py-2 rounded-lg transition-colors">
                <RotateCcw size={15} />
                Solicitar devolución
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const TEXTOS = {
  cancelar: {
    titulo: 'Confirmar cancelación',
    cuerpo: (p) => p.pago
      ? `Se cancelará el pedido ${p.id}, se liberará su fecha de arranque y se reembolsarán ${formatoMoneda(p.pago.monto)} MXN al medio de pago original.`
      : `Se cancelará el pedido ${p.id}. No tiene ningún pago registrado.`,
    confirmar: 'Sí, cancelar',
    ejecutar: (id) => servicio.cancelar(id),
  },
  devolver: {
    titulo: 'Solicitar devolución',
    cuerpo: (p) => `Se registrará la devolución del pedido ${p.id} y se reembolsarán ${formatoMoneda(p.pago.monto)} MXN. Las condiciones (plazos y montos) las define Socius.`,
    confirmar: 'Sí, solicitar devolución',
    ejecutar: (id) => servicio.solicitarDevolucion(id),
  },
}

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([])
  const [accion, setAccion] = useState(null) // { tipo, pedido }
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState('todos')

  const recargar = useCallback(() => setPedidos(servicio.listar()), [])
  useEffect(recargar, [recargar])

  const cerrar = () => {
    if (procesando) return
    setAccion(null)
    setError('')
  }

  const confirmar = async () => {
    setProcesando(true)
    setError('')
    try {
      await TEXTOS[accion.tipo].ejecutar(accion.pedido.id)
      setAccion(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setProcesando(false)
      recargar()
    }
  }

  const filtros = ['todos', ...Object.values(ESTADOS)]
  const pedidosFiltrados = filtro === 'todos' ? pedidos : pedidos.filter((p) => p.estado === filtro)

  return (
    <div className="min-h-screen bg-brand-soft/40 pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
          <div>
            <span className="text-brand text-xs font-semibold uppercase tracking-widest mb-2 block">Mi cuenta</span>
            <h1 className="text-4xl font-black text-navy">Mis Pedidos</h1>
          </div>
          <Link to="/cotizador" className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold px-5 py-3 rounded-xl text-sm transition-all duration-200">
            <ShoppingBag size={15} />
            Nuevo pedido
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          {filtros.map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                filtro === f ? 'bg-brand text-white' : 'bg-white border border-slate-300 text-slate-700 hover:border-brand hover:text-brand'
              }`}
            >
              {f === 'todos' ? 'Todos' : ETIQUETAS[f]}
            </button>
          ))}
        </div>

        {pedidosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-4">
              <Package size={28} className="text-slate-400" />
            </div>
            <p className="text-slate-700 text-lg font-medium mb-2">No hay pedidos</p>
            <p className="text-slate-500 text-sm">
              {filtro === 'todos' ? 'Aún no has realizado ningún pedido.' : `No tienes pedidos en estado "${ETIQUETAS[filtro]}".`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pedidosFiltrados.map((p) => (
              <PedidoRow key={p.id} pedido={p} onAccion={(tipo, pedido) => setAccion({ tipo, pedido })} />
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={Boolean(accion)} onClose={cerrar} title={accion ? TEXTOS[accion.tipo].titulo : ''}>
        {accion && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
              <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-slate-700 text-sm leading-relaxed">{TEXTOS[accion.tipo].cuerpo(accion.pedido)}</p>
            </div>
            {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}
            <div className="flex items-center gap-3">
              <button onClick={cerrar} disabled={procesando} className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 hover:text-navy text-sm font-medium transition-colors disabled:opacity-50">
                No, mantener pedido
              </button>
              <button onClick={confirmar} disabled={procesando} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-50">
                {procesando ? 'Procesando…' : TEXTOS[accion.tipo].confirmar}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
