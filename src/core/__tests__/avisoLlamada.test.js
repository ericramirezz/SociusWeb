// Aviso a Socius al agendar una llamada (Edge Function aviso-llamada).
// No llama a Resend: se usa un fetch falso que guarda lo que se habría enviado.
import { describe, expect, it } from 'vitest'
import { API_RESEND, avisarLlamada, correoLlamada, fechaLarga } from '../avisos/avisoLlamada'

const CONFIG = { secreto: 'secreto-prueba', llaveResend: 're_prueba', para: 'admin@sociusrealestate.com', de: 'Socius <avisos@correo.sociusrealestate.com>' }
const LLAMADA = { id: 7, fecha: '2026-11-25', hora: '11:00', nombre: 'Ana', empresa: 'Demo', email: 'ana@demo.mx', telefono: '5500000000', mensaje: null }
const aviso = (record = LLAMADA, extra = {}) => JSON.stringify({ type: 'INSERT', table: 'llamadas', schema: 'public', record, old_record: null, ...extra })

function fetchFalso(respuesta = { ok: true, status: 200, json: async () => ({ id: 'email_1' }) }) {
  const llamadas = []
  const f = async (url, opciones) => {
    llamadas.push({ url, ...opciones, body: JSON.parse(opciones.body) })
    return respuesta
  }
  f.llamadas = llamadas
  return f
}

describe('Aviso de llamada agendada', () => {
  it('CP-52 manda el correo a Socius con los datos del prospecto y responde al prospecto', async () => {
    const fetch = fetchFalso()
    const r = await avisarLlamada({ cuerpo: aviso(), encabezados: { 'X-Aviso-Secreto': 'secreto-prueba' }, config: CONFIG, fetch })

    expect(r).toEqual({ status: 200, motivo: 'enviado', id: 'email_1' })
    expect(fetch.llamadas).toHaveLength(1)
    const [envio] = fetch.llamadas
    expect(envio.url).toBe(API_RESEND)
    expect(envio.headers.Authorization).toBe('Bearer re_prueba')
    expect(envio.headers['Idempotency-Key']).toBe('llamada-7')
    expect(envio.body).toMatchObject({ from: CONFIG.de, to: ['admin@sociusrealestate.com'], reply_to: 'ana@demo.mx' })
    expect(envio.body.subject).toContain('Ana (Demo)')
    expect(envio.body.subject).toContain('miércoles 25 de noviembre de 2026 a las 11:00')
    expect(envio.body.text).toContain('Teléfono: 5500000000')
  })

  it('CP-53 sin el secreto correcto no manda nada', async () => {
    const fetch = fetchFalso()
    expect(await avisarLlamada({ cuerpo: aviso(), encabezados: {}, config: CONFIG, fetch })).toMatchObject({ status: 401 })
    expect(await avisarLlamada({ cuerpo: aviso(), encabezados: { 'x-aviso-secreto': 'otro' }, config: CONFIG, fetch })).toMatchObject({ status: 401 })
    expect(await avisarLlamada({ cuerpo: aviso(), encabezados: { 'x-aviso-secreto': 'secreto-prueba' }, config: { ...CONFIG, llaveResend: '' }, fetch }))
      .toMatchObject({ status: 500, motivo: 'falta_configuracion' })
    expect(fetch.llamadas).toHaveLength(0)
  })

  it('CP-54 ignora avisos que no son una llamada nueva y rechaza contenido inválido', async () => {
    const fetch = fetchFalso()
    const enc = { 'x-aviso-secreto': 'secreto-prueba' }
    expect(await avisarLlamada({ cuerpo: aviso(LLAMADA, { type: 'UPDATE' }), encabezados: enc, config: CONFIG, fetch })).toMatchObject({ status: 204 })
    expect(await avisarLlamada({ cuerpo: aviso(LLAMADA, { table: 'ordenes' }), encabezados: enc, config: CONFIG, fetch })).toMatchObject({ status: 204 })
    expect(await avisarLlamada({ cuerpo: 'no es json', encabezados: enc, config: CONFIG, fetch })).toMatchObject({ status: 400 })
    expect(fetch.llamadas).toHaveLength(0)
  })

  it('CP-55 escapa lo que escribió el prospecto y avisa si Resend falla', async () => {
    const { html } = correoLlamada({ ...LLAMADA, nombre: '<script>x</script>', mensaje: 'Hola & "adiós"' })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('Hola &amp; &quot;adiós&quot;')
    expect(fechaLarga('2026-11-30')).toBe('lunes 30 de noviembre de 2026')

    const fetch = fetchFalso({ ok: false, status: 403, text: async () => 'domain not verified' })
    expect(await avisarLlamada({ cuerpo: aviso(), encabezados: { 'x-aviso-secreto': 'secreto-prueba' }, config: CONFIG, fetch }))
      .toMatchObject({ status: 502, motivo: 'resend_403', detalle: 'domain not verified' })
  })
})
