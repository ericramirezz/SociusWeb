// PATRÓN: State (comportamiento), como tabla de transiciones.
// Los siete estados del anteproyecto y qué evento lleva de uno a otro.
// Cualquier transición que no esté en la tabla se rechaza.
export const ESTADOS = Object.freeze({
  COTIZADA: 'cotizada',
  PAGADA: 'pagada',
  AGENDADA: 'agendada',
  EN_CURSO: 'en_curso',
  COMPLETADA: 'completada',
  CANCELADA: 'cancelada',
  REEMBOLSADA: 'reembolsada',
})

const E = ESTADOS
const TRANSICIONES = {
  [E.COTIZADA]: { pagar: E.PAGADA, cancelar: E.CANCELADA },
  [E.PAGADA]: { agendar: E.AGENDADA, completar: E.COMPLETADA, cancelar: E.CANCELADA, reembolsar: E.REEMBOLSADA },
  [E.AGENDADA]: { iniciar: E.EN_CURSO, cancelar: E.CANCELADA, reembolsar: E.REEMBOLSADA },
  [E.EN_CURSO]: { completar: E.COMPLETADA, reembolsar: E.REEMBOLSADA },
  [E.COMPLETADA]: { reembolsar: E.REEMBOLSADA },
  [E.CANCELADA]: { reembolsar: E.REEMBOLSADA },
  [E.REEMBOLSADA]: {},
}

export const ETIQUETAS = {
  [E.COTIZADA]: 'Cotizada',
  [E.PAGADA]: 'Pagada',
  [E.AGENDADA]: 'Agendada',
  [E.EN_CURSO]: 'En curso',
  [E.COMPLETADA]: 'Completada',
  [E.CANCELADA]: 'Cancelada',
  [E.REEMBOLSADA]: 'Reembolsada',
}

export const puede = (orden, evento) => Boolean(TRANSICIONES[orden.estado]?.[evento])

export const accionesPermitidas = (orden) => Object.keys(TRANSICIONES[orden.estado] ?? {})

// Devuelve una orden NUEVA (no muta) con el estado siguiente y el historial actualizado.
export function transicionar(orden, evento, ahora = new Date()) {
  const siguiente = TRANSICIONES[orden.estado]?.[evento]
  if (!siguiente) {
    throw new Error(`Transición inválida: no se puede "${evento}" una orden ${ETIQUETAS[orden.estado] ?? orden.estado}`)
  }
  return {
    ...orden,
    estado: siguiente,
    historial: [...(orden.historial ?? []), { estado: siguiente, evento, fecha: ahora.toISOString() }],
  }
}
