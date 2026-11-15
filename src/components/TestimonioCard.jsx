import { useState } from 'react'
import { Quote, Play } from 'lucide-react'
import Modal from './Modal'
import { localizar, useIdioma } from '../i18n/IdiomaContext'

// Convierte un enlace de YouTube/Vimeo a su URL de "embed"; devuelve null si es un archivo propio.
export function urlEmbed(url) {
  if (!url) return null
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1`
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1`
  return null
}

function iniciales(nombre) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

function Avatar({ foto, autor }) {
  const { t } = useIdioma()
  const [error, setError] = useState(false)
  if (foto && !error) {
    return (
      <img
        src={foto}
        alt={t('testimonios.foto', { autor })}
        loading="lazy"
        onError={() => setError(true)}
        className="w-11 h-11 rounded-full object-cover border border-slate-200"
      />
    )
  }
  return (
    <div className="w-11 h-11 rounded-full bg-brand/10 text-brand flex items-center justify-center text-sm font-bold">
      {iniciales(autor)}
    </div>
  )
}

export default function TestimonioCard({ testimonio }) {
  const { idioma, t: tr } = useIdioma()
  const t = localizar(testimonio, idioma)
  const [videoAbierto, setVideoAbierto] = useState(false)
  const embed = urlEmbed(t.video)
  const portada = t.poster || t.foto

  return (
    <div className="flex flex-col p-6 rounded-2xl border border-slate-200 bg-slate-50 hover:border-brand/20 transition-all duration-300 card-hover">
      {t.video && (
        <button
          type="button"
          onClick={() => setVideoAbierto(true)}
          className="group relative mb-5 aspect-video w-full overflow-hidden rounded-xl bg-navy/90"
          aria-label={tr('testimonios.verVideo', { autor: t.autor })}
        >
          {portada && (
            <img src={portada} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-70" />
          )}
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-brand shadow-lg transition-transform duration-200 group-hover:scale-110">
              <Play size={22} className="ml-1" fill="currentColor" />
            </span>
          </span>
        </button>
      )}

      <Quote size={24} className="text-brand/40 mb-4" />
      <p className="text-slate-700 text-sm leading-relaxed mb-6 flex-1">"{t.texto}"</p>
      <div className="flex items-center gap-1 mb-4">
        {Array.from({ length: t.rating }).map((_, j) => (
          <span key={j} className="text-brand text-xs">★</span>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Avatar foto={t.foto} autor={t.autor} />
        <div>
          <p className="text-navy font-semibold text-sm">{t.autor}</p>
          <p className="text-slate-500 text-xs mt-0.5">{t.cargo}</p>
        </div>
      </div>

      {t.video && (
        <Modal isOpen={videoAbierto} onClose={() => setVideoAbierto(false)} title={t.autor} size="lg">
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
            {embed ? (
              <iframe
                src={embed}
                title={`Testimonio de ${t.autor}`}
                className="h-full w-full"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            ) : (
              <video src={t.video} poster={portada || undefined} controls autoPlay playsInline className="h-full w-full" />
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
