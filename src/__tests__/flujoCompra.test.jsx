// @vitest-environment jsdom
// Pruebas de interfaz (extremo a extremo dentro de jsdom): recorren el flujo
// como lo haría un cliente, usando la app real con pago simulado.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { seleccion } from '../core'

const ESPERA = { timeout: 6000 }

async function llenarContacto(user) {
  await user.type(screen.getByLabelText('Nombre completo'), 'Ana Demo')
  await user.type(screen.getByLabelText('Empresa / Proyecto'), 'Inmobiliaria Demo')
  await user.type(screen.getByLabelText('Email'), 'ana@demo.mx')
  await user.type(screen.getByLabelText('Teléfono'), '5512345678')
}

beforeEach(() => {
  localStorage.clear()
  window.history.pushState({}, '', '/checkout')
})
afterEach(cleanup)

describe('Flujo de compra en la interfaz', () => {
  it('CP-23 cotiza, paga, agenda, da seguimiento y cancela con reembolso', async () => {
    const user = userEvent.setup()
    seleccion.guardar(['nexus-growth', 'avi'])
    render(<App />)

    expect(screen.getByText(/Fecha propuesta por el sistema/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Pagar \$87,000 MXN/ })).toBeTruthy()

    await llenarContacto(user)
    await user.click(screen.getByRole('radio', { name: 'Mercado Pago' }))
    await user.click(screen.getByRole('button', { name: /Pagar/ }))

    expect(await screen.findByText('¡Pago confirmado!', {}, ESPERA)).toBeTruthy()
    expect(screen.getAllByText('Agendada').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('link', { name: /Ver mis pedidos/ }))
    await user.click(await screen.findByRole('button', { name: /SOC-/ }))
    expect(screen.getByText(/vía mercadopago/)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /Cancelar pedido y reembolsar/ }))
    await user.click(screen.getByRole('button', { name: 'Sí, cancelar' }))
    // "Reembolsada" ya existe como filtro; al terminar aparece además en el estado y en el seguimiento.
    await waitFor(() => expect(screen.getAllByText('Reembolsada').length).toBe(3), ESPERA)
    expect(screen.queryByRole('button', { name: /Cancelar pedido/ })).toBeNull()
    expect(screen.getByText(/Reembolsado: \$87,000 MXN/)).toBeTruthy()
  }, 20000)

  it('CP-24 tarjeta rechazada: avisa, no cobra y deja reintentar', async () => {
    const user = userEvent.setup()
    seleccion.guardar(['avi'])
    render(<App />)

    await llenarContacto(user)
    await user.click(screen.getByRole('button', { name: /rechazada/ }))
    await user.click(screen.getByRole('button', { name: /Pagar/ }))
    expect((await screen.findByRole('alert', {}, ESPERA)).textContent).toMatch(/Tarjeta rechazada/)

    await user.click(screen.getByRole('button', { name: /aprobada/ }))
    await user.click(screen.getByRole('button', { name: /Pagar/ }))
    expect(await screen.findByText('¡Pago confirmado!', {}, ESPERA)).toBeTruthy()
    expect(screen.getByText('Acceso inmediato')).toBeTruthy()
  }, 20000)

  it('CP-25 el formulario valida los datos de contacto antes de cobrar', async () => {
    const user = userEvent.setup()
    seleccion.guardar(['avi'])
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Pagar/ }))
    expect(screen.getByText('Nombre requerido')).toBeTruthy()
    expect(screen.getByText('Email válido requerido')).toBeTruthy()
    expect(localStorage.getItem('socius_pedidos_v2')).toBeNull()
  })
})
