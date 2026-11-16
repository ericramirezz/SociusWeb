// @vitest-environment jsdom
// Cuentas de cliente (función 1, parte B): pedidos y llamadas en Supabase.
// Se usa un cliente de Supabase FALSO que registra cada llamada; no toca la base real.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { programas } from '../data/programas'
import { AgendaLlamadas, HORARIO_OCUPADO } from '../core/agendaLlamadas'
import { ConfigApp } from '../core/config'
import { BusEventos } from '../core/eventos'
import { FabricaPasarelas } from '../core/pagos/fabricaPasarelas'
import { crearSdks, TARJETA_APROBADA } from '../core/pagos/sdkSimulados'
import { RepositorioMemoria } from '../core/repositorio'
import { aFilaEditable, aOrden, RepositorioLlamadasSupabase, RepositorioPedidosSupabase } from '../core/repositorioSupabase'
import { ServicioPedidos } from '../core/servicioPedidos'
import { ServicioSesion } from '../core/sesion'
import { SesionProvider } from '../sesion/SesionContext'
import { IdiomaProvider } from '../i18n/IdiomaContext'
import Pedidos from '../pages/Pedidos'

afterEach(cleanup)

// Imita el encadenado de supabase-js: from('t').insert(...).select('id').single().
// Cada operación queda en `operaciones` con sus pasos; `respuestas[tabla]` decide qué devuelve.
function supabaseFalso({ uid = 'u-1', respuestas = {} } = {}) {
  const operaciones = []
  const from = (tabla) => {
    const op = { tabla, pasos: [] }
    operaciones.push(op)
    const encadenable = new Proxy({}, {
      get(_, paso) {
        if (paso === 'then') {
          const r = respuestas[tabla]
          const valor = typeof r === 'function' ? r(op) : (r ?? { data: null, error: null })
          return (ok, mal) => Promise.resolve(valor).then(ok, mal)
        }
        return (...args) => {
          op.pasos.push([paso, ...args])
          return encadenable
        }
      },
    })
    return encadenable
  }
  return {
    operaciones,
    from,
    rpc: vi.fn(async (fn) => respuestas[`rpc:${fn}`] ?? { data: [], error: null }),
    auth: { getSession: async () => ({ data: { session: uid ? { user: { id: uid } } : null } }) },
  }
}
const paso = (op, nombre) => op.pasos.find(([p]) => p === nombre)

const FILA = {
  id: 'SOC-100001', estado: 'agendada', historial: [{ estado: 'pagada' }], moneda: 'MXN',
  cliente: { nombre: 'Ana', email: 'ana@demo.mx' }, total_hoy: '87000.00', total_contrato: 87000,
  requiere_agenda: true, fecha_arranque: '2026-11-23', fecha_entrega: '2026-12-08', fecha_fin: '2027-03-23',
  fecha_ajustada: false, reembolso: null, fecha_orden: '2026-11-16T16:00:00Z',
  partidas: [
    { id: 2, programa_id: 'avi', nombre: 'AVI', tipo: 'digital', precio: 7000, cobro_hoy: 7000, total_contrato: 7000 },
    { id: 1, programa_id: 'nexus-growth', nombre: 'Nexus Growth', tipo: 'servicio', precio: 80000, cobro_hoy: 80000, total_contrato: 80000 },
  ],
  pagos: [{ pasarela: 'mercadopago', id_transaccion: 'mp_1', monto: '87000' }],
}

describe('Repositorio de pedidos en Supabase', () => {
  it('CP-32 traduce entre las tablas y la orden del núcleo sin perder datos', () => {
    const orden = aOrden(FILA)
    expect(orden).toMatchObject({ id: 'SOC-100001', estado: 'agendada', totalHoy: 87000, requiereAgenda: true, fechaArranque: '2026-11-23' })
    expect(orden.partidas.map((p) => p.id)).toEqual(['nexus-growth', 'avi']) // en el orden en que se guardaron
    expect(orden.pago).toEqual({ pasarela: 'mercadopago', idTransaccion: 'mp_1', monto: 87000 })
    expect(aOrden({ ...FILA, pagos: [] }).pago).toBeNull()

    const fila = aFilaEditable(orden)
    // Solo columnas que el navegador tiene permiso de actualizar.
    expect(fila).not.toHaveProperty('id')
    expect(fila).not.toHaveProperty('cliente_id')
    expect(fila).not.toHaveProperty('moneda')
    expect(fila).toMatchObject({ estado: 'agendada', total_hoy: 87000, fecha_arranque: '2026-11-23' })
  })

  it('CP-33 crea la orden ligada a la cuenta, guarda partidas y pago sin duplicarlo, y sin sesión no crea nada', async () => {
    const cliente = supabaseFalso({ respuestas: { ordenes: { data: { id: 'SOC-100001' }, error: null } } })
    const repo = new RepositorioPedidosSupabase(cliente)
    const orden = {
      estado: 'cotizada', historial: [], cliente: { nombre: 'Ana' }, totalHoy: 7000, totalContrato: 7000, moneda: 'MXN',
      partidas: [{ id: 'avi', nombre: 'AVI', tipo: 'digital', precio: 7000, cobroHoy: 7000, totalContrato: 7000 }],
    }

    const guardada = await repo.guardar(orden)
    expect(guardada.id).toBe('SOC-100001')
    const alta = cliente.operaciones.find((o) => o.tabla === 'ordenes' && paso(o, 'insert'))
    expect(paso(alta, 'insert')[1]).toMatchObject({ cliente_id: 'u-1', estado: 'cotizada', moneda: 'MXN' })
    const partidas = cliente.operaciones.find((o) => o.tabla === 'partidas' && paso(o, 'insert'))
    expect(paso(partidas, 'insert')[1]).toEqual([expect.objectContaining({ orden_id: 'SOC-100001', programa_id: 'avi', cobro_hoy: 7000 })])

    await repo.guardar({ ...guardada, estado: 'completada', pago: { pasarela: 'stripe', idTransaccion: 'pi_1', monto: 7000 } })
    const pago = cliente.operaciones.find((o) => o.tabla === 'pagos')
    expect(paso(pago, 'upsert')[2]).toEqual({ onConflict: 'pasarela,id_transaccion', ignoreDuplicates: true })
    // Ya pagada: las partidas no se vuelven a tocar.
    expect(cliente.operaciones.filter((o) => o.tabla === 'partidas')).toHaveLength(2) // el borrado + la alta iniciales

    const sinSesion = new RepositorioPedidosSupabase(supabaseFalso({ uid: null }))
    await expect(sinSesion.guardar(orden)).rejects.toThrow(/iniciar sesión/)
  })

  it('CP-34 el cupo diario se cuenta con todas las órdenes de la base, no solo las del cliente', async () => {
    const cliente = supabaseFalso({ respuestas: { 'rpc:arranques_por_dia': { data: [{ fecha: '2026-11-25', arranques: 2 }], error: null } } })
    const repoBase = new RepositorioPedidosSupabase(cliente)
    const servicio = new ServicioPedidos({
      repoPedidos: new RepositorioMemoria(), // el cliente aún no tiene órdenes propias
      fabricaPasarelas: new FabricaPasarelas(crearSdks(0), () => {}),
      bus: new BusEventos(), config: ConfigApp.obtener(), catalogo: programas,
      reloj: () => new Date(2026, 10, 16, 10, 0),
      fuenteOcupacion: (desde) => repoBase.arranquesPorDia(desde),
    })
    const { orden } = await servicio.comprar({ ids: ['nexus-ia'], cliente: { nombre: 'Ana' }, tarjeta: TARJETA_APROBADA, fechaCliente: '2026-11-25' })
    expect(cliente.rpc).toHaveBeenCalledWith('arranques_por_dia', { desde: '2026-11-16' })
    expect(orden).toMatchObject({ id: 'SOC-100001', fechaArranque: '2026-11-26', fechaAjustada: true })
  })

  it('CP-35 si otra persona toma el horario un instante antes, la base lo rechaza y se avisa como horario ocupado', async () => {
    const cliente = supabaseFalso({ respuestas: { llamadas: { data: null, error: { code: '23505', message: 'duplicate key' } } } })
    const repo = new RepositorioLlamadasSupabase(cliente)
    const agenda = new AgendaLlamadas({
      repoLlamadas: repo, bus: new BusEventos(), reloj: () => new Date(2026, 10, 16, 10, 0),
      fuenteOcupados: (desde, hasta) => repo.ocupados(desde, hasta),
    })
    const datos = { nombre: 'Ana', empresa: 'Demo', email: 'ana@demo.mx', telefono: '5500000000' }
    await expect(agenda.agendar({ cliente: datos, fecha: '2026-11-17', hora: '10:00' })).rejects.toMatchObject({ codigo: HORARIO_OCUPADO })
    const alta = cliente.operaciones.find((o) => o.tabla === 'llamadas')
    expect(paso(alta, 'insert')[1]).toMatchObject({ fecha: '2026-11-17', hora: '10:00', nombre: 'Ana', mensaje: null })
    expect(paso(alta, 'select')).toBeUndefined() // el navegador no puede leer llamadas
  })
})

describe('Mis pedidos con cuentas activas', () => {
  it('CP-36 sin sesión pide entrar y regresa a Mis pedidos después', async () => {
    const sinSesion = new ServicioSesion({
      cliente: {
        auth: {
          getSession: async () => ({ data: { session: null } }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        },
      },
    })
    render(
      <IdiomaProvider>
        <SesionProvider servicio={sinSesion}>
          <MemoryRouter initialEntries={['/pedidos']}>
            <Pedidos />
          </MemoryRouter>
        </SesionProvider>
      </IdiomaProvider>
    )
    expect(await screen.findByText('Entra para ver tus pedidos')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Entrar/ }).getAttribute('href')).toBe('/entrar?volver=/pedidos')
  })
})
