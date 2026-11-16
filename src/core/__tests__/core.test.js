import { describe, expect, it, vi } from 'vitest'
import { programas } from '../../data/programas'
import { AgendaLlamadas, HORARIO_OCUPADO } from '../agendaLlamadas'
import { ConfigApp } from '../config'
import { resolverFechaCliente } from '../entrega'
import { ESTADOS, transicionar } from '../estadoOrden'
import { BusEventos, EVENTOS } from '../eventos'
import { conIdempotencia, conReintento } from '../pagos/decoradores'
import { FabricaPasarelas } from '../pagos/fabricaPasarelas'
import { crearSdks, TARJETA_APROBADA, TARJETA_RECHAZADA } from '../pagos/sdkSimulados'
import { crearProducto, ProductoDigital, Servicio } from '../productos'
import { RepositorioMemoria } from '../repositorio'
import { ServicioPedidos } from '../servicioPedidos'

const config = ConfigApp.obtener()
const LUNES = new Date(2026, 10, 16, 10, 0) // lunes 16 de noviembre de 2026

function montar(hoy = LUNES) {
  const reloj = { ahora: hoy }
  const bus = new BusEventos()
  const eventos = []
  bus.suscribir('*', (_, e) => eventos.push(e))
  const servicio = new ServicioPedidos({
    repoPedidos: new RepositorioMemoria(),
    fabricaPasarelas: new FabricaPasarelas(crearSdks(0), () => {}),
    bus, config, catalogo: programas,
    reloj: () => new Date(reloj.ahora.getTime() + eventos.length), // ids únicos por orden
  })
  return { servicio, eventos, reloj }
}
const cliente = { nombre: 'Ana', empresa: 'Demo', email: 'ana@demo.mx', telefono: '5500000000' }

describe('Singleton · ConfigApp', () => {
  it('CP-01 siempre devuelve la misma instancia y no permite new', () => {
    expect(ConfigApp.obtener()).toBe(ConfigApp.obtener())
    expect(() => new ConfigApp()).toThrow()
  })
})

describe('Factory Method · productos', () => {
  it('CP-02 crea la clase correcta según el tipo', () => {
    expect(crearProducto(programas.find((p) => p.id === 'avi'))).toBeInstanceOf(ProductoDigital)
    expect(crearProducto(programas.find((p) => p.id === 'socius-core'))).toBeInstanceOf(Servicio)
    expect(() => crearProducto({ tipo: 'otro' })).toThrow()
  })
})

describe('Strategy · cobro y entrega', () => {
  const { servicio } = montar()
  it('CP-03 cotiza varios productos con su forma de pago', () => {
    const c = servicio.cotizar(['nexus-growth', 'nexus-growth-split', 'socius-core', 'avi'])
    expect(c.partidas).toHaveLength(4)
    // único 80,000 + primera mensualidad 35,000 + 50% de 150,000 + 7,000
    expect(c.totalHoy).toBe(80000 + 35000 + 75000 + 7000)
    expect(c.totalContrato).toBe(80000 + 35000 * 4 + 150000 + 7000)
  })
  it('CP-04 producto digital: entrega el mismo día, sin agenda', () => {
    const c = servicio.cotizar(['avi'])
    expect(c.requiereAgenda).toBe(false)
    expect(c.entregaPropuesta.fechaEntrega).toBe('2026-11-16')
  })
  it('CP-05 servicio: arranque a 5 días hábiles, primera versión +15 días, fin +4 meses', () => {
    const e = servicio.cotizar(['nexus-growth']).entregaPropuesta
    expect(e).toMatchObject({ fechaArranque: '2026-11-23', fechaEntrega: '2026-12-08', fechaFin: '2027-03-23' })
  })
})

describe('Agenda · fecha propuesta por el cliente', () => {
  it('CP-06 confirma una fecha hábil con lugar', () => {
    expect(resolverFechaCliente('2026-11-25', LUNES, config, {})).toMatchObject({ confirmada: true, fecha: '2026-11-25' })
  })
  it('CP-07 fin de semana, día lleno o muy pronto: sugiere la más cercana', () => {
    expect(resolverFechaCliente('2026-11-28', LUNES, config, {})).toMatchObject({ confirmada: false, fecha: '2026-11-30' })
    expect(resolverFechaCliente('2026-11-25', LUNES, config, { '2026-11-25': 2 })).toMatchObject({ confirmada: false, fecha: '2026-11-26' })
    expect(resolverFechaCliente('2026-11-17', LUNES, config, {})).toMatchObject({ confirmada: false, fecha: '2026-11-23' })
  })
})

describe('Adapter + Factory · pasarelas', () => {
  const fabrica = new FabricaPasarelas(crearSdks(0), () => {})
  it.each(['stripe', 'mercadopago', 'paypal'])('CP-08 %s cobra y reembolsa bajo el mismo contrato', async (tipo) => {
    const p = fabrica.crearPasarela(tipo)
    const cobro = await p.cobrar({ monto: 7000, moneda: 'MXN', referencia: `ref-${tipo}`, tarjeta: TARJETA_APROBADA })
    expect(cobro).toMatchObject({ ok: true, pasarela: tipo })
    expect(typeof cobro.idTransaccion).toBe('string')
    expect(await p.reembolsar({ idTransaccion: cobro.idTransaccion, monto: 7000, moneda: 'MXN' })).toMatchObject({ ok: true })
  })
  it('CP-09 cada adaptador traduce el monto al formato de su proveedor', async () => {
    const sdks = crearSdks(0)
    const stripe = vi.spyOn(sdks.stripe.paymentIntents, 'create')
    const mp = vi.spyOn(sdks.mercadopago.payment, 'create')
    const pp = vi.spyOn(sdks.paypal.orders, 'capture')
    const f = new FabricaPasarelas(sdks, () => {})
    for (const t of ['stripe', 'mercadopago', 'paypal']) await f.crearPasarela(t).cobrar({ monto: 1500.5, moneda: 'MXN', referencia: 'x' })
    expect(stripe.mock.calls[0][0].amount).toBe(150050) // centavos
    expect(mp.mock.calls[0][0].transaction_amount).toBe(1500.5) // pesos
    expect(pp.mock.calls[0][0].purchase_units[0].amount.value).toBe('1500.50') // texto
  })
  it('CP-10 pasarela desconocida lanza error', () => {
    expect(() => fabrica.crearPasarela('bitcoin')).toThrow()
  })
})

describe('Decorator · pasarelas', () => {
  it('CP-11 idempotencia: la misma referencia no se cobra dos veces', async () => {
    const base = { nombre: 'x', cobrar: vi.fn(async () => ({ ok: true, idTransaccion: 't1' })) }
    const p = conIdempotencia(base)
    await p.cobrar({ referencia: 'SOC-1' })
    expect(await p.cobrar({ referencia: 'SOC-1' })).toMatchObject({ idTransaccion: 't1', repetido: true })
    expect(base.cobrar).toHaveBeenCalledTimes(1)
  })
  it('CP-12 reintento: recupera fallas de red sin tocar la pasarela', async () => {
    const base = { nombre: 'x', cobrar: vi.fn().mockRejectedValueOnce(new Error('red')).mockResolvedValue({ ok: true }) }
    expect(await conReintento(base).cobrar({})).toEqual({ ok: true })
    expect(base.cobrar).toHaveBeenCalledTimes(2)
  })
})

describe('State · estados de la orden', () => {
  it('CP-13 recorre el flujo feliz y guarda historial', () => {
    let o = { estado: ESTADOS.COTIZADA }
    for (const ev of ['pagar', 'agendar', 'iniciar', 'completar']) o = transicionar(o, ev)
    expect(o.estado).toBe(ESTADOS.COMPLETADA)
    expect(o.historial.map((h) => h.estado)).toEqual(['pagada', 'agendada', 'en_curso', 'completada'])
  })
  it('CP-14 rechaza transiciones inválidas', () => {
    expect(() => transicionar({ estado: ESTADOS.COTIZADA }, 'iniciar')).toThrow(/Transición inválida/)
    expect(() => transicionar({ estado: ESTADOS.REEMBOLSADA }, 'pagar')).toThrow()
    expect(() => transicionar({ estado: ESTADOS.EN_CURSO }, 'cancelar')).toThrow()
  })
})

describe('Facade + Observer · flujo de compra', () => {
  it('CP-15 compra de servicio: queda agendada en la fecha del cliente y notifica', async () => {
    const { servicio, eventos } = montar()
    const { ok, orden } = await servicio.comprar({ ids: ['nexus-growth'], cliente, pasarela: 'mercadopago', tarjeta: TARJETA_APROBADA, fechaCliente: '2026-11-25' })
    expect(ok).toBe(true)
    expect(orden).toMatchObject({ estado: 'agendada', fechaArranque: '2026-11-25', fechaEntrega: '2026-12-10', fechaAjustada: false })
    expect(orden.pago).toMatchObject({ pasarela: 'mercadopago', monto: 80000 })
    expect(eventos).toEqual([EVENTOS.COTIZADA, EVENTOS.PAGADA, EVENTOS.AGENDADA])
  })
  it('CP-16 compra de producto digital: completada con acceso inmediato', async () => {
    const { servicio } = montar()
    const { orden } = await servicio.comprar({ ids: ['avi'], cliente, tarjeta: TARJETA_APROBADA })
    expect(orden).toMatchObject({ estado: 'completada', fechaEntrega: '2026-11-16' })
  })
  it('CP-17 tarjeta rechazada: la orden sigue cotizada y el reintento usa la misma orden', async () => {
    const { servicio, eventos } = montar()
    const r1 = await servicio.comprar({ ids: ['avi'], cliente, tarjeta: TARJETA_RECHAZADA })
    expect(r1).toMatchObject({ ok: false, orden: { estado: 'cotizada' } })
    expect(eventos).toContain(EVENTOS.PAGO_RECHAZADO)
    const r2 = await servicio.comprar({ ids: ['avi'], cliente, tarjeta: TARJETA_APROBADA, ordenId: r1.orden.id })
    expect(r2.orden.id).toBe(r1.orden.id)
    expect(await servicio.listar()).toHaveLength(1)
  })
  it('CP-18 el tercer arranque del mismo día se mueve al siguiente día hábil', async () => {
    const { servicio } = montar()
    const pedir = () => servicio.comprar({ ids: ['nexus-ia'], cliente, tarjeta: TARJETA_APROBADA, fechaCliente: '2026-11-25' })
    await pedir(); await pedir()
    const { orden } = await pedir()
    expect(orden).toMatchObject({ fechaArranque: '2026-11-26', fechaAjustada: true })
  })
  it('CP-19 cancelación de orden agendada: se reembolsa y libera el lugar', async () => {
    const { servicio, eventos } = montar()
    const { orden } = await servicio.comprar({ ids: ['nexus-growth'], cliente, tarjeta: TARJETA_APROBADA })
    const final = await servicio.cancelar(orden.id)
    expect(final.estado).toBe('reembolsada')
    expect(final.reembolso.monto).toBe(80000)
    expect(eventos.slice(-2)).toEqual([EVENTOS.CANCELADA, EVENTOS.REEMBOLSADA])
    expect(await servicio.ocupacion()).toEqual({})
  })
  it('CP-20 la orden avanza sola con el calendario y admite devolución en curso', async () => {
    const { servicio, reloj } = montar()
    const { orden } = await servicio.comprar({ ids: ['nexus-growth'], cliente, tarjeta: TARJETA_APROBADA })
    reloj.ahora = new Date(2026, 11, 1)
    expect((await servicio.listar())[0].estado).toBe('en_curso')
    expect(servicio.puedeCancelar(await servicio.obtener(orden.id))).toBe(false)
    await expect(servicio.cancelar(orden.id)).rejects.toThrow(/Transición inválida/)
    expect((await servicio.solicitarDevolucion(orden.id)).estado).toBe('reembolsada')
  })
  it('CP-21 pasado el fin del programa la orden queda completada', async () => {
    const { servicio, reloj } = montar()
    await servicio.comprar({ ids: ['nexus-growth'], cliente, tarjeta: TARJETA_APROBADA })
    reloj.ahora = new Date(2027, 3, 1)
    expect((await servicio.listar())[0].estado).toBe('completada')
  })
})

describe('Agenda de llamadas', () => {
  it('CP-22 ofrece 5 días hábiles y no permite tomar dos veces el mismo horario', async () => {
    const a = new AgendaLlamadas({ repoLlamadas: new RepositorioMemoria(), bus: new BusEventos(), reloj: () => LUNES })
    const dias = await a.horarios()
    expect(dias.map((d) => d.fecha)).toEqual(['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-23'])
    await a.agendar({ cliente, fecha: '2026-11-17', hora: '10:00' })
    expect((await a.horarios())[0].horas).not.toContain('10:00')
    await expect(a.agendar({ cliente, fecha: '2026-11-17', hora: '10:00' })).rejects.toMatchObject({ codigo: HORARIO_OCUPADO })
  })
})
