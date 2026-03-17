import { type ReactNode, type ButtonHTMLAttributes } from 'react'
import { X } from 'lucide-react'

// ── Button ────────────────────────────────────────────────────────────────────
type BtnVariant = 'default' | 'outline' | 'ghost' | 'destructive'
type BtnSize = 'default' | 'sm' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: BtnSize
}

export function Button({ variant = 'default', size = 'default', className = '', children, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900'
  const variants: Record<BtnVariant, string> = {
    default: 'bg-zinc-900 text-zinc-50 hover:bg-zinc-800',
    outline: 'border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800',
    ghost: 'hover:bg-zinc-100 text-zinc-700',
    destructive: 'bg-red-500 text-white hover:bg-red-600',
  }
  const sizes: Record<BtnSize, string> = {
    default: 'h-10 px-4 py-2',
    sm: 'h-8 px-3 text-xs',
    icon: 'h-9 w-9',
  }
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
interface BadgeProps { children: ReactNode; className?: string }

export function Badge({ children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 bg-white rounded-xl shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors rounded-md p-1 hover:bg-zinc-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin ${className}`} />
  )
}

// ── Toast (simple inline) ─────────────────────────────────────────────────────
interface ToastProps { message: string; type?: 'info' | 'success' | 'error' }

export function Toast({ message, type = 'info' }: ToastProps) {
  const styles = {
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    error: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <div className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border text-sm ${styles[type]}`}>
      {type === 'info' && <Spinner />}
      <span>{message}</span>
    </div>
  )
}
