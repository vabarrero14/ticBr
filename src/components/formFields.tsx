import type { ReactNode } from 'react'

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
      {label}
      {children}
    </label>
  )
}

export const inputClass =
  'rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900'
