import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { config } from '../core'
import { useIdioma } from '../i18n/IdiomaContext'

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
    <section id="preguntas-frecuentes" className="py-20 px-4 border-t border-slate-200">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-black text-navy mb-10">{t('faq.titulo')}</h2>

        <div className="space-y-2.5">
          {t('faq.items').map((item, i) => {
            const activa = abierta === i
            const idPanel = `faq-panel-${i}`
            return (
              <div key={i} className={`rounded-lg transition-colors duration-200 ${activa ? 'bg-brand-soft' : 'bg-slate-50'}`}>
                <h3>
                  <button
                    type="button"
                    onClick={() => setAbierta(activa ? null : i)}
                    aria-expanded={activa}
                    aria-controls={idPanel}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left text-navy text-base sm:text-lg font-medium rounded-lg hover:bg-brand-soft transition-colors duration-200"
                  >
                    {item.q}
                    <ChevronRight
                      size={20}
                      className={`flex-shrink-0 text-navy transition-transform duration-200 ${activa ? 'rotate-90' : ''}`}
                    />
                  </button>
                </h3>
                {activa && (
                  <div id={idPanel} className="px-6 pb-6 -mt-1 text-slate-700 text-sm sm:text-base leading-relaxed animate-fade-in">
                    {interpolar(item.a)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
