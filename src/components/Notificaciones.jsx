import { useEffect, useState } from 'react'
import { CheckCircle, AlertTriangle, Info } from 'lucide-react'
import { bus, EVENTOS } from '../core'

// Observador (patrón Observer): se suscribe al bus de eventos y muestra un aviso.
// El servicio de pedidos no sabe que este componente existe.
const MENSAJES = {
  [EVENTOS.PAGADA]: (o) => ({ tipo: 'ok', texto: `Pago aprobado · orden ${o.id}` }),
  [EVENTOS.AGENDADA]: (o) => ({ tipo: 'info', texto: `Arranque agendado para el ${o.fechaArranque}` }),
  [EVENTOS.CANCELADA]: (o) => ({ tipo: 'info', texto: `Orden ${o.id} cancelada` }),
  [EVENTOS.REEMBOLSADA]: (o) => ({ tipo: 'ok', texto: `Reembolso emitido · orden ${o.id}` }),
  [EVENTOS.PAGO_RECHAZADO]: (d) => ({ tipo: 'error', texto: `${d.mensaje}. Intenta con otra tarjeta.` }),
  [EVENTOS.LLAMADA_AGENDADA]: (l) => ({ tipo: 'ok', texto: `Llamada agendada: ${l.fecha} a las ${l.hora}` }),
}
const ESTILO = {
  ok: { clase: 'border-green-200 text-green-800', Icono: CheckCircle },
  info: { clase: 'border-brand/30 text-brand-dark', Icono: Info },
  error: { clase: 'border-red-200 text-red-700', Icono: AlertTriangle },
}

export default function Notificaciones() {
  const [avisos, setAvisos] = useState([])

  useEffect(() => {
    const bajas = Object.entries(MENSAJES).map(([evento, crear]) =>
      bus.suscribir(evento, (datos) => {
        const aviso = { id: Math.random(), ...crear(datos) }
        setAvisos((a) => [...a, aviso])
        setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== aviso.id)), 5000)
      })
    )
    return () => bajas.forEach((baja) => baja())
  }, [])

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
