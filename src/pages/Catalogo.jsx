import { useNavigate } from 'react-router-dom'
import { Check, ArrowRight, Info } from 'lucide-react'
import { programas } from '../data/programas'
import { seleccion } from '../core'

const coloresTag = {
  'nexus-growth': 'bg-blue-500/10 text-blue-700',
  'nexus-growth-split': 'bg-blue-500/10 text-blue-700',
  'nexus-partner': 'bg-purple-500/10 text-purple-700',
  'nexus-partner-split': 'bg-purple-500/10 text-purple-700',
  'socius-core': 'bg-brand/10 text-brand',
  'nexus-ia': 'bg-green-500/10 text-green-700',
  'avi': 'bg-pink-500/10 text-pink-700',
}

const features = {
  'nexus-growth': ['Infraestructura completa', 'Operación por Socius', 'CRM incluido', 'Campañas digitales', 'Reportes semanales'],
  'nexus-growth-split': ['Infraestructura completa', 'Operación por Socius', 'CRM incluido', 'Pago mensual', 'Sin compromiso largo plazo'],
  'nexus-partner': ['Todo de Nexus Growth', 'Comisión por cierre', 'Socius como socio', 'Mayor alineación de intereses', 'Reportes semanales'],
  'nexus-partner-split': ['Todo de Nexus Partner', 'Pago mensual fraccionado', 'Comisión por cierre', 'Flexible', 'Sin enganche grande'],
  'socius-core': ['Instalación completa', 'Capacitación del equipo', 'Manual de procesos', 'Acompañamiento 90 días', 'Tecnología propia'],
  'nexus-ia': ['2 agentes de IA', 'CRM inteligente', 'Respuestas 24/7', 'Calificación automática', 'Agendamiento automático'],
  'avi': ['Curso formativo', 'Agentes de IA incluidos', 'Material digital', 'Acceso de por vida', 'Comunidad privada'],
}

export default function Catalogo() {
  const navigate = useNavigate()

  const handleSeleccionar = (id) => {
    seleccion.agregar(id)
    navigate('/cotizador')
  }

  return (
    <div className="min-h-screen bg-white pt-24 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-brand text-xs font-semibold uppercase tracking-widest mb-3 block">Catálogo</span>
          <h1 className="text-4xl sm:text-5xl font-black text-navy mb-4">Programas Socius</h1>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">
            Cada programa está diseñado para una etapa y perfil específico. Selecciona el que mejor se adapta a tu situación.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-16">
          {programas.map((p) => (
            <div
              key={p.id}
              className={`relative rounded-2xl border flex flex-col overflow-hidden transition-all duration-300 hover:scale-[1.01] ${
                p.destacado ? 'border-brand/30 shadow-lg shadow-brand/5' : 'border-slate-200'
              }`}
            >
              {p.destacado && (
                <div className="bg-brand text-white text-xs font-bold tracking-widest uppercase text-center py-2">
                  Más Popular
                </div>
              )}

              <div className={`flex-1 flex flex-col p-6 ${p.destacado ? 'bg-gradient-to-b from-brand/5 to-white' : 'bg-white shadow-sm'}`}>
                {/* Tag */}
                <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full mb-4 w-fit ${coloresTag[p.id] || 'bg-slate-100 text-slate-700'}`}>
                  {p.id.includes('split') ? 'Pago fraccionado' : p.id === 'avi' ? 'Formativo' : p.id.includes('ia') ? 'Tecnología IA' : 'Servicio completo'}
                </span>

                <h2 className="text-navy font-black text-xl mb-2">{p.nombre}</h2>
                <p className="text-slate-700 text-sm leading-relaxed mb-5">{p.descripcion}</p>

                {/* Para quién */}
                <div className="bg-slate-50 rounded-lg p-3 mb-5 flex items-start gap-2">
                  <Info size={14} className="text-brand mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Ideal para</p>
                    <p className="text-slate-700 text-xs">{p.paraQuien}</p>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-6 flex-1">
                  {(features[p.id] || []).map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check size={13} className="text-brand flex-shrink-0" />
                      <span className="text-slate-700 text-xs">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* Price */}
                <div className="border-t border-slate-200 pt-4 mb-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-brand font-black text-3xl">${p.precio.toLocaleString('es-MX')}</span>
                    <span className="text-slate-500 text-sm">{p.moneda}</span>
                  </div>
                  <p className="text-slate-500 text-xs mt-1">{p.pago}</p>
                </div>

                <button
                  onClick={() => handleSeleccionar(p.id)}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                    p.destacado
                      ? 'bg-brand hover:bg-brand-dark text-white'
                      : 'border border-brand/30 text-brand hover:bg-brand hover:text-white'
                  }`}
                >
                  Seleccionar programa
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison note */}
        <div className="max-w-2xl mx-auto text-center p-6 rounded-2xl border border-slate-200 bg-slate-50">
          <p className="text-slate-600 text-sm">
            ¿No sabes cuál elegir? <span className="text-brand">Agenda una llamada</span> y te ayudamos a encontrar el programa ideal para tu desarrollo.
          </p>
          <button
            onClick={() => navigate('/agenda')}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-dark transition-colors"
          >
            Hablar con un estratega <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
