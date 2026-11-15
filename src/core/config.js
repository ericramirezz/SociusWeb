// PATRÓN: Singleton (creacional).
// Una sola configuración compartida por toda la app. Siguiendo la nota de clase,
// los servicios NO llaman a ConfigApp.obtener() por dentro: la reciben por
// parámetro (inyección de dependencias), así las pruebas pueden pasar otra.
export class ConfigApp {
  static #instancia = null

  constructor() {
    if (ConfigApp.#instancia) {
      throw new Error('ConfigApp es Singleton: usa ConfigApp.obtener()')
    }
    this.moneda = 'MXN'
    this.diasHabilesMinimosArranque = 5 // anticipación mínima para arrancar un servicio
    this.diasPrimeraVersion = 15 // la primera versión queda operando 15 días después
    this.mesesPrograma = 4 // todos los servicios duran 4 meses
    this.arranquesPorDia = 2 // capacidad de Socius: proyectos que arrancan el mismo día
    this.pasarelaPorDefecto = 'stripe'
    Object.freeze(this)
  }

  static obtener() {
    if (!ConfigApp.#instancia) ConfigApp.#instancia = new ConfigApp()
    return ConfigApp.#instancia
  }
}
