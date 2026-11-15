import { ESTADOS } from '../core'
import { useIdioma } from '../i18n/IdiomaContext'

const ESTILOS = {
  [ESTADOS.COTIZADA]: 'bg-slate-100 text-slate-700 border-slate-300',
  [ESTADOS.PAGADA]: 'bg-blue-50 text-blue-800 border-blue-200',
  [ESTADOS.AGENDADA]: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  [ESTADOS.EN_CURSO]: 'bg-green-50 text-green-800 border-green-200',
  [ESTADOS.COMPLETADA]: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  [ESTADOS.CANCELADA]: 'bg-red-50 text-red-700 border-red-200',
  [ESTADOS.REEMBOLSADA]: 'bg-amber-50 text-amber-800 border-amber-200',
}

export default function EstadoBadge({ estado }) {
  const { t } = useIdioma()
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${ESTILOS[estado] ?? ESTILOS[ESTADOS.COTIZADA]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {t(`estados.${estado}`)}
    </span>
  )
}
