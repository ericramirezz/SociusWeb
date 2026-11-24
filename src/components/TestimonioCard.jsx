import { useId, useState } from 'react'
import { Play, Star } from 'lucide-react'
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

export function iniciales(nombre) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

// Foto del cliente o, si no hay, sus iniciales sobre el degradado de marca (forma, no texto).
export function Avatar({ foto, autor, tamano = 'h-11 w-11 text-sm' }) {
  const { t } = useIdioma()
  const [error, setError] = useState(false)
  if (foto && !error) {
    return (
      <img
        src={foto}
        alt={t('testimonios.foto', { autor })}
        loading="lazy"
        onError={() => setError(true)}
        className={`${tamano} flex-shrink-0 rounded-md object-cover`}
      />
    )
  }
  return (
    <span aria-hidden="true" className={`${tamano} flex flex-shrink-0 items-center justify-center rounded-md bg-degradado font-display font-bold text-white`}>
      {iniciales(autor)}
    </span>
  )
}

// Comillas hechas de bloques: el mismo módulo de la portada, con el degradado violeta → cian.
function Comillas() {
  const id = useId()
  return (
    <svg aria-hidden="true" viewBox="0 0 64 44" className="h-10 w-auto rotate-180 self-start sm:h-12">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5348CF" />
          <stop offset="1" stopColor="#659FFB" />
        </linearGradient>
      </defs>
      <path d="M0 0h26v26L15 44H5l7-18H0zM36 0h26v26L51 44H41l7-18H36z" fill={`url(#${id})`} />
    </svg>
  )
}

// Testimonio destacado: la cita a tamaño grande, con autor, calificación y video si lo hay.
export default function TestimonioCard({ testimonio }) {
  const { idioma, t: tr } = useIdioma()
  const t = localizar(testimonio, idioma)
  const [videoAbierto, setVideoAbierto] = useState(false)
  const embed = urlEmbed(t.video)
  const portada = t.poster || t.foto

  return (
    <figure className="flex h-full flex-col">
      <Comillas />
      <blockquote className="mt-8 text-[clamp(1.3rem,2.3vw,1.9rem)] font-light leading-[1.4] text-negro">{t.texto}</blockquote>

      {t.video && (
        <button
          type="button"
          onClick={() => setVideoAbierto(true)}
          className="group relative mt-8 aspect-video w-full max-w-md overflow-hidden rounded-md bg-negro"
          aria-label={tr('testimonios.verVideo', { autor: t.autor })}
        >
          {portada && (
            <img src={portada} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-70 transition-opacity duration-300 group-hover:opacity-90" />
          )}
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-violeta transition-transform duration-200 group-hover:scale-105">
              <Play size={22} className="ml-1" fill="currentColor" aria-hidden="true" />
            </span>
          </span>
        </button>
      )}

      <figcaption className="mt-auto flex flex-wrap items-center gap-4 pt-10">
        <Avatar foto={t.foto} autor={t.autor} tamano="h-14 w-14 text-lg" />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-negro">{t.autor}</p>
          <p className="text-[15px] text-negro/60">{t.cargo}</p>
        </div>
        <span role="img" className="flex gap-0.5 text-violeta" aria-label={`${t.rating}/5`}>
          {Array.from({ length: t.rating }).map((_, j) => (
            <Star key={j} size={15} fill="currentColor" strokeWidth={0} aria-hidden="true" />
          ))}
        </span>
      </figcaption>

      {t.video && (
        <Modal isOpen={videoAbierto} onClose={() => setVideoAbierto(false)} title={t.autor} size="lg">
          <div className="aspect-video w-full overflow-hidden rounded-md bg-negro">
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
    </figure>
  )
}
