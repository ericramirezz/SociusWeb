import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, AlertCircle, CheckCircle, Zap, LogIn, ExternalLink } from 'lucide-react'
import {
  pedidos, seleccion, fabricaPasarelas, config, formatoMoneda,
  TARJETA_APROBADA, TARJETA_RECHAZADA,
} from '../core'
import { useIdioma } from '../i18n/IdiomaContext'
import { useSesion } from '../sesion/SesionContext'
import { Cargando, EncabezadoPagina, Paso } from '../components/Lamina'
import { boton, campo, contenedor, errorCampo, etiquetaCampo } from '../components/estilos'

// label y placeholder son claves del diccionario (i18n/es.js, en.js).
const CAMPOS = [
  { name: 'nombre', label: 'comun.nombreCompleto', type: 'text', placeholder: 'comun.tuNombre', autoComplete: 'name' },
  { name: 'empresa', label: 'comun.empresa', type: 'text', placeholder: 'checkout.phEmpresa', autoComplete: 'organization' },
  { name: 'email', label: 'comun.email', type: 'email', placeholder: 'comun.phEmail', autoComplete: 'email' },
  { name: 'telefono', label: 'comun.telefono', type: 'tel', placeholder: 'comun.phTelefono', autoComplete: 'tel' },
]

const tarjetaConEspacios = (n) => n.replace(/(\d{4})(?=\d)/g, '$1 ')

// Tarjetas de prueba de cada pasarela real (las publica cada una en su documentación).
// PayPal no lleva tarjeta: se paga entrando con la cuenta personal de prueba (sandbox).
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

  // Sprint 7: Stripe, Mercado Pago y PayPal cobran en su propia página (si están conectadas).
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

  if (faltaSesion) {
    return (
      <div className="min-h-screen bg-lavanda px-5 pb-24 pt-32 sm:pt-40">
        <div className="mx-auto max-w-md rounded-md bg-white p-8 text-center">
          <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-lavanda text-violeta">
            <LogIn size={22} aria-hidden="true" />
          </span>
          <h1 className="titular text-2xl text-negro">{t('checkout.entraTitulo')}</h1>
          <p className="mt-3 leading-relaxed text-negro/70">{t('checkout.entraTexto')}</p>
          <Link to="/entrar?volver=/checkout" className={`${boton.primario} mt-7`}>
            {t('nav.entrar')}
          </Link>
        </div>
      </div>
    )
  }

  if (ocupacion === null || cargandoSesion) {
    return (
      <div className="flex min-h-screen justify-center bg-white px-5 pb-24 pt-40">
        <Cargando etiqueta={t('comun.cargando')} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      <EncabezadoPagina etiqueta="Checkout" titulo={t('checkout.titulo')} />

      <div className={`${contenedor} mt-14 grid gap-12 lg:grid-cols-12 lg:gap-x-8`}>
        <form onSubmit={handleSubmit} className="space-y-12 lg:col-span-7" noValidate>
          {/* 1. Contacto */}
          <Paso numero={1} titulo={t('checkout.contacto')}>
            <div className="grid gap-5 sm:grid-cols-2">
              {CAMPOS.map(({ label, placeholder, ...c }) => (
                <div key={c.name}>
                  <label htmlFor={c.name} className={etiquetaCampo}>
                    {t(label)}
                  </label>
                  <input
                    id={c.name}
                    {...c}
                    placeholder={t(placeholder)}
                    value={form[c.name]}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors[c.name])}
                    className={campo(errors[c.name])}
                  />
                  {errors[c.name] && <p className={errorCampo}>{errors[c.name]}</p>}
                </div>
              ))}
            </div>
          </Paso>

          {/* 2. Entrega / agenda */}
          <Paso numero={2} titulo={t('checkout.entrega')}>
            {cotizacion.partidas.some((x) => !x.producto.requiereAgenda) && (
              <p className="mb-4 flex items-center gap-2 text-[15px] text-negro/80">
                <Zap size={15} aria-hidden="true" className="text-violeta" />
                {t('checkout.digitalInmediato')}
              </p>
            )}
            {cotizacion.requiereAgenda && (
              <>
                <p className="mb-5 text-[15px] leading-relaxed text-negro/70">
                  {t('checkout.fechaSistema')} <span className="font-semibold text-negro">{fecha(propuesta.fechaArranque)}</span>.
                  {' '}{t('checkout.siPrefieres')}
                </p>
                <label htmlFor="fecha" className={etiquetaCampo}>
                  {t('checkout.tuFecha')}
                </label>
                <input
                  id="fecha"
                  type="date"
                  value={fechaElegida}
                  onChange={(e) => setFechaPreferida(e.target.value)}
                  min={propuesta.fechaArranque}
                  className={`${campo(false)} sm:max-w-xs`}
                />
                {revision && (
                  <div
                    className={`mt-4 flex items-start gap-2.5 border-l-2 px-4 py-3 text-sm leading-relaxed ${
                      revision.confirmada ? 'border-violeta bg-lavanda text-negro' : 'border-cian bg-cian/10 text-negro'
                    }`}
                  >
                    {revision.confirmada ? (
                      <CheckCircle size={16} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle size={16} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
                    )}
                    <span>
                      {revision.confirmada ? (
                        <>
                          {t('checkout.disponible')} <strong>{fecha(revision.fecha)}</strong>.
                        </>
                      ) : (
                        <>
                          {t(`fechaArranque.${revision.codigo}`, { dias: config.diasHabilesMinimosArranque })}. {t('checkout.masCercana')}{' '}
                          <strong>{fecha(revision.fecha)}</strong> {t('checkout.seAgendara')}
                        </>
                      )}
                    </span>
                  </div>
                )}
              </>
            )}
          </Paso>

          {/* 3. Pago */}
          <Paso numero={3} titulo={t('checkout.pago')}>
            <p className="mb-6 flex items-start gap-2 border-l-2 border-violeta bg-lavanda px-4 py-2.5 text-[13px] leading-relaxed text-negro">
              <AlertCircle size={14} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
              {paginaExterna ? t('checkout.modoPruebaExterno', { pasarela: nombrePasarela }) : t('checkout.modoPrueba')}
            </p>

            <p className={etiquetaCampo}>{t('checkout.pagarCon')}</p>
            <div className="mb-6 grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('checkout.pasarela')}>
              {fabricaPasarelas.disponibles().map((p) => {
                const activa = pasarela === p.tipo
                return (
                  <button
                    key={p.tipo}
                    type="button"
                    role="radio"
                    aria-checked={activa}
                    onClick={() => setPasarela(p.tipo)}
                    className={`rounded-md border px-2 py-3.5 text-sm font-semibold transition-colors duration-200 ${
                      activa ? 'border-violeta bg-lavanda text-violeta ring-1 ring-violeta' : 'border-negro/20 text-negro/80 hover:border-violeta hover:text-violeta'
                    }`}
                  >
                    {p.etiqueta}
                  </button>
                )
              })}
            </div>

            {paginaExterna ? (
              <div className="rounded-md bg-lavanda p-4 text-sm text-negro/80">
                <p className="mb-1 flex items-center gap-2 font-semibold text-negro">
                  <ExternalLink size={14} aria-hidden="true" className="text-violeta" />
                  {t('checkout.paginaExterna', { pasarela: nombrePasarela })}
                </p>
                <p className="text-[13px] leading-relaxed text-negro/70">
                  {TARJETAS_PAGINA[pasarela] && (
                    <>
                      {t('checkout.tarjetaExterna')} <span className="font-display tabular-nums">{TARJETAS_PAGINA[pasarela]}</span> ·{' '}
                    </>
                  )}
                  {t(`checkout.datosPrueba.${pasarela}`)}
                </p>
              </div>
            ) : (
              <>
                <label htmlFor="tarjeta" className={etiquetaCampo}>
                  {t('checkout.numeroTarjeta')}
                </label>
                <input
                  id="tarjeta"
                  inputMode="numeric"
                  autoComplete="off"
                  value={tarjetaConEspacios(tarjeta)}
                  onChange={(e) => setTarjeta(e.target.value.replace(/\D/g, '').slice(0, 16))}
                  aria-invalid={Boolean(errors.tarjeta)}
                  className={`${campo(errors.tarjeta)} font-display tabular-nums tracking-wider`}
                />
                {errors.tarjeta && <p className={errorCampo}>{errors.tarjeta}</p>}
                <p className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-negro/60">
                  {t('checkout.tarjetasPrueba')}
                  <button
                    type="button"
                    onClick={() => setTarjeta(TARJETA_APROBADA)}
                    className="rounded-full border border-negro/15 px-2.5 py-1 font-medium text-negro transition-colors hover:border-violeta hover:text-violeta"
                  >
                    {t('checkout.aprobada')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTarjeta(TARJETA_RECHAZADA)}
                    className="rounded-full border border-negro/15 px-2.5 py-1 font-medium text-negro transition-colors hover:border-violeta hover:text-violeta"
                  >
                    {t('checkout.rechazada')}
                  </button>
                </p>
              </>
            )}

            {errorPago && (
              <div className="mt-5 flex items-start gap-2.5 border-l-2 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                <AlertCircle size={16} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
                {errorPago}
              </div>
            )}
          </Paso>

          <button type="submit" disabled={loading || seleccionados.length === 0} className={`${boton.primario} w-full py-4 text-base`}>
            {loading ? (
              <>
                <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                {t('checkout.procesandoPago')}
              </>
            ) : (
              <>
                <Lock size={16} aria-hidden="true" />
                {paginaExterna ? t('checkout.pagarEn', { pasarela: nombrePasarela }) : t('checkout.pagar')} {formatoMoneda(cotizacion.totalHoy)} MXN
              </>
            )}
          </button>
        </form>

        {/* Resumen */}
        <aside className="lg:col-span-5 lg:col-start-8 xl:col-span-4 xl:col-start-9">
          <div className="rounded-md bg-lavanda lg:sticky lg:top-24">
            <h2 className="border-b border-violeta/15 px-5 py-4 font-bold text-negro">{t('checkout.resumen')}</h2>
            <ul className="divide-y divide-violeta/15 px-5">
              {cotizacion.partidas.map(({ producto: p, cobro }) => (
                <li key={p.id} className="flex items-start justify-between gap-3 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-negro">{p.nombre}</p>
                    <p className="mt-0.5 text-[13px] leading-snug text-negro/70">
                      {t(`tipo.${p.tipo}`)} · {detalleCobro(p.id)}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-sm font-semibold text-negro tabular-nums">{formatoMoneda(cobro.hoy)}</span>
                </li>
              ))}
            </ul>
            <dl className="border-t border-violeta/15 px-5 py-4">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-negro/70">{t('cotizador.valorTotal')}</dt>
                <dd className="text-sm text-negro/80 tabular-nums">{formatoMoneda(cotizacion.totalContrato)} MXN</dd>
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-dashed border-violeta/25 pt-3">
                <dt className="font-bold text-negro">{t('cotizador.aPagarHoy')}</dt>
                <dd className="cifra text-2xl text-violeta">{formatoMoneda(cotizacion.totalHoy)} MXN</dd>
              </div>
            </dl>
            <p className="px-5 pb-5 text-xs leading-relaxed text-negro/60">{t('checkout.notaPublicidad')}</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
