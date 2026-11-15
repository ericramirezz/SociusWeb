import { useState } from 'react'
import { Calendar, Clock, CheckCircle, ArrowRight, Phone, Mail, MessageSquare } from 'lucide-react'

import { agenda, formatoLargo } from '../core'

const diaSemana = (iso) => formatoLargo(iso).split(',')[0]

export default function Agenda() {
  const [form, setForm] = useState({ nombre: '', empresa: '', email: '', telefono: '', mensaje: '' })
  const [errors, setErrors] = useState({})
  const [selectedSlot, setSelectedSlot] = useState({ fecha: '', hora: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  // Próximos 5 días hábiles, sin los horarios que ya están tomados.
  const [slots] = useState(() => agenda.horarios().map((s) => ({ ...s, dia: diaSemana(s.fecha) })))

  const validate = () => {
    const e = {}
    if (!form.nombre.trim()) e.nombre = 'Campo requerido'
    if (!form.empresa.trim()) e.empresa = 'Campo requerido'
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email válido requerido'
    if (!form.telefono.trim()) e.telefono = 'Campo requerido'
    if (!selectedSlot.fecha || !selectedSlot.hora) e.slot = 'Selecciona un horario'
    return e
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length > 0) {
      setErrors(e2)
      return
    }
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      try {
        agenda.agendar({ cliente: form, fecha: selectedSlot.fecha, hora: selectedSlot.hora })
        setSubmitted(true)
      } catch (err) {
        setErrors({ slot: err.message })
      }
    }, 800)
  }

  const inputClass = (field) =>
    `w-full bg-white border ${errors[field] ? 'border-red-400' : 'border-slate-300'} rounded-lg px-4 py-3 text-navy text-sm placeholder-slate-400 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-all duration-200`

  if (submitted) {
    const fechaFormateada = formatoLargo(selectedSlot.fecha)

    return (
      <div className="min-h-screen bg-white pt-24 pb-20 px-4 flex items-center">
        <div className="max-w-lg mx-auto w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
            <CheckCircle size={40} className="text-green-700" />
          </div>
          <h1 className="text-4xl font-black text-navy mb-3">¡Llamada agendada!</h1>
          <p className="text-slate-600 text-lg mb-8">
            Hemos recibido tu solicitud. Te confirmaremos por email.
          </p>

          <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm text-left space-y-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center">
                <Calendar size={16} className="text-brand" />
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider">Fecha</p>
                <p className="text-navy font-semibold text-sm">{fechaFormateada}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center">
                <Clock size={16} className="text-brand" />
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider">Hora</p>
                <p className="text-navy font-semibold text-sm">{selectedSlot.hora} hrs (hora CDMX)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center">
                <Phone size={16} className="text-brand" />
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider">Contacto</p>
                <p className="text-navy font-semibold text-sm">{form.nombre} · {form.empresa}</p>
              </div>
            </div>
          </div>

          <p className="text-slate-500 text-sm">
            Un estratega de Socius te contactará al {form.email} para confirmar y enviar el enlace de la videollamada.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pt-24 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="text-brand text-xs font-semibold uppercase tracking-widest mb-3 block">Agenda</span>
          <h1 className="text-4xl sm:text-5xl font-black text-navy mb-4">Agendar llamada estratégica</h1>
          <p className="text-slate-600 max-w-xl mx-auto">
            30 minutos, sin costo. Te mostramos exactamente cómo Socius puede escalar tu desarrollo inmobiliario.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Form */}
          <div className="flex-1">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact */}
              <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                <h2 className="text-navy font-bold text-lg mb-5">Tu información</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-600 text-xs uppercase tracking-wider mb-2 block">Nombre completo</label>
                    <input
                      type="text"
                      name="nombre"
                      value={form.nombre}
                      onChange={handleChange}
                      placeholder="Tu nombre"
                      className={inputClass('nombre')}
                    />
                    {errors.nombre && <p className="text-red-600 text-xs mt-1">{errors.nombre}</p>}
                  </div>
                  <div>
                    <label className="text-slate-600 text-xs uppercase tracking-wider mb-2 block">Empresa / Proyecto</label>
                    <input
                      type="text"
                      name="empresa"
                      value={form.empresa}
                      onChange={handleChange}
                      placeholder="Tu empresa"
                      className={inputClass('empresa')}
                    />
                    {errors.empresa && <p className="text-red-600 text-xs mt-1">{errors.empresa}</p>}
                  </div>
                  <div>
                    <label className="text-slate-600 text-xs uppercase tracking-wider mb-2 block">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="tu@empresa.com"
                      className={inputClass('email')}
                    />
                    {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="text-slate-600 text-xs uppercase tracking-wider mb-2 block">Teléfono</label>
                    <input
                      type="tel"
                      name="telefono"
                      value={form.telefono}
                      onChange={handleChange}
                      placeholder="+52 55 0000 0000"
                      className={inputClass('telefono')}
                    />
                    {errors.telefono && <p className="text-red-600 text-xs mt-1">{errors.telefono}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-slate-600 text-xs uppercase tracking-wider mb-2 block">
                      Cuéntanos de tu proyecto (opcional)
                    </label>
                    <textarea
                      name="mensaje"
                      value={form.mensaje}
                      onChange={handleChange}
                      placeholder="¿En qué etapa está tu desarrollo? ¿Cuál es tu principal reto comercial?"
                      rows={3}
                      className={`${inputClass('mensaje')} resize-none`}
                    />
                  </div>
                </div>
              </div>

              {/* Slot selector */}
              <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                <h2 className="text-navy font-bold text-lg mb-5 flex items-center gap-2">
                  <Calendar size={18} className="text-brand" />
                  Selecciona fecha y hora
                </h2>
                {errors.slot && (
                  <p className="text-red-600 text-xs mb-3">{errors.slot}</p>
                )}
                <div className="space-y-5">
                  {slots.map((slot) => (
                    <div key={slot.fecha}>
                      <p className="text-slate-600 text-xs uppercase tracking-wider mb-2">
                        {formatoLargo(slot.fecha)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {slot.horas.map((hora) => {
                          const isSelected = selectedSlot.fecha === slot.fecha && selectedSlot.hora === hora
                          return (
                            <button
                              key={hora}
                              type="button"
                              onClick={() => {
                                setSelectedSlot({ fecha: slot.fecha, hora })
                                if (errors.slot) setErrors((p) => ({ ...p, slot: '' }))
                              }}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                isSelected
                                  ? 'bg-brand text-white font-bold'
                                  : 'border border-slate-200 text-slate-700 hover:border-brand/40 hover:text-brand'
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

                {selectedSlot.fecha && selectedSlot.hora && (
                  <div className="mt-5 p-3 rounded-lg bg-brand/5 border border-brand/15 flex items-center gap-2">
                    <CheckCircle size={15} className="text-brand" />
                    <p className="text-brand text-sm font-medium">
                      Seleccionado: {slots.find((s) => s.fecha === selectedSlot.fecha)?.dia} a las {selectedSlot.hora} hrs
                    </p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-bold py-4 rounded-xl text-base transition-all duration-200"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Confirmando...
                  </>
                ) : (
                  <>
                    Confirmar llamada estratégica
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Info sidebar */}
          <div className="lg:w-72">
            <div className="sticky top-24 space-y-4">
              <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
                <h3 className="text-navy font-bold mb-4">¿Qué esperar?</h3>
                <ul className="space-y-3">
                  {[
                    '30 minutos de sesión estratégica',
                    'Diagnóstico de tu etapa comercial',
                    'Recomendación de programa',
                    'Propuesta personalizada',
                    'Sin compromiso de compra',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle size={14} className="text-brand mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50">
                <h3 className="text-slate-700 font-semibold text-sm mb-3">También puedes contactarnos</h3>
                <div className="space-y-2">
                  <a href="mailto:hola@socius.mx" className="flex items-center gap-2 text-slate-600 hover:text-brand text-sm transition-colors">
                    <Mail size={14} />
                    hola@socius.mx
                  </a>
                  <a href="tel:+525512345678" className="flex items-center gap-2 text-slate-600 hover:text-brand text-sm transition-colors">
                    <Phone size={14} />
                    +52 55 1234 5678
                  </a>
                  <a href="https://wa.me/525512345678" className="flex items-center gap-2 text-slate-600 hover:text-brand text-sm transition-colors">
                    <MessageSquare size={14} />
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
