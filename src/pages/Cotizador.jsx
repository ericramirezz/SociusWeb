import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, ArrowRight, AlertCircle, Trash2 } from 'lucide-react'
import { programas } from '../data/programas'
import { pedidos, seleccion, formatoMoneda } from '../core'
import { useIdioma } from '../i18n/IdiomaContext'
import ProgramaCard from '../components/ProgramaCard'

export default function Cotizador() {
  const navigate = useNavigate()
  const { t, fecha, cobro: detalleCobro } = useIdioma()
  const [seleccionados, setSeleccionados] = useState([])

  // Arranques ya agendados por día: la fecha propuesta respeta el cupo diario.
  const [ocupacion, setOcupacion] = useState({})

  useEffect(() => {
    setSeleccionados(seleccion.leer())
    let vigente = true
    pedidos.ocupacion().then((o) => vigente && setOcupacion(o)).catch(() => {})
    return () => {
      vigente = false
    }
  }, [])

  const togglePrograma = (id) => {
    setSeleccionados(seleccion.alternar(id))
  }

  const removePrograma = (id) => {
    setSeleccionados(seleccion.quitar(id))
  }

  // La fachada cotiza: forma de pago (Strategy) y fecha de entrega por tipo de producto.
  const cotizacion = pedidos.cotizar(seleccionados, ocupacion)
  const programasSeleccionados = cotizacion.partidas

  const handleIrAPago = () => {
    if (seleccionados.length === 0) return
    navigate('/checkout')
  }

  return (
    <div className="min-h-screen bg-white pt-24 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <span className="text-brand text-xs font-semibold uppercase tracking-widest mb-2 block">{t('cotizador.etiqueta')}</span>
          <h1 className="text-4xl font-black text-navy">{t('cotizador.titulo')}</h1>
          <p className="text-slate-600 mt-2">{t('cotizador.subtitulo')}</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Programs grid */}
          <div className="flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {programas.map((p) => (
                <ProgramaCard
                  key={p.id}
                  programa={p}
                  seleccionado={seleccionados.includes(p.id)}
                  onToggle={togglePrograma}
                  modo="cotizador"
                />
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:w-80 xl:w-96">
            <div className="sticky top-24">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <ShoppingCart size={18} className="text-brand" />
                    <h2 className="text-navy font-bold">{t('cotizador.resumen')}</h2>
                  </div>
                </div>

                {/* Items */}
                <div className="p-5 min-h-[200px]">
                  {programasSeleccionados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                        <ShoppingCart size={20} className="text-slate-400" />
                      </div>
                      <p className="text-slate-500 text-sm">{t('cotizador.vacio')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {programasSeleccionados.map(({ producto: p, cobro }) => (
                        <div key={p.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-slate-50">
                          <div className="flex-1 min-w-0">
                            <p className="text-navy text-sm font-medium truncate">{p.nombre}</p>
                            <p className="text-brand text-sm font-bold">{formatoMoneda(cobro.hoy)} {t('cotizador.hoy')}</p>
                            <p className="text-slate-500 text-xs">{detalleCobro(p.id)}</p>
                          </div>
                          <button
                            onClick={() => removePrograma(p.id)}
                            className="text-slate-400 hover:text-red-600 transition-colors mt-0.5"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Total */}
                {programasSeleccionados.length > 0 && (
                  <div className="border-t border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-600 text-sm">{t('cotizador.aPagarHoy')}</span>
                      <span className="text-navy font-bold">{formatoMoneda(cotizacion.totalHoy)} MXN</span>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-slate-600 text-sm">{t('cotizador.valorTotal')}</span>
                      <span className="text-slate-700 text-sm">{formatoMoneda(cotizacion.totalContrato)} MXN</span>
                    </div>
                    <div className="p-3 rounded-lg bg-brand-soft border border-brand/15 mb-3">
                      <p className="text-brand text-xs font-semibold uppercase tracking-wider mb-1">{t('cotizador.fechaPropuesta')}</p>
                      {cotizacion.requiereAgenda ? (
                        <p className="text-navy text-sm">
                          {t('cotizador.arranqueEl')} <strong>{fecha(cotizacion.entregaPropuesta.fechaArranque)}</strong>; {t('cotizador.primeraVersion')}{' '}
                          <strong>{fecha(cotizacion.entregaPropuesta.fechaEntrega)}</strong>. {t('cotizador.puedesProponer')}
                        </p>
                      ) : (
                        <p className="text-navy text-sm">{t('cotizador.accesoInmediato')}</p>
                      )}
                    </div>
                    <p className="text-slate-400 text-xs mb-5">{t('cotizador.sinPublicidad')}</p>

                    <button
                      onClick={handleIrAPago}
                      className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold py-3.5 rounded-xl text-sm transition-all duration-200"
                    >
                      {t('cotizador.irPago')}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}

                {/* Note */}
                <div className="px-5 pb-5">
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <AlertCircle size={14} className="text-brand mt-0.5 flex-shrink-0" />
                    <p className="text-slate-500 text-xs leading-relaxed">
                      {t('cotizador.notaPublicidad1')} <span className="text-slate-700">{t('cotizador.notaPublicidad2')}</span> {t('cotizador.notaPublicidad3')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
