// PATRÓN: Decorator (estructural).
// Envuelven a cualquier pasarela y le agregan comportamiento SIN modificarla.
// Se pueden apilar: conRegistro(conIdempotencia(pasarela)).

// Hereda del objeto envuelto (nombre, etiqueta, reembolsar…) y solo redefine lo que cambia.
const envolver = (pasarela, extras) => Object.assign(Object.create(pasarela), extras)

// Bitácora: registra cada cobro y reembolso con su duración.
export function conRegistro(pasarela, registrar = console.info) {
  const medir = (operacion) => async (datos) => {
    const t0 = Date.now()
    const r = await pasarela[operacion](datos)
    registrar(`[pagos] ${pasarela.nombre}.${operacion} ${r.ok ? 'OK' : 'RECHAZADO'} (${Date.now() - t0} ms)`, {
      referencia: datos.referencia ?? datos.idTransaccion,
      monto: datos.monto,
    })
    return r
  }
  return envolver(pasarela, { cobrar: medir('cobrar'), reembolsar: medir('reembolsar') })
}

// Idempotencia: reintentar el mismo cobro (misma referencia) no cobra dos veces.
// Si el usuario da doble clic en "Pagar", el segundo intento recibe el primer resultado.
export function conIdempotencia(pasarela) {
  const aprobados = new Map()
  return envolver(pasarela, {
    async cobrar(datos) {
      if (aprobados.has(datos.referencia)) return { ...aprobados.get(datos.referencia), repetido: true }
      const r = await pasarela.cobrar(datos)
      if (r.ok) aprobados.set(datos.referencia, r)
      return r
    },
  })
}

// Reintento: si la pasarela falla por red (lanza excepción), vuelve a intentar.
// Un rechazo de tarjeta NO es excepción y no se reintenta.
export function conReintento(pasarela, intentos = 3) {
  return envolver(pasarela, {
    async cobrar(datos) {
      let ultimoError
      for (let i = 0; i < intentos; i++) {
        try {
          return await pasarela.cobrar(datos)
        } catch (e) {
          ultimoError = e
        }
      }
      throw ultimoError
    },
  })
}
