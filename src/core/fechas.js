// Utilidades de fecha. Todas trabajan en hora local y con cadenas 'YYYY-MM-DD'
// para evitar el desfase de un día que produce toISOString() (UTC).
export const aISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const deISO = (iso) => {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(a, m - 1, d)
}

export const esHabil = (d) => d.getDay() !== 0 && d.getDay() !== 6

export function sumarDias(fecha, dias) {
  const r = new Date(fecha)
  r.setDate(r.getDate() + dias)
  return r
}

export function sumarDiasHabiles(fecha, dias) {
  let r = new Date(fecha)
  let contados = 0
  while (contados < dias) {
    r = sumarDias(r, 1)
    if (esHabil(r)) contados++
  }
  return r
}

export function sumarMeses(fecha, meses) {
  const r = new Date(fecha)
  r.setMonth(r.getMonth() + meses)
  return r
}

export const formatoLargo = (iso, locale = 'es-MX') =>
  deISO(iso).toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

export const formatoMoneda = (n) => `$${Number(n).toLocaleString('es-MX')}`
