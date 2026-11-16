// Servicio de sesión: la única pieza que habla con la autenticación de Supabase.
// Las pantallas no llaman a Supabase directo; así se puede cambiar de proveedor
// o pasar un cliente falso en las pruebas (inyección de dependencias).
//
// Acceso sin contraseña: el cliente escribe su correo y recibe un enlace de un
// solo uso. Al abrirlo regresa a la app con la sesión iniciada (Supabase guarda
// los tokens JWT y los renueva solo).

export const ERRORES_SESION = Object.freeze({
  EMAIL_INVALIDO: 'email_invalido',
  LIMITE: 'limite', // demasiados correos en poco tiempo
  NO_DISPONIBLE: 'no_disponible', // la app corre sin Supabase configurado
  DESCONOCIDO: 'desconocido',
})

const EMAIL = /^\S+@\S+\.\S+$/

export class ServicioSesion {
  constructor({ cliente }) {
    this.cliente = cliente // instancia de supabase-js, o null
  }

  get disponible() {
    return Boolean(this.cliente)
  }

  // Envía el enlace de acceso. `regresarA` = URL completa a la que vuelve el enlace.
  // Devuelve { ok: true } o { ok: false, error: ERRORES_SESION.*, detalle }.
  async enviarEnlace(email, regresarA) {
    if (!this.disponible) return { ok: false, error: ERRORES_SESION.NO_DISPONIBLE }
    const limpio = String(email ?? '').trim().toLowerCase()
    if (!EMAIL.test(limpio)) return { ok: false, error: ERRORES_SESION.EMAIL_INVALIDO }

    const { error } = await this.cliente.auth.signInWithOtp({
      email: limpio,
      options: { emailRedirectTo: regresarA, shouldCreateUser: true },
    })
    if (!error) return { ok: true }
    const limite = error.status === 429 || /rate limit/i.test(error.message ?? '')
    return { ok: false, error: limite ? ERRORES_SESION.LIMITE : ERRORES_SESION.DESCONOCIDO, detalle: error.message }
  }

  async usuarioActual() {
    if (!this.disponible) return null
    const { data } = await this.cliente.auth.getSession()
    return aUsuario(data.session)
  }

  async salir() {
    if (this.disponible) await this.cliente.auth.signOut()
  }

  // Observer: avisa cada vez que alguien entra o sale. Devuelve la función para dejar de escuchar.
  alCambiar(fn) {
    if (!this.disponible) return () => {}
    const { data } = this.cliente.auth.onAuthStateChange((_evento, sesion) => fn(aUsuario(sesion)))
    return () => data.subscription.unsubscribe()
  }
}

// Solo lo que la interfaz necesita del usuario de Supabase.
const aUsuario = (sesion) => (sesion?.user ? { id: sesion.user.id, email: sesion.user.email } : null)
