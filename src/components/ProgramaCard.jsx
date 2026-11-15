import { useNavigate } from 'react-router-dom'
import { Check, ArrowRight, Star } from 'lucide-react'
import { seleccion } from '../core'
import { useIdioma } from '../i18n/IdiomaContext'

export default function ProgramaCard({ programa, seleccionado, onToggle, modo = 'catalogo' }) {
  const navigate = useNavigate()
  const { t, programa: txt } = useIdioma()

  const formatPrecio = (precio, moneda) => {
    return `$${precio.toLocaleString('es-MX')} ${moneda}`
  }

  const handleCotizar = () => {
    seleccion.agregar(programa.id)
    navigate('/cotizador')
  }

  if (modo === 'cotizador') {
    return (
      <div
        onClick={() => onToggle(programa.id)}
        className={`relative cursor-pointer rounded-xl border p-5 transition-all duration-200 ${
          seleccionado
            ? 'border-brand bg-brand/5 shadow-lg shadow-brand/10'
            : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
        }`}
      >
        {seleccionado && (
          <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-brand flex items-center justify-center">
            <Check size={14} className="text-white" />
          </div>
        )}
        {programa.destacado && (
          <div className="inline-flex items-center gap-1 bg-brand/15 text-brand text-xs font-medium px-2 py-0.5 rounded-full mb-3">
            <Star size={10} fill="currentColor" />
            {t('card.destacado')}
          </div>
        )}
        <h3 className="text-navy font-semibold text-sm mb-1">{programa.nombre}</h3>
        <p className="text-slate-600 text-xs mb-3 line-clamp-2">{txt(programa, 'descripcion')}</p>
        <p className="text-brand font-bold text-base">{formatPrecio(programa.precio, programa.moneda)}</p>
        <p className="text-slate-500 text-xs mt-1">{txt(programa, 'pago')}</p>
        <span className="inline-block mt-3 text-[10px] font-semibold uppercase tracking-wider text-brand bg-brand/10 px-2 py-0.5 rounded">
          {t(`tipo.${programa.tipo}`)}
        </span>
      </div>
    )
  }

  return (
    <div className={`relative rounded-xl border transition-all duration-300 card-hover flex flex-col ${
      programa.destacado ? 'border-brand/40 bg-gradient-to-b from-brand/5 to-transparent' : 'border-slate-200 bg-slate-50'
    }`}>
      {programa.destacado && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-brand text-white text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full">
            {t('card.masPopular')}
          </span>
        </div>
      )}

      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-navy font-bold text-lg mb-2">{programa.nombre}</h3>
        <p className="text-slate-700 text-sm mb-4 leading-relaxed flex-1">{txt(programa, 'descripcion')}</p>

        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs uppercase tracking-wider">{t('card.paraQuien')}</span>
            <span className="text-slate-700 text-xs">{txt(programa, 'paraQuien')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs uppercase tracking-wider">{t('card.pago')}</span>
            <span className="text-slate-700 text-xs">{txt(programa, 'pago')}</span>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4 mb-5">
          <span className="text-brand font-black text-2xl">${programa.precio.toLocaleString('es-MX')}</span>
          <span className="text-slate-600 text-sm ml-1">{programa.moneda}</span>
        </div>

        <button
          onClick={handleCotizar}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
            programa.destacado
              ? 'bg-brand hover:bg-brand-dark text-white'
              : 'border border-brand/40 text-brand hover:bg-brand hover:text-white'
          }`}
        >
          {t('card.cotizar')}
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}
