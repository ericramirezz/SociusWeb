// PATRÓN: Strategy (comportamiento).
// Dos familias de algoritmos intercambiables, sin cadenas de if/else:
//   1. Fecha de entrega según el tipo de producto (digital vs. servicio).
//   2. Cobro inicial según la forma de pago (único, 2 pagos, mensual).
import { aISO, deISO, esHabil, sumarDias, sumarDiasHabiles, sumarMeses } from './fechas'

// --- 1. Estrategias de entrega -------------------------------------------
// Firma común: (hoy, config, ocupacion) => { tipo, fechaEntrega, ... }

export function entregaInmediata(hoy) {
  return { tipo: 'digital', fechaEntrega: aISO(hoy), descripcion: 'Acceso inmediato al confirmar el pago' }
}

export function entregaServicio(hoy, config, ocupacion = {}) {
  const minimo = sumarDiasHabiles(hoy, config.diasHabilesMinimosArranque)
  const arranque = primerDiaDisponible(minimo, config, ocupacion)
  return { tipo: 'servicio', ...calendarioServicio(arranque, config) }
}

export function calendarioServicio(arranque, config) {
  return {
    fechaArranque: aISO(arranque),
    fechaEntrega: aISO(sumarDias(arranque, config.diasPrimeraVersion)), // primera versión operando
    fechaFin: aISO(sumarMeses(arranque, config.mesesPrograma)),
    descripcion: `Primera versión operando ${config.diasPrimeraVersion} días después del arranque`,
  }
}

// --- Disponibilidad de agenda --------------------------------------------
// ocupacion: { 'YYYY-MM-DD': número de arranques ya agendados ese día }

export const hayDisponibilidad = (fecha, config, ocupacion = {}) =>
  esHabil(fecha) && (ocupacion[aISO(fecha)] ?? 0) < config.arranquesPorDia

export function primerDiaDisponible(desde, config, ocupacion = {}) {
  let d = new Date(desde)
  while (!hayDisponibilidad(d, config, ocupacion)) d = sumarDias(d, 1)
  return d
}

// El cliente propone su fecha: si hay lugar se confirma; si no, se sugiere la más cercana.
export function resolverFechaCliente(fechaISO, hoy, config, ocupacion = {}) {
  const minimo = deISO(aISO(sumarDiasHabiles(hoy, config.diasHabilesMinimosArranque))) // sin hora
  const pedida = deISO(fechaISO)
  if (pedida >= minimo && hayDisponibilidad(pedida, config, ocupacion)) {
    return { confirmada: true, fecha: fechaISO, motivo: null, codigo: null }
  }
  const base = pedida < minimo ? minimo : pedida
  const sugerida = aISO(primerDiaDisponible(base, config, ocupacion))
  // `codigo` permite a la interfaz mostrar el motivo en el idioma elegido.
  const codigo = pedida < minimo ? 'anticipacion' : !esHabil(pedida) ? 'finDeSemana' : 'sinLugar'
  const motivo = {
    anticipacion: `Se necesitan al menos ${config.diasHabilesMinimosArranque} días hábiles de anticipación`,
    finDeSemana: 'Los arranques son de lunes a viernes',
    sinLugar: 'Ese día ya no tiene lugares',
  }[codigo]
  return { confirmada: false, fecha: sugerida, motivo, codigo }
}

// --- 2. Estrategias de cobro ---------------------------------------------
// Firma común: (precio, config) => { hoy, totalContrato, detalle }

export const ESTRATEGIAS_COBRO = {
  unico: (precio) => ({ hoy: precio, totalContrato: precio, detalle: 'Pago único' }),
  dos_pagos: (precio) => ({ hoy: precio / 2, totalContrato: precio, detalle: '2 pagos: 50% hoy y 50% al mes 2' }),
  mensual: (precio, config) => ({
    hoy: precio,
    totalContrato: precio * config.mesesPrograma,
    detalle: `${config.mesesPrograma} mensualidades; hoy se cobra la primera`,
  }),
}
