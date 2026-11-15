import { Link } from 'react-router-dom'
import { Instagram, Linkedin, Twitter, Mail, Phone } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <span className="text-3xl font-black tracking-widest text-brand">SOCIUS</span>
            <p className="mt-3 text-slate-600 text-sm leading-relaxed">
              Real Estate Consulting. Infraestructura comercial para desarrollos inmobiliarios de alto desempeño.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:text-brand hover:border-brand/40 transition-all duration-200"
              >
                <Instagram size={15} />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:text-brand hover:border-brand/40 transition-all duration-200"
              >
                <Linkedin size={15} />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:text-brand hover:border-brand/40 transition-all duration-200"
              >
                <Twitter size={15} />
              </a>
            </div>
          </div>

          {/* Nav */}
          <div>
            <h4 className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-4">Navegación</h4>
            <ul className="space-y-2">
              {[
                { label: 'Inicio', href: '/' },
                { label: 'Programas', href: '/catalogo' },
                { label: 'Cotizador', href: '/cotizador' },
                { label: 'Mis Pedidos', href: '/pedidos' },
              ].map((l) => (
                <li key={l.href}>
                  <Link to={l.href} className="text-sm text-slate-700 hover:text-brand transition-colors duration-200">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Programs */}
          <div>
            <h4 className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-4">Programas</h4>
            <ul className="space-y-2">
              {['Nexus Growth', 'Nexus Partner', 'Socius Core', 'Nexus IA', 'AVI'].map((p) => (
                <li key={p}>
                  <Link to="/catalogo" className="text-sm text-slate-700 hover:text-brand transition-colors duration-200">
                    {p}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-4">Contacto</h4>
            <ul className="space-y-3">
              <li>
                <a href="mailto:hola@socius.mx" className="flex items-center gap-2 text-sm text-slate-700 hover:text-brand transition-colors duration-200">
                  <Mail size={14} />
                  hola@socius.mx
                </a>
              </li>
              <li>
                <a href="tel:+525512345678" className="flex items-center gap-2 text-sm text-slate-700 hover:text-brand transition-colors duration-200">
                  <Phone size={14} />
                  +52 55 1234 5678
                </a>
              </li>
            </ul>
            <div className="mt-6">
              <Link
                to="/agenda"
                className="inline-block bg-brand hover:bg-brand-dark text-white text-xs font-bold tracking-wider uppercase px-5 py-2.5 rounded-md transition-all duration-200"
              >
                Agendar llamada
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Socius Real Estate Consulting. Todos los derechos reservados.
          </p>
          <p className="text-xs text-slate-400">
            JLL · Coldwell Banker · FUNO
          </p>
        </div>
      </div>
    </footer>
  )
}
