import { useEffect, useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { Check, Calendar, Clock } from 'lucide-react'
import EstadoBadge from '../components/EstadoBadge'
import { pedidos, seleccion, formatoMoneda, ESTADOS } from '../core'
import { useIdioma } from '../i18n/IdiomaContext'
import { Cargando } from '../components/Lamina'
import { boton } from '../components/estilos'

// Al volver de la página de Stripe, el pago lo confirma el webhook unos segundos después:
// mientras la orden siga cotizada se vuelve a consultar cada 2 s, hasta 1 minuto.
const ESPERA_MS = 2000
const MAX_CONSULTAS = 30

function Dato({ titulo, children }) {
  return (
    <div>
      <dt className="text-[13px] text-negro/60">{titulo}</dt>
      <dd className="mt-0.5 break-words text-[15px] font-medium text-negro">{children}</dd>
    </div>
  )
}

export default function Confirmacion() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { t, fecha, locale, cobro: detalleCobro } = useIdioma()
  const [orden, setOrden] = useState(null)
  const [agotado, setAgotado] = useState(false)
  const id = params.get('orden') ?? localStorage.getItem('socius_ultima_orden')

  useEffect(() => {
    let vigente = true
    let temporizador
    const consultar = async (intento) => {
      try {
        const encontrada = await pedidos.obtener(id)
        if (!vigente) return
        if (!encontrada) return navigate('/')
        setOrden(encontrada)
        if (encontrada.estado !== ESTADOS.COTIZADA) return seleccion.vaciar()
        if (intento >= MAX_CONSULTAS) return setAgotado(true)
        temporizador = setTimeout(() => consultar(intento + 1), ESPERA_MS)
      } catch {
        if (vigente) navigate('/')
      }
    }
    consultar(1)
    return () => {
      vigente = false
      clearTimeout(temporizador)
    }
  }, [id, navigate])

  if (!orden) return null

  // Todavía sin confirmar: el cliente acaba de pagar en Stripe y el webhook no ha llegado.
  if (orden.estado === ESTADOS.COTIZADA) {
    return (
      <div className="flex min-h-screen items-center bg-white px-5 pb-24 pt-32">
        <div className="mx-auto w-full max-w-md text-center">
          {agotado ? (
            <span className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-lavanda text-violeta">
              <Clock size={26} aria-hidden="true" />
            </span>
          ) : (
            <Cargando etiqueta={t('comun.cargando')} className="mx-auto mb-6 h-10 w-10" />
          )}
          <h1 className="titular text-3xl text-negro">{agotado ? t('confirmacion.tardando') : t('confirmacion.confirmando')}</h1>
          <p className="mt-3 leading-relaxed text-negro/70">{agotado ? t('confirmacion.tardandoTexto') : t('confirmacion.confirmandoTexto')}</p>
          <p className="mt-5 font-display tabular-nums text-lg font-bold text-violeta">{orden.id}</p>
          <Link to="/pedidos" className={`${boton.primario} mt-8`}>
            {t('confirmacion.verPedidos')}
          </Link>
        </div>
      </div>
    )
  }

  const fechaOrdenFormateada = new Date(orden.fechaOrden).toLocaleDateString(locale, {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="min-h-screen bg-lavanda px-5 pb-24 pt-28 sm:pt-36">
      <div className="mx-auto w-full max-w-2xl">
        {/* Encabezado de éxito */}
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-violeta text-white animate-aparece">
            <Check size={28} strokeWidth={3} aria-hidden="true" />
          </span>
          <div>
            <h1 className="titular text-[clamp(1.75rem,4.5vw,2.5rem)] leading-none text-negro">{t('confirmacion.titulo')}</h1>
            <p className="mt-2 text-negro/70">{t('confirmacion.procesado', { pasarela: orden.pago?.pasarela ?? '' })}</p>
          </div>
        </div>

        {/* Comprobante */}
        <article className="mt-10 overflow-hidden rounded-md bg-white">
          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-negro/10 p-6 sm:p-8">
            <div>
              <p className="text-[13px] text-negro/60">{t('confirmacion.numeroOrden')}</p>
              <p className="mt-1 font-display tabular-nums text-2xl font-bold text-negro sm:text-3xl">{orden.id}</p>
            </div>
            <div className="text-right">
              <p className="mb-1.5 text-[13px] text-negro/60">{t('confirmacion.estado')}</p>
              <EstadoBadge estado={orden.estado} />
            </div>
          </header>

          <div className="space-y-8 p-6 sm:p-8">
            <section>
              <h2 className="mb-4 text-sm font-semibold text-negro">{t('confirmacion.cliente')}</h2>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Dato titulo={t('confirmacion.nombre')}>{orden.cliente.nombre}</Dato>
                <Dato titulo={t('confirmacion.empresa')}>{orden.cliente.empresa}</Dato>
                <Dato titulo={t('comun.email')}>{orden.cliente.email}</Dato>
                <Dato titulo={t('comun.telefono')}>{orden.cliente.telefono}</Dato>
              </dl>
            </section>

            <section>
              <h2 className="mb-2 text-sm font-semibold text-negro">{t('confirmacion.contratados')}</h2>
              <ul className="divide-y divide-negro/10 border-y border-negro/10">
                {orden.partidas.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="text-[15px] font-semibold text-negro">{p.nombre}</p>
                      <p className="text-[13px] text-negro/60">{detalleCobro(p.id)}</p>
                    </div>
                    <span className="whitespace-nowrap text-sm font-semibold text-negro tabular-nums">{formatoMoneda(p.cobroHoy)} MXN</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-baseline justify-between gap-4">
                <span className="font-bold text-negro">{t('confirmacion.totalPagado')}</span>
                <span className="cifra text-3xl text-violeta">{formatoMoneda(orden.totalHoy)} MXN</span>
              </div>
            </section>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-negro/10 p-4">
                <dt className="flex items-center gap-2 text-[13px] text-negro/60">
                  <Calendar size={13} aria-hidden="true" />
                  {t('confirmacion.fechaOrden')}
                </dt>
                <dd className="mt-1.5 text-[15px] text-negro">{fechaOrdenFormateada}</dd>
              </div>
              <div className="rounded-md border-l-2 border-violeta bg-lavanda p-4">
                <dt className="flex items-center gap-2 text-[13px] font-medium text-violeta">
                  <Calendar size={13} aria-hidden="true" />
                  {orden.fechaArranque ? t('confirmacion.fechaArranque') : t('confirmacion.entrega')}
                </dt>
                {orden.fechaArranque ? (
                  <dd className="mt-1.5">
                    <p className="text-[15px] font-semibold text-negro">{fecha(orden.fechaArranque)}</p>
                    <p className="mt-1 text-[13px] text-negro/70">
                      {t('confirmacion.primeraVersion')} {fecha(orden.fechaEntrega)}
                    </p>
                    {orden.fechaAjustada && <p className="mt-1 text-[13px] text-violeta">{t('confirmacion.ajustada')}</p>}
                  </dd>
                ) : (
                  <dd className="mt-1.5 text-[15px] font-semibold text-negro">{t('confirmacion.accesoInmediato')}</dd>
                )}
              </div>
            </dl>
          </div>
        </article>

        {/* Acciones */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link to="/pedidos" className={`${boton.primario} flex-1`}>
            {t('confirmacion.verPedidos')}
          </Link>
          <Link to="/" className={`${boton.secundario} flex-1 bg-white`}>
            {t('confirmacion.volverInicio')}
          </Link>
        </div>

        <p className="mt-6 text-center text-[13px] leading-relaxed text-negro/60">{t('confirmacion.nota')}</p>
      </div>
    </div>
  )
}
