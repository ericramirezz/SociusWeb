import { Link } from 'react-router-dom'
import { Check, GraduationCap } from 'lucide-react'
import { programas } from '../data/programas'
import ProgramaCard from '../components/ProgramaCard'
import PreguntasFrecuentes from '../components/PreguntasFrecuentes'
import CompresionTiempo from '../components/CompresionTiempo'
import { EncabezadoSeccion, Etiqueta } from '../components/Lamina'
import { boton, contenedor } from '../components/estilos'
import { useIdioma } from '../i18n/IdiomaContext'

// Desarrollos y brokers que han trabajado con Socius (de sociusrealestate.com).
const CLIENTES = ['Terraviva', 'Vivenza', 'Global Inmuebles', 'We Santa Fe', 'Sahai', 'Riga Bosques', 'Coldwell Banker', 'Urbano Town']

// Tres niveles de involucramiento = tres edificios: entre más hace Socius, más alto.
const TORRES = [
  { alto: 'h-40 md:h-72', estilo: 'bg-negro text-white pisos', nota: 'text-violeta' },
  { alto: 'h-32 md:h-56', estilo: 'bg-violeta text-white pisos', nota: 'text-violeta' },
  // Nexus IA: solo la capa de IA, en cian (el acento de IA de la marca).
  { alto: 'h-24 md:h-40', estilo: 'bg-cian text-negro pisos-oscuros', nota: 'text-violeta' },
]

// Contenido alineado a la columna de lectura del encabezado (columnas 4 a 12).
function Columna({ children, className = '' }) {
  return (
    <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
      <div className={`lg:col-span-9 lg:col-start-4 ${className}`}>{children}</div>
    </div>
  )
}

export default function Home() {
  const { t, locale } = useIdioma()
  const numero = (n) => n.toLocaleString(locale)

  // Cifras: el número manda; la unidad va más chica, como en una ficha técnica.
  const metricas = [
    { valor: `+${numero(250)}`, texto: t('home.metricas.negocios') },
    { valor: `$${numero(2500)}`, unidad: t('home.metricas.mdp'), texto: t('home.metricas.ventas') },
    { valor: numero(4), unidad: t('home.metricas.meses'), texto: t('home.metricas.promedio') },
    { valor: `${numero(21)}×`, texto: t('home.metricas.calificacion') },
  ]

  return (
    <div className="bg-white">
      {/* HERO: la promesa y su dibujo */}
      <section className="pt-28 sm:pt-40">
        <div className={contenedor}>
          <Etiqueta>{t('home.insignia')}</Etiqueta>

          <h1 className="titular mt-6 text-[clamp(2.1rem,5.4vw,4.75rem)] leading-[1.0] text-negro">
            {[t('home.titulo1'), t('home.titulo2')].filter(Boolean).map((linea) => (
              <span key={linea} className="block">
                {linea}
              </span>
            ))}
            {/* El mismo azul de los bloques apilados: "cuatro meses" es lo que dibuja la gráfica. */}
            <span className="block text-violeta">{t('home.titulo3')}</span>
          </h1>

          <div className="mt-12 grid items-end gap-x-8 gap-y-14 lg:mt-16 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="max-w-md text-lg leading-relaxed text-negro/70 sm:text-xl">{t('home.subtitulo')}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/agenda" className={boton.primario}>
                  {t('comun.agendarLlamadaEstrategica')}
                </Link>
                <Link to="/catalogo" className={boton.secundario}>
                  {t('home.verProgramas')}
                </Link>
              </div>
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <CompresionTiempo />
            </div>
          </div>

          {/* Clientes */}
          <div className="mt-20 grid gap-y-4 border-t border-negro/10 py-8 lg:mt-24 lg:grid-cols-12 lg:gap-x-8">
            <p className="text-sm font-medium text-negro/60 lg:col-span-3">{t('home.clientes')}</p>
            <ul className="flex flex-wrap gap-x-8 gap-y-3 lg:col-span-9">
              {CLIENTES.map((marca) => (
                <li key={marca} className="text-[15px] font-semibold tracking-subtitular text-negro/70">
                  {marca}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* DIAGNÓSTICO: el problema que resuelve Socius */}
      <section className="bg-negro py-24 text-white sm:py-32">
        <div className={contenedor}>
          <EncabezadoSeccion oscuro etiqueta={t('home.diagnostico.etiqueta')} titulo={[t('home.diagnostico.titulo1'), t('home.diagnostico.titulo2')]} />
          <Columna className="mt-16">
            <ul className="grid gap-10 md:grid-cols-3 md:gap-8">
              {t('home.diagnostico.problemas').map(({ titulo, desc }) => (
                <li key={titulo} className="border-t border-white/20 pt-5">
                  <h3 className="text-lg font-bold">{titulo}</h3>
                  <p className="mt-2 leading-relaxed text-white/70">{desc}</p>
                </li>
              ))}
            </ul>
            <div className="mt-20 max-w-2xl">
              <p className="text-2xl font-bold tracking-subtitular sm:text-3xl">{t('home.diagnostico.cierre1')}</p>
              <p className="mt-3 text-lg leading-relaxed text-white/70">{t('home.diagnostico.cierre2')}</p>
            </div>
          </Columna>
        </div>
      </section>

      {/* CÓMO FUNCIONA LA MÁQUINA: tres etapas en orden */}
      <section className="py-24 sm:py-32">
        <div className={contenedor}>
          <EncabezadoSeccion etiqueta={t('home.queEs')} titulo={[t('home.queEsTitulo1'), t('home.queEsTitulo2')]}>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-negro/70 sm:text-xl">{t('home.queEsP1')}</p>
            <p className="mt-4 font-semibold text-negro">{t('home.queEsP2')}</p>
            <Link to="/agenda" className={`${boton.texto} mt-8`}>
              {t('comun.hablarEstratega')}
            </Link>
          </EncabezadoSeccion>

          <Columna className="mt-16">
            <ol className="grid gap-0 md:grid-cols-3 md:gap-8">
              {t('home.pilares').map(({ titulo, desc, metrica }, i, lista) => (
                <li key={titulo} className="relative flex gap-5 pb-10 md:block md:pb-0">
                  {/* Conector: vertical en móvil, horizontal en escritorio */}
                  {i < lista.length - 1 && (
                    <>
                      <span aria-hidden="true" className="absolute bottom-0 left-5 top-11 w-px bg-violeta/25 md:hidden" />
                      <span aria-hidden="true" className="absolute left-12 right-0 top-5 hidden h-px bg-violeta/25 md:block" />
                    </>
                  )}
                  <span className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-violeta bg-white text-sm font-bold text-violeta">
                    {i + 1}
                  </span>
                  <div className="md:mt-6">
                    <h3 className="text-lg font-bold leading-snug text-negro">{titulo}</h3>
                    <p className="mt-2 leading-relaxed text-negro/70">{desc}</p>
                    <p className="mt-4 border-t border-violeta/20 pt-3 text-sm font-semibold leading-snug text-violeta">{metrica}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Columna>
        </div>
      </section>

      {/* MÉTRICAS: una ficha técnica de resultados */}
      <section className="bg-lavanda py-24 sm:py-32">
        <div className={contenedor}>
          <EncabezadoSeccion etiqueta={t('home.resultados')} titulo={t('home.resultadosTitulo')} tamano="medio" />
          <dl className="mt-14">
            {metricas.map(({ valor, unidad, texto }) => (
              <div key={texto} className="grid items-baseline gap-x-8 gap-y-1 border-t border-violeta/15 py-6 sm:grid-cols-2 lg:grid-cols-12 lg:py-8">
                <dt className="order-2 max-w-sm text-base leading-snug text-negro/70 sm:text-lg lg:col-span-4 lg:col-start-9">{texto}</dt>
                <dd className="cifra order-1 text-[clamp(3rem,7vw,5.5rem)] leading-none text-negro lg:col-span-5 lg:col-start-4">
                  {valor}
                  {unidad && <span className="ml-2 text-[0.4em] font-bold text-violeta">{unidad.trim()}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* NIVELES DE INVOLUCRAMIENTO: tres edificios de distinta altura */}
      <section className="py-24 sm:py-32">
        <div className={contenedor}>
          <EncabezadoSeccion etiqueta={t('home.niveles.etiqueta')} titulo={[t('home.niveles.titulo1'), t('home.niveles.titulo2')]} sub={t('home.niveles.sub')} />
          <Columna className="mt-16">
            <ul className="grid gap-12 md:grid-cols-3 md:gap-6">
              {t('home.niveles.items').map(({ modo, nombre, desc, nota }, i) => {
                const torre = TORRES[i] ?? TORRES.at(-1)
                return (
                  <li key={nombre} className="flex flex-col">
                    <div className="flex flex-col justify-end md:h-72">
                      <div className={`flex flex-col justify-between rounded-t-md p-5 ${torre.alto} ${torre.estilo}`}>
                        <p className="text-sm font-medium opacity-80">{modo}</p>
                        <h3 className="titular text-2xl sm:text-[1.75rem]">{nombre}</h3>
                      </div>
                    </div>
                    <div className="border-t-2 border-negro pt-5">
                      <p className="leading-relaxed text-negro/70">{desc}</p>
                      <p className="mt-4 flex items-start gap-2 text-sm font-semibold text-negro">
                        <Check size={16} aria-hidden="true" className={`mt-0.5 flex-shrink-0 ${torre.nota}`} />
                        {nota}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="mt-16 flex flex-col gap-6 rounded-md bg-lavanda p-6 sm:p-8 md:flex-row md:items-center">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-white text-violeta">
                <GraduationCap size={22} aria-hidden="true" />
              </span>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-negro">{t('home.niveles.aviTitulo')}</h3>
                <p className="mt-1 max-w-2xl leading-relaxed text-negro/70">{t('home.niveles.aviTexto')}</p>
              </div>
              <Link to="/catalogo" className={`${boton.chico} self-start md:self-center`}>
                {t('home.niveles.aviCta')}
              </Link>
            </div>
          </Columna>
        </div>
      </section>

      {/* MÉTODO SOCIUS: las seis iniciales deletrean la marca */}
      <section className="bg-lavanda py-24 sm:py-32">
        <div className={contenedor}>
          <EncabezadoSeccion etiqueta={t('home.metodo.etiqueta')} titulo={[t('home.metodo.titulo1'), t('home.metodo.titulo2')]} />
          <ol className="mt-16 grid border-t border-violeta/15 sm:grid-cols-2 lg:grid-cols-6">
            {t('home.metodo.pasos').map(({ letra, titulo, desc }, i) => (
              <li
                key={titulo}
                className={`flex gap-5 border-b border-violeta/15 py-6 lg:block lg:border-b-0 lg:border-l lg:px-5 lg:py-8 lg:first:border-l-0 lg:first:pl-0 ${
                  i % 2 === 1 ? 'sm:border-l sm:pl-5' : 'sm:pr-5'
                }`}
              >
                <span aria-hidden="true" className="w-14 flex-shrink-0 font-display text-6xl font-bold leading-[0.8] text-violeta lg:block lg:w-auto lg:text-[clamp(5rem,8vw,7.5rem)]">
                  {letra}
                </span>
                <div className="lg:mt-8">
                  <h3 className="font-bold leading-snug text-negro">{titulo}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-negro/70">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* PROGRAMAS: lista de precios */}
      <section className="py-24 sm:py-32">
        <div className={contenedor}>
          <EncabezadoSeccion etiqueta={t('home.programas')} titulo={t('home.programasTitulo')} sub={t('home.programasSub')} tamano="medio" />
          <ul className="mt-14 border-t border-negro/10">
            {programas.map((p) => (
              <ProgramaCard key={p.id} programa={p} modo="catalogo" />
            ))}
          </ul>
          <div className="mt-10 lg:grid lg:grid-cols-12 lg:gap-x-8">
            <Link to="/catalogo" className={`${boton.texto} lg:col-span-9 lg:col-start-4`}>
              {t('home.verComparativa')}
            </Link>
          </div>
        </div>
      </section>

      {/* CTA FINAL: cianotipo */}
      <section className="plano-claro bg-violeta py-24 text-white sm:py-32">
        <div className={`${contenedor} grid gap-y-10 lg:grid-cols-12 lg:gap-x-8`}>
          <div className="lg:col-span-9 lg:col-start-4">
            <h2 className="titular text-[clamp(1.9rem,4.8vw,4rem)] leading-[1.0]">
              <span className="block">{t('home.ctaTitulo1')}</span>
              <span className="block">{t('home.ctaTitulo2')}</span>
            </h2>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-white/85">{t('home.ctaTexto')}</p>
            <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-center">
              <Link to="/agenda" className={boton.claro}>
                {t('comun.agendarLlamadaEstrategica')}
              </Link>
              <Link to="/cotizador" className="font-semibold text-white underline decoration-white/40 decoration-2 underline-offset-[6px] transition-colors hover:decoration-white">
                {t('home.irCotizador')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PREGUNTAS FRECUENTES: siempre al final de la portada */}
      <PreguntasFrecuentes />
    </div>
  )
}
