// PATRÓN: Factory Method (creacional), versión con registro como en la nota de clase.
// El checkout pide crearPasarela('stripe') y recibe un objeto con cobrar() y
// reembolsar(); no sabe qué clase concreta hay detrás.
// Nuevo proveedor = nueva clase adaptadora + una línea en el registro.
import { AdaptadorMercadoPago, AdaptadorPayPal, AdaptadorStripe } from './adaptadores'
import { conIdempotencia, conRegistro, conReintento } from './decoradores'
import { crearSdks } from './sdkSimulados'

export class FabricaPasarelas {
  #registro = new Map()
  #instancias = new Map()

  constructor(sdks = crearSdks(), registrar = console.info) {
    this.registrar = registrar
    this.registrarPasarela('stripe', () => new AdaptadorStripe(sdks.stripe))
    this.registrarPasarela('mercadopago', () => new AdaptadorMercadoPago(sdks.mercadopago))
    this.registrarPasarela('paypal', () => new AdaptadorPayPal(sdks.paypal))
  }

  registrarPasarela(tipo, constructor) {
    this.#registro.set(tipo, constructor)
  }

  crearPasarela(tipo) {
    if (!this.#registro.has(tipo)) throw new Error(`Pasarela no soportada: ${tipo}`)
    // Una instancia por tipo: la memoria de idempotencia debe sobrevivir entre cobros.
    if (!this.#instancias.has(tipo)) {
      const base = this.#registro.get(tipo)()
      this.#instancias.set(tipo, conRegistro(conIdempotencia(conReintento(base)), this.registrar))
    }
    return this.#instancias.get(tipo)
  }

  disponibles() {
    return [...this.#registro.keys()].map((tipo) => ({ tipo, etiqueta: this.crearPasarela(tipo).etiqueta }))
  }
}
