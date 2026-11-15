// PATRÓN: Factory Method (creacional).
// El catálogo es una lista de datos planos; la fábrica decide qué clase concreta
// crear según `tipo`. Un tipo nuevo (p. ej. "taller") = nueva clase + registro,
// sin tocar las pantallas.
import { ESTRATEGIAS_COBRO, entregaInmediata, entregaServicio } from './entrega'

class Producto {
  constructor(datos) {
    Object.assign(this, datos)
  }
  cobro(config) {
    return ESTRATEGIAS_COBRO[this.formaPago ?? 'unico'](this.precio, config)
  }
}

export class ProductoDigital extends Producto {
  requiereAgenda = false
  etiquetaTipo = 'Producto digital'
  entrega(hoy) {
    return entregaInmediata(hoy)
  }
}

export class Servicio extends Producto {
  requiereAgenda = true
  etiquetaTipo = 'Servicio'
  entrega(hoy, config, ocupacion) {
    return entregaServicio(hoy, config, ocupacion)
  }
}

const REGISTRO = { digital: ProductoDigital, servicio: Servicio }

export function crearProducto(datos) {
  const Clase = REGISTRO[datos.tipo]
  if (!Clase) throw new Error(`Tipo de producto desconocido: ${datos.tipo}`)
  return new Clase(datos)
}

export function registrarTipoProducto(tipo, Clase) {
  REGISTRO[tipo] = Clase
}
