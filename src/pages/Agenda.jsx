import { useEffect, useState } from 'react'
import { Calendar, Clock, Check, Phone, Mail, MessageSquare } from 'lucide-react'

import { agenda, formatoLargo, HORARIO_OCUPADO } from '../core'
import { useIdioma } from '../i18n/IdiomaContext'
import { Cargando, EncabezadoPagina, Paso } from '../components/Lamina'
import { boton, campo, contenedor, errorCampo, etiquetaCampo } from '../components/estilos'

const diaSemana = (iso, locale) => formatoLargo(iso, locale).split(',')[0]
// Partes de la fecha para el encabezado de cada día (el formato lo da el idioma activo).
const parte = (iso, locale, opciones) => new Date(`${iso}T12:00:00`).toLocaleDateString(locale, opciones)

const CAMPOS = [
  { name: 'nombre', label: 'comun.nombreCompleto', type: 'text', placeholder: 'comun.tuNombre', autoComplete: 'name' },
  { name: 'empresa', label: 'comun.empresa', type: 'text', placeholder: 'agenda.phEmpresa', autoComplete: 'organization' },
  { name: 'email', label: 'comun.email', type: 'email', placeholder: 'comun.phEmail', autoComplete: 'email' },
  { name: 'telefono', label: 'comun.telefono', type: 'tel', placeholder: 'comun.phTelefono', autoComplete: 'tel' },
]

export default function Agenda() {
  const { t, fecha, locale } = useIdioma()
  const [form, setForm] = useState({ nombre: '', empresa: '', email: '', telefono: '', mensaje: '' })
  const [errors, setErrors] = useState({})
  const [selectedSlot, setSelectedSlot] = useState({ fecha: '', hora: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  // Próximos 5 días hábiles, sin los horarios que ya están tomados (null mientras carga).
  const [slots, setSlots] = useState(null)
  const cargarHorarios = () => agenda.horarios().then(setSlots).catch(() => setSlots([]))

  useEffect(() => {
    cargarHorarios()
  }, [])

  const validate = () => {
    const e = {}
    if (!form.nombre.trim()) e.nombre = t('agenda.requerido')
    if (!form.empresa.trim()) e.empresa = t('agenda.requerido')
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = t('comun.emailValido')
    if (!form.telefono.trim()) e.telefono = t('agenda.requerido')
    if (!selectedSlot.fecha || !selectedSlot.hora) e.slot = t('agenda.seleccionaHorario')
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
    if (Object.keys(e2).length > 0) {
      setErrors(e2)
      return
    }
    setLoading(true)
    try {
      await agenda.agendar({ cliente: form, fecha: selectedSlot.fecha, hora: selectedSlot.hora })
      setSubmitted(true)
    } catch (err) {
      if (err.codigo === HORARIO_OCUPADO) {
        setErrors({ slot: t('agenda.noDisponible') })
        setSelectedSlot({ fecha: '', hora: '' })
        cargarHorarios() // alguien más lo tomó: se refresca la lista
      } else {
        setErrors({ slot: t('agenda.errorGeneral') })
      }
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    const fechaFormateada = fecha(selectedSlot.fecha)
    const filas = [
      { Icono: Calendar, titulo: t('agenda.fecha'), valor: fechaFormateada },
      { Icono: Clock, titulo: t('agenda.hora'), valor: t('agenda.horaCdmx', { hora: selectedSlot.hora }) },
      { Icono: Phone, titulo: t('agenda.contacto'), valor: `${form.nombre} · ${form.empresa}` },
    ]

    return (
      <div className="min-h-screen bg-lavanda px-5 pb-24 pt-28 sm:pt-36">
        <div className="mx-auto w-full max-w-xl">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-violeta text-white animate-aparece">
              <Check size={28} strokeWidth={3} aria-hidden="true" />
            </span>
            <div>
              <h1 className="titular text-[clamp(1.75rem,4.5vw,2.5rem)] leading-none text-negro">{t('agenda.agendada')}</h1>
              <p className="mt-2 text-negro/70">{t('agenda.recibida')}</p>
            </div>
          </div>

          <dl className="mt-10 divide-y divide-negro/10 rounded-md bg-white">
            {filas.map(({ Icono, titulo, valor }) => (
              <div key={titulo} className="flex items-center gap-4 p-5">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-lavanda text-violeta">
                  <Icono size={17} aria-hidden="true" />
                </span>
                <div>
                  <dt className="text-[13px] text-negro/60">{titulo}</dt>
                  <dd className="text-[15px] font-semibold text-negro">{valor}</dd>
                </div>
              </div>
            ))}
          </dl>

          <p className="mt-6 text-[15px] leading-relaxed text-negro/70">{t('agenda.teContactara', { email: form.email })}</p>
        </div>
      </div>
    )
  }

  const hayHorario = selectedSlot.fecha && selectedSlot.hora

  return (
    <div className="min-h-screen bg-white pb-24">
      <EncabezadoPagina etiqueta={t('agenda.etiqueta')} titulo={t('comun.agendarLlamadaEstrategica')} sub={t('agenda.subtitulo')} />

      <div className={`${contenedor} mt-14 grid gap-12 lg:grid-cols-12 lg:gap-x-8`}>
        <form onSubmit={handleSubmit} className="space-y-12 lg:col-span-8" noValidate>
          {/* 1. Fecha y hora: la semana completa de un vistazo */}
          <Paso numero={1} titulo={t('agenda.seleccionaFecha')}>
            {errors.slot && (
              <p className="mb-4 border-l-2 border-red-600 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700" role="alert">
                {errors.slot}
              </p>
            )}

            {slots === null ? (
              <Cargando etiqueta={t('comun.cargando')} />
            ) : (
              <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
                {slots.map((slot) => (
                  <div key={slot.fecha} role="group" aria-label={fecha(slot.fecha)}>
                    <p className="border-b-2 border-negro pb-2 text-center">
                      <span className="block text-xs font-medium capitalize text-negro/60">{parte(slot.fecha, locale, { weekday: 'short' }).replace('.', '')}</span>
                      <span className="block cifra text-2xl text-negro">{parte(slot.fecha, locale, { day: 'numeric' })}</span>
                      <span className="block text-xs capitalize text-negro/60">{parte(slot.fecha, locale, { month: 'short' }).replace('.', '')}</span>
                    </p>
                    <div className="mt-3 space-y-1.5">
                      {slot.horas.length === 0 && <p className="py-2 text-center text-negro/30">—</p>}
                      {slot.horas.map((hora) => {
                        const isSelected = selectedSlot.fecha === slot.fecha && selectedSlot.hora === hora
                        return (
                          <button
                            key={hora}
                            type="button"
                            aria-pressed={isSelected}
                            aria-label={`${fecha(slot.fecha)}, ${hora}`}
                            onClick={() => {
                              setSelectedSlot({ fecha: slot.fecha, hora })
                              if (errors.slot) setErrors((p) => ({ ...p, slot: '' }))
                            }}
                            className={`w-full rounded-md py-2.5 text-[13px] font-semibold tabular-nums transition-colors duration-150 sm:text-sm ${
                              isSelected ? 'bg-violeta text-white' : 'bg-lavanda text-violeta hover:bg-violeta/15'
                            }`}
                          >
                            {hora}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {hayHorario && (
              <p className="mt-5 flex items-center gap-2.5 border-l-2 border-violeta bg-lavanda px-4 py-3 text-sm font-semibold text-violeta animate-aparece">
                <Check size={16} aria-hidden="true" />
                {t('agenda.seleccionado', { dia: diaSemana(selectedSlot.fecha, locale), hora: selectedSlot.hora })}
              </p>
            )}
          </Paso>

          {/* 2. Tus datos */}
          <Paso numero={2} titulo={t('agenda.tuInfo')}>
            <div className="grid gap-5 sm:grid-cols-2">
              {CAMPOS.map(({ name, label, placeholder, ...c }) => (
                <div key={name}>
                  <label htmlFor={`agenda-${name}`} className={etiquetaCampo}>
                    {t(label)}
                  </label>
                  <input
                    id={`agenda-${name}`}
                    name={name}
                    {...c}
                    value={form[name]}
                    onChange={handleChange}
                    placeholder={t(placeholder)}
                    aria-invalid={Boolean(errors[name])}
                    className={campo(errors[name])}
                  />
                  {errors[name] && <p className={errorCampo}>{errors[name]}</p>}
                </div>
              ))}
              <div className="sm:col-span-2">
                <label htmlFor="agenda-mensaje" className={etiquetaCampo}>
                  {t('agenda.proyecto')}
                </label>
                <textarea
                  id="agenda-mensaje"
                  name="mensaje"
                  value={form.mensaje}
                  onChange={handleChange}
                  placeholder={t('agenda.phProyecto')}
                  rows={3}
                  className={`${campo(false)} resize-none`}
                />
              </div>
            </div>
          </Paso>

          <button type="submit" disabled={loading} className={`${boton.primario} w-full py-4 text-base`}>
            {loading ? (
              <>
                <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                {t('agenda.confirmando')}
              </>
            ) : (
              t('agenda.confirmar')
            )}
          </button>
        </form>

        {/* Qué esperar */}
        <aside className="lg:col-span-4">
          <div className="space-y-8 lg:sticky lg:top-24">
            <div className="rounded-md bg-negro p-6 text-white">
              <h2 className="text-lg font-bold">{t('agenda.queEsperar')}</h2>
              <ul className="mt-5 space-y-3.5">
                {t('agenda.esperar').map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[15px] text-white/85">
                    <span aria-hidden="true" className="mt-[7px] h-2 w-2 flex-shrink-0 bg-cian" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-negro/10 pt-6">
              <h2 className="text-sm font-medium text-negro/60">{t('agenda.tambien')}</h2>
              <ul className="mt-4 space-y-3">
                {[
                  { href: 'mailto:admin@sociusrealestate.com', Icono: Mail, texto: 'admin@sociusrealestate.com' },
                  { href: 'tel:+525536711555', Icono: Phone, texto: '+52 55 3671 1555' },
                  { href: 'https://wa.me/525536711555', Icono: MessageSquare, texto: 'WhatsApp' },
                ].map(({ href, Icono, texto }) => (
                  <li key={href}>
                    <a href={href} className="inline-flex items-center gap-2.5 text-[15px] font-medium text-negro transition-colors hover:text-violeta">
                      <Icono size={15} aria-hidden="true" className="text-violeta" />
                      {texto}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
