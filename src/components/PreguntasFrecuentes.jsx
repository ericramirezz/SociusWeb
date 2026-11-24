import { useState } from 'react'
import { Plus } from 'lucide-react'
import { config } from '../core'
import { useIdioma } from '../i18n/IdiomaContext'
import { contenedor } from './estilos'

// Acordeón de preguntas frecuentes. Las preguntas viven en los diccionarios
// (i18n/es.js y en.js, clave faq.items); los números salen de la configuración.
export default function PreguntasFrecuentes() {
  const { t } = useIdioma()
  const [abierta, setAbierta] = useState(null)
  const vars = {
    dias: config.diasHabilesMinimosArranque,
    primera: config.diasPrimeraVersion,
    meses: config.mesesPrograma,
  }
  const interpolar = (texto) => texto.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)

  return (
    <section id="preguntas-frecuentes" className="py-24 sm:py-32">
      <div className={contenedor}>
      <div className="grid gap-y-10 border-t border-negro/10 pt-6 lg:grid-cols-12 lg:gap-x-8">
        <div className="lg:col-span-3">
          <h2 className="titular text-[clamp(1.6rem,3vw,2.25rem)] leading-[1.04] text-negro lg:sticky lg:top-28">
            {t('faq.titulo')}
          </h2>
        </div>

        <div className="lg:col-span-8 lg:col-start-5">
          {t('faq.items').map((item, i) => {
            const activa = abierta === i
            const idPanel = `faq-panel-${i}`
            return (
              <div key={i} className="border-b border-negro/10 first:border-t lg:first:border-t-0">
                <h3>
                  <button
                    type="button"
                    onClick={() => setAbierta(activa ? null : i)}
                    aria-expanded={activa}
                    aria-controls={idPanel}
                    className={`flex w-full items-center justify-between gap-6 py-6 text-left text-lg font-semibold tracking-[-0.01em] transition-colors duration-200 ${
                      activa ? 'text-violeta' : 'text-negro hover:text-violeta'
                    }`}
                  >
                    {item.q}
                    <span
                      aria-hidden="true"
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md transition-[transform,background-color,color] duration-300 ${
                        activa ? 'rotate-45 bg-violeta text-white' : 'bg-lavanda text-violeta'
                      }`}
                    >
                      <Plus size={16} strokeWidth={2.5} />
                    </span>
                  </button>
                </h3>
                {activa && (
                  <div id={idPanel} className="max-w-2xl pb-7 pr-12 leading-relaxed text-negro/70 animate-aparece">
                    {interpolar(item.a)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      </div>
    </section>
  )
}
