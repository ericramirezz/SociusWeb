// Agenda de llamadas estratégicas: genera los próximos días hábiles con sus
// horarios y oculta los que ya están tomados. Usa el mismo Repository y Observer.
//
// fuenteOcupados (opcional): async (desdeISO, hastaISO) => [{ fecha, hora }].
// Con Supabase la da la base (el navegador no puede leer los datos de otras
// llamadas); sin ella se leen del repositorio.
import { EVENTOS } from './eventos'
import { aISO, sumarDiasHabiles } from './fechas'

const HORAS = ['10:00', '11:00', '12:00', '15:00', '16:00', '17:00']

// Error con código para que la interfaz distinga "horario tomado" de una falla de red.
export const HORARIO_OCUPADO = 'horario_ocupado'
const horarioOcupado = () => Object.assign(new Error('Ese horario ya no está disponible'), { codigo: HORARIO_OCUPADO })

export class AgendaLlamadas {
  constructor({ repoLlamadas, bus, reloj = () => new Date(), fuenteOcupados = null }) {
    Object.assign(this, { repoLlamadas, bus, reloj, fuenteOcupados })
  }

  async horarios(dias = 5) {
    const fechas = Array.from({ length: dias }, (_, i) => aISO(sumarDiasHabiles(this.reloj(), i + 1)))
    const ocupados = this.fuenteOcupados
      ? await this.fuenteOcupados(fechas[0], fechas.at(-1))
      : await this.repoLlamadas.listar()
    const tomados = new Set(ocupados.map((l) => `${l.fecha} ${l.hora}`))
    return fechas.map((fecha) => ({ fecha, horas: HORAS.filter((h) => !tomados.has(`${fecha} ${h}`)) }))
  }

  async agendar({ cliente, fecha, hora }) {
    const libre = (await this.horarios(30)).some((d) => d.fecha === fecha && d.horas.includes(hora))
    if (!libre) throw horarioOcupado()
    let llamada
    try {
      llamada = await this.repoLlamadas.guardar({ id: `${fecha} ${hora}`, cliente, fecha, hora })
    } catch (e) {
      // Con Supabase, si otra persona lo tomó un instante antes, la base lo rechaza (23505 = unique).
      throw e.codigo === '23505' ? horarioOcupado() : e
    }
    this.bus.publicar(EVENTOS.LLAMADA_AGENDADA, llamada)
    return llamada
  }
}
