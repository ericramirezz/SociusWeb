import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { config, formatoLargo } from '../core'
import { programas } from '../data/programas'
import es from './es'
import en from './en'

// Idiomas disponibles. Para agregar otro: crear su diccionario y registrarlo aquí.
export const IDIOMAS = [
  { codigo: 'es', nombre: 'Español (Latinoamérica)', locale: 'es-MX', diccionario: es },
  { codigo: 'en', nombre: 'English (US)', locale: 'en-US', diccionario: en },
]
const POR_CODIGO = Object.fromEntries(IDIOMAS.map((i) => [i.codigo, i]))
const CLAVE = 'socius_idioma'

const leerGuardado = () => {
  try {
    const guardado = localStorage.getItem(CLAVE)
    return POR_CODIGO[guardado] ? guardado : 'es'
  } catch {
    return 'es'
  }
}

const buscar = (dic, ruta) => ruta.split('.').reduce((nodo, parte) => nodo?.[parte], dic)

// t('home.hero.titulo') devuelve el texto; t('faq.items') puede devolver listas u objetos.
// Interpola {variables}; si falta una clave en inglés, usa la de español.
function crearT(diccionario) {
  return (ruta, vars) => {
    let valor = buscar(diccionario, ruta) ?? buscar(es, ruta)
    if (valor === undefined) return ruta
    if (typeof valor === 'string' && vars) {
      valor = valor.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`))
    }
    return valor
  }
}

const FORMA_PAGO = Object.fromEntries(programas.map((p) => [p.id, p.formaPago ?? 'unico']))

const IdiomaContext = createContext(null)

export function IdiomaProvider({ children }) {
  const [idioma, setIdiomaState] = useState(leerGuardado)

  const setIdioma = useCallback((codigo) => {
    if (!POR_CODIGO[codigo]) return
    setIdiomaState(codigo)
    try {
      localStorage.setItem(CLAVE, codigo)
    } catch {
      /* sin almacenamiento: el cambio dura solo esta visita */
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = POR_CODIGO[idioma].locale
  }, [idioma])

  const valor = useMemo(() => {
    const { locale, diccionario } = POR_CODIGO[idioma]
    const t = crearT(diccionario)
    return {
      idioma,
      locale,
      setIdioma,
      t,
      fecha: (iso) => formatoLargo(iso, locale),
      // Detalle del cobro de un programa ("Pago único", "4 mensualidades…") por su id.
      cobro: (idPrograma) => t(`cobro.${FORMA_PAGO[idPrograma] ?? 'unico'}`, { meses: config.mesesPrograma }),
      // Texto traducido de un programa del catálogo: descripcion, paraQuien o pago.
      programa: (p, campo) => t(`programas.${p.id}.${campo}`),
    }
  }, [idioma, setIdioma])

  return <IdiomaContext.Provider value={valor}>{children}</IdiomaContext.Provider>
}

export function useIdioma() {
  const ctx = useContext(IdiomaContext)
  if (!ctx) throw new Error('useIdioma debe usarse dentro de <IdiomaProvider>')
  return ctx
}

// Elige la versión traducida de un dato que trae { ..., traduccion: { en: {...} } }.
export const localizar = (dato, idioma) => ({ ...dato, ...(dato.traduccion?.[idioma] ?? {}) })
