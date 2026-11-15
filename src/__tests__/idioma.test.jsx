// @vitest-environment jsdom
// Pruebas de interfaz: cambio de idioma, preguntas frecuentes y página de testimonios.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

// jsdom no implementa IntersectionObserver (lo usa el contador de métricas de la portada).
globalThis.IntersectionObserver ??= class {
  observe() {}
  disconnect() {}
}

beforeEach(() => {
  localStorage.clear()
  window.history.pushState({}, '', '/')
})
afterEach(cleanup)

describe('Idioma, FAQ y testimonios', () => {
  it('CP-26 el mundo del menú cambia entre Español e English y recuerda la elección', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getAllByRole('link', { name: 'Inicio' }).length).toBeGreaterThan(0)

    await user.click(screen.getAllByRole('button', { name: 'Cambiar idioma' })[0])
    await user.click(screen.getByRole('menuitemradio', { name: 'English (US)' }))

    expect(screen.getAllByRole('link', { name: 'Home' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Frequently asked questions' })).toBeTruthy()
    expect(document.documentElement.lang).toBe('en-US')
    expect(localStorage.getItem('socius_idioma')).toBe('en')
  })

  it('CP-27 la portada termina con FAQ desplegable y no muestra testimonios', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.queryByText('Lo que dicen nuestros clientes')).toBeNull()

    const pregunta = screen.getByRole('button', { name: '¿El presupuesto publicitario está incluido?' })
    expect(pregunta.getAttribute('aria-expanded')).toBe('false')
    await user.click(pregunta)
    expect(pregunta.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText(/se cotiza por separado según el desarrollo/)).toBeTruthy()
  })

  it('CP-28 Testimonios solo se alcanza desde el menú y tiene su propia página', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getAllByRole('link', { name: 'Testimonios' })[0])
    expect(window.location.pathname).toBe('/testimonios')
    expect(screen.getByRole('heading', { name: 'Lo que dicen nuestros clientes' })).toBeTruthy()
  })
})
