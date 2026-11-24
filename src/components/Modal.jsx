import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

const anchos = { md: 'max-w-md', lg: 'max-w-3xl' }

// Diálogo accesible: se cierra con Escape o con clic fuera, bloquea el
// desplazamiento de la página y devuelve el foco al elemento que lo abrió.
export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const idTitulo = useId()
  const panel = useRef(null)
  // onClose puede cambiar en cada render; el efecto solo depende de si está abierto.
  const cerrar = useRef(onClose)
  cerrar.current = onClose

  useEffect(() => {
    if (!isOpen) return undefined
    const previo = document.activeElement
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    const escape = (e) => e.key === 'Escape' && cerrar.current?.()
    document.addEventListener('keydown', escape)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', escape)
      if (previo && previo.isConnected && typeof previo.focus === 'function') previo.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-negro/70 backdrop-blur-[2px] animate-fade-in" aria-hidden="true" />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className={`relative z-10 w-full ${anchos[size] || anchos.md} rounded-t-xl bg-white outline-none animate-aparece sm:rounded-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-negro/10 px-6 py-5">
          <h2 id={idTitulo} className="text-lg font-bold tracking-subtitular text-negro">
            {title}
          </h2>
          <button onClick={onClose} className="-mr-2 rounded-md p-2 text-negro/60 transition-colors hover:bg-lavanda hover:text-negro">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
