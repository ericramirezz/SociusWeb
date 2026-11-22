// Pagos en la página de la pasarela (Sprint 7), lado del navegador.
// No cobra nada aquí: le pide a la Edge Function crear-pago la URL de la página
// de pago (la llave secreta vive solo en el servidor). Quien confirma el pago es
// el webhook firmado de la pasarela, no el navegador.
export class SesionesPagoSupabase {
  constructor(cliente, pasarelas = ['stripe']) {
    this.cliente = cliente
    this.pasarelas = pasarelas
  }

  soporta(pasarela) {
    return this.pasarelas.includes(pasarela)
  }

  async crear({ ordenId, origen }) {
    const { data, error } = await this.cliente.functions.invoke('crear-pago', { body: { ordenId, origen } })
    if (error) {
      // La función responde { error: 'motivo' }; se muestra ese motivo si viene.
      let motivo
      try {
        motivo = (await error.context?.json())?.error
      } catch {
        motivo = undefined
      }
      throw new Error(motivo ?? error.message)
    }
    if (!data?.url) throw new Error('La pasarela no devolvió la página de pago')
    return data
  }
}
