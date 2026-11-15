// PATRÓN: Repository (acceso a datos).
// Las pantallas y el servicio piden "guardar" o "listar" sin saber dónde viven
// los datos. Hoy: localStorage. En pruebas: memoria. Después: Supabase, con la
// misma interfaz { listar, obtener, guardar, borrar }.
export class RepositorioMemoria {
  #datos = new Map()
  listar() {
    return [...this.#datos.values()]
  }
  obtener(id) {
    return this.#datos.get(id) ?? null
  }
  guardar(entidad) {
    this.#datos.set(entidad.id, entidad)
    return entidad
  }
  borrar(id) {
    this.#datos.delete(id)
  }
}

export class RepositorioLocalStorage {
  constructor(clave, almacen = globalThis.localStorage) {
    this.clave = clave
    this.almacen = almacen
  }
  #leer() {
    try {
      return JSON.parse(this.almacen.getItem(this.clave) || '[]')
    } catch {
      return []
    }
  }
  #escribir(lista) {
    this.almacen.setItem(this.clave, JSON.stringify(lista))
  }
  listar() {
    return this.#leer()
  }
  obtener(id) {
    return this.#leer().find((x) => x.id === id) ?? null
  }
  guardar(entidad) {
    const lista = this.#leer()
    const i = lista.findIndex((x) => x.id === entidad.id)
    if (i >= 0) lista[i] = entidad
    else lista.unshift(entidad)
    this.#escribir(lista)
    return entidad
  }
  borrar(id) {
    this.#escribir(this.#leer().filter((x) => x.id !== id))
  }
}
