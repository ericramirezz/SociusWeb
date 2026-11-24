import { ESTADOS } from '../core'
import { useIdioma } from '../i18n/IdiomaContext'

// Estados con la paleta de marca: el relleno sube de intensidad conforme avanza la orden
// (lavanda → cian → violeta → negro) y las salidas (cancelada, reembolsada) van en contorno.
const ESTILOS = {
  [ESTADOS.COTIZADA]: 'bg-negro/5 text-negro/70',
  [ESTADOS.PAGADA]: 'bg-lavanda text-violeta',
  [ESTADOS.AGENDADA]: 'bg-cian/20 text-negro',
  [ESTADOS.EN_CURSO]: 'bg-violeta text-white',
  [ESTADOS.COMPLETADA]: 'bg-negro text-white',
  [ESTADOS.CANCELADA]: 'bg-white text-negro/60 ring-1 ring-inset ring-negro/20',
  [ESTADOS.REEMBOLSADA]: 'bg-white text-violeta ring-1 ring-inset ring-violeta/40',
}

export default function EstadoBadge({ estado }) {
  const { t } = useIdioma()
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${ESTILOS[estado] ?? ESTILOS[ESTADOS.COTIZADA]}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {t(`estados.${estado}`)}
    </span>
  )
}
