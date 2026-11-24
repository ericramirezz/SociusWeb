// Piezas del lenguaje "lámina" que comparten todas las pantallas.
import { contenedor } from './estilos'

// Marca de unidad: el mismo bloque azul que se apila en la portada.
export function Bloque({ className = '' }) {
  return <span aria-hidden="true" className={`inline-block h-2 w-2 flex-shrink-0 bg-current ${className}`} />
}

// Nombre de la sección. En escritorio cuelga en el margen izquierdo, como las notas de un plano.
export function Etiqueta({ children, oscuro = false, className = '' }) {
  if (!children) return null
  return (
    <p className={`flex items-center gap-2.5 text-sm font-medium ${oscuro ? 'text-cian' : 'text-violeta'} ${className}`}>
      <Bloque />
      <span className={oscuro ? 'text-white/70' : 'text-negro/70'}>{children}</span>
    </p>
  )
}

// Encabezado de sección: línea superior, etiqueta al margen y título en la columna de lectura.
// `titulo` puede ser una lista de líneas; cada una se rompe en su propio renglón.
export function EncabezadoSeccion({ etiqueta, titulo, sub, oscuro = false, como: Titulo = 'h2', tamano = 'grande', children }) {
  const lineas = (Array.isArray(titulo) ? titulo : [titulo]).filter(Boolean)
  const tamanos = {
    grande: 'text-[clamp(1.75rem,4.6vw,3.6rem)] leading-[1.02]',
    medio: 'text-[clamp(1.6rem,3.6vw,2.9rem)] leading-[1.04]',
  }
  return (
    <div className={`grid gap-y-6 border-t pt-6 lg:grid-cols-12 lg:gap-x-8 ${oscuro ? 'border-white/15' : 'border-negro/10'}`}>
      <div className="lg:col-span-3">
        <Etiqueta oscuro={oscuro}>{etiqueta}</Etiqueta>
      </div>
      <div className="lg:col-span-9">
        <Titulo className={`titular ${tamanos[tamano]} ${oscuro ? 'text-white' : 'text-negro'}`}>
          {lineas.map((linea) => (
            <span key={linea} className="block">
              {linea}
            </span>
          ))}
        </Titulo>
        {sub && <p className={`mt-6 max-w-2xl text-lg leading-relaxed ${oscuro ? 'text-white/70' : 'text-negro/70'}`}>{sub}</p>}
        {children}
      </div>
    </div>
  )
}

// Encabezado de las páginas interiores: mismo sistema, con h1 y aire para la barra fija.
export function EncabezadoPagina({ etiqueta, titulo, sub, children }) {
  return (
    <div className={`${contenedor} pt-28 sm:pt-36`}>
      <EncabezadoSeccion etiqueta={etiqueta} titulo={titulo} sub={sub} como="h1" tamano="medio">
        {children}
      </EncabezadoSeccion>
    </div>
  )
}

// Cota: la línea con la que un plano marca una medida. Aquí mide tiempo.
// `fondo` debe coincidir con el fondo de la sección para que el texto "corte" la línea.
export function Cota({ texto, tono = 'text-negro/50', fondo = 'bg-white', textoClase = 'text-negro/70', className = '', style }) {
  return (
    <div className={`relative flex h-5 items-center ${tono} ${className}`} style={style}>
      <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-current" />
      <span aria-hidden="true" className="absolute left-0 top-1/2 h-3 w-px -translate-y-1/2 rotate-45 bg-current" />
      <span aria-hidden="true" className="absolute right-0 top-1/2 h-3 w-px -translate-y-1/2 rotate-45 bg-current" />
      <span className={`relative mx-auto whitespace-nowrap px-2 text-xs font-semibold tabular-nums ${fondo} ${textoClase}`}>{texto}</span>
    </div>
  )
}

export function Cargando({ etiqueta, className = '' }) {
  return (
    <div
      className={`h-8 w-8 animate-spin rounded-full border-2 border-violeta/20 border-t-violeta ${className}`}
      role="status"
      aria-label={etiqueta}
    />
  )
}

// Paso numerado de un formulario: el orden sí importa (checkout, agenda).
export function Paso({ numero, titulo, children, id = `paso-${numero}` }) {
  return (
    <section aria-labelledby={id} className="border-t border-negro/10 pt-8">
      <div className="mb-6 flex items-center gap-4">
        <span aria-hidden="true" className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2 border-violeta text-sm font-bold text-violeta">
          {numero}
        </span>
        <h2 id={id} className="text-xl font-bold tracking-subtitular text-negro">
          {titulo}
        </h2>
      </div>
      <div className="sm:pl-[52px]">{children}</div>
    </section>
  )
}
