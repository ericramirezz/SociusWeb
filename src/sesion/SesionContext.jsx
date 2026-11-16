import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { sesion as servicioPorDefecto } from '../core'

// Comparte el usuario actual con toda la app. Escucha al servicio de sesión
// (patrón Observer) y se actualiza solo cuando alguien entra o sale.
// `servicio` se puede reemplazar en las pruebas por uno falso.
const SesionContext = createContext(null)

export function SesionProvider({ children, servicio = servicioPorDefecto }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(servicio.disponible)

  useEffect(() => {
    if (!servicio.disponible) return undefined
    let vigente = true
    servicio.usuarioActual().then((u) => {
      if (!vigente) return
      setUsuario(u)
      setCargando(false)
    })
    const dejarDeEscuchar = servicio.alCambiar((u) => {
      setUsuario(u)
      setCargando(false)
    })
    return () => {
      vigente = false
      dejarDeEscuchar()
    }
  }, [servicio])

  const valor = useMemo(
    () => ({ usuario, cargando, disponible: servicio.disponible, servicio, salir: () => servicio.salir() }),
    [usuario, cargando, servicio]
  )
  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>
}

export function useSesion() {
  const ctx = useContext(SesionContext)
  if (!ctx) throw new Error('useSesion debe usarse dentro de <SesionProvider>')
  return ctx
}
