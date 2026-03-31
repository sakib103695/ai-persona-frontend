'use client'

import { useEffect, useRef, useState } from 'react'

interface ConfirmDialogProps {
  title: string
  description: string
  confirmLabel?: string
  /** If set, user must type this exact string to enable confirm */
  confirmText?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Confirm',
  confirmText,
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const canConfirm = !confirmText || typed === confirmText

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  useEffect(() => {
    if (confirmText) inputRef.current?.focus()
  }, [confirmText])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-rose-100' : 'bg-amber-100'}`}>
            <span className={`material-symbols-rounded text-xl ${danger ? 'text-rose-500' : 'text-amber-500'}`}>
              {danger ? 'delete_forever' : 'warning'}
            </span>
          </div>
          <div>
            <h2 className="text-base font-bold text-[#181a2b]">{title}</h2>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">{description}</p>
          </div>
        </div>

        {confirmText && (
          <div className="mb-5">
            <p className="text-xs text-slate-500 mb-2">
              Type <span className="font-bold text-[#181a2b]">{confirmText}</span> to confirm:
            </p>
            <input
              ref={inputRef}
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-[#181a2b] focus:outline-none focus:ring-2 focus:ring-rose-200"
              placeholder={confirmText}
            />
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className={`px-4 py-2 text-sm font-bold text-white rounded-xl transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
              danger ? 'bg-rose-500 hover:bg-rose-600' : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
