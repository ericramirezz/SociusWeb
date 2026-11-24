import { useEffect, useState } from 'react'
import { useIdioma } from '../i18n/IdiomaContext'
import { Cota } from './Lamina'

// La promesa de Socius dibujada: las ventas de doce meses (un bloque por mes)
// se apilan en las primeras cuatro columnas, como pisos de un edificio.
// Es el único movimiento automático del sitio; con "reducir movimiento" se ve ya apilado.
// Cada bloque lleva su pedazo del degradado de marca (violeta → cian): apilados, forman uno solo.
const COLUMNAS = 12
const DESTINO = 4

const lugar = (i, apilado) => (apilado ? { col: i % DESTINO, fila: Math.floor(i / DESTINO) } : { col: i, fila: 0 })

const caja = (col, fila) => ({
  left: `calc(${col} * 100% / ${COLUMNAS} + 2px)`,
  bottom: `calc(${fila} * 100% / 3 + 2px)`,
  width: `calc(100% / ${COLUMNAS} - 4px)`,
  height: 'calc(100% / 3 - 4px)',
})

export default function CompresionTiempo() {
  const { t, locale } = useIdioma()
  const [apilado, setApilado] = useState(false)

  useEffect(() => {
    const quieto = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (quieto) {
      setApilado(true)
      return undefined
    }
    const id = setTimeout(() => setApilado(true), 900)
    return () => clearTimeout(id)
  }, [])

  const meses = Array.from({ length: COLUMNAS }, (_, i) => new Date(2026, i, 15).toLocaleDateString(locale, { month: 'narrow' }))
  const unidad = t('home.metricas.meses')

  return (
    <figure aria-hidden="true" className="w-full select-none">
      <div className="plano relative aspect-[12/3] w-full border-r border-t border-violeta/10 border-b-2 border-b-negro">
        {/* Lo que queda libre: ocho meses que ya no se necesitan */}
        {meses.map((_, i) =>
          i < DESTINO ? null : (
            <span
              key={`libre-${i}`}
              className={`absolute border border-dashed border-violeta/35 transition-opacity duration-500 ${apilado ? 'opacity-100' : 'opacity-0'}`}
              style={{ ...caja(i, 0), transitionDelay: apilado ? '600ms' : '0ms' }}
            />
          )
        )}
        {meses.map((_, i) => {
          const { col, fila } = lugar(i, apilado)
          const final = lugar(i, true)
          return (
            <span
              key={`mes-${i}`}
              className="absolute bg-degradado transition-[left,bottom] duration-700 ease-[cubic-bezier(0.65,0,0.35,1)]"
              style={{
                ...caja(col, fila),
                backgroundSize: `${DESTINO * 100}% 300%`,
                backgroundPosition: `${(final.col / (DESTINO - 1)) * 100}% ${((2 - final.fila) / 2) * 100}%`,
                transitionDelay: `${Math.max(0, i - DESTINO) * 70}ms`,
              }}
            />
          )
        })}
      </div>

      <div className="mt-2 grid grid-cols-12 text-center text-[11px] font-semibold uppercase">
        {meses.map((m, i) => (
          <span key={i} className={i < DESTINO ? 'text-negro' : 'text-negro/50'}>
            {m}
          </span>
        ))}
      </div>

      <Cota texto={`12${unidad}`} className="mt-5" />
      <div className="mt-2 w-1/3">
        <Cota
          texto={`4${unidad}`}
          tono="text-violeta"
          textoClase="text-violeta"
          className="transition-[clip-path] duration-700 ease-out"
          style={{ clipPath: apilado ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)', transitionDelay: apilado ? '1300ms' : '0ms' }}
        />
      </div>
    </figure>
  )
}
