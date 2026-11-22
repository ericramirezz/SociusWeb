import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CreditCard, Lock, ArrowRight, AlertCircle, Calendar, CheckCircle, Zap, LogIn, ExternalLink } from 'lucide-react'
import {
  pedidos, seleccion, fabricaPasarelas, config, formatoMoneda,
  TARJETA_APROBADA, TARJETA_RECHAZADA,
} from '../core'
import { useIdioma } from '../i18n/IdiomaContext'
import { useSesion } from '../sesion/SesionContext'

// label y placeholder son claves del diccionario (i18n/es.js, en.js).
const CAMPOS = [
  { name: 'nombre', label: 'comun.nombreCompleto', type: 'text', placeholder: 'comun.tuNombre' },
  { name: 'empresa', label: 'comun.empresa', type: 'text', placeholder: 'checkout.phEmpresa' },
  { name: 'email', label: 'comun.email', type: 'email', placeholder: 'comun.phEmail' },
  { name: 'telefono', label: 'comun.telefono', type: 'tel', placeholder: 'comun.phTelefono' },
]

const tarjetaConEspacios = (n) => n.replace(/(\d{4})(?=\d)/g, '$1 ')

// Tarjetas de prueba de cada pasarela real (las publica cada una en su documentación).
const TARJETAS_PAGINA = { stripe: '4242 4242 4242 4242', mercadopago: '5474 9254 3267 0366' }

export default function Checkout() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { t, fecha, cobro: detalleCobro } = useIdioma()
  const [seleccionados, setSeleccionados] = useState(() => seleccion.leer())
  const [form, setForm] = useState({ nombre: '', empresa: '', email: '', telefono: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [pasarela, setPasarela] = useState(config.pasarelaPorDefecto)
  const [tarjeta, setTarjeta] = useState(TARJETA_APROBADA)
  // Si el pago se rechaza, o el cliente regresa de Stripe sin pagar, se reintenta sobre la misma orden.
  const [ordenId, setOrdenId] = useState(() => params.get('cancelado'))
  const [errorPago, setErrorPago] = useState(() => (params.get('cancelado') ? t('checkout.cancelado') : ''))
  const [fechaPreferida, setFechaPreferida] = useState('') // vacía = la que propone el sistema
  const [ocupacion, setOcupacion] = useState(null) // arranques por día; null mientras carga

  // Con Supabase activo, comprar requiere sesión (la base liga la orden a la cuenta).
  const { usuario, disponible: hayCuentas, cargando: cargandoSesion } = useSesion()
  const faltaSesion = hayCuentas && !cargandoSesion && !usuario

  // Sprint 7: Stripe y Mercado Pago cobran en su propia página; PayPal sigue simulado.
  const paginaExterna = pedidos.usaPaginaDePago(pasarela)
  const nombrePasarela = fabricaPasarelas.crearPasarela(pasarela).etiqueta

  // La fachada cotiza y propone la fecha de entrega según el tipo de producto y el cupo diario.
  const cotizacion = pedidos.cotizar(seleccionados, ocupacion ?? {})
  const propuesta = cotizacion.entregaPropuesta
  const fechaElegida = fechaPreferida || propuesta?.fechaArranque || ''
  // El cliente propone su fecha: se confirma o se sugiere la más cercana.
  const revision = cotizacion.requiereAgenda && fechaElegida ? pedidos.revisarFecha(fechaElegida, ocupacion ?? {}) : null

  useEffect(() => {
    if (seleccionados.length === 0) navigate('/cotizador')
  }, [seleccionados, navigate])

  useEffect(() => {
    let vigente = true
    pedidos.ocupacion().then((o) => vigente && setOcupacion(o)).catch(() => vigente && setOcupacion({}))
    return () => {
      vigente = false
    }
  }, [])

  // Con sesión, el correo de la cuenta se llena solo.
  useEffect(() => {
    if (usuario?.email) setForm((f) => (f.email ? f : { ...f, email: usuario.email }))
  }, [usuario])

  const validate = () => {
    const e = {}
    if (!form.nombre.trim()) e.nombre = t('checkout.nombreRequerido')
    if (!form.empresa.trim()) e.empresa = t('checkout.empresaRequerida')
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = t('comun.emailValido')
    if (!form.telefono.trim()) e.telefono = t('checkout.telefonoRequerido')
    if (!paginaExterna && tarjeta.length !== 16) e.tarjeta = t('checkout.tarjeta16')
    return e
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length > 0) return setErrors(e2)
    setLoading(true)
    setErrorPago('')
    try {
      if (paginaExterna) {
        // La orden queda cotizada y el cliente paga en Stripe; el webhook la confirma.
        const r = await pedidos.iniciarPagoEnPasarela({
          ids: seleccionados, cliente: form, pasarela, ordenId,
          fechaCliente: revision?.fecha, origen: window.location.origin,
        })
        setOrdenId(r.orden.id)
        localStorage.setItem('socius_ultima_orden', r.orden.id)
        window.location.assign(r.url)
        return
      }
      const r = await pedidos.comprar({
        ids: seleccionados, cliente: form, pasarela, tarjeta, ordenId,
        fechaCliente: revision?.fecha,
      })
      if (!r.ok) {
        setOrdenId(r.orden.id)
        setErrorPago(t('checkout.rechazo'))
        return
      }
      seleccion.vaciar()
      localStorage.setItem('socius_ultima_orden', r.orden.id)
      setSeleccionados([])
      navigate('/confirmacion')
    } catch (err) {
      if (err.orden?.id) setOrdenId(err.orden.id)
      setErrorPago(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputClass = (field) =>
    `w-full bg-white border ${errors[field] ? 'border-red-400' : 'border-slate-300'} rounded-lg px-4 py-3 text-navy text-sm placeholder-slate-400 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-all duration-200`
  const labelClass = 'text-slate-600 text-xs uppercase tracking-wider mb-2 block'
  const cardClass = 'p-6 rounded-2xl border border-slate-200 bg-white shadow-sm'

  if (faltaSesion) {
    return (
      <div className="min-h-screen bg-brand-soft/40 pt-28 pb-20 px-4">
        <div className={`${cardClass} max-w-md mx-auto text-center`}>
          <LogIn size={32} className="mx-auto text-brand mb-4" />
          <h1 className="text-navy font-black text-2xl mb-2">{t('checkout.entraTitulo')}</h1>
          <p className="text-slate-600 text-sm mb-6">{t('checkout.entraTexto')}</p>
          <Link
            to="/entrar?volver=/checkout"
            className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
          >
            {t('nav.entrar')}
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    )
  }

  if (ocupacion === null || cargandoSesion) {
    return (
      <div className="min-h-screen bg-brand-soft/40 pt-28 pb-20 px-4 flex justify-center">
        <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" role="status" aria-label={t('comun.cargando')} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-soft/40 pt-24 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <span className="text-brand text-xs font-semibold uppercase tracking-widest mb-2 block">Checkout</span>
          <h1 className="text-4xl font-black text-navy">{t('checkout.titulo')}</h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-1">
            <form onSubmit={handleSubmit} className="space-y-8" noValidate>
              {/* Contacto */}
              <div className={cardClass}>
                <h2 className="text-navy font-bold text-lg mb-5">{t('checkout.contacto')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {CAMPOS.map(({ label, placeholder, ...c }) => (
                    <div key={c.name}>
                      <label htmlFor={c.name} className={labelClass}>{t(label)}</label>
                      <input id={c.name} {...c} placeholder={t(placeholder)} value={form[c.name]} onChange={handleChange} className={inputClass(c.name)} />
                      {errors[c.name] && <p className="text-red-600 text-xs mt-1">{errors[c.name]}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Entrega / agenda */}
              <div className={cardClass}>
                <h2 className="text-navy font-bold text-lg mb-2 flex items-center gap-2">
                  <Calendar size={18} className="text-brand" />
                  {t('checkout.entrega')}
                </h2>
                {cotizacion.partidas.some((x) => !x.producto.requiereAgenda) && (
                  <p className="flex items-center gap-2 text-slate-700 text-sm mb-3">
                    <Zap size={14} className="text-brand" />
                    {t('checkout.digitalInmediato')}
                  </p>
                )}
                {cotizacion.requiereAgenda && (
                  <>
                    <p className="text-slate-600 text-sm mb-5">
                      {t('checkout.fechaSistema')} <span className="text-brand font-semibold">{fecha(propuesta.fechaArranque)}</span>.
                      {' '}{t('checkout.siPrefieres')}
                    </p>
                    <label htmlFor="fecha" className={labelClass}>{t('checkout.tuFecha')}</label>
                    <input
                      id="fecha"
                      type="date"
                      value={fechaElegida}
                      onChange={(e) => setFechaPreferida(e.target.value)}
                      min={propuesta.fechaArranque}
                      className={inputClass('fecha')}
                    />
                    {revision && (
                      <div className={`mt-3 p-3 rounded-lg border text-sm flex items-start gap-2 ${
                        revision.confirmada ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}>
                        {revision.confirmada ? <CheckCircle size={15} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />}
                        <span>
                          {revision.confirmada
                            ? <>{t('checkout.disponible')} <strong>{fecha(revision.fecha)}</strong>.</>
                            : <>{t(`fechaArranque.${revision.codigo}`, { dias: config.diasHabilesMinimosArranque })}. {t('checkout.masCercana')} <strong>{fecha(revision.fecha)}</strong> {t('checkout.seAgendara')}</>}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Pago */}
              <div className={cardClass}>
                <h2 className="text-navy font-bold text-lg mb-2 flex items-center gap-2">
                  <CreditCard size={18} className="text-brand" />
                  {t('checkout.pago')}
                </h2>
                <p className="mb-5 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertCircle size={13} className="flex-shrink-0" />
                  {paginaExterna ? t('checkout.modoPruebaExterno', { pasarela: nombrePasarela }) : t('checkout.modoPrueba')}
                </p>

                <p className={labelClass}>{t('checkout.pagarCon')}</p>
                <div className="grid grid-cols-3 gap-3 mb-5" role="radiogroup" aria-label={t('checkout.pasarela')}>
                  {fabricaPasarelas.disponibles().map((p) => (
                    <button
                      key={p.tipo}
                      type="button"
                      role="radio"
                      aria-checked={pasarela === p.tipo}
                      onClick={() => setPasarela(p.tipo)}
                      className={`py-3 rounded-lg border text-sm font-semibold transition-all duration-200 ${
                        pasarela === p.tipo ? 'border-brand bg-brand text-white' : 'border-slate-300 text-slate-700 hover:border-brand hover:text-brand'
                      }`}
                    >
                      {p.etiqueta}
                    </button>
                  ))}
                </div>

                {paginaExterna ? (
                  <div className="p-4 rounded-lg bg-brand-soft border border-brand/15 text-sm text-slate-700">
                    <p className="flex items-center gap-2 text-navy font-semibold mb-1">
                      <ExternalLink size={14} className="text-brand" />
                      {t('checkout.paginaExterna', { pasarela: nombrePasarela })}
                    </p>
                    <p className="text-slate-600 text-xs">
                      {t('checkout.tarjetaExterna')} <span className="font-mono">{TARJETAS_PAGINA[pasarela]}</span> · {t(`checkout.datosPrueba.${pasarela}`)}
                    </p>
                  </div>
                ) : (
                  <>
                    <label htmlFor="tarjeta" className={labelClass}>{t('checkout.numeroTarjeta')}</label>
                    <input
                      id="tarjeta"
                      inputMode="numeric"
                      autoComplete="off"
                      value={tarjetaConEspacios(tarjeta)}
                      onChange={(e) => setTarjeta(e.target.value.replace(/\D/g, '').slice(0, 16))}
                      className={`${inputClass('tarjeta')} font-mono`}
                    />
                    {errors.tarjeta && <p className="text-red-600 text-xs mt-1">{errors.tarjeta}</p>}
                    <p className="text-slate-500 text-xs mt-2">
                      {t('checkout.tarjetasPrueba')}{' '}
                      <button type="button" onClick={() => setTarjeta(TARJETA_APROBADA)} className="text-brand font-medium underline">{t('checkout.aprobada')}</button>
                      {' · '}
                      <button type="button" onClick={() => setTarjeta(TARJETA_RECHAZADA)} className="text-brand font-medium underline">{t('checkout.rechazada')}</button>
                    </p>
                  </>
                )}

                {errorPago && (
                  <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2" role="alert">
                    <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                    {errorPago}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || seleccionados.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-base transition-all duration-200"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    {t('checkout.procesandoPago')}
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    {paginaExterna ? t('checkout.pagarEn', { pasarela: nombrePasarela }) : t('checkout.pagar')} {formatoMoneda(cotizacion.totalHoy)} MXN
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Resumen */}
          <div className="lg:w-80 xl:w-96">
            <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200">
                <h2 className="text-navy font-bold">{t('checkout.resumen')}</h2>
              </div>
              <div className="p-5 space-y-3">
                {cotizacion.partidas.map(({ producto: p, cobro }) => (
                  <div key={p.id} className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-navy text-sm font-medium">{p.nombre}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{t(`tipo.${p.tipo}`)} · {detalleCobro(p.id)}</p>
                    </div>
                    <span className="text-slate-700 text-sm font-medium whitespace-nowrap">{formatoMoneda(cobro.hoy)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-600 text-sm">{t('cotizador.valorTotal')}</span>
                  <span className="text-slate-700 text-sm">{formatoMoneda(cotizacion.totalContrato)} MXN</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <span className="text-navy font-bold">{t('cotizador.aPagarHoy')}</span>
                  <span className="text-brand font-black text-lg">{formatoMoneda(cotizacion.totalHoy)} MXN</span>
                </div>
              </div>
              <div className="px-5 pb-5">
                <p className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-xs leading-relaxed">
                  {t('checkout.notaPublicidad')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
