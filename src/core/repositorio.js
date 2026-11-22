// PATRÓN: Repository (acceso a datos).
// El servicio pide "guardar" u "obtener" sin saber dónde viven los datos.
// Interfaz común, toda asíncrona porque una base remota responde por la red:
//   listar() · obtener(id) · guardar(entidad) → entidad con id · borrar(id)
// Implementaciones: memoria (pruebas), localStorage (sin Supabase) y Supabase
// (repositorioSupabase.js).

// Si la entidad llega sin id, se le asigna el siguiente: SOC-100001, SOC-100002…
// (el mismo formato que genera la base de datos).
function siguienteId(lista, prefijo) {
  const max = lista.reduce((m, x) => {
    const n = Number(String(x.id ?? '').slice(prefijo.length))
    return Number.isFinite(n) ? Math.max(m, n) : m
  }, 100000)
  return `${prefijo}${max + 1}`
}

// Número de orden a partir de su pago (lo usa el aviso de reembolso de la pasarela).
const buscarPorTransaccion = (lista, pasarela, idTransaccion) =>
  lista.find((o) => o.pago?.pasarela === pasarela && o.pago?.idTransaccion === idTransaccion)?.id ?? null

export class RepositorioMemoria {
  #datos = new Map()
  constructor({ prefijoId = 'SOC-' } = {}) {
    this.prefijoId = prefijoId
  }
  async listar() {
    return [...this.#datos.values()]
  }
  async obtener(id) {
    return this.#datos.get(id) ?? null
  }
  async guardar(entidad) {
    const conId = entidad.id ? entidad : { ...entidad, id: siguienteId([...this.#datos.values()], this.prefijoId) }
    this.#datos.set(conId.id, conId)
    return conId
  }
  async ordenPorTransaccion(pasarela, idTransaccion) {
    return buscarPorTransaccion(await this.listar(), pasarela, idTransaccion)
  }
  async borrar(id) {
    this.#datos.delete(id)
  }
}

export class RepositorioLocalStorage {
  constructor(clave, { almacen = globalThis.localStorage, prefijoId = 'SOC-' } = {}) {
    this.clave = clave
    this.almacen = almacen
    this.prefijoId = prefijoId
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
  async listar() {
    return this.#leer()
  }
  async obtener(id) {
    return this.#leer().find((x) => x.id === id) ?? null
  }
  async guardar(entidad) {
    const lista = this.#leer()
    const conId = entidad.id ? entidad : { ...entidad, id: siguienteId(lista, this.prefijoId) }
    const i = lista.findIndex((x) => x.id === conId.id)
    if (i >= 0) lista[i] = conId
    else lista.unshift(conId)
    this.#escribir(lista)
    return conId
  }
  async ordenPorTransaccion(pasarela, idTransaccion) {
    return buscarPorTransaccion(await this.listar(), pasarela, idTransaccion)
  }
  async borrar(id) {
    this.#escribir(this.#leer().filter((x) => x.id !== id))
  }
}
