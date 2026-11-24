import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { seleccion } from '../core'
import { useIdioma } from '../i18n/IdiomaContext'
import { boton } from './estilos'

// Un programa del catálogo en dos presentaciones:
//  - modo "catalogo": una fila de la lista de precios de la portada.
//  - modo "cotizador": una fila que se marca o desmarca para armar el paquete.
export default function ProgramaCard({ programa, seleccionado, onToggle, modo = 'catalogo' }) {
  const navigate = useNavigate()
  const { t, programa: txt } = useIdioma()
  const precio = `$${programa.precio.toLocaleString('es-MX')}`
  const sinDosPuntos = (texto) => texto.replace(/:\s*$/, '')

  const handleCotizar = () => {
    seleccion.agregar(programa.id)
    navigate('/cotizador')
  }

  if (modo === 'cotizador') {
    return (
      <button
        type="button"
        onClick={() => onToggle(programa.id)}
        aria-pressed={Boolean(seleccionado)}
        className={`group flex w-full items-start gap-4 rounded-md border p-4 text-left transition-colors duration-200 sm:p-5 ${
          seleccionado ? 'border-violeta bg-lavanda' : 'border-negro/10 bg-white hover:border-negro/30'
        }`}
      >
        {/* Casilla: se llena con el bloque azul al elegir */}
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[4px] border-2 transition-colors ${
            seleccionado ? 'border-violeta bg-violeta text-white' : 'border-negro/20 text-transparent group-hover:border-violeta/60'
          }`}
        >
          <Check size={13} strokeWidth={3} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="text-[15px] font-bold text-negro">{programa.nombre}</span>
            {programa.destacado && (
              <span className="rounded-full bg-violeta px-2 py-0.5 text-[11px] font-semibold text-white">{t('card.destacado')}</span>
            )}
          </span>
          <span className="mt-1 block text-sm leading-snug text-negro/70">{txt(programa, 'descripcion')}</span>
          <span className="mt-2 block text-[13px] text-negro/60">
            {t(`tipo.${programa.tipo}`)} · {txt(programa, 'pago')}
          </span>
        </span>
        <span className="text-right">
          <span className="block whitespace-nowrap cifra text-base text-negro">{precio}</span>
          <span className="block text-xs text-negro/60">{programa.moneda}</span>
        </span>
      </button>
    )
  }

  return (
    <li className="group grid gap-x-8 gap-y-4 border-b border-negro/10 py-6 transition-colors sm:grid-cols-2 lg:grid-cols-12 lg:items-center">
      <div className="sm:col-span-2 lg:col-span-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="titular text-xl text-negro">{programa.nombre}</h3>
          {programa.destacado && (
            <span className="rounded-full bg-violeta px-2.5 py-0.5 text-xs font-semibold text-white">{t('card.masPopular')}</span>
          )}
        </div>
        <p className="mt-1.5 leading-snug text-negro/70">{txt(programa, 'descripcion')}</p>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:col-span-2 lg:col-span-4">
        <div>
          <dt className="text-negro/60">{sinDosPuntos(t('card.paraQuien'))}</dt>
          <dd className="mt-0.5 font-medium leading-snug text-negro">{txt(programa, 'paraQuien')}</dd>
        </div>
        <div>
          <dt className="text-negro/60">{sinDosPuntos(t('card.pago'))}</dt>
          <dd className="mt-0.5 font-medium leading-snug text-negro">{txt(programa, 'pago')}</dd>
        </div>
      </dl>

      <p className="flex items-baseline gap-1.5 lg:col-span-2 lg:justify-end">
        <span className="cifra text-2xl text-negro">{precio}</span>
        <span className="text-sm text-negro/60">{programa.moneda}</span>
      </p>

      <div className="sm:text-right lg:col-span-2">
        <button onClick={handleCotizar} className={programa.destacado ? boton.chico : boton.chicoContorno}>
          {t('card.cotizar')}
        </button>
      </div>
    </li>
  )
}
