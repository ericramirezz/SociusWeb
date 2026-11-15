import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, ChevronRight } from 'lucide-react'
import { useIdioma } from '../i18n/IdiomaContext'
import SelectorIdioma from './SelectorIdioma'

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
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-lg shadow-slate-200/70' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-black tracking-widest text-brand group-hover:text-brand-dark transition-colors duration-200">
              SOCIUS
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`px-3 xl:px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  location.pathname === link.href
                    ? 'text-brand bg-brand/10'
                    : 'text-slate-700 hover:text-navy hover:bg-slate-100'
                }`}
              >
                {t(`nav.${link.clave}`)}
              </Link>
            ))}
          </nav>

          {/* Idioma + CTA */}
          <div className="hidden lg:flex items-center gap-2">
            <SelectorIdioma />
            <Link
              to="/agenda"
              className="flex items-center gap-1 bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-4 py-2 rounded-md transition-all duration-200"
            >
              {t('nav.cta')}
              <ChevronRight size={16} />
            </Link>
          </div>

          {/* Mobile: idioma + hamburguesa */}
          <div className="lg:hidden flex items-center gap-1">
            <SelectorIdioma />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-md text-slate-700 hover:text-navy hover:bg-slate-100 transition-colors"
              aria-label={t('nav.abrirMenu')}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden bg-white/98 border-t border-slate-200 backdrop-blur-sm">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`block px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 ${
                  location.pathname === link.href
                    ? 'text-brand bg-brand/10'
                    : 'text-slate-700 hover:text-navy hover:bg-slate-100'
                }`}
              >
                {t(`nav.${link.clave}`)}
              </Link>
            ))}
            <div className="pt-2 pb-1">
              <Link
                to="/agenda"
                className="block w-full text-center bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-4 py-3 rounded-md transition-all duration-200"
              >
                {t('nav.ctaMovil')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
