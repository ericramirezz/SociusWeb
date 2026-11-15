import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import TestimonioCard from '../components/TestimonioCard'
import { testimonios } from '../data/testimonios'
import { useIdioma } from '../i18n/IdiomaContext'

// Página propia de testimonios: solo se llega desde el menú superior.
export default function Testimonios() {
  const { t } = useIdioma()

  return (
    <div className="min-h-screen bg-white pt-24 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-brand text-xs font-semibold uppercase tracking-widest mb-3 block">{t('testimonios.etiqueta')}</span>
          <h1 className="text-4xl sm:text-5xl font-black text-navy mb-4">{t('testimonios.titulo')}</h1>
          <p className="text-slate-600 max-w-xl mx-auto">{t('testimonios.subtitulo')}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {testimonios.map((testimonio) => (
            <TestimonioCard key={testimonio.autor} testimonio={testimonio} />
          ))}
        </div>

        <div className="max-w-2xl mx-auto text-center p-8 rounded-2xl border border-brand/20 bg-brand-soft/60">
          <p className="text-navy text-lg font-bold mb-4">{t('testimonios.ctaTexto')}</p>
          <Link
            to="/agenda"
            className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold px-6 py-3 rounded-xl text-sm transition-all duration-200"
          >
            {t('comun.agendarLlamadaEstrategica')}
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}
