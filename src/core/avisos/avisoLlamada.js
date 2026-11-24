// Aviso a Socius cuando un prospecto agenda una llamada estratégica.
//
// PATRÓN: Observer, del lado del servidor. La página solo inserta la fila en
// `llamadas`; un Database Webhook de Supabase avisa a la Edge Function
// aviso-llamada, y esta manda el correo por Resend. Así el correo no depende del
// navegador del cliente y nadie puede usar la página para mandar correos.
//
// El Database Webhook manda { type, table, record, ... } y un encabezado con un
// secreto compartido (x-aviso-secreto) que la función revisa antes de enviar.

import { igualSeguro } from '../webhooks/firmas'

export const API_RESEND = 'https://api.resend.com/emails'

// Los datos vienen de un formulario público: se escapan antes de meterlos al HTML.
const escapar = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

// "2026-11-25" → "miércoles 25 de noviembre de 2026" (la fecha es de calendario, sin hora).
// Se arma a mano: toLocaleDateString cambia el formato según la versión de Node/Deno.
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
export function fechaLarga(fechaISO) {
  const [a, m, d] = String(fechaISO).split('-').map(Number)
  if (!a || !m || !d) return String(fechaISO ?? '')
  const dia = new Date(Date.UTC(a, m - 1, d)).getUTCDay()
  return `${DIAS[dia]} ${d} de ${MESES[m - 1]} de ${a}`
}

export function correoLlamada(llamada) {
  const cuando = `${fechaLarga(llamada.fecha)} a las ${llamada.hora} (hora CDMX)`
  const filas = [
    ['Cuándo', cuando],
    ['Nombre', llamada.nombre],
    ['Empresa', llamada.empresa],
    ['Correo', llamada.email],
    ['Teléfono', llamada.telefono],
    ['Mensaje', llamada.mensaje || '—'],
  ]
  const html = `<div lang="es" style="font-family:Arial,Helvetica,sans-serif;color:#111021;max-width:520px">
  <h2 style="margin:0 0 4px;color:#5348CF">Nueva llamada agendada</h2>
  <p style="margin:0 0 16px;color:#3a3950">Un prospecto agendó una llamada estratégica desde app.sociusrealestate.com.</p>
  <table style="border-collapse:collapse;width:100%;font-size:14px">
    ${filas.map(([k, v]) => `<tr><td style="padding:8px 12px 8px 0;color:#6b6a7d;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:8px 0;border-bottom:1px solid #EFECFD">${escapar(v)}</td></tr>`).join('\n    ')}
  </table>
  <p style="margin:16px 0 0;font-size:13px;color:#6b6a7d">Responde a este correo para escribirle directo al prospecto.</p>
</div>`
  const texto = ['Nueva llamada agendada', ...filas.map(([k, v]) => `${k}: ${v ?? ''}`)].join('\n')
  return { asunto: `Llamada agendada: ${llamada.nombre} (${llamada.empresa}) · ${cuando}`, html, texto }
}

// Respuesta HTTP: 200 enviado · 204 aviso que no es de una llamada nueva (se ignora)
// 401 secreto incorrecto · 400 contenido inválido · 500 falta configurar · 502 Resend falló
export async function avisarLlamada({ cuerpo, encabezados = {}, config = {}, fetch = globalThis.fetch }) {
  const { secreto, llaveResend, para, de } = config
  if (!secreto || !llaveResend || !para || !de) return { status: 500, motivo: 'falta_configuracion' }

  const enc = Object.fromEntries(Object.entries(encabezados).map(([k, v]) => [k.toLowerCase(), v]))
  if (!igualSeguro(String(enc['x-aviso-secreto'] ?? ''), secreto)) return { status: 401, motivo: 'secreto_invalido' }

  let datos
  try {
    datos = JSON.parse(cuerpo)
  } catch {
    return { status: 400, motivo: 'json_invalido' }
  }
  if (datos?.type !== 'INSERT' || datos?.table !== 'llamadas' || !datos.record) return { status: 204, motivo: 'ignorado' }

  const llamada = datos.record
  const { asunto, html, texto } = correoLlamada(llamada)
  const r = await fetch(API_RESEND, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${llaveResend}`,
      'Content-Type': 'application/json',
      // Si Supabase reintenta el mismo aviso, Resend no manda el correo dos veces.
      'Idempotency-Key': `llamada-${llamada.id ?? `${llamada.fecha}-${llamada.hora}`}`,
    },
    body: JSON.stringify({
      from: de,
      to: [para],
      reply_to: llamada.email || undefined,
      subject: asunto,
      html,
      text: texto,
    }),
  })
  if (!r.ok) {
    const detalle = await r.text().catch(() => '')
    return { status: 502, motivo: `resend_${r.status}`, detalle }
  }
  const { id } = await r.json().catch(() => ({}))
  return { status: 200, motivo: 'enviado', id }
}
