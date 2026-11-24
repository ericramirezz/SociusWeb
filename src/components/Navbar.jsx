import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useIdioma } from '../i18n/IdiomaContext'
import SelectorIdioma from './SelectorIdioma'
import MenuCuenta from './MenuCuenta'
import Logo from './Logo'
import { boton, contenedor } from './estilos'

const navLinks = [
  { clave: 'inicio', href: '/' },
  { clave: 'programas', href: '/catalogo' },
  { clave: 'testimonios', href: '/testimonios' },
  { clave: 'cotizador', href: '/cotizador' },
  { clave: 'pedidos', href: '/pedidos' },
  { clave: 'agendar', href: '/agenda' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const { t } = useIdioma()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Con el menú móvil abierto, la página de atrás no se desplaza.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const solido = scrolled || menuOpen

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-300 ${
        // Sin desenfoque con el menú abierto: backdrop-filter haría que el panel fijo se mida contra la barra.
        menuOpen ? 'border-b border-negro/10 bg-white' : solido ? 'border-b border-negro/10 bg-white/95 backdrop-blur-md' : 'border-b border-transparent bg-white/0'
      }`}
    >
      <div className={contenedor}>
        <div className="flex h-[72px] items-center justify-between gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <Logo className="h-8" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-7 lg:flex">
            {navLinks.map((link) => {
              const activo = location.pathname === link.href
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  aria-current={activo ? 'page' : undefined}
                  className={`relative py-2 text-sm font-medium transition-colors duration-200 ${
                    activo
                      ? 'text-negro after:absolute after:inset-x-0 after:-bottom-[25px] after:h-0.5 after:bg-violeta'
                      : 'text-negro/70 hover:text-negro'
                  }`}
                >
                  {t(`nav.${link.clave}`)}
                </Link>
              )
            })}
          </nav>

          {/* Idioma + CTA */}
          <div className="hidden items-center gap-1 lg:flex">
            <SelectorIdioma />
            <MenuCuenta />
            <Link to="/agenda" className={`${boton.chico} ml-3`}>
              {t('nav.cta')}
            </Link>
          </div>

          {/* Mobile: idioma + hamburguesa */}
          <div className="flex items-center gap-1 lg:hidden">
            <SelectorIdioma />
            <MenuCuenta />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-md p-2 text-negro transition-colors hover:bg-lavanda"
              aria-label={t('nav.abrirMenu')}
              aria-expanded={menuOpen}
              aria-controls="menu-movil"
            >
              {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu: hoja completa con enlaces grandes */}
      {menuOpen && (
        <div id="menu-movil" className="fixed inset-x-0 bottom-0 top-[73px] overflow-y-auto bg-white lg:hidden">
          <nav className={`${contenedor} flex min-h-full flex-col pb-8 pt-4`}>
            <ul className="border-t border-negro/10">
              {navLinks.map((link) => {
                const activo = location.pathname === link.href
                return (
                  <li key={link.href} className="border-b border-negro/10">
                    <Link
                      to={link.href}
                      aria-current={activo ? 'page' : undefined}
                      className={`flex items-center justify-between py-4 text-2xl font-bold tracking-subtitular ${
                        activo ? 'text-violeta' : 'text-negro'
                      }`}
                    >
                      {t(`nav.${link.clave}`)}
                      {activo && <span aria-hidden="true" className="h-2.5 w-2.5 bg-violeta" />}
                    </Link>
                  </li>
                )
              })}
            </ul>
            <Link to="/agenda" className={`${boton.primario} mt-auto w-full`}>
              {t('nav.ctaMovil')}
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
