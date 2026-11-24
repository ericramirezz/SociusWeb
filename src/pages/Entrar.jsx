import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Mail, AlertCircle, LogOut, Package, Check } from 'lucide-react'
import { ERRORES_SESION } from '../core'
import { useSesion } from '../sesion/SesionContext'
import { useIdioma } from '../i18n/IdiomaContext'
import { Cargando, EncabezadoPagina } from '../components/Lamina'
import { boton, campo, contenedor, etiquetaCampo } from '../components/estilos'

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

  const tarjeta = 'w-full rounded-md border border-negro/10 bg-white p-6 sm:p-8'
  const icono = 'mb-5 flex h-12 w-12 items-center justify-center rounded-md'

  let contenido
  if (!disponible) {
    contenido = (
      <div className={tarjeta}>
        <p className="flex items-start gap-2.5 text-[15px] leading-relaxed text-negro/80">
          <AlertCircle size={17} aria-hidden="true" className="mt-0.5 flex-shrink-0 text-violeta" />
          {t('entrar.noDisponible')}
        </p>
      </div>
    )
  } else if (cargando) {
    contenido = <Cargando etiqueta={t('comun.procesando')} />
  } else if (usuario) {
    contenido = (
      <div className={tarjeta}>
        <span className={`${icono} bg-violeta text-white`}>
          <Check size={22} strokeWidth={3} aria-hidden="true" />
        </span>
        <p className="text-lg font-bold text-negro">{t('entrar.yaDentro')}</p>
        <p className="mt-1 break-all text-[15px] text-negro/70">{usuario.email}</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link to="/pedidos" className={`${boton.primario} flex-1`}>
            <Package size={16} aria-hidden="true" />
            {t('nav.pedidos')}
          </Link>
          <button onClick={salir} className={`${boton.secundario} flex-1`}>
            <LogOut size={16} aria-hidden="true" />
            {t('nav.salir')}
          </button>
        </div>
      </div>
    )
  } else if (enviado) {
    contenido = (
      <div className={tarjeta} role="status">
        <span className={`${icono} bg-lavanda text-violeta`}>
          <Mail size={22} aria-hidden="true" />
        </span>
        <p className="text-lg font-bold text-negro">{t('entrar.revisaCorreo')}</p>
        <p className="mt-2 text-[15px] text-negro/70">{t('entrar.enviadoA')}</p>
        <p className="mt-1 break-all text-[15px] font-semibold text-negro">{email.trim().toLowerCase()}</p>
        <p className="mt-5 text-[13px] leading-relaxed text-negro/60">{t('entrar.abreEnlace')}</p>
        <button onClick={() => setEnviado(false)} className={`${boton.texto} mt-6 text-sm`}>
          {t('entrar.otroCorreo')}
        </button>
      </div>
    )
  } else {
    contenido = (
      <form onSubmit={enviar} className={tarjeta} noValidate>
        <label htmlFor="email-entrar" className={etiquetaCampo}>
          {t('comun.email')}
        </label>
        <input
          id="email-entrar"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('comun.phEmail')}
          aria-invalid={Boolean(error)}
          className={campo(Boolean(error))}
        />
        {error && (
          <p className="mt-2 text-[13px] font-medium text-red-600" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={enviando} className={`${boton.primario} mt-5 w-full`}>
          {enviando ? t('comun.procesando') : t('entrar.enviar')}
        </button>
        <p className="mt-4 text-[13px] text-negro/60">{t('entrar.sinContrasena')}</p>
      </form>
    )
  }

  return (
    <div className="min-h-screen bg-lavanda/50 pb-24">
      <EncabezadoPagina etiqueta={t('entrar.etiqueta')} titulo={t('entrar.titulo')} sub={t('entrar.subtitulo')} />
      <div className={`${contenedor} mt-12 lg:grid lg:grid-cols-12 lg:gap-x-8`}>
        <div className="max-w-md lg:col-span-5 lg:col-start-4 lg:max-w-none">{contenido}</div>
      </div>
    </div>
  )
}
