import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, AlertTriangle, XCircle, ChevronDown, ShoppingBag, RotateCcw, CreditCard, LogIn } from 'lucide-react'
import Modal from '../components/Modal'
import EstadoBadge from '../components/EstadoBadge'
import { Cargando, EncabezadoPagina } from '../components/Lamina'
import { boton, contenedor } from '../components/estilos'
import { pedidos as servicio, ESTADOS, formatoMoneda } from '../core'
import { useIdioma } from '../i18n/IdiomaContext'
import { useSesion } from '../sesion/SesionContext'

const fechaCorta = (iso, locale) => new Date(iso).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
const fechaHora = (iso, locale) => new Date(iso).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function Dato({ titulo, children }) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-negro/60">{titulo}</p>
      <div className="text-[15px] text-negro">{children}</div>
    </div>
  )
}

function PedidoRow({ pedido, onAccion }) {
  const [expanded, setExpanded] = useState(false)
  const { t, fecha, locale, cobro: detalleCobro } = useIdioma()
  const inactiva = [ESTADOS.CANCELADA, ESTADOS.REEMBOLSADA].includes(pedido.estado)

  return (
    <li className={`border-b border-negro/10 ${expanded ? 'bg-white' : ''}`}>
      <button
        type="button"
        className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-1 py-5 text-left transition-colors hover:bg-white sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:px-4"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className={`font-display tabular-nums text-[15px] font-bold ${inactiva ? 'text-negro/60' : 'text-negro'}`}>{pedido.id}</span>
            <EstadoBadge estado={pedido.estado} />
          </div>
          <p className="mt-1.5 truncate text-sm text-negro/70">{pedido.partidas.map((p) => p.nombre).join(' + ')}</p>
        </div>
        <div className="hidden text-right sm:block">
          <p className={`font-bold tabular-nums ${inactiva ? 'text-negro/60 line-through decoration-negro/30' : 'text-negro'}`}>{formatoMoneda(pedido.totalHoy)} MXN</p>
          <p className="mt-0.5 text-[13px] text-negro/60">{fechaCorta(pedido.fechaOrden, locale)}</p>
        </div>
        <span
          aria-hidden="true"
          className={`flex h-8 w-8 items-center justify-center rounded-md text-negro/60 transition-[transform,background-color] duration-200 ${expanded ? 'rotate-180 bg-lavanda text-violeta' : ''}`}
        >
          <ChevronDown size={18} />
        </span>
      </button>

      {expanded && (
        <div className="px-1 pb-6 animate-aparece sm:px-4">
          <div className="grid gap-8 border-t border-negro/10 pt-6 md:grid-cols-2">
            <div>
              <p className="mb-2 text-[13px] font-medium text-negro/60">{t('pedidos.productos')}</p>
              <ul className="divide-y divide-negro/10 border-y border-negro/10">
                {pedido.partidas.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="text-[15px] font-medium text-negro">{p.nombre}</p>
                      <p className="text-[13px] text-negro/60">{detalleCobro(p.id)}</p>
                    </div>
                    <span className="whitespace-nowrap text-sm font-bold text-negro tabular-nums">{formatoMoneda(p.cobroHoy)}</span>
                  </li>
                ))}
              </ul>

              {/* Seguimiento: la historia de la orden, de la más antigua a la más reciente */}
              <p className="mb-3 mt-8 text-[13px] font-medium text-negro/60">{t('pedidos.seguimiento')}</p>
              <ol className="relative space-y-3 pl-5">
                <span aria-hidden="true" className="absolute bottom-2 left-[3px] top-2 w-px bg-violeta/25" />
                {pedido.historial.map((h, i) => (
                  <li key={i} className="relative text-sm">
                    <span
                      aria-hidden="true"
                      className={`absolute -left-5 top-1.5 h-[7px] w-[7px] ${i === pedido.historial.length - 1 ? 'bg-violeta' : 'border border-violeta/50 bg-white'}`}
                    />
                    <strong className="font-semibold text-negro">{t(`estados.${h.estado}`)}</strong>
                    <span className="ml-2 text-[13px] text-negro/60">{fechaHora(h.fecha, locale)}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="space-y-6">
              {pedido.fechaArranque ? (
                <Dato titulo={t('pedidos.calendario')}>
                  <p className="flex items-center gap-2 font-semibold">
                    <Calendar size={14} aria-hidden="true" className="text-violeta" /> {t('pedidos.arranque')} {fecha(pedido.fechaArranque)}
                  </p>
                  <p className="mt-1 text-[13px] text-negro/70">
                    {t('pedidos.primeraVersion')} {fecha(pedido.fechaEntrega)}
                  </p>
                  <p className="text-[13px] text-negro/70">
                    {t('pedidos.fin')} {fecha(pedido.fechaFin)}
                  </p>
                </Dato>
              ) : pedido.fechaEntrega ? (
                <Dato titulo={t('pedidos.entrega')}>{t('pedidos.accesoDesde', { fecha: fecha(pedido.fechaEntrega) })}</Dato>
              ) : null}
              {pedido.pago && (
                <Dato titulo={t('pedidos.pago')}>
                  <p className="flex items-center gap-2">
                    <CreditCard size={14} aria-hidden="true" className="text-violeta" /> {formatoMoneda(pedido.pago.monto)} MXN {t('pedidos.via')} {pedido.pago.pasarela}
                  </p>
                  <p className="mt-1 break-all font-display tabular-nums text-xs text-negro/60">{pedido.pago.idTransaccion}</p>
                  {pedido.reembolso?.estado === 'solicitado' ? (
                    <p className="mt-2 border-l-2 border-violeta bg-lavanda px-3 py-2 text-[13px] text-negro">
                      {t('pedidos.reembolsoSolicitado', { monto: formatoMoneda(pedido.reembolso.monto) })}
                    </p>
                  ) : pedido.reembolso ? (
                    <p className="mt-2 border-l-2 border-violeta bg-lavanda px-3 py-2 text-[13px] text-negro">
                      {t('pedidos.reembolsado')} {formatoMoneda(pedido.reembolso.monto)} MXN
                    </p>
                  ) : null}
                </Dato>
              )}
              <Dato titulo={t('pedidos.cliente')}>
                <p className="font-medium">{pedido.cliente.nombre}</p>
                <p className="text-[13px] text-negro/70">{pedido.cliente.empresa}</p>
              </Dato>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 border-t border-negro/10 pt-5">
            {pedido.estado === ESTADOS.COTIZADA && (
              <Link to="/cotizador" className={boton.chico}>
                {t('pedidos.volverCotizar')}
              </Link>
            )}
            {servicio.puedeCancelar(pedido) && (
              <button
                onClick={() => onAccion('cancelar', pedido)}
                className="inline-flex items-center gap-2 rounded-md border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white"
              >
                <XCircle size={15} aria-hidden="true" />
                {pedido.pago ? t('pedidos.cancelarReembolsar') : t('pedidos.cancelar')}
              </button>
            )}
            {servicio.puedeDevolver(pedido) && (
              <button
                onClick={() => onAccion('devolver', pedido)}
                className="inline-flex items-center gap-2 rounded-md border border-violeta/40 px-4 py-2.5 text-sm font-semibold text-violeta transition-colors hover:bg-lavanda"
              >
                <RotateCcw size={15} aria-hidden="true" />
                {t('pedidos.devolucion')}
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

// Textos de los diálogos de confirmación (claves en pedidos.modal del diccionario).
const ACCIONES = {
  cancelar: {
    cuerpo: (t, p) => !p.pago
      ? t('pedidos.modal.cancelar.sinPago', { id: p.id })
      : servicio.reembolsoManual(p)
        ? t('pedidos.modal.cancelar.conSolicitud', { id: p.id, monto: formatoMoneda(p.pago.monto) })
        : t('pedidos.modal.cancelar.conPago', { id: p.id, monto: formatoMoneda(p.pago.monto) }),
    ejecutar: (id) => servicio.cancelar(id),
  },
  devolver: {
    cuerpo: (t, p) => servicio.reembolsoManual(p)
      ? t('pedidos.modal.devolver.conSolicitud', { id: p.id, monto: formatoMoneda(p.pago.monto) })
      : t('pedidos.modal.devolver.cuerpo', { id: p.id, monto: formatoMoneda(p.pago.monto) }),
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
      <div className="min-h-screen bg-lavanda px-5 pb-24 pt-32 sm:pt-40">
        <div className="mx-auto max-w-md rounded-md bg-white p-8 text-center">
          <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-lavanda text-violeta">
            <LogIn size={22} aria-hidden="true" />
          </span>
          <h1 className="titular text-2xl text-negro">{t('pedidos.entraTitulo')}</h1>
          <p className="mt-3 leading-relaxed text-negro/70">{t('pedidos.entraTexto')}</p>
          <Link to="/entrar?volver=/pedidos" className={`${boton.primario} mt-7`}>
            {t('nav.entrar')}
          </Link>
        </div>
      </div>
    )
  }

  const filtros = ['todos', ...Object.values(ESTADOS)]
  const pedidosFiltrados = filtro === 'todos' ? pedidos : pedidos.filter((p) => p.estado === filtro)

  return (
    <div className="min-h-screen bg-lavanda/50 pb-24">
      <EncabezadoPagina etiqueta={t('pedidos.etiqueta')} titulo={t('pedidos.titulo')}>
        <Link to="/cotizador" className={`${boton.chico} mt-8`}>
          <ShoppingBag size={15} aria-hidden="true" />
          {t('pedidos.nuevo')}
        </Link>
      </EncabezadoPagina>

      <div className={`${contenedor} mt-12 lg:grid lg:grid-cols-12 lg:gap-x-8`}>
        <div className="lg:col-span-9 lg:col-start-4">
          {/* Filtros por estado: se desplazan de lado en pantallas angostas */}
          <div className="sin-barra -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
              {filtros.map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  aria-pressed={filtro === f}
                  className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200 ${
                    filtro === f ? 'bg-negro text-white' : 'border border-negro/15 bg-white text-negro/80 hover:border-negro/40 hover:text-negro'
                  }`}
                >
                  {f === 'todos' ? t('pedidos.todos') : t(`estados.${f}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8">
            {cargando || cargandoSesion ? (
              <div className="flex justify-center py-20">
                <Cargando etiqueta={t('comun.cargando')} />
              </div>
            ) : errorCarga ? (
              <div className="flex flex-col items-center py-20 text-center" role="alert">
                <AlertTriangle size={28} aria-hidden="true" className="mb-3 text-violeta" />
                <p className="mb-4 font-medium text-negro/80">{t('comun.errorCarga')}</p>
                <button onClick={recargar} className={boton.texto}>
                  {t('comun.reintentar')}
                </button>
              </div>
            ) : pedidosFiltrados.length === 0 ? (
              <div className="flex flex-col items-start border-t border-negro/10 py-16">
                {/* Un lote vacío: la cuadrícula sin bloques */}
                <div aria-hidden="true" className="mb-6 grid w-16 grid-cols-4 gap-1">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <span key={i} className="aspect-square border border-dashed border-violeta/30" />
                  ))}
                </div>
                <p className="text-xl font-bold text-negro">{t('pedidos.sinPedidos')}</p>
                <p className="mt-1 text-negro/70">
                  {filtro === 'todos' ? t('pedidos.aunNo') : t('pedidos.sinEstado', { estado: t(`estados.${filtro}`) })}
                </p>
              </div>
            ) : (
              <ul className="border-t border-negro/10">
                {pedidosFiltrados.map((p) => (
                  <PedidoRow key={p.id} pedido={p} onAccion={(tipo, pedido) => setAccion({ tipo, pedido })} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={Boolean(accion)} onClose={cerrar} title={accion ? t(`pedidos.modal.${accion.tipo}.titulo`) : ''}>
        {accion && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 border-l-2 border-red-600 bg-red-50 p-4">
              <AlertTriangle size={18} aria-hidden="true" className="mt-0.5 flex-shrink-0 text-red-600" />
              <p className="text-sm leading-relaxed text-negro/80">{ACCIONES[accion.tipo].cuerpo(t, accion.pedido)}</p>
            </div>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button onClick={cerrar} disabled={procesando} className={`${boton.secundario} flex-1 py-3 text-sm`}>
                {t('pedidos.mantener')}
              </button>
              <button
                onClick={confirmar}
                disabled={procesando}
                className="inline-flex flex-1 items-center justify-center rounded-md bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {procesando ? t('comun.procesando') : t(`pedidos.modal.${accion.tipo}.confirmar`)}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
