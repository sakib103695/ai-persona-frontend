'use client'

import { useState } from 'react'
import { ImportModal } from './ImportModal'

interface Props {
  variant?: 'primary' | 'ghost'
  className?: string
}

export function ImportModalTrigger({ variant = 'primary', className = '' }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          variant === 'primary'
            ? `flex items-center gap-2 brand-gradient text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-xl shadow-indigo-200 active:scale-95 transition-transform ${className}`
            : `flex items-center gap-2 text-indigo-600 font-semibold text-sm hover:bg-indigo-50 px-4 py-2 rounded-xl transition-colors ${className}`
        }
      >
        {variant === 'primary' && (
          <span className="material-symbols-rounded text-base">cloud_download</span>
        )}
        {variant === 'primary' ? 'Get Started Now' : 'Import Persona'}
        {variant === 'primary' && (
          <span className="material-symbols-rounded text-base">arrow_forward</span>
        )}
      </button>

      {open && <ImportModal onClose={() => setOpen(false)} />}
    </>
  )
}
