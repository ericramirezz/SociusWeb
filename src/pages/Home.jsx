import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown, Zap, Target, TrendingUp, Building2, Users, Clock, Award } from 'lucide-react'
import { programas } from '../data/programas'
import ProgramaCard from '../components/ProgramaCard'
import PreguntasFrecuentes from '../components/PreguntasFrecuentes'
import { useIdioma } from '../i18n/IdiomaContext'

function useCountUp(end, duration = 2000, start = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
    let startTime = null
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCount(Math.floor(progress * end))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [end, duration, start])
  return count
}

function MetricCard({ icon: Icon, value, suffix, label, start }) {
  const count = useCountUp(value, 2000, start)
  return (
    <div className="text-center p-6">
      <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-brand/10 flex items-center justify-center">
        <Icon size={22} className="text-brand" />
      </div>
      <div className="text-4xl font-black text-navy mb-1">
        {count}{suffix}
      </div>
      <div className="text-slate-600 text-sm">{label}</div>
    </div>
  )
}

const ICONOS_PILARES = [Zap, Target, TrendingUp]

export default function Home() {
  const metricsRef = useRef(null)
  const [metricsVisible, setMetricsVisible] = useState(false)
  const { t } = useIdioma()

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMetricsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    if (metricsRef.current) observer.observe(metricsRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 pt-28 pb-24 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-brand-soft to-white" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(29,78,216,0.08)_0%,_transparent_60%)]" />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(11,31,58,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(11,31,58,0.6) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-brand/10 border border-brand/20 text-brand text-xs font-medium tracking-widest uppercase px-4 py-2 rounded-full mb-8">
            <Award size={12} />
            {t('home.insignia')}
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[1.05] tracking-tight mb-6">
            {[t('home.titulo1'), t('home.titulo2')].filter(Boolean).map((linea) => (
              <span key={linea} className="block text-navy">{linea}</span>
            ))}
            <span className="block text-brand">{t('home.titulo3')}</span>
          </h1>

          <p className="text-slate-700 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            {t('home.subtitulo')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/agenda"
              className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold px-8 py-4 rounded-xl text-base transition-all duration-200 shadow-lg shadow-brand/20 hover:shadow-brand/30 hover:scale-105"
            >
              {t('comun.agendarLlamadaEstrategica')}
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/catalogo"
              className="flex items-center gap-2 border border-slate-300 hover:border-slate-400 text-navy font-semibold px-8 py-4 rounded-xl text-base transition-all duration-200 hover:bg-slate-100"
            >
              {t('home.verProgramas')}
            </Link>
          </div>

          {/* Trust logos */}
          <div className="mt-16 flex flex-col items-center gap-4">
            <p className="text-slate-400 text-xs uppercase tracking-widest">{t('home.clientes')}</p>
            <div className="flex items-center gap-8">
              {['JLL', 'Coldwell Banker', 'FUNO'].map((brand) => (
                <span key={brand} className="text-slate-500 text-sm font-semibold tracking-wider hover:text-slate-600 transition-colors">
                  {brand}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="hidden sm:block absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-slate-400">
          <ChevronDown size={24} />
        </div>
      </section>

      {/* QUÉ ES SOCIUS */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-brand text-xs font-semibold uppercase tracking-widest mb-4 block">
                {t('home.queEs')}
              </span>
              <h2 className="text-4xl sm:text-5xl font-black text-navy leading-tight mb-6">
                {t('home.queEsTitulo1')}<br />
                <span className="text-brand">{t('home.queEsTitulo2')}</span>
              </h2>
              <p className="text-slate-700 text-lg leading-relaxed mb-6">
                {t('home.queEsP1')}
              </p>
              <p className="text-slate-600 text-base leading-relaxed">
                {t('home.queEsP2')}
              </p>
              <Link
                to="/agenda"
                className="inline-flex items-center gap-2 mt-8 text-brand font-semibold hover:gap-3 transition-all duration-200"
              >
                {t('comun.hablarEstratega')}
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="space-y-4">
              {t('home.pilares').map(({ titulo, desc }, i) => {
                const Icon = ICONOS_PILARES[i]
                return (
                <div
                  key={titulo}
                  className="flex items-start gap-5 p-5 rounded-xl border border-slate-200 bg-slate-50 hover:border-brand/20 hover:bg-brand/3 transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={18} className="text-brand" />
                  </div>
                  <div>
                    <h3 className="text-navy font-bold text-base mb-1">{titulo}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* MÉTRICAS */}
      <section ref={metricsRef} className="py-20 px-4 border-y border-slate-200 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-brand text-xs font-semibold uppercase tracking-widest mb-3 block">{t('home.resultados')}</span>
            <h2 className="text-3xl sm:text-4xl font-black text-navy">{t('home.resultadosTitulo')}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-x-0 md:divide-x divide-slate-200">
            <MetricCard icon={Building2} value={50} suffix="+" label={t('home.metricas.desarrollos')} start={metricsVisible} />
            <MetricCard icon={Users} value={1200} suffix="+" label={t('home.metricas.citas')} start={metricsVisible} />
            <MetricCard icon={Clock} value={4} suffix={t('home.metricas.meses')} label={t('home.metricas.promedio')} start={metricsVisible} />
            <MetricCard icon={Award} value={3} suffix="" label={t('home.metricas.alianzas')} start={metricsVisible} />
          </div>
        </div>
      </section>

      {/* PROGRAMAS */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-brand text-xs font-semibold uppercase tracking-widest mb-3 block">{t('home.programas')}</span>
            <h2 className="text-3xl sm:text-4xl font-black text-navy mb-4">{t('home.programasTitulo')}</h2>
            <p className="text-slate-600 max-w-xl mx-auto">{t('home.programasSub')}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {programas.map((p) => (
              <ProgramaCard key={p.id} programa={p} modo="catalogo" />
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              to="/catalogo"
              className="inline-flex items-center gap-2 border border-slate-200 hover:border-brand/40 text-slate-700 hover:text-brand text-sm font-medium px-6 py-3 rounded-lg transition-all duration-200"
            >
              {t('home.verComparativa')}
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative p-12 rounded-3xl border border-brand/20 bg-gradient-to-b from-brand/5 to-transparent overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(29,78,216,0.08)_0%,_transparent_70%)]" />
            <div className="relative z-10">
              <h2 className="text-4xl sm:text-5xl font-black text-navy mb-4 leading-tight">
                {t('home.ctaTitulo1')}<br />
                <span className="text-brand">{t('home.ctaTitulo2')}</span>
              </h2>
              <p className="text-slate-700 text-lg mb-10 max-w-xl mx-auto">
                {t('home.ctaTexto')}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/agenda"
                  className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold px-8 py-4 rounded-xl text-base transition-all duration-200 hover:scale-105"
                >
                  {t('comun.agendarLlamadaEstrategica')}
                  <ArrowRight size={18} />
                </Link>
                <Link
                  to="/cotizador"
                  className="text-brand font-semibold text-base hover:text-brand-dark transition-colors"
                >
                  {t('home.irCotizador')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* PREGUNTAS FRECUENTES: siempre al final de la portada */}
      <PreguntasFrecuentes />
    </div>
  )
}
