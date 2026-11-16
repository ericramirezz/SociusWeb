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
        className="flex items-center gap-1.5 p-2 rounded-md text-sm font-medium text-slate-700 hover:text-navy hover:bg-slate-100 transition-colors"
      >
        <LogIn size={18} />
        <span className="hidden xl:inline">{t('nav.entrar')}</span>
      </Link>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-label={t('nav.cuenta')}
        aria-haspopup="menu"
        aria-expanded={abierto}
        className="w-9 h-9 rounded-full bg-brand text-white text-sm font-bold flex items-center justify-center hover:bg-brand-dark transition-colors"
      >
        {usuario.email?.[0]?.toUpperCase() ?? '?'}
      </button>
      {abierto && (
        <div role="menu" className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/70 py-2 animate-fade-in">
          <p className="px-4 pt-1 pb-3 text-xs text-slate-500 border-b border-slate-100 break-all">{usuario.email}</p>
          <Link
            to="/pedidos"
            role="menuitem"
            onClick={() => setAbierto(false)}
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-navy"
          >
            <Package size={15} />
            {t('nav.pedidos')}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setAbierto(false)
              salir()
            }}
            className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-navy"
          >
            <LogOut size={15} />
            {t('nav.salir')}
          </button>
        </div>
      )}
    </div>
  )
}
