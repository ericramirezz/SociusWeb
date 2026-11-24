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
        className={`flex h-10 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors duration-200 ${
          abierto ? 'bg-lavanda text-violeta' : 'text-negro/70 hover:bg-lavanda hover:text-negro'
        }`}
      >
        <Globe size={18} aria-hidden="true" />
        <span className="text-xs font-semibold uppercase">{idioma}</span>
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-2 w-60 overflow-hidden rounded-md border border-negro/10 bg-white py-1.5 shadow-[0_16px_40px_-16px_rgb(17_16_33_/_0.35)] animate-aparece"
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
                className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium transition-colors ${
                  activo ? 'text-violeta' : 'text-negro/80 hover:bg-lavanda hover:text-negro'
                }`}
              >
                {i.nombre}
                {activo && <Check size={16} aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
