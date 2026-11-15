import { useNavigate } from 'react-router-dom'
import { Check, ArrowRight, Info } from 'lucide-react'
import { programas } from '../data/programas'
import { seleccion } from '../core'
import { useIdioma } from '../i18n/IdiomaContext'

const coloresTag = {
  'nexus-growth': 'bg-blue-500/10 text-blue-700',
  'nexus-growth-split': 'bg-blue-500/10 text-blue-700',
  'nexus-partner': 'bg-purple-500/10 text-purple-700',
  'nexus-partner-split': 'bg-purple-500/10 text-purple-700',
  'socius-core': 'bg-brand/10 text-brand',
  'nexus-ia': 'bg-green-500/10 text-green-700',
  'avi': 'bg-pink-500/10 text-pink-700',
}

export default function Catalogo() {
  const navigate = useNavigate()
  const { t, programa: txt } = useIdioma()

  const handleSeleccionar = (id) => {
    seleccion.agregar(id)
    navigate('/cotizador')
  }

  return (
    <div className="min-h-screen bg-white pt-24 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-brand text-xs font-semibold uppercase tracking-widest mb-3 block">{t('catalogo.etiqueta')}</span>
          <h1 className="text-4xl sm:text-5xl font-black text-navy mb-4">{t('catalogo.titulo')}</h1>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">
            {t('catalogo.subtitulo')}
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
                  {t('card.masPopular')}
                </div>
              )}

              <div className={`flex-1 flex flex-col p-6 ${p.destacado ? 'bg-gradient-to-b from-brand/5 to-white' : 'bg-white shadow-sm'}`}>
                {/* Tag */}
                <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full mb-4 w-fit ${coloresTag[p.id] || 'bg-slate-100 text-slate-700'}`}>
                  {t(`catalogo.tags.${p.id.includes('split') ? 'split' : p.id === 'avi' ? 'formativo' : p.id.includes('ia') ? 'ia' : 'completo'}`)}
                </span>

                <h2 className="text-navy font-black text-xl mb-2">{p.nombre}</h2>
                <p className="text-slate-700 text-sm leading-relaxed mb-5">{txt(p, 'descripcion')}</p>

                {/* Para quién */}
                <div className="bg-slate-50 rounded-lg p-3 mb-5 flex items-start gap-2">
                  <Info size={14} className="text-brand mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">{t('catalogo.idealPara')}</p>
                    <p className="text-slate-700 text-xs">{txt(p, 'paraQuien')}</p>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-6 flex-1">
                  {(t(`catalogo.features.${p.id}`) || []).map((f) => (
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
                  <p className="text-slate-500 text-xs mt-1">{txt(p, 'pago')}</p>
                </div>

                <button
                  onClick={() => handleSeleccionar(p.id)}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                    p.destacado
                      ? 'bg-brand hover:bg-brand-dark text-white'
                      : 'border border-brand/30 text-brand hover:bg-brand hover:text-white'
                  }`}
                >
                  {t('catalogo.seleccionar')}
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison note */}
        <div className="max-w-2xl mx-auto text-center p-6 rounded-2xl border border-slate-200 bg-slate-50">
          <p className="text-slate-600 text-sm">
            {t('catalogo.noSabes')} <span className="text-brand">{t('catalogo.agendaUna')}</span> {t('catalogo.noSabesFin')}
          </p>
          <button
            onClick={() => navigate('/agenda')}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-dark transition-colors"
          >
            {t('comun.hablarEstratega')} <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
