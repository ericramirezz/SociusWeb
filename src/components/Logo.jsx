import { useState } from 'react'

// Logo oficial de Socius. El brief pide usar solo los archivos oficiales: nunca tipear
// "SOCIUS" ni redibujar el infinito. Coloca los archivos de la carpeta de marca en
// public/marca/ con estos nombres y aparecerán solos en la barra y el pie de página.
// Mientras no estén, se muestra un texto provisional.
const ARCHIVOS = {
  color: '/marca/socius-logo.png',
  blanco: '/marca/socius-logo-blanco.png',
}

export default function Logo({ variante = 'color', className = 'h-8' }) {
  const [falta, setFalta] = useState(false)

  if (!falta) {
    return <img src={ARCHIVOS[variante]} alt="Socius Real Estate" className={`w-auto ${className}`} onError={() => setFalta(true)} />
  }
  return (
    <span className={`font-display text-[22px] font-bold tracking-[0.18em] ${variante === 'blanco' ? 'text-white' : 'text-violeta'}`}>
      SOCIUS
    </span>
  )
}
