import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Package, Calendar, AlertTriangle, XCircle, ChevronDown, ChevronUp, ShoppingBag, RotateCcw, CreditCard, LogIn, ArrowRight } from 'lucide-react'
import Modal from '../components/Modal'
import EstadoBadge from '../components/EstadoBadge'
import { pedidos as servicio, ESTADOS, formatoMoneda } from '../core'
import { useIdioma } from '../i18n/IdiomaContext'
import { useSesion } from '../sesion/SesionContext'

const fechaCorta = (iso, locale) => new Date(iso).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
const fechaHora = (iso, locale) => new Date(iso).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

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
  const { t, fecha, locale, cobro: detalleCobro } = useIdioma()
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
          <p className="text-slate-500 text-xs mt-0.5">{fechaCorta(pedido.fechaOrden, locale)}</p>
        </div>
        <span className="text-slate-500 ml-2">{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
      </button>

      {expanded && (
        <div className="border-t border-slate-200 p-5 bg-slate-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-5">
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-3">{t('pedidos.productos')}</p>
              <div className="space-y-2">
                {pedido.partidas.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-white border border-slate-200">
                    <div>
                      <p className="text-navy text-sm">{p.nombre}</p>
                      <p className="text-slate-500 text-xs">{detalleCobro(p.id)}</p>
                    </div>
                    <span className="text-brand text-sm font-bold whitespace-nowrap">{formatoMoneda(p.cobroHoy)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {pedido.fechaArranque ? (
                <Dato titulo={t('pedidos.calendario')}>
                  <p className="flex items-center gap-2"><Calendar size={13} className="text-brand" /> {t('pedidos.arranque')} {fecha(pedido.fechaArranque)}</p>
                  <p className="text-slate-600 text-xs mt-1">{t('pedidos.primeraVersion')} {fecha(pedido.fechaEntrega)}</p>
                  <p className="text-slate-600 text-xs">{t('pedidos.fin')} {fecha(pedido.fechaFin)}</p>
                </Dato>
              ) : pedido.fechaEntrega ? (
                <Dato titulo={t('pedidos.entrega')}>{t('pedidos.accesoDesde', { fecha: fecha(pedido.fechaEntrega) })}</Dato>
              ) : null}
              {pedido.pago && (
                <Dato titulo={t('pedidos.pago')}>
                  <p className="flex items-center gap-2"><CreditCard size={13} className="text-brand" /> {formatoMoneda(pedido.pago.monto)} MXN {t('pedidos.via')} {pedido.pago.pasarela}</p>
                  <p className="text-slate-500 text-xs font-mono mt-1 break-all">{pedido.pago.idTransaccion}</p>
                  {pedido.reembolso && <p className="text-amber-800 text-xs mt-1">{t('pedidos.reembolsado')} {formatoMoneda(pedido.reembolso.monto)} MXN</p>}
                </Dato>
              )}
              <Dato titulo={t('pedidos.cliente')}>
                <p>{pedido.cliente.nombre}</p>
                <p className="text-slate-600 text-xs">{pedido.cliente.empresa}</p>
              </Dato>
            </div>
          </div>

          <div className="mb-5">
            <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">{t('pedidos.seguimiento')}</p>
            <ol className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-600">
              {pedido.historial.map((h, i) => (
                <li key={i} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden="true">→</span>}
                  <span><strong className="text-navy">{t(`estados.${h.estado}`)}</strong> · {fechaHora(h.fecha, locale)}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-wrap gap-3">
            {pedido.estado === ESTADOS.COTIZADA && (
              <Link to="/cotizador" className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                {t('pedidos.volverCotizar')}
              </Link>
            )}
            {servicio.puedeCancelar(pedido) && (
              <button onClick={() => onAccion('cancelar', pedido)} className="flex items-center gap-2 text-red-600 hover:bg-red-50 text-sm font-medium border border-red-200 px-4 py-2 rounded-lg transition-colors">
                <XCircle size={15} />
                {pedido.pago ? t('pedidos.cancelarReembolsar') : t('pedidos.cancelar')}
              </button>
            )}
            {servicio.puedeDevolver(pedido) && (
              <button onClick={() => onAccion('devolver', pedido)} className="flex items-center gap-2 text-amber-800 hover:bg-amber-50 text-sm font-medium border border-amber-300 px-4 py-2 rounded-lg transition-colors">
                <RotateCcw size={15} />
                {t('pedidos.devolucion')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Textos de los diálogos de confirmación (claves en pedidos.modal del diccionario).
const ACCIONES = {
  cancelar: {
    cuerpo: (t, p) => p.pago
      ? t('pedidos.modal.cancelar.conPago', { id: p.id, monto: formatoMoneda(p.pago.monto) })
      : t('pedidos.modal.cancelar.sinPago', { id: p.id }),
    ejecutar: (id) => servicio.cancelar(id),
  },
  devolver: {
    cuerpo: (t, p) => t('pedidos.modal.devolver.cuerpo', { id: p.id, monto: formatoMoneda(p.pago.monto) }),
    ejecutar: (id) => servicio.solicitarDevolucion(id),
  },
}

export default function Pedidos() {
  const { t } = useIdioma()
  const [pedidos, setPedidos] = useState([])
  const [accion, setAccion] = useState(null) // { tipo, pedido }
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState(false)

  // Con Supabase activo, los pedidos son de la cuenta: sin sesión no hay qué mostrar.
  const { usuario, disponible: hayCuentas, cargando: cargandoSesion } = useSesion()
  const faltaSesion = hayCuentas && !cargandoSesion && !usuario

  const recargar = useCallback(async () => {
    try {
      setPedidos(await servicio.listar())
      setErrorCarga(false)
    } catch {
      setErrorCarga(true)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    if (cargandoSesion || faltaSesion) return
    recargar()
  }, [recargar, cargandoSesion, faltaSesion, usuario?.id])

  const cerrar = () => {
    if (procesando) return
    setAccion(null)
    setError('')
  }

  const confirmar = async () => {
    setProcesando(true)
    setError('')
    try {
      await ACCIONES[accion.tipo].ejecutar(accion.pedido.id)
      setAccion(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setProcesando(false)
      await recargar()
    }
  }

  if (faltaSesion) {
    return (
      <div className="min-h-screen bg-brand-soft/40 pt-28 pb-20 px-4">
        <div className="max-w-md mx-auto text-center p-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <LogIn size={32} className="mx-auto text-brand mb-4" />
          <h1 className="text-navy font-black text-2xl mb-2">{t('pedidos.entraTitulo')}</h1>
          <p className="text-slate-600 text-sm mb-6">{t('pedidos.entraTexto')}</p>
          <Link
            to="/entrar?volver=/pedidos"
            className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
          >
            {t('nav.entrar')}
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    )
  }

  const filtros = ['todos', ...Object.values(ESTADOS)]
  const pedidosFiltrados = filtro === 'todos' ? pedidos : pedidos.filter((p) => p.estado === filtro)

  return (
    <div className="min-h-screen bg-brand-soft/40 pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
          <div>
            <span className="text-brand text-xs font-semibold uppercase tracking-widest mb-2 block">{t('pedidos.etiqueta')}</span>
            <h1 className="text-4xl font-black text-navy">{t('pedidos.titulo')}</h1>
          </div>
          <Link to="/cotizador" className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold px-5 py-3 rounded-xl text-sm transition-all duration-200">
            <ShoppingBag size={15} />
            {t('pedidos.nuevo')}
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
              {f === 'todos' ? t('pedidos.todos') : t(`estados.${f}`)}
            </button>
          ))}
        </div>

        {cargando || cargandoSesion ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" role="status" aria-label={t('comun.cargando')} />
          </div>
        ) : errorCarga ? (
          <div className="flex flex-col items-center py-20 text-center" role="alert">
            <AlertTriangle size={28} className="text-amber-600 mb-3" />
            <p className="text-slate-700 font-medium mb-4">{t('comun.errorCarga')}</p>
            <button onClick={recargar} className="text-brand text-sm font-semibold hover:text-brand-dark">{t('comun.reintentar')}</button>
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-4">
              <Package size={28} className="text-slate-400" />
            </div>
            <p className="text-slate-700 text-lg font-medium mb-2">{t('pedidos.sinPedidos')}</p>
            <p className="text-slate-500 text-sm">
              {filtro === 'todos' ? t('pedidos.aunNo') : t('pedidos.sinEstado', { estado: t(`estados.${filtro}`) })}
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

      <Modal isOpen={Boolean(accion)} onClose={cerrar} title={accion ? t(`pedidos.modal.${accion.tipo}.titulo`) : ''}>
        {accion && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
              <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-slate-700 text-sm leading-relaxed">{ACCIONES[accion.tipo].cuerpo(t, accion.pedido)}</p>
            </div>
            {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}
            <div className="flex items-center gap-3">
              <button onClick={cerrar} disabled={procesando} className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 hover:text-navy text-sm font-medium transition-colors disabled:opacity-50">
                {t('pedidos.mantener')}
              </button>
              <button onClick={confirmar} disabled={procesando} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-50">
                {procesando ? t('comun.procesando') : t(`pedidos.modal.${accion.tipo}.confirmar`)}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
