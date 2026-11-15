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
  [EVENTOS.PAGO_RECHAZADO]: (_, t) => ({ tipo: 'error', texto: t('notif.rechazado') }),
  [EVENTOS.LLAMADA_AGENDADA]: (l, t, fecha) => ({ tipo: 'ok', texto: t('notif.llamada', { fecha: fecha(l.fecha), hora: l.hora }) }),
}
const ESTILO = {
  ok: { clase: 'border-green-200 text-green-800', Icono: CheckCircle },
  info: { clase: 'border-brand/30 text-brand-dark', Icono: Info },
  error: { clase: 'border-red-200 text-red-700', Icono: AlertTriangle },
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
    <div className="fixed bottom-4 right-4 z-[60] space-y-2 w-[calc(100%-2rem)] max-w-sm" role="status" aria-live="polite">
      {avisos.map(({ id, tipo, texto }) => {
        const { clase, Icono } = ESTILO[tipo]
        return (
          <div key={id} className={`flex items-center gap-2 bg-white border rounded-xl shadow-lg px-4 py-3 text-sm font-medium animate-fade-in ${clase}`}>
            <Icono size={16} className="flex-shrink-0" />
            {texto}
          </div>
        )
      })}
    </div>
  )
}
