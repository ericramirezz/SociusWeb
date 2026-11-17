// La cola de avisos de pago: el receptor (productor) deja cada aviso y el
// procesador (consumidor) los toma después. Si procesar falla, el aviso no se
// pierde: vuelve a la cola hasta MAX_INTENTOS y luego queda en 'error' para revisarlo.
//
// Misma interfaz en dos versiones (como el Repository): memoria para pruebas y
// la tabla eventos_pago de Supabase.

export const ESTADOS_EVENTO = Object.freeze({
  PENDIENTE: 'pendiente',
  PROCESANDO: 'procesando',
  PROCESADO: 'procesado',
  ERROR: 'error',
})
export const MAX_INTENTOS = 3

const siguienteEstado = (intentos, max) => (intentos >= max ? ESTADOS_EVENTO.ERROR : ESTADOS_EVENTO.PENDIENTE)

export class ColaEventosMemoria {
  #filas = []
  #seq = 0

  // Devuelve { nuevo: false } si ese aviso (misma pasarela e id) ya estaba: no se duplica.
  async encolar({ pasarela, eventoId, tipo, contenido }) {
    if (this.#filas.some((f) => f.pasarela === pasarela && f.eventoId === eventoId)) return { nuevo: false }
    this.#filas.push({ id: ++this.#seq, pasarela, eventoId, tipo, contenido, estado: ESTADOS_EVENTO.PENDIENTE, intentos: 0, ultimoError: null })
    return { nuevo: true }
  }

  // Toma los pendientes y los marca como 'procesando' para que nadie más los tome.
  async tomar(limite = 10) {
    const tomados = this.#filas.filter((f) => f.estado === ESTADOS_EVENTO.PENDIENTE).slice(0, limite)
    tomados.forEach((f) => (f.estado = ESTADOS_EVENTO.PROCESANDO))
    return tomados.map((f) => ({ ...f }))
  }

  async marcarProcesado(evento) {
    this.#buscar(evento.id).estado = ESTADOS_EVENTO.PROCESADO
  }

  async registrarFallo(evento, mensaje, max = MAX_INTENTOS) {
    const f = this.#buscar(evento.id)
    f.intentos += 1
    f.ultimoError = mensaje
    f.estado = siguienteEstado(f.intentos, max)
  }

  async listar() {
    return this.#filas.map((f) => ({ ...f }))
  }

  #buscar(id) {
    return this.#filas.find((f) => f.id === id)
  }
}

const aEvento = (f) => ({
  id: f.id, pasarela: f.pasarela, eventoId: f.evento_id, tipo: f.tipo, contenido: f.contenido,
  estado: f.estado, intentos: f.intentos, ultimoError: f.ultimo_error ?? null,
})

// Solo corre en el servidor (Edge Function) con la llave de servicio: el navegador no tiene acceso a esta tabla.
export class ColaEventosSupabase {
  constructor(cliente) {
    this.cliente = cliente
  }

  async encolar({ pasarela, eventoId, tipo, contenido }) {
    const { data, error } = await this.cliente
      .from('eventos_pago')
      .upsert({ pasarela, evento_id: eventoId, tipo, contenido }, { onConflict: 'pasarela,evento_id', ignoreDuplicates: true })
      .select('id')
    if (error) throw new Error(`No se pudo guardar el aviso: ${error.message}`)
    return { nuevo: data.length > 0 }
  }

  // La función tomar_eventos_pago (migración 003) usa "for update skip locked":
  // si dos consumidores corren a la vez, cada aviso lo toma solo uno.
  async tomar(limite = 10) {
    const { data, error } = await this.cliente.rpc('tomar_eventos_pago', { limite })
    if (error) throw new Error(`No se pudieron tomar los avisos: ${error.message}`)
    return data.map(aEvento)
  }

  async marcarProcesado(evento) {
    const { error } = await this.cliente
      .from('eventos_pago')
      .update({ estado: ESTADOS_EVENTO.PROCESADO, procesado_en: new Date().toISOString(), ultimo_error: null })
      .eq('id', evento.id)
    if (error) throw new Error(`No se pudo marcar el aviso: ${error.message}`)
  }

  async registrarFallo(evento, mensaje, max = MAX_INTENTOS) {
    const intentos = evento.intentos + 1
    const { error } = await this.cliente
      .from('eventos_pago')
      .update({ intentos, ultimo_error: mensaje, estado: siguienteEstado(intentos, max) })
      .eq('id', evento.id)
    if (error) throw new Error(`No se pudo registrar el fallo: ${error.message}`)
  }
}
