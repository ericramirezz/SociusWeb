import { Link } from 'react-router-dom'
import { Instagram, Linkedin, Twitter, Mail } from 'lucide-react'
import { useIdioma } from '../i18n/IdiomaContext'
import { boton, contenedor } from './estilos'
import Logo from './Logo'

const REDES = [
  { href: 'https://instagram.com', nombre: 'Instagram', Icono: Instagram },
  { href: 'https://linkedin.com', nombre: 'LinkedIn', Icono: Linkedin },
  { href: 'https://twitter.com', nombre: 'Twitter', Icono: Twitter },
]

function Columna({ titulo, children }) {
  return (
    <div>
      <h2 className="mb-5 text-sm font-medium text-white/50">{titulo}</h2>
      {children}
    </div>
  )
}

const enlace = 'text-[15px] text-white/80 transition-colors duration-200 hover:text-white'

export default function Footer() {
  const { t } = useIdioma()
  return (
    <footer className="bg-negro text-white">
      <div className={`${contenedor} pb-10 pt-20`}>
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 lg:grid-cols-12">
          {/* Marca */}
          <div className="col-span-2 lg:col-span-5">
            <Logo variante="blanco" className="h-10" />
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-white/70">{t('footer.descripcion')}</p>
            <p className="mt-3 text-[15px] font-semibold text-cian">{t('footer.lema')}</p>
            <div className="mt-8 flex items-center gap-2">
              {REDES.map(({ href, nombre, Icono }) => (
                <a
                  key={nombre}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={nombre}
                  className="flex h-10 w-10 items-center justify-center rounded-md border border-white/15 text-white/70 transition-colors duration-200 hover:border-white hover:text-white"
                >
                  <Icono size={16} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/* Navegación */}
          <div className="lg:col-span-2">
            <Columna titulo={t('footer.navegacion')}>
              <ul className="space-y-3">
                {[
                  { label: t('nav.inicio'), href: '/' },
                  { label: t('nav.programas'), href: '/catalogo' },
                  { label: t('nav.testimonios'), href: '/testimonios' },
                  { label: t('nav.cotizador'), href: '/cotizador' },
                  { label: t('nav.pedidos'), href: '/pedidos' },
                ].map((l) => (
                  <li key={l.href}>
                    <Link to={l.href} className={enlace}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </Columna>
          </div>

          {/* Programas */}
          <div className="lg:col-span-2">
            <Columna titulo={t('footer.programas')}>
              <ul className="space-y-3">
                {['Nexus Growth', 'Nexus Partner', 'Socius Core', 'Nexus IA', 'AVI'].map((p) => (
                  <li key={p}>
                    <Link to="/catalogo" className={enlace}>
                      {p}
                    </Link>
                  </li>
                ))}
              </ul>
            </Columna>
          </div>

          {/* Contacto */}
          <div className="col-span-2 lg:col-span-3">
            <Columna titulo={t('footer.contacto')}>
              <a href="mailto:admin@sociusrealestate.com" className={`${enlace} inline-flex items-center gap-2 break-all`}>
                <Mail size={15} aria-hidden="true" className="flex-shrink-0" />
                admin@sociusrealestate.com
              </a>
              <div className="mt-6">
                <Link to="/agenda" className={`${boton.claro} px-5 py-3 text-sm`}>
                  {t('nav.cta')}
                </Link>
              </div>
            </Columna>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-white/10 pt-6 text-[13px] text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Socius Real Estate Consulting. {t('footer.derechos')}
          </p>
          <p>{t('footer.hechoEn')}</p>
        </div>
      </div>
    </footer>
  )
}
