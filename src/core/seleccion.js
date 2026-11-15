// Selección del cotizador (qué programas eligió el visitante). Vive en localStorage.
const CLAVE = 'cotizador_seleccionados'
const leer = () => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) || '[]')
  } catch {
    return []
  }
}
export const seleccion = {
  leer,
  guardar: (ids) => (localStorage.setItem(CLAVE, JSON.stringify(ids)), ids),
  agregar: (id) => seleccion.guardar([...new Set([...leer(), id])]),
  alternar: (id) => seleccion.guardar(leer().includes(id) ? leer().filter((x) => x !== id) : [...leer(), id]),
  quitar: (id) => seleccion.guardar(leer().filter((x) => x !== id)),
  vaciar: () => localStorage.removeItem(CLAVE),
}
