import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Mail, ArrowRight, CheckCircle, AlertCircle, LogOut, Package } from 'lucide-react'
import { ERRORES_SESION } from '../core'
import { useSesion } from '../sesion/SesionContext'
import { useIdioma } from '../i18n/IdiomaContext'

// Solo rutas internas ("/pedidos"); evita que un enlace manipulado mande a otro sitio.
const rutaSegura = (r) => (r && r.startsWith('/') && !r.startsWith('//') ? r : null)

export default function Entrar() {
  const { t } = useIdioma()
  const { usuario, cargando, disponible, servicio, salir } = useSesion()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const volver = rutaSegura(params.get('volver'))

  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  // Al regresar desde el enlace del correo ya hay sesión: se continúa a donde iba.
  useEffect(() => {
    if (usuario && volver) navigate(volver, { replace: true })
  }, [usuario, volver, navigate])

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    const regresarA = `${window.location.origin}/entrar${volver ? `?volver=${encodeURIComponent(volver)}` : ''}`
    const r = await servicio.enviarEnlace(email, regresarA)
    setEnviando(false)
    if (r.ok) return setEnviado(true)
    setError({
      [ERRORES_SESION.EMAIL_INVALIDO]: t('comun.emailValido'),
      [ERRORES_SESION.LIMITE]: t('entrar.limite'),
    }[r.error] ?? t('entrar.errorGeneral'))
  }

  const tarjeta = 'w-full max-w-md mx-auto p-8 rounded-2xl border border-slate-200 bg-white shadow-sm'

  let contenido
  if (!disponible) {
    contenido = (
      <div className={tarjeta}>
        <p className="flex items-start gap-2 text-slate-700 text-sm">
          <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
          {t('entrar.noDisponible')}
        </p>
      </div>
    )
  } else if (cargando) {
    contenido = <div className="w-8 h-8 mx-auto border-2 border-brand/30 border-t-brand rounded-full animate-spin" aria-label={t('comun.procesando')} />
  } else if (usuario) {
    contenido = (
      <div className={`${tarjeta} text-center`}>
        <CheckCircle size={36} className="mx-auto text-green-700 mb-4" />
        <p className="text-navy font-bold text-lg mb-1">{t('entrar.yaDentro')}</p>
        <p className="text-slate-600 text-sm mb-6 break-all">{usuario.email}</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link to="/pedidos" className="flex-1 flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold py-3 rounded-xl text-sm transition-colors">
            <Package size={15} />
            {t('nav.pedidos')}
          </Link>
          <button onClick={salir} className="flex-1 flex items-center justify-center gap-2 border border-slate-300 text-slate-700 hover:text-navy font-medium py-3 rounded-xl text-sm transition-colors">
            <LogOut size={15} />
            {t('nav.salir')}
          </button>
        </div>
      </div>
    )
  } else if (enviado) {
    contenido = (
      <div className={`${tarjeta} text-center`} role="status">
        <Mail size={36} className="mx-auto text-brand mb-4" />
        <p className="text-navy font-bold text-lg mb-2">{t('entrar.revisaCorreo')}</p>
        <p className="text-slate-600 text-sm mb-1">{t('entrar.enviadoA')}</p>
        <p className="text-navy font-semibold text-sm mb-5 break-all">{email.trim().toLowerCase()}</p>
        <p className="text-slate-500 text-xs mb-6">{t('entrar.abreEnlace')}</p>
        <button onClick={() => setEnviado(false)} className="text-brand text-sm font-semibold hover:text-brand-dark">
          {t('entrar.otroCorreo')}
        </button>
      </div>
    )
  } else {
    contenido = (
      <form onSubmit={enviar} className={tarjeta} noValidate>
        <label htmlFor="email-entrar" className="text-slate-600 text-xs uppercase tracking-wider mb-2 block">{t('comun.email')}</label>
        <input
          id="email-entrar"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('comun.phEmail')}
          className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-navy text-sm placeholder-slate-400 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
        />
        {error && <p className="text-red-600 text-xs mt-2" role="alert">{error}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="mt-5 w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm transition-colors"
        >
          {enviando ? t('comun.procesando') : t('entrar.enviar')}
          {!enviando && <ArrowRight size={16} />}
        </button>
        <p className="text-slate-500 text-xs mt-4 text-center">{t('entrar.sinContrasena')}</p>
      </form>
    )
  }

  return (
    <div className="min-h-screen bg-brand-soft/40 pt-28 pb-20 px-4">
      <div className="max-w-md mx-auto text-center mb-8">
        <span className="text-brand text-xs font-semibold uppercase tracking-widest mb-2 block">{t('entrar.etiqueta')}</span>
        <h1 className="text-3xl sm:text-4xl font-black text-navy mb-3">{t('entrar.titulo')}</h1>
        <p className="text-slate-600">{t('entrar.subtitulo')}</p>
      </div>
      {contenido}
    </div>
  )
}
