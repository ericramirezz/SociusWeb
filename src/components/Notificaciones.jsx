import { useEffect, useState } from 'react'
import { CheckCircle, AlertTriangle, Info } from 'lucide-react'
import { bus, EVENTOS } from '../core'
import { useIdioma } from '../i18n/IdiomaContext'

// Observador (patrón Observer): se suscribe al bus de eventos y muestra un aviso.
// El servicio de pedidos no sabe que este componente existe.
// Cada evento produce un aviso; el texto se traduce con t() en el idioma activo.
const MENSAJES = {
  [EVENTOS.PAGADA]: (o, t) => ({ tipo: 'ok', texto: t('notif.pagada', { id: o.id }) }),
  [EVENTOS.AGENDADA]: (o, t, fecha) => ({ tipo: 'info', texto: t('notif.agendada', { fecha: fecha(o.fechaArranque) }) }),
  [EVENTOS.CANCELADA]: (o, t) => ({ tipo: 'info', texto: t('notif.cancelada', { id: o.id }) }),
  [EVENTOS.REEMBOLSADA]: (o, t) => ({ tipo: 'ok', texto: t('notif.reembolsada', { id: o.id }) }),
  [EVENTOS.REEMBOLSO_SOLICITADO]: (o, t) => ({ tipo: 'info', texto: t('notif.reembolsoSolicitado', { id: o.id }) }),
  [EVENTOS.PAGO_RECHAZADO]: (_, t) => ({ tipo: 'error', texto: t('notif.rechazado') }),
  [EVENTOS.LLAMADA_AGENDADA]: (l, t, fecha) => ({ tipo: 'ok', texto: t('notif.llamada', { fecha: fecha(l.fecha), hora: l.hora }) }),
}
// Una barra de color a la izquierda dice el tipo de aviso sin llenar la pantalla de color.
const ESTILO = {
  ok: { barra: 'bg-degradado', icono: 'text-cian', Icono: CheckCircle },
  info: { barra: 'bg-violeta', icono: 'text-lavanda', Icono: Info },
  error: { barra: 'bg-red-500', icono: 'text-red-400', Icono: AlertTriangle },
}

export default function Notificaciones() {
  const [avisos, setAvisos] = useState([])
  const { t, fecha } = useIdioma()

  useEffect(() => {
    const bajas = Object.entries(MENSAJES).map(([evento, crear]) =>
      bus.suscribir(evento, (datos) => {
        const aviso = { id: Math.random(), ...crear(datos, t, fecha) }
        setAvisos((a) => [...a, aviso])
        setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== aviso.id)), 5000)
      })
    )
    return () => bajas.forEach((baja) => baja())
  }, [t, fecha])

  return (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[80] space-y-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96"
      role="status"
      aria-live="polite"
    >
      {avisos.map(({ id, tipo, texto }) => {
        const { barra, icono, Icono } = ESTILO[tipo]
        return (
          <div
            key={id}
            className="pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-md bg-negro py-3.5 pl-5 pr-4 text-sm font-medium text-white shadow-[0_12px_32px_-12px_rgb(17_16_33_/_0.5)] animate-aparece"
          >
            <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${barra}`} />
            <Icono size={16} aria-hidden="true" className={`mt-0.5 flex-shrink-0 ${icono}`} />
            <span className="leading-snug">{texto}</span>
          </div>
        )
      })}
    </div>
  )
}
