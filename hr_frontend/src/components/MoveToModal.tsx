import { useState } from 'react'
import { Modal, Button, Spinner } from '@/components/ui'
import type { PersonFolder } from '@/types'

interface MoveToModalProps {
  open: boolean
  onClose: () => void
  onMove: (targetPerson: string) => Promise<void>
  existingPersons: PersonFolder[]
  selectedCount: number
}

export default function MoveToModal({ open, onClose, onMove, existingPersons, selectedCount }: MoveToModalProps) {
  const [target, setTarget] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    const trimmed = target.trim()
    if (!trimmed) return
    setSaving(true)
    setError('')
    try {
      await onMove(trimmed)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi.')
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Chuyển ${selectedCount} file`}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700">Chọn hoặc nhập tên hồ sơ mới</label>
          <input
            autoFocus
            list="person-list"
            value={target}
            onChange={e => setTarget(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="Ví dụ: Nguyen_Van_A"
            className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
          <datalist id="person-list">
            {existingPersons.map(p => (
              <option key={p.name} value={p.name} />
            ))}
          </datalist>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Hủy</Button>
          <Button onClick={handleSave} disabled={!target.trim() || saving} className="flex-1">
            {saving ? <><Spinner className="mr-2" />Đang lưu…</> : 'Chuyển'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
