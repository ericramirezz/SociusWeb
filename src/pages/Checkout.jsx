import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Lock, ArrowRight, AlertCircle, Calendar, CheckCircle, Zap } from 'lucide-react'
import {
  pedidos, seleccion, fabricaPasarelas, config, formatoLargo, formatoMoneda,
  TARJETA_APROBADA, TARJETA_RECHAZADA,
} from '../core'

const CAMPOS = [
  { name: 'nombre', label: 'Nombre completo', type: 'text', placeholder: 'Tu nombre' },
  { name: 'empresa', label: 'Empresa / Proyecto', type: 'text', placeholder: 'Nombre de tu empresa' },
  { name: 'email', label: 'Email', type: 'email', placeholder: 'tu@empresa.com' },
  { name: 'telefono', label: 'Teléfono', type: 'tel', placeholder: '+52 55 0000 0000' },
]

const tarjetaConEspacios = (n) => n.replace(/(\d{4})(?=\d)/g, '$1 ')

export default function Checkout() {
  const navigate = useNavigate()
  const [seleccionados, setSeleccionados] = useState(() => seleccion.leer())
  const [form, setForm] = useState({ nombre: '', empresa: '', email: '', telefono: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [pasarela, setPasarela] = useState(config.pasarelaPorDefecto)
  const [tarjeta, setTarjeta] = useState(TARJETA_APROBADA)
  const [ordenId, setOrdenId] = useState(null) // si el pago se rechaza, se reintenta sobre la misma orden
  const [errorPago, setErrorPago] = useState('')

  // La fachada cotiza y propone la fecha de entrega según el tipo de producto.
  const cotizacion = pedidos.cotizar(seleccionados)
  const propuesta = cotizacion.entregaPropuesta
  const [fechaPreferida, setFechaPreferida] = useState(propuesta?.fechaArranque ?? '')
  // El cliente propone su fecha: se confirma o se sugiere la más cercana.
  const revision = cotizacion.requiereAgenda && fechaPreferida ? pedidos.revisarFecha(fechaPreferida) : null

  useEffect(() => {
    if (seleccionados.length === 0) navigate('/cotizador')
  }, [seleccionados, navigate])

  const validate = () => {
    const e = {}
    if (!form.nombre.trim()) e.nombre = 'Nombre requerido'
    if (!form.empresa.trim()) e.empresa = 'Empresa requerida'
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email válido requerido'
    if (!form.telefono.trim()) e.telefono = 'Teléfono requerido'
    if (tarjeta.length !== 16) e.tarjeta = 'La tarjeta debe tener 16 dígitos'
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
      const r = await pedidos.comprar({
        ids: seleccionados, cliente: form, pasarela, tarjeta, ordenId,
        fechaCliente: revision?.fecha,
      })
      if (!r.ok) {
        setOrdenId(r.orden.id)
        setErrorPago(`${r.mensaje}. No se realizó ningún cargo; puedes intentar con otra tarjeta.`)
        return
      }
      seleccion.vaciar()
      localStorage.setItem('socius_ultima_orden', r.orden.id)
      setSeleccionados([])
      navigate('/confirmacion')
    } catch (err) {
      setErrorPago(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputClass = (field) =>
    `w-full bg-white border ${errors[field] ? 'border-red-400' : 'border-slate-300'} rounded-lg px-4 py-3 text-navy text-sm placeholder-slate-400 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-all duration-200`
  const labelClass = 'text-slate-600 text-xs uppercase tracking-wider mb-2 block'
  const cardClass = 'p-6 rounded-2xl border border-slate-200 bg-white shadow-sm'

  return (
    <div className="min-h-screen bg-brand-soft/40 pt-24 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <span className="text-brand text-xs font-semibold uppercase tracking-widest mb-2 block">Checkout</span>
          <h1 className="text-4xl font-black text-navy">Finalizar pedido</h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-1">
            <form onSubmit={handleSubmit} className="space-y-8" noValidate>
              {/* Contacto */}
              <div className={cardClass}>
                <h2 className="text-navy font-bold text-lg mb-5">Información de contacto</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {CAMPOS.map((c) => (
                    <div key={c.name}>
                      <label htmlFor={c.name} className={labelClass}>{c.label}</label>
                      <input id={c.name} {...c} value={form[c.name]} onChange={handleChange} className={inputClass(c.name)} />
                      {errors[c.name] && <p className="text-red-600 text-xs mt-1">{errors[c.name]}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Entrega / agenda */}
              <div className={cardClass}>
                <h2 className="text-navy font-bold text-lg mb-2 flex items-center gap-2">
                  <Calendar size={18} className="text-brand" />
                  Entrega y fecha de arranque
                </h2>
                {cotizacion.partidas.some((x) => !x.producto.requiereAgenda) && (
                  <p className="flex items-center gap-2 text-slate-700 text-sm mb-3">
                    <Zap size={14} className="text-brand" />
                    Producto digital: acceso inmediato al confirmar el pago.
                  </p>
                )}
                {cotizacion.requiereAgenda && (
                  <>
                    <p className="text-slate-600 text-sm mb-5">
                      Fecha propuesta por el sistema: <span className="text-brand font-semibold">{formatoLargo(propuesta.fechaArranque)}</span>.
                      Si prefieres otra, propónla aquí.
                    </p>
                    <label htmlFor="fecha" className={labelClass}>Tu fecha de arranque preferida</label>
                    <input
                      id="fecha"
                      type="date"
                      value={fechaPreferida}
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
                            ? <>Fecha disponible. Arrancamos el <strong>{formatoLargo(revision.fecha)}</strong>.</>
                            : <>{revision.motivo}. La fecha disponible más cercana es el <strong>{formatoLargo(revision.fecha)}</strong> y es la que se agendará.</>}
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
                  Pago
                </h2>
                <p className="mb-5 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertCircle size={13} className="flex-shrink-0" />
                  Modo prueba: el pago es simulado y no se realiza ningún cargo real.
                </p>

                <p className={labelClass}>Pagar con</p>
                <div className="grid grid-cols-3 gap-3 mb-5" role="radiogroup" aria-label="Pasarela de pago">
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

                <label htmlFor="tarjeta" className={labelClass}>Número de tarjeta</label>
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
                  Tarjetas de prueba:{' '}
                  <button type="button" onClick={() => setTarjeta(TARJETA_APROBADA)} className="text-brand font-medium underline">4242… aprobada</button>
                  {' · '}
                  <button type="button" onClick={() => setTarjeta(TARJETA_RECHAZADA)} className="text-brand font-medium underline">4000…0002 rechazada</button>
                </p>

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
                    Procesando pago...
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    Pagar {formatoMoneda(cotizacion.totalHoy)} MXN
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
                <h2 className="text-navy font-bold">Resumen del pedido</h2>
              </div>
              <div className="p-5 space-y-3">
                {cotizacion.partidas.map(({ producto: p, cobro }) => (
                  <div key={p.id} className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-navy text-sm font-medium">{p.nombre}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{p.etiquetaTipo} · {cobro.detalle}</p>
                    </div>
                    <span className="text-slate-700 text-sm font-medium whitespace-nowrap">{formatoMoneda(cobro.hoy)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-600 text-sm">Valor total del contrato</span>
                  <span className="text-slate-700 text-sm">{formatoMoneda(cotizacion.totalContrato)} MXN</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <span className="text-navy font-bold">A pagar hoy</span>
                  <span className="text-brand font-black text-lg">{formatoMoneda(cotizacion.totalHoy)} MXN</span>
                </div>
              </div>
              <div className="px-5 pb-5">
                <p className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-xs leading-relaxed">
                  * Presupuesto publicitario no incluido. Se cotiza por separado según el desarrollo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
