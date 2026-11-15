import { useEffect, useRef, useState } from 'react'
import { Globe, Check } from 'lucide-react'
import { IDIOMAS, useIdioma } from '../i18n/IdiomaContext'

// Botón con el mundo: abre un menú con los idiomas disponibles.
// Se cierra al elegir, al hacer clic fuera o con Escape.
export default function SelectorIdioma() {
  const { idioma, setIdioma, t } = useIdioma()
  const [abierto, setAbierto] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!abierto) return
    const fuera = (e) => ref.current && !ref.current.contains(e.target) && setAbierto(false)
    const escape = (e) => e.key === 'Escape' && setAbierto(false)
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', escape)
    }
  }, [abierto])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-label={t('nav.idioma')}
        aria-haspopup="menu"
        aria-expanded={abierto}
        className={`flex items-center gap-1.5 p-2 rounded-md text-sm font-medium transition-colors duration-200 ${
          abierto ? 'text-brand bg-brand/10' : 'text-slate-700 hover:text-navy hover:bg-slate-100'
        }`}
      >
        <Globe size={19} />
        <span className="uppercase text-xs font-semibold">{idioma}</span>
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-60 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/70 py-2 animate-fade-in"
        >
          {IDIOMAS.map((i) => {
            const activo = i.codigo === idioma
            return (
              <button
                key={i.codigo}
                type="button"
                role="menuitemradio"
                aria-checked={activo}
                lang={i.locale}
                onClick={() => {
                  setIdioma(i.codigo)
                  setAbierto(false)
                }}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold transition-colors ${
                  activo ? 'text-brand bg-brand/5' : 'text-slate-700 hover:bg-slate-50 hover:text-navy'
                }`}
              >
                {i.nombre}
                {activo && <Check size={16} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
