import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import TestimonioCard, { Avatar } from '../components/TestimonioCard'
import { testimonios } from '../data/testimonios'
import { casos, marcas } from '../data/casos'
import { localizar, useIdioma } from '../i18n/IdiomaContext'
import { EncabezadoPagina, EncabezadoSeccion } from '../components/Lamina'
import { boton, contenedor } from '../components/estilos'

// Página propia de testimonios: solo se llega desde el menú superior.
// Sigue el principio del brief "prueba antes que promesa": primero marcas y cifras,
// después las voces de los clientes.

// Flecha de transformación: el degradado de marca como forma, de "antes" a "después".
function Transformacion() {
  return (
    <span aria-hidden="true" className="relative block h-1.5 w-full rounded-full bg-degradado-horizontal">
      <span className="absolute -right-1 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[7px] border-l-[11px] border-y-transparent border-l-cian" />
    </span>
  )
}

export default function Testimonios() {
  const { t, idioma } = useIdioma()
  const [activo, setActivo] = useState(0)
  const pestanas = useRef([])
  const total = testimonios.length

  const ir = (i, enfocar = false) => {
    const n = (i + total) % total
    setActivo(n)
    const pestana = pestanas.current[n]
    if (enfocar) pestana?.focus()
    // En móvil el directorio se desplaza de lado: se trae a la vista el cliente elegido.
    const lista = pestana?.parentElement
    if (lista && lista.scrollWidth > lista.clientWidth && typeof pestana.scrollIntoView === 'function') {
      pestana.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
    }
  }

  // Teclado del directorio: flechas, Inicio y Fin (patrón de pestañas accesibles).
  const teclas = (e) => {
    const paso = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]
    if (paso) {
      e.preventDefault()
      ir(activo + paso, true)
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      ir(e.key === 'Home' ? 0 : total - 1, true)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <EncabezadoPagina etiqueta={t('testimonios.etiqueta')} titulo={t('testimonios.titulo')} sub={t('testimonios.subtitulo')} />

      {/* Marcas que ya confían */}
      <div className={`${contenedor} mt-14`}>
        <div className="grid gap-y-4 border-y border-negro/10 py-6 lg:grid-cols-12 lg:items-center lg:gap-x-8">
          <p className="text-sm font-medium text-negro/60 lg:col-span-3">{t('testimonios.marcas')}</p>
          <ul className="flex flex-wrap items-center gap-x-8 gap-y-3 lg:col-span-9">
            {marcas.map((marca) => (
              <li key={marca} className="font-display text-lg font-bold uppercase tracking-wide text-negro/80 sm:text-xl">
                {marca}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Casos con cifras: antes y después */}
      <section className="mt-20 bg-lavanda py-24 sm:py-28">
        <div className={contenedor}>
          <EncabezadoSeccion etiqueta={t('testimonios.casos.etiqueta')} titulo={t('testimonios.casos.titulo')} tamano="medio" />
          <ul className="mt-14 border-t border-negro/10">
            {casos.map((caso) => {
              const c = localizar(caso, idioma)
              return (
                <li key={c.cliente} className="grid gap-y-5 border-b border-negro/10 py-8 lg:grid-cols-12 lg:items-center lg:gap-x-8">
                  <div className="lg:col-span-3">
                    <p className="titular text-lg leading-tight text-negro">{c.cliente}</p>
                    <p className="mt-1 text-sm text-negro/60">{c.lugar}</p>
                  </div>
                  <div className="lg:col-span-3">
                    <p className="text-xs font-medium text-negro/50">{t('testimonios.casos.antes')}</p>
                    <p className="mt-1 leading-snug text-negro/70">{c.antes}</p>
                  </div>
                  <div className="w-24 lg:col-span-1 lg:w-auto">
                    <Transformacion />
                  </div>
                  <div className="lg:col-span-5">
                    <p className="text-xs font-semibold text-violeta">{t('testimonios.casos.despues')}</p>
                    <p className="mt-1 font-display text-xl font-semibold leading-snug text-negro sm:text-2xl">{c.despues}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      {/* Voces: directorio de clientes y la cita destacada */}
      <section className="py-24 sm:py-32">
        <div className={contenedor}>
          <EncabezadoSeccion etiqueta={t('testimonios.voces.etiqueta')} titulo={t('testimonios.voces.titulo')} tamano="medio" />

          <div className="mt-14 grid grid-cols-1 overflow-hidden rounded-md lg:grid-cols-12">
            {/* Directorio, como el de la entrada de un edificio */}
            <div className="min-w-0 bg-negro lg:col-span-4">
              <div
                role="tablist"
                aria-label={t('testimonios.voces.lista')}
                aria-orientation="vertical"
                onKeyDown={teclas}
                className="sin-barra flex gap-1.5 overflow-x-auto p-3 lg:flex-col lg:gap-0 lg:overflow-visible lg:p-0"
              >
                {testimonios.map((testimonio, i) => {
                  const v = localizar(testimonio, idioma)
                  const sel = i === activo
                  return (
                    <button
                      key={v.autor}
                      ref={(el) => (pestanas.current[i] = el)}
                      type="button"
                      role="tab"
                      id={`voz-tab-${i}`}
                      aria-selected={sel}
                      aria-controls="voz-panel"
                      tabIndex={sel ? 0 : -1}
                      onClick={() => ir(i)}
                      className={`flex flex-shrink-0 items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors duration-200 lg:rounded-none lg:border-b lg:border-white/10 lg:px-6 lg:py-4 lg:last:border-b-0 ${
                        sel ? 'bg-white/10 text-white lg:shadow-[inset_3px_0_0_#659FFB]' : 'text-white/60 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className={`transition-opacity ${sel ? 'opacity-100' : 'opacity-50'}`}>
                        <Avatar foto={v.foto} autor={v.autor} tamano="h-9 w-9 text-xs" />
                      </span>
                      <span className="min-w-0">
                        <span className="block whitespace-nowrap text-sm font-semibold">{v.autor}</span>
                        <span className="hidden truncate text-[13px] text-white/50 lg:block">{v.cargo}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Cita destacada */}
            <div
              id="voz-panel"
              role="tabpanel"
              aria-labelledby={`voz-tab-${activo}`}
              className="plano-voz flex min-w-0 flex-col bg-lavanda p-6 sm:p-10 lg:col-span-8 lg:p-14"
            >
              <div key={activo} className="flex flex-1 flex-col animate-entra">
                <TestimonioCard testimonio={testimonios[activo]} />
              </div>
              <div className="mt-10 flex items-center justify-between border-t border-negro/10 pt-5">
                <p className="cifra text-sm text-negro/60" aria-live="polite">
                  {t('testimonios.voces.contador', { actual: activo + 1, total })}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => ir(activo - 1)}
                    aria-label={t('testimonios.voces.anterior')}
                    className="flex h-11 w-11 items-center justify-center rounded-md border border-negro/15 bg-white text-negro transition-colors hover:border-negro hover:bg-negro hover:text-white"
                  >
                    <ArrowLeft size={18} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => ir(activo + 1)}
                    aria-label={t('testimonios.voces.siguiente')}
                    className="flex h-11 w-11 items-center justify-center rounded-md bg-violeta text-white transition-colors hover:bg-negro"
                  >
                    <ArrowRight size={18} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Llamado a la acción */}
      <section className="plano-claro bg-violeta py-20 text-white sm:py-24">
        <div className={`${contenedor} grid gap-y-8 lg:grid-cols-12 lg:gap-x-8`}>
          <div className="lg:col-span-9 lg:col-start-4">
            <p className="titular text-[clamp(1.6rem,3.6vw,2.75rem)] leading-[1.05]">{t('testimonios.ctaTexto')}</p>
            <Link to="/agenda" className={`${boton.claro} mt-8`}>
              {t('comun.agendarLlamadaEstrategica')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
