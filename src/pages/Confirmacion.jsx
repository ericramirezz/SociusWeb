import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { CheckCircle, Calendar, Hash, Package, ArrowRight } from 'lucide-react'
import EstadoBadge from '../components/EstadoBadge'
import { pedidos, formatoMoneda } from '../core'
import { useIdioma } from '../i18n/IdiomaContext'

export default function Confirmacion() {
  const navigate = useNavigate()
  const { t, fecha, locale, cobro: detalleCobro } = useIdioma()
  const [orden, setOrden] = useState(null)

  useEffect(() => {
    let vigente = true
    pedidos
      .obtener(localStorage.getItem('socius_ultima_orden'))
      .then((encontrada) => {
        if (!vigente) return
        if (encontrada) setOrden(encontrada)
        else navigate('/')
      })
      .catch(() => vigente && navigate('/'))
    return () => {
      vigente = false
    }
  }, [navigate])

  if (!orden) return null


  const fechaOrdenFormateada = new Date(orden.fechaOrden).toLocaleDateString(locale, {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="min-h-screen bg-white pt-24 pb-20 px-4 flex items-center">
      <div className="max-w-2xl mx-auto w-full">
        {/* Success banner */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 mb-5">
            <CheckCircle size={40} className="text-green-700" />
          </div>
          <h1 className="text-4xl font-black text-navy mb-3">{t('confirmacion.titulo')}</h1>
          <p className="text-slate-600 text-lg">
            {t('confirmacion.procesado', { pasarela: orden.pago.pasarela })}
          </p>
        </div>

        {/* Order card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-6">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-brand/5 to-transparent">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">{t('confirmacion.numeroOrden')}</p>
                <div className="flex items-center gap-2">
                  <Hash size={14} className="text-brand" />
                  <span className="text-brand font-black text-xl tracking-wider">{orden.id}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">{t('confirmacion.estado')}</p>
                <EstadoBadge estado={orden.estado} />
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-6">
            {/* Client */}
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-widest mb-3">{t('confirmacion.cliente')}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-slate-400 text-xs mb-0.5">{t('confirmacion.nombre')}</p>
                  <p className="text-navy text-sm font-medium">{orden.cliente.nombre}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-0.5">{t('confirmacion.empresa')}</p>
                  <p className="text-navy text-sm font-medium">{orden.cliente.empresa}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-0.5">{t('comun.email')}</p>
                  <p className="text-navy text-sm">{orden.cliente.email}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-0.5">{t('comun.telefono')}</p>
                  <p className="text-navy text-sm">{orden.cliente.telefono}</p>
                </div>
              </div>
            </div>

            {/* Programs */}
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                <Package size={12} />
                {t('confirmacion.contratados')}
              </p>
              <div className="space-y-2">
                {orden.partidas.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <div>
                      <p className="text-navy text-sm font-medium">{p.nombre}</p>
                      <p className="text-slate-500 text-xs">{detalleCobro(p.id)}</p>
                    </div>
                    <span className="text-brand font-bold text-sm">{formatoMoneda(p.cobroHoy)} MXN</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="border-t border-slate-200 pt-4 flex items-center justify-between">
              <span className="text-navy font-bold">{t('confirmacion.totalPagado')}</span>
              <span className="text-brand font-black text-2xl">{formatoMoneda(orden.totalHoy)} MXN</span>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar size={13} className="text-brand" />
                  <p className="text-slate-500 text-xs uppercase tracking-wider">{t('confirmacion.fechaOrden')}</p>
                </div>
                <p className="text-navy text-sm">{fechaOrdenFormateada}</p>
              </div>
              <div className="p-3 rounded-lg bg-brand/5 border border-brand/15">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar size={13} className="text-brand" />
                  <p className="text-brand text-xs uppercase tracking-wider">{orden.fechaArranque ? t('confirmacion.fechaArranque') : t('confirmacion.entrega')}</p>
                </div>
                {orden.fechaArranque ? (
                  <>
                    <p className="text-navy font-semibold text-sm">{fecha(orden.fechaArranque)}</p>
                    <p className="text-slate-600 text-xs mt-1">{t('confirmacion.primeraVersion')} {fecha(orden.fechaEntrega)}</p>
                    {orden.fechaAjustada && <p className="text-amber-800 text-xs mt-1">{t('confirmacion.ajustada')}</p>}
                  </>
                ) : (
                  <p className="text-navy font-semibold text-sm">{t('confirmacion.accesoInmediato')}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/pedidos"
            className="flex-1 flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold py-3.5 rounded-xl text-sm transition-all duration-200"
          >
            {t('confirmacion.verPedidos')}
            <ArrowRight size={15} />
          </Link>
          <Link
            to="/"
            className="flex-1 flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-navy font-medium py-3.5 rounded-xl text-sm transition-all duration-200"
          >
            {t('confirmacion.volverInicio')}
          </Link>
        </div>

        {/* Note */}
        <p className="text-center text-slate-400 text-xs mt-6">
          {t('confirmacion.nota')}
        </p>
      </div>
    </div>
  )
}
