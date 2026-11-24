import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, AlertCircle, Trash2 } from 'lucide-react'
import { programas } from '../data/programas'
import { pedidos, seleccion, formatoMoneda } from '../core'
import { useIdioma } from '../i18n/IdiomaContext'
import ProgramaCard from '../components/ProgramaCard'
import { EncabezadoPagina } from '../components/Lamina'
import { boton, contenedor } from '../components/estilos'

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
  const hayAlgo = programasSeleccionados.length > 0

  const handleIrAPago = () => {
    if (seleccionados.length === 0) return
    navigate('/checkout')
  }

  return (
    <div className={`min-h-screen bg-white ${hayAlgo ? 'pb-36 lg:pb-24' : 'pb-24'}`}>
      <EncabezadoPagina etiqueta={t('cotizador.etiqueta')} titulo={t('cotizador.titulo')} sub={t('cotizador.subtitulo')} />

      <div className={`${contenedor} mt-14 grid gap-10 lg:grid-cols-12 lg:gap-x-8`}>
        {/* Programas: se marcan como casillas */}
        <div className="space-y-3 lg:col-span-7 lg:col-start-1">
          {programas.map((p) => (
            <ProgramaCard key={p.id} programa={p} seleccionado={seleccionados.includes(p.id)} onToggle={togglePrograma} modo="cotizador" />
          ))}
        </div>

        {/* Hoja de cotización */}
        <aside className="lg:col-span-5 lg:col-start-8 xl:col-span-4 xl:col-start-9">
          <div className="lg:sticky lg:top-24">
            <div className="rounded-md border border-negro/10 bg-white">
              <div className="flex items-center gap-2.5 border-b border-negro/10 px-5 py-4">
                <ShoppingCart size={18} aria-hidden="true" className="text-violeta" />
                <h2 className="font-bold text-negro">{t('cotizador.resumen')}</h2>
              </div>

              <div className="px-5 py-4">
                {!hayAlgo ? (
                  <div className="py-8 text-center">
                    {/* Doce casillas vacías (4×3, como el edificio de la portada): aún no hay bloques */}
                    <div aria-hidden="true" className="mx-auto mb-4 grid w-20 grid-cols-4 gap-1">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <span key={i} className="aspect-square border border-dashed border-violeta/30" />
                      ))}
                    </div>
                    <p className="text-sm text-negro/60">{t('cotizador.vacio')}</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-negro/10">
                    {programasSeleccionados.map(({ producto: p, cobro }) => (
                      <li key={p.id} className="flex items-start justify-between gap-3 py-3 first:pt-1">
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-semibold text-negro">{p.nombre}</p>
                          <p className="mt-0.5 text-[13px] leading-snug text-negro/60">{detalleCobro(p.id)}</p>
                        </div>
                        <p className="whitespace-nowrap text-right text-sm font-bold text-negro tabular-nums">
                          {formatoMoneda(cobro.hoy)} <span className="font-medium text-negro/60">{t('cotizador.hoy')}</span>
                        </p>
                        <button
                          onClick={() => removePrograma(p.id)}
                          className="-mr-1 rounded-md p-1 text-negro/50 transition-colors hover:bg-lavanda hover:text-negro"
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {hayAlgo && (
                <div className="border-t border-negro/10 px-5 py-5">
                  <dl className="space-y-2">
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-sm text-negro/70">{t('cotizador.valorTotal')}</dt>
                      <dd className="text-sm text-negro/80 tabular-nums">{formatoMoneda(cotizacion.totalContrato)} MXN</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4 border-t border-dashed border-negro/15 pt-3">
                      <dt className="font-bold text-negro">{t('cotizador.aPagarHoy')}</dt>
                      <dd className="cifra text-2xl text-negro">{formatoMoneda(cotizacion.totalHoy)} MXN</dd>
                    </div>
                  </dl>

                  <div className="mt-5 border-l-2 border-violeta bg-lavanda px-4 py-3">
                    <p className="text-[13px] font-semibold text-violeta">{t('cotizador.fechaPropuesta')}</p>
                    {cotizacion.requiereAgenda ? (
                      <p className="mt-1 text-sm leading-relaxed text-negro">
                        {t('cotizador.arranqueEl')} <strong>{fecha(cotizacion.entregaPropuesta.fechaArranque)}</strong>; {t('cotizador.primeraVersion')}{' '}
                        <strong>{fecha(cotizacion.entregaPropuesta.fechaEntrega)}</strong>. {t('cotizador.puedesProponer')}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-negro">{t('cotizador.accesoInmediato')}</p>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-negro/60">{t('cotizador.sinPublicidad')}</p>

                  <button onClick={handleIrAPago} className={`${boton.primario} mt-5 hidden w-full lg:flex`}>
                    {t('cotizador.irPago')}
                  </button>
                </div>
              )}
            </div>

            <p className="mt-4 flex items-start gap-2 text-[13px] leading-relaxed text-negro/60">
              <AlertCircle size={14} aria-hidden="true" className="mt-0.5 flex-shrink-0 text-violeta" />
              <span>
                {t('cotizador.notaPublicidad1')} <span className="font-semibold text-negro/80">{t('cotizador.notaPublicidad2')}</span>{' '}
                {t('cotizador.notaPublicidad3')}
              </span>
            </p>
          </div>
        </aside>
      </div>

      {/* Móvil: el total y el siguiente paso siempre a la mano */}
      {hayAlgo && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-negro/10 bg-white/95 backdrop-blur-md lg:hidden">
          <div className={`${contenedor} flex items-center justify-between gap-4 py-3`}>
            <div>
              <p className="text-xs text-negro/60">{t('cotizador.aPagarHoy')}</p>
              <p className="cifra text-lg text-negro">{formatoMoneda(cotizacion.totalHoy)} MXN</p>
            </div>
            <button onClick={handleIrAPago} className={boton.primario}>
              {t('cotizador.irPago')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
