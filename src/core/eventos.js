// PATRÓN: Observer (comportamiento).
// El servicio de pedidos publica eventos ("orden.pagada", "orden.cancelada"…)
// sin conocer a quién le interesan. Las notificaciones en pantalla y la bitácora
// se suscriben. Agregar una reacción nueva (correo, factura, webhook) es
// suscribirse, sin tocar el código que publica.
export class BusEventos {
  #suscriptores = new Map()

  suscribir(evento, fn) {
    if (!this.#suscriptores.has(evento)) this.#suscriptores.set(evento, new Set())
    this.#suscriptores.get(evento).add(fn)
    return () => this.#suscriptores.get(evento)?.delete(fn) // función para desuscribirse
  }

  publicar(evento, datos) {
    const interesados = [...(this.#suscriptores.get(evento) ?? []), ...(this.#suscriptores.get('*') ?? [])]
    interesados.forEach((fn) => fn(datos, evento))
  }
}

export const EVENTOS = Object.freeze({
  COTIZADA: 'orden.cotizada',
  PAGADA: 'orden.pagada',
  AGENDADA: 'orden.agendada',
  CANCELADA: 'orden.cancelada',
  REEMBOLSADA: 'orden.reembolsada',
  REEMBOLSO_SOLICITADO: 'orden.reembolso_solicitado',
  PAGO_RECHAZADO: 'pago.rechazado',
  LLAMADA_AGENDADA: 'llamada.agendada',
})
