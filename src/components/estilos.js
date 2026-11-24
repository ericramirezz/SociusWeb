// Clases compartidas. Un solo lugar para botones, campos y contenedor,
// así todas las pantallas se comportan igual.

export const contenedor = 'mx-auto w-full max-w-7xl px-5 sm:px-8'

const baseBoton =
  'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50'

export const boton = {
  // Acción principal: una por pantalla.
  primario: `${baseBoton} bg-violeta px-6 py-3.5 text-[15px] text-white hover:bg-negro`,
  // Acción alternativa junto a la principal.
  secundario: `${baseBoton} border border-negro/20 px-6 py-3.5 text-[15px] text-negro hover:border-negro hover:bg-negro hover:text-white`,
  // Sobre fondo violeta o negro.
  claro: `${baseBoton} bg-white px-6 py-3.5 text-[15px] text-violeta hover:bg-lavanda`,
  // Versión compacta para filas y barras.
  chico: `${baseBoton} bg-violeta px-4 py-2.5 text-sm text-white hover:bg-negro`,
  chicoContorno: `${baseBoton} border border-violeta/30 px-4 py-2.5 text-sm text-violeta hover:border-violeta hover:bg-violeta hover:text-white`,
  // Enlace con subrayado discreto.
  texto:
    'inline-flex items-center gap-1.5 font-semibold text-violeta underline decoration-violeta/30 decoration-2 underline-offset-[6px] transition-colors hover:text-negro hover:decoration-violeta',
}

export const campo = (conError) =>
  `w-full rounded-md border ${conError ? 'border-red-400' : 'border-negro/20'} bg-white px-4 py-3 text-[15px] text-negro placeholder-negro/40 transition-colors duration-200 hover:border-negro/40 focus:border-violeta focus:outline-none focus:ring-4 focus:ring-violeta/10`

export const etiquetaCampo = 'mb-1.5 block text-sm font-medium text-negro'

export const errorCampo = 'mt-1.5 text-[13px] font-medium text-red-600'
