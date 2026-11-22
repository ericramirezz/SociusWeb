// PATRÓN: Productor/Consumidor (Tarea 03), lado del PRODUCTOR.
// Recibe el aviso de la pasarela, revisa la firma, lo deja en la cola y responde
// de inmediato. No toca la orden: eso lo hace el procesador después. Así la
// pasarela nunca espera y un error al procesar no hace que se pierda el aviso.
import { VERIFICADORES } from './firmas'
import { TRADUCTORES } from './traductores'

// Respuesta HTTP que se le da a la pasarela:
//   200 recibido / duplicado · 400 firma o contenido inválido · 404 pasarela desconocida · 500 falta configurar el secreto
export async function recibirWebhook({ pasarela, cuerpo, encabezados = {}, secretos = {}, cola, reloj = () => new Date(), fetch }) {
  const verificar = VERIFICADORES[pasarela]
  if (!verificar) return { status: 404, motivo: 'pasarela_desconocida' }
  const secreto = secretos[pasarela]
  if (!secreto) return { status: 500, motivo: 'sin_secreto' }

  // Los nombres de encabezado llegan con mayúsculas distintas según el servidor.
  const enc = Object.fromEntries(Object.entries(encabezados).map(([k, v]) => [k.toLowerCase(), v]))
  const firma = await verificar(cuerpo, enc, secreto, reloj(), fetch) // fetch: solo PayPal, que verifica con su API
  if (!firma.ok) return { status: 400, motivo: firma.motivo }

  let datos
  try {
    datos = JSON.parse(cuerpo)
  } catch {
    return { status: 400, motivo: 'json_invalido' }
  }
  const evento = TRADUCTORES[pasarela](datos)
  if (!evento.eventoId) return { status: 400, motivo: 'sin_id_de_evento' }

  const { nuevo } = await cola.encolar({ pasarela, eventoId: evento.eventoId, tipo: evento.tipo, contenido: datos })
  // A un duplicado también se le responde 200: si no, la pasarela lo seguiría reenviando.
  return { status: 200, motivo: nuevo ? 'recibido' : 'duplicado' }
}
