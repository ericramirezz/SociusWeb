// @vitest-environment jsdom
// Cuentas de cliente (función 1, parte A): servicio de sesión con un cliente de
// Supabase falso, y la pantalla /entrar. No se conecta a ningún servidor.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ServicioSesion, ERRORES_SESION } from '../core/sesion'
import { SesionProvider } from '../sesion/SesionContext'
import { IdiomaProvider } from '../i18n/IdiomaContext'
import Entrar from '../pages/Entrar'

afterEach(cleanup)

// Imita la parte de supabase-js que usa el servicio.
function clienteFalso({ sesion = null, errorAlEnviar = null } = {}) {
  const oyentes = []
  return {
    oyentes,
    auth: {
      signInWithOtp: vi.fn(async () => ({ error: errorAlEnviar })),
      getSession: vi.fn(async () => ({ data: { session: sesion } })),
      signOut: vi.fn(async () => oyentes.forEach((fn) => fn('SIGNED_OUT', null))),
      onAuthStateChange: vi.fn((fn) => {
        oyentes.push(fn)
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      }),
    },
  }
}

const SESION_ANA = { user: { id: 'u-1', email: 'ana@demo.mx' } }

describe('Servicio de sesión', () => {
  it('CP-29 envía el enlace al correo limpio, valida el formato y reconoce el límite de envíos', async () => {
    const cliente = clienteFalso()
    const servicio = new ServicioSesion({ cliente })

    expect(await servicio.enviarEnlace('  Ana@Demo.MX ', 'http://localhost:5173/entrar')).toEqual({ ok: true })
    expect(cliente.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'ana@demo.mx',
      options: { emailRedirectTo: 'http://localhost:5173/entrar', shouldCreateUser: true },
    })

    expect((await servicio.enviarEnlace('no-es-correo', 'x')).error).toBe(ERRORES_SESION.EMAIL_INVALIDO)
    expect(cliente.auth.signInWithOtp).toHaveBeenCalledTimes(1) // el inválido no llega a Supabase

    const saturado = new ServicioSesion({ cliente: clienteFalso({ errorAlEnviar: { status: 429, message: 'email rate limit exceeded' } }) })
    expect((await saturado.enviarEnlace('ana@demo.mx', 'x')).error).toBe(ERRORES_SESION.LIMITE)

    const sinSupabase = new ServicioSesion({ cliente: null })
    expect(sinSupabase.disponible).toBe(false)
    expect((await sinSupabase.enviarEnlace('ana@demo.mx', 'x')).error).toBe(ERRORES_SESION.NO_DISPONIBLE)
  })
})

function montar(servicio, ruta = '/entrar') {
  return render(
    <IdiomaProvider>
      <SesionProvider servicio={servicio}>
        <MemoryRouter initialEntries={[ruta]}>
          <Routes>
            <Route path="/entrar" element={<Entrar />} />
            <Route path="/pedidos" element={<p>Pantalla de pedidos</p>} />
          </Routes>
        </MemoryRouter>
      </SesionProvider>
    </IdiomaProvider>
  )
}

describe('Pantalla /entrar', () => {
  it('CP-30 pide el correo, envía el enlace y confirma a dónde se mandó', async () => {
    const user = userEvent.setup()
    const cliente = clienteFalso()
    montar(new ServicioSesion({ cliente }))

    await user.type(await screen.findByLabelText('Email'), 'ana@demo.mx')
    await user.click(screen.getByRole('button', { name: /Enviarme el enlace/ }))

    expect(await screen.findByText('Revisa tu correo')).toBeTruthy()
    expect(screen.getByText('ana@demo.mx')).toBeTruthy()
    expect(cliente.auth.signInWithOtp.mock.calls[0][0].options.emailRedirectTo).toMatch(/\/entrar$/)
  })

  it('CP-31 con sesión iniciada regresa a la página pedida, y al salir se cierra la sesión', async () => {
    const user = userEvent.setup()
    montar(new ServicioSesion({ cliente: clienteFalso({ sesion: SESION_ANA }) }), '/entrar?volver=/pedidos')
    expect(await screen.findByText('Pantalla de pedidos')).toBeTruthy()

    cleanup()
    const cliente = clienteFalso({ sesion: SESION_ANA })
    montar(new ServicioSesion({ cliente }), '/entrar?volver=//sitio-ajeno.com') // ruta externa: se ignora
    expect(await screen.findByText('Ya entraste')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /Salir/ }))
    expect(cliente.auth.signOut).toHaveBeenCalled()
    expect(await screen.findByRole('button', { name: /Enviarme el enlace/ })).toBeTruthy()
  })
})
