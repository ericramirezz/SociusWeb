# Socius Web

Aplicación web para Socius Real Estate Consulting: catálogo con precios, cotizador, compra con pago en modo prueba, fecha de entrega propuesta, agenda, y "Mis pedidos" con cancelación y devolución. Proyecto final de Negocios Electrónicos y Desarrollo Web (Equipo 13, semestre 2027-1).

## Cómo correrlo

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 51 casos de prueba (Vitest)
npm run build      # versión de producción en dist/
npm run build:funciones   # empaqueta src/core para las Edge Functions (supabase/functions/_shared/)
npm run simular:webhook -- --url … --secreto … --orden SOC-… --monto …   # manda un aviso de pago firmado
```

## Estado actual

- Frontend: React 18 + Vite + Tailwind + React Router.
- Backend: Supabase (Postgres + autenticación). Con `.env.local` los pedidos, pagos y llamadas viven en la base y el cliente entra con un enlace a su correo; sin él, la app usa `localStorage` y no pide cuenta (así corren las pruebas).
- Base de datos: `supabase/migrations/` se pega en orden en el SQL Editor de Supabase (001, 002…). Seguridad por fila: cada cliente ve solo sus pedidos.
- `.env.local` (no se sube a git): `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. Nunca la llave secreta.
- Pagos: **Stripe y Mercado Pago en modo prueba real** (Stripe Checkout y Checkout Pro, Sprint 7) cuando `.env.local` trae `VITE_STRIPE_PUBLISHABLE_KEY` / `VITE_MERCADOPAGO_PUBLIC_KEY`; PayPal sigue **simulado** detrás de su adaptador. Las llaves secretas viven solo en Supabase (Edge Functions), nunca en el frontend.
- Webhooks de pago firmados (Función 2): la pasarela avisa a la Edge Function `webhook-pagos`, que revisa la firma HMAC, guarda el aviso en la cola `eventos_pago` y responde; el consumidor lo aplica a la orden con reintentos (ver "Webhooks" abajo).
- Tarjetas de prueba: `4242 4242 4242 4242` aprueba, `4000 0000 0000 0002` rechaza (en la página de Stripe y en el simulador).

## Estructura

```
src/
  core/                 Lógica de negocio. No importa React.
    index.js            Composición: crea y conecta las instancias reales
    config.js           Singleton: reglas configurables (días, capacidad, moneda)
    productos.js        Factory Method: ProductoDigital / Servicio
    entrega.js          Strategy: fecha de entrega y cobro inicial; disponibilidad
    estadoOrden.js      State: los 7 estados y sus transiciones
    eventos.js          Observer: bus de eventos
    repositorio.js      Repository: memoria / localStorage
    repositorioSupabase.js  Repository en Supabase: órdenes, partidas, pagos, llamadas
    supabase.js         Cliente único de Supabase (null sin .env.local o en pruebas)
    sesion.js           Servicio de sesión: enlace por correo, salir, avisos de cambio
    servicioPedidos.js  Facade: cotizar, comprar, cancelar, devolver, listar
    agendaLlamadas.js   Horarios de la llamada estratégica
    webhooks/           Función 2: avisos de pago de las pasarelas
      firmas.js             Verifica la firma HMAC-SHA256 (Stripe, Mercado Pago)
      traductores.js        Adapter: cada aviso queda como { tipo, referencia, monto… }
      colaEventos.js        Cola de avisos: memoria / tabla eventos_pago
      receptor.js           Productor: firma → cola → responde
      procesador.js         Consumidor: aplica el pago a la orden, reintenta 3 veces
      servidor.js           Lo que usan las Edge Functions (se empaqueta)
    pagos/
      paginasDePago.js      Sprint 7 (Strategy): reglas comunes de crear-pago y qué pago es real
      checkoutStripe.js     Sprint 7: sesión de Stripe Checkout (corre en la Edge Function crear-pago)
      checkoutMercadoPago.js Sprint 7: preferencia de Checkout Pro y consulta del pago en su API
      sesionesPago.js       Sprint 7: el navegador pide la página de pago a crear-pago
      sdkSimulados.js       Imitan la forma de respuesta de cada proveedor
      adaptadores.js        Adapter: un contrato cobrar()/reembolsar() para los tres
      decoradores.js        Decorator: bitácora, idempotencia, reintento
      fabricaPasarelas.js   Factory Method con registro
    __tests__/          Pruebas unitarias (CP-01 a CP-22), webhooks (CP-37 a CP-41) Stripe (CP-42 a CP-47) y Mercado Pago (CP-48 y CP-49)
  __tests__/            Pruebas de interfaz e integración con Supabase falso (CP-23 a CP-36)
  sesion/               SesionContext (useSesion): usuario actual para las pantallas
  i18n/                 Idiomas: IdiomaContext (useIdioma, t), es.js, en.js
  pages/                Una pantalla por ruta (incluye /testimonios)
  components/           Navbar, SelectorIdioma, Footer, Modal, ProgramaCard, TestimonioCard,
                        PreguntasFrecuentes, EstadoBadge, Notificaciones
  data/programas.js     Catálogo
  data/testimonios.js   Testimonios (texto, foto, video y traducción)
public/testimonios/     Fotos y videos de los testimonios
supabase/
  migrations/           SQL que se corre en orden en el SQL Editor (001, 002, 003…)
  functions/            Edge Functions: webhook-pagos, procesar-eventos y crear-pago
    _shared/webhooks.js Generado por `npm run build:funciones`; no editar a mano
scripts/                construir-funciones.mjs, simular-webhook.mjs
```

## Webhooks de pago

1. La pasarela manda un aviso a `…/functions/v1/webhook-pagos/<stripe|mercadopago>`.
2. **Productor** (`receptor.js`): revisa la firma con el secreto compartido. Si no coincide, o el aviso tiene más de 5 minutos, responde 400 y no guarda nada. Si es válida, lo guarda en `eventos_pago` y responde 200 de inmediato. Un aviso repetido responde "duplicado" y no se guarda dos veces.
3. **Consumidor** (`procesador.js`): toma los pendientes con `tomar_eventos_pago` (`for update skip locked`, así dos procesos no toman el mismo) y llama a `ServicioPedidos.confirmarPago`, que usa la misma tabla de estados que el checkout. Si falla, reintenta; al tercer fallo el aviso queda en `error` con el motivo.
4. Si la orden ya estaba pagada, no cambia nada (idempotencia). Si el monto no coincide con el de la orden, no se aplica.

Mercado Pago solo avisa "cambió el pago X": el consumidor consulta `GET /v1/payments/{id}` con el Access Token para saber el estado, el monto y la orden (`external_reference`). PayPal verifica sus avisos por API; se conecta después.

Secretos de las Edge Functions (Supabase → Edge Functions → Secrets): `STRIPE_WEBHOOK_SECRET`, `MERCADOPAGO_WEBHOOK_SECRET`. `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los pone Supabase solo.

### Publicar las funciones (ya hecho el 21/nov/2026; repetir si cambia `src/core`)

```bash
npx supabase login                                   # en una terminal propia (abre el navegador)
npx supabase link --project-ref wfhwrblshkdbrkskfmrt
# Secreto de prueba: se guarda en .env.local (no se sube) y en Supabase. Mientras sea simulado, el mismo para las dos.
SECRETO=$(openssl rand -hex 32)
printf '\nWEBHOOK_SECRETO_PRUEBA=%s\n' "$SECRETO" >> .env.local
npx supabase secrets set STRIPE_WEBHOOK_SECRET=$SECRETO MERCADOPAGO_WEBHOOK_SECRET=$SECRETO
npm run build:funciones
npx supabase functions deploy webhook-pagos --no-verify-jwt --use-api   # la firma la autentica, no la sesión
npx supabase functions deploy procesar-eventos --use-api                 # solo con la llave de servicio
```

Prueba de punta a punta: pagar en la app con la tarjeta de rechazo para dejar una orden *cotizada*, y luego

```bash
npm run simular:webhook -- --url https://wfhwrblshkdbrkskfmrt.supabase.co/functions/v1/webhook-pagos/stripe \
  --secreto "$(grep '^WEBHOOK_SECRETO_PRUEBA=' .env.local | cut -d= -f2)" --orden SOC-… --monto <total_hoy> --repetir
```

Debe responder `recibido` y luego `duplicado`; en `eventos_pago` queda un solo aviso `procesado` (`intentos` cuenta solo los fallos) y la orden pasa a *pagada* o *agendada*. Sin firma, `webhook-pagos` responde 400; sin llave, `procesar-eventos` responde 401.

## Pago con Stripe (Sprint 7)

1. En el checkout el cliente elige Stripe y da clic en "Pagar en Stripe". `ServicioPedidos.iniciarPagoEnPasarela` deja la orden **cotizada** (no cobra nada).
2. La Edge Function `crear-pago` revisa la sesión del cliente, lee la orden con sus permisos (solo ve las suyas), toma el monto **de la base** y crea la sesión de Stripe Checkout con la llave secreta. El número de orden viaja en `payment_intent_data.metadata.orden_id`.
3. El cliente paga en la página de Stripe; la tarjeta nunca pasa por nuestro código.
4. Stripe manda `payment_intent.succeeded` firmado a `webhook-pagos` (Función 2) y la orden pasa a pagada → agendada/completada.
5. Stripe regresa al cliente a `/confirmacion?orden=…`, que espera al webhook (consulta cada 2 s, hasta 1 minuto). Si cancela, vuelve a `/checkout?cancelado=…` y reintenta sobre la misma orden.

Configuración (una vez):

```bash
read -rsp "sk_test_: " SK && echo && npx supabase secrets set STRIPE_SECRET_KEY=$SK
npm run build:funciones
npx supabase functions deploy crear-pago --no-verify-jwt --use-api   # la sesión se revisa dentro con getUser()
```

- `.env.local`: `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_…` (activa el modo Stripe real en la app).
- Stripe → Desarrolladores → Webhooks: destino `https://<ref>.supabase.co/functions/v1/webhook-pagos/stripe` con los eventos `payment_intent.succeeded` y `payment_intent.payment_failed`; su secreto `whsec_…` va en `STRIPE_WEBHOOK_SECRET` (reemplaza el de prueba del simulador).
- Sitio publicado: agregar su dirección a `ORIGENES_PERMITIDOS` (secreto, separado por comas; por defecto `http://localhost:5173`).

## Pago con Mercado Pago (Sprint 7)

Mismo camino que Stripe, con la misma Edge Function `crear-pago` (`pasarela: 'mercadopago'`): crea una **preferencia** de Checkout Pro con el monto de la base y `external_reference = SOC-…`, y el cliente paga en la página de Mercado Pago. Al regresar (en localhost, con "Volver al sitio"), `/confirmacion` espera el aviso. El aviso firmado (`x-signature`) llega a `webhook-pagos/mercadopago` y el consumidor consulta el pago en la API antes de aplicarlo.

Configuración (una vez): en developers de Mercado Pago, una aplicación de **Checkout Pro** en modo **Prueba**.

- `MERCADOPAGO_ACCESS_TOKEN` (secreto de Supabase): el Access Token de las credenciales de prueba.
- `.env.local`: `VITE_MERCADOPAGO_PUBLIC_KEY=APP_USR-…` (activa el modo Mercado Pago real en la app).
- Configuración de webhooks (modo prueba): URL `https://<ref>.supabase.co/functions/v1/webhook-pagos/mercadopago`, evento **Pagos**; su clave secreta va en `MERCADOPAGO_WEBHOOK_SECRET`.
- Tarjeta de prueba: `5474 9254 3267 0366`, titular **APRO** (aprueba), 11/30, CVV 123. Pagar en una ventana de incógnito: la cuenta vendedora no puede pagarse a sí misma.

### Reembolsos de pagos reales (solicitud + Socius)

Un pago real de Stripe o Mercado Pago no lo reembolsa la app (`ServicioPedidos.reembolsoManual`, que usa `esPagoReal`):

1. El cliente cancela (antes del arranque: la orden queda *cancelada* y se libera la fecha) o pide devolución (en curso o completada). La orden guarda `reembolso = { estado: 'solicitado', tipo, monto }` y "Mis pedidos" lo muestra.
2. Socius revisa la solicitud y, si procede, reembolsa desde el panel de Stripe (Pagos → el pago → Reembolsar), por el monto que decida.
3. Stripe manda `charge.refunded` firmado a `webhook-pagos`; el consumidor encuentra la orden por el pago (`pi_…` en la tabla `pagos`) y la marca *reembolsada* con `reembolso.estado = 'emitido'`. Un reembolso hecho sin solicitud también se registra.

En Mercado Pago, Socius reembolsa desde su panel y llega un aviso del mismo pago; la API responde `status: refunded` y la orden se marca reembolsada.

Los pagos simulados (PayPal y los del simulador) se siguen reembolsando solos. En Stripe, el webhook debe escuchar también `charge.refunded`.

## Idiomas

Español (Latinoamérica) e English (US), con el ícono de mundo del menú. La elección se guarda en el navegador.

- Todo texto visible sale de `src/i18n/es.js` / `en.js` con `t('seccion.clave')`; no se escriben textos fijos en los componentes.
- El núcleo (`core/`) no traduce: entrega códigos (estado, forma de pago, motivo de fecha) y la interfaz los convierte en texto.
- Agregar un idioma: crear su diccionario y registrarlo en `IDIOMAS` de `IdiomaContext.jsx`. Lo que falte se muestra en español.
- La moneda no cambia con el idioma; de eso se encargará la pasarela de pago.

## Testimonios con foto o video

Se editan en `src/data/testimonios.js` (instrucciones en el comentario del archivo). Los archivos van en `public/testimonios/` y se escriben como `'/testimonios/nombre.jpg'`; el video también puede ser un enlace de YouTube o Vimeo.

Regla: las pantallas solo hablan con `core/index.js` (`pedidos`, `agenda`, `bus`, `seleccion`). Nada de `localStorage` ni reglas de negocio dentro de un componente.

## Patrones de diseño (Tema 3)

| Patrón | Síntoma que resuelve | Dónde |
| --- | --- | --- |
| Singleton | Una sola configuración para todo el proceso | `core/config.js` |
| Factory Method | Instanciar clases concretas por todo el código | `core/productos.js`, `core/pagos/fabricaPasarelas.js` |
| Strategy | `if/else` de reglas de negocio (cobro, entrega) | `core/entrega.js` |
| Observer | Varios módulos reaccionan al mismo evento | `core/eventos.js`, `components/Notificaciones.jsx` |
| Decorator | Bitácora, idempotencia y reintento sin tocar la pasarela | `core/pagos/decoradores.js` |
| Adapter | Cada API de pagos habla distinto | `core/pagos/adaptadores.js` |
| State | Qué se puede hacer con una orden según su estado | `core/estadoOrden.js` |
| Repository | Cambiar dónde se guardan los datos sin tocar pantallas | `core/repositorio.js` |
| Facade | Una interfaz simple sobre todo lo anterior | `core/servicioPedidos.js` |
| Productor/Consumidor | Recibir el aviso de la pasarela sin esperar a procesarlo, sin perderlo si algo falla | `core/webhooks/receptor.js`, `procesador.js`, `colaEventos.js` |

Antipatrones que evitamos: Singleton como estado global (la configuración se inyecta), "Factory" cosmética con `if/elif`, y capas de más (regla de tres, YAGNI).

## Reglas de negocio

- **Producto digital (AVI):** acceso inmediato al confirmar el pago; la orden queda *completada*.
- **Servicios:** arranque propuesto a 5 días hábiles; primera versión operando 15 días después; fin a los 4 meses.
- **Agenda:** el cliente propone fecha; se confirma si es día hábil con lugar (máximo 2 arranques por día); si no, se agenda la más cercana.
- **Cobro inicial:** pago único = 100 %; 2 pagos = 50 %; mensual = primera de 4 mensualidades.
- **Estados:** cotizada → pagada → agendada → en curso → completada; cancelada y reembolsada como salidas.
- **Cancelación:** solo antes del arranque; si hubo pago, se reembolsa. **Devolución:** en curso o completada.

Los números viven en `core/config.js`.

## Identidad visual

Blanco y azules. Tokens en `tailwind.config.js`: `brand` (#1D4ED8), `brand-dark` (#1E3A8A), `brand-soft` (#EFF6FF), `navy` (#0B1F3A). Usar siempre los tokens, nunca hex sueltos.

## Notas de clase aplicadas

- **Tema 3 · Patrones:** detectar primero el síntoma y dejar que el patrón salga del refactor; caso "una compra en línea" (Factory para pasarela, Strategy para cálculo, Adapter para API externa, Observer para avisos, Repository para datos); idempotencia en el POST de pago.
- **Tema 4 · Herramientas:** React como librería de frontend para SPA; pruebas unitarias como primera línea de defensa y pruebas de interfaz automatizadas; Git/GitHub; CI/CD y PaaS para el despliegue; APIs REST con versionado, autenticación por llaves y validación de datos; Postman para probar las APIs de pago.
- **Tema 6 · Calidad:** ISO/IEC 25010 (fiabilidad, seguridad, mantenibilidad) como criterios; pruebas funcionales, no funcionales y estructurales (ISTQB); "shift left": seguridad y pruebas desde el inicio; Scrum con sprints cortos y entregas incrementales.

## Pendiente

1. Integración real en modo prueba de PayPal (Stripe y Mercado Pago ya están): verificar sus avisos por API y, con las tres reales, quitar las políticas TEMPORAL de la migración 001.
2. Panel de Socius para ver las solicitudes de reembolso (función 7 del backlog); mientras, se revisan en Supabase (`ordenes.reembolso->>estado = 'solicitado'`).
3. Correo propio (SMTP) para el enlace de acceso antes de la demo.
4. Documento final, presentación con mockup, diagrama de contexto y demo.
