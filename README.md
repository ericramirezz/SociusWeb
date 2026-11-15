# Socius Web

Aplicación web para Socius Real Estate Consulting: catálogo con precios, cotizador, compra con pago en modo prueba, fecha de entrega propuesta, agenda, y "Mis pedidos" con cancelación y devolución. Proyecto final de Negocios Electrónicos y Desarrollo Web (Equipo 13, semestre 2027-1).

## Cómo correrlo

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 30 casos de prueba (Vitest)
npm run build      # versión de producción en dist/
```

## Estado actual

- Frontend: React 18 + Vite + Tailwind + React Router. Sin backend todavía.
- Datos en `localStorage` detrás de un Repository; al migrar a una base real solo cambia esa clase.
- Pagos **simulados** (Stripe, Mercado Pago y PayPal detrás de adaptadores). La integración real se hace en la fase de pruebas y requiere un backend: las llaves secretas nunca van en el frontend.
- Tarjetas de prueba: `4242 4242 4242 4242` aprueba, `4000 0000 0000 0002` rechaza.

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
    servicioPedidos.js  Facade: cotizar, comprar, cancelar, devolver, listar
    agendaLlamadas.js   Horarios de la llamada estratégica
    pagos/
      sdkSimulados.js       Imitan la forma de respuesta de cada proveedor
      adaptadores.js        Adapter: un contrato cobrar()/reembolsar() para los tres
      decoradores.js        Decorator: bitácora, idempotencia, reintento
      fabricaPasarelas.js   Factory Method con registro
    __tests__/          Pruebas unitarias (CP-01 a CP-22)
  __tests__/            Pruebas de interfaz (CP-23 a CP-28)
  i18n/                 Idiomas: IdiomaContext (useIdioma, t), es.js, en.js
  pages/                Una pantalla por ruta (incluye /testimonios)
  components/           Navbar, SelectorIdioma, Footer, Modal, ProgramaCard, TestimonioCard,
                        PreguntasFrecuentes, EstadoBadge, Notificaciones
  data/programas.js     Catálogo
  data/testimonios.js   Testimonios (texto, foto, video y traducción)
public/testimonios/     Fotos y videos de los testimonios
```

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

1. Integración real en modo prueba de Stripe, Mercado Pago y PayPal (requiere backend).
2. Base de datos (el anteproyecto propone Supabase) sustituyendo `RepositorioLocalStorage`.
3. Documento final, presentación con mockup, diagrama de contexto y demo.
