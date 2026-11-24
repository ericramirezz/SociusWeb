import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LogIn, LogOut, Package } from 'lucide-react'
import { useSesion } from '../sesion/SesionContext'
import { useIdioma } from '../i18n/IdiomaContext'

// Sin sesión: enlace "Entrar". Con sesión: inicial del correo que abre un menú
// con el correo, Mis pedidos y Salir. Si Supabase no está configurado, no se muestra.
export default function MenuCuenta() {
  const { t } = useIdioma()
  const { usuario, cargando, disponible, salir } = useSesion()
  const [abierto, setAbierto] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!abierto) return undefined
    const fuera = (e) => ref.current && !ref.current.contains(e.target) && setAbierto(false)
    const escape = (e) => e.key === 'Escape' && setAbierto(false)
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', escape)
    }
  }, [abierto])

  if (!disponible || cargando) return null

  if (!usuario) {
    return (
      <Link
        to="/entrar"
        aria-label={t('nav.entrar')}
        className="flex h-10 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-negro/70 transition-colors hover:bg-lavanda hover:text-negro"
      >
        <LogIn size={18} aria-hidden="true" />
        <span className="hidden xl:inline">{t('nav.entrar')}</span>
      </Link>
    )
  }

  const opcion = 'flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-medium text-negro/80 transition-colors hover:bg-lavanda hover:text-negro'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-label={t('nav.cuenta')}
        aria-haspopup="menu"
        aria-expanded={abierto}
        className="ml-1 flex h-9 w-9 items-center justify-center rounded-md bg-negro text-sm font-bold text-white transition-colors hover:bg-violeta"
      >
        {usuario.email?.[0]?.toUpperCase() ?? '?'}
      </button>
      {abierto && (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-2 w-64 overflow-hidden rounded-md border border-negro/10 bg-white py-1.5 shadow-[0_16px_40px_-16px_rgb(17_16_33_/_0.35)] animate-aparece"
        >
          <p className="break-all border-b border-negro/10 px-4 pb-3 pt-2 text-[13px] text-negro/60">{usuario.email}</p>
          <Link to="/pedidos" role="menuitem" onClick={() => setAbierto(false)} className={opcion}>
            <Package size={15} aria-hidden="true" />
            {t('nav.pedidos')}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setAbierto(false)
              salir()
            }}
            className={opcion}
          >
            <LogOut size={15} aria-hidden="true" />
            {t('nav.salir')}
          </button>
        </div>
      )}
    </div>
  )
}
