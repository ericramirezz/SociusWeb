// Agenda de llamadas estratégicas: genera los próximos días hábiles con sus
// horarios y oculta los que ya están tomados. Usa el mismo Repository y Observer.
import { EVENTOS } from './eventos'
import { aISO, sumarDiasHabiles } from './fechas'

const HORAS = ['10:00', '11:00', '12:00', '15:00', '16:00', '17:00']

export class AgendaLlamadas {
  constructor({ repoLlamadas, bus, reloj = () => new Date() }) {
    Object.assign(this, { repoLlamadas, bus, reloj })
  }

  horarios(dias = 5) {
    const tomados = new Set(this.repoLlamadas.listar().map((l) => `${l.fecha} ${l.hora}`))
    return Array.from({ length: dias }, (_, i) => {
      const fecha = aISO(sumarDiasHabiles(this.reloj(), i + 1))
      return { fecha, horas: HORAS.filter((h) => !tomados.has(`${fecha} ${h}`)) }
    })
  }

  agendar({ cliente, fecha, hora }) {
    const libre = this.horarios(30).some((d) => d.fecha === fecha && d.horas.includes(hora))
    if (!libre) throw new Error('Ese horario ya no está disponible')
    const llamada = this.repoLlamadas.guardar({ id: `${fecha} ${hora}`, cliente, fecha, hora })
    this.bus.publicar(EVENTOS.LLAMADA_AGENDADA, llamada)
    return llamada
  }
}
