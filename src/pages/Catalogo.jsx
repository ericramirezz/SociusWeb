import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { programas } from '../data/programas'
import { seleccion } from '../core'
import { useIdioma } from '../i18n/IdiomaContext'
import { Bloque, EncabezadoPagina } from '../components/Lamina'
import { boton, contenedor } from '../components/estilos'

// Tipo de programa → etiqueta. Todas en la familia de azules de la marca.
const tipoDe = (id) => (id.includes('split') ? 'split' : id === 'avi' ? 'formativo' : id.includes('ia') ? 'ia' : 'completo')
const coloresTag = {
  completo: 'bg-negro text-white',
  split: 'bg-lavanda text-violeta',
  ia: 'bg-cian text-negro', // cian = acento de IA
  formativo: 'border border-violeta/30 text-violeta',
}

export default function Catalogo() {
  const navigate = useNavigate()
  const { t, programa: txt } = useIdioma()

  const handleSeleccionar = (id) => {
    seleccion.agregar(id)
    navigate('/cotizador')
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      <EncabezadoPagina etiqueta={t('catalogo.etiqueta')} titulo={t('catalogo.titulo')} sub={t('catalogo.subtitulo')} />

      {/* Fichas técnicas: una por programa */}
      <div className={`${contenedor} mt-16`}>
        {programas.map((p) => {
          const tipo = tipoDe(p.id)
          return (
            <article key={p.id} className="grid gap-y-6 border-t border-negro/10 py-10 lg:grid-cols-12 lg:gap-x-8">
              {/* Clasificación al margen */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:col-span-3 lg:flex-col lg:items-start">
                <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${coloresTag[tipo]}`}>
                  {t(`catalogo.tags.${tipo}`)}
                </span>
                {p.destacado && (
                  <span className="flex items-center gap-2 text-sm font-semibold text-violeta">
                    <Bloque />
                    {t('card.masPopular')}
                  </span>
                )}
              </div>

              {/* Qué es y para quién */}
              <div className="lg:col-span-3">
                <h2 className="titular text-[1.75rem] leading-none text-negro">{p.nombre}</h2>
                <p className="mt-3 leading-relaxed text-negro/70">{txt(p, 'descripcion')}</p>
                <p className="mt-5 text-sm text-negro/60">{t('catalogo.idealPara')}</p>
                <p className="mt-1 font-medium leading-snug text-negro">{txt(p, 'paraQuien')}</p>
              </div>

              {/* Qué incluye */}
              <ul className="space-y-2.5 lg:col-span-3">
                {(t(`catalogo.features.${p.id}`) || []).map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[15px] text-negro/80">
                    <Check size={16} aria-hidden="true" className="mt-0.5 flex-shrink-0 text-violeta" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* Precio */}
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between lg:col-span-3 lg:flex-col lg:items-stretch lg:justify-start">
                <div>
                  <p className="flex items-baseline gap-1.5">
                    <span className="cifra text-4xl text-negro">${p.precio.toLocaleString('es-MX')}</span>
                    <span className="text-sm text-negro/60">{p.moneda}</span>
                  </p>
                  <p className="mt-1 text-sm text-negro/60">{txt(p, 'pago')}</p>
                </div>
                <button onClick={() => handleSeleccionar(p.id)} className={`${p.destacado ? boton.primario : boton.secundario} w-full sm:w-auto lg:w-full`}>
                  {t('catalogo.seleccionar')}
                </button>
              </div>
            </article>
          )
        })}

        {/* ¿No sabes cuál elegir? */}
        <div className="grid gap-y-6 border-t-2 border-negro pt-10 lg:grid-cols-12 lg:gap-x-8">
          <div className="lg:col-span-6 lg:col-start-4">
            <p className="text-xl leading-snug text-negro sm:text-2xl">
              <span className="font-bold">{t('catalogo.noSabes')}</span> <span className="text-violeta">{t('catalogo.agendaUna')}</span>{' '}
              {t('catalogo.noSabesFin')}
            </p>
          </div>
          <div className="lg:col-span-3 lg:text-right">
            <button onClick={() => navigate('/agenda')} className={boton.chico}>
              {t('comun.hablarEstratega')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
