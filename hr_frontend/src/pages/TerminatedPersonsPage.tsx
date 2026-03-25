import { useState } from 'react'
import { FileText, Eye, ChevronRight, ArrowLeft, Search, X, Pencil, Trash2, Download } from 'lucide-react'
import { usePersonData } from '@/hooks/usePersonData'
import { Button, Badge, Modal, Spinner } from '@/components/ui'
import { deletePersonData, deletePersonDataFile, renamePersonDataFile, personPreviewUrl, downloadPersonDataUrl, deletePersonsBatch } from '@/api/client'
import { toast } from 'react-hot-toast'
import { useConfirm } from '@/hooks/useConfirm'
import type { PersonFolder } from '@/types'

const DOC_LABELS: Record<string, string> = {
  CCCD: 'CCCD',
  Bang_dai_hoc: 'Bằng đại học',
  Giay_kham_suc_khoe: 'Giấy khám sức khỏe',
  Anh_the: 'Ảnh thẻ',
  Ly_lich: 'Lý lịch',
  Khac: 'Khác',
}

function docTypeLabel(filename: string): string {
  const base = filename.split('.')[0].replace(/_\d+$/, '')
  return DOC_LABELS[base] ?? base
}

function isImage(filename: string): boolean {
  return /\.(png|jpe?g)$/i.test(filename)
}

function PreviewModal({ person, filename, onClose }: { person: string; filename: string; onClose: () => void }) {
  const url = personPreviewUrl(person, filename)
  const img = isImage(filename)
  return (
    <Modal open onClose={onClose} title={filename} maxWidth="max-w-4xl">
      <div className="bg-zinc-100 rounded-lg overflow-hidden flex items-center justify-center" style={{ minHeight: 420 }}>
        {img ? (
          <img src={url} alt={filename} className="max-w-full max-h-[65vh] object-contain" />
        ) : (
          <object data={url} type="application/pdf" className="w-full border-0" style={{ height: '65vh' }}>
            <iframe src={`${url}#toolbar=1&navpanes=0`} title={filename} className="w-full border-0" style={{ height: '65vh' }} />
          </object>
        )}
      </div>
    </Modal>
  )
}

function RenameModal({ person, filename, onClose, onRenamed }: { person: string; filename: string; onClose: () => void; onRenamed: () => void }) {
  const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')) : ''
  const baseName = filename.slice(0, filename.length - ext.length)
  const [value, setValue] = useState(baseName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    const trimmed = value.trim()
    if (!trimmed) return
    const newName = trimmed + ext
    if (newName === filename) { onClose(); return }
    setSaving(true); setError('')
    try {
      await renamePersonDataFile(person, filename, newName)
      onRenamed()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi.')
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Đổi tên file">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700">Tên mới</label>
          <div className="flex items-center gap-2">
            <input
              autoFocus value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="h-10 flex-1 rounded-md border border-zinc-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
            <span className="text-sm text-zinc-400 shrink-0">{ext}</span>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Hủy</Button>
          <Button onClick={handleSave} disabled={!value.trim() || saving} className="flex-1">
            {saving ? <><Spinner className="mr-2" />Đang lưu…</> : 'Lưu'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function FileRow({ filename, onPreview, onRename, onDelete }: {
  filename: string; onPreview: () => void; onRename: () => void; onDelete: () => void;
}) {
  return (
    <tr className="border-b last:border-0 hover:bg-zinc-50 transition-colors group">
      <td className="px-6 py-4">
        <div className="flex items-center gap-2.5">
          <FileText className="h-4 w-4 text-zinc-300 shrink-0" />
          <span className="text-sm font-medium text-zinc-800 truncate max-w-xs" title={filename}>{filename}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <Badge className="bg-zinc-100 text-zinc-600 border-zinc-200">{docTypeLabel(filename)}</Badge>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" onClick={onPreview}>
            <Eye className="h-3.5 w-3.5 mr-1" /> Xem
          </Button>
          <Button variant="ghost" size="sm" onClick={onRename}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Đổi tên
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-400 hover:text-red-600 hover:bg-red-50">
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Xóa file
          </Button>
        </div>
      </td>
    </tr>
  )
}

export default function TerminatedPersonsPage() {
  const confirm = useConfirm()
  // Fetch ONLY terminated persons
  const { persons, loading, error, refresh } = usePersonData(true)

  const [searchName, setSearchName] = useState('')
  const [currentFolder, setCurrentFolder] = useState<PersonFolder | null>(null)

  const [selectedPersons, setSelectedPersons] = useState<string[]>([])
  const [committing, setCommitting] = useState(false)

  const [preview, setPreview] = useState<{ person: string; filename: string } | null>(null)
  const [renaming, setRenaming] = useState<{ person: string; filename: string } | null>(null)

  const liveFolder = currentFolder ? (persons.find(p => p.name === currentFolder.name) ?? null) : null

  const handleDeleteFile = async (person: string, filename: string) => {
    const ok = await confirm(`Xóa VĨNH VIỄN file "${filename}"? Hành động này không thể hoàn tác.`, { variant: 'destructive', confirmText: 'Xóa Vĩnh Viễn' })
    if (!ok) return
    try {
      await deletePersonDataFile(person, filename)
      refresh()
      toast.success('Đã xóa thành công.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xóa thất bại.')
    }
  }

  const handleDeleteFolder = async (person: string) => {
    const ok = await confirm('CẢNH BÁO: Xóa VĨNH VIỄN hồ sơ, nhân sự, và truy vết dự án của nhân viên đã nghỉ việc này?', { variant: 'destructive', confirmText: 'Xóa Vĩnh Viễn' })
    if (!ok) return
    try {
      await deletePersonData(person)
      refresh()
      if (currentFolder?.name === person) setCurrentFolder(null)
      toast.success('Đã xóa hồ sơ thành công.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xóa thất bại.')
    }
  }

  const filtered = persons.filter(p => p.name.toLowerCase().includes(searchName.toLowerCase()))

  const handleBatchDelete = async (targets: string[]) => {
    const isAll = targets.length === filtered.length
    const msg = isAll
      ? 'Bạn có CHẮC CHẮN muốn XÓA VĨNH VIỄN TẤT CẢ hồ sơ đã nghỉ việc hiện tại không? (Hành động này không thể hoàn tác)'
      : `Bạn có chắc muốn xóa vĩnh viễn ${targets.length} hồ sơ đã chọn?`

    const ok = await confirm(msg, { variant: 'destructive', confirmText: 'Xóa Vĩnh Viễn' })
    if (!ok) return
    setCommitting(true)
    try {
      await deletePersonsBatch(targets)
      refresh()
      toast.success('Đã xóa hồ sơ thành công.')
      setSelectedPersons([])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xóa hàng loạt thất bại.')
    } finally {
      setCommitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-red-600">Hồ sơ nhân viên nghỉ việc</h2>
          <p className="text-zinc-500 text-sm mt-1">Quản lý và dọn dẹp dữ liệu của danh sách nhân sự đã thôi việc.</p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {!currentFolder && (
          <div className="flex flex-col sm:flex-row justify-between w-full gap-4">
            <div className="flex flex-wrap gap-2 items-center">
              {selectedPersons.length > 0 && (
                <Button variant="destructive" onClick={() => handleBatchDelete(selectedPersons)} disabled={committing}>
                  <Trash2 className="w-4 h-4 mr-2" /> Xóa đã chọn ({selectedPersons.length})
                </Button>
              )}
              {filtered.length > 0 && (
                <Button variant="outline" className="text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200 bg-white" onClick={() => handleBatchDelete(filtered.map(p => p.name))} disabled={committing}>
                  Xóa tất cả
                </Button>
              )}
            </div>

            <div className="flex w-full sm:max-w-md gap-2 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                <input value={searchName} onChange={e => setSearchName(e.target.value)}
                  placeholder="Tìm hồ sơ đã nghỉ việc…"
                  className="h-10 w-full rounded-md border border-zinc-200 bg-white pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-red-900 placeholder:text-zinc-400"
                />
                {searchName && (
                  <button onClick={() => setSearchName('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main card */}
      <div className="rounded-xl border border-red-100 bg-white shadow-sm overflow-hidden ring-1 ring-red-100">
        <div className="px-6 py-3 border-b bg-red-50/50 flex items-center text-sm text-zinc-500">
          <button onClick={() => setCurrentFolder(null)} className={`hover:text-zinc-900 transition-colors ${!currentFolder ? 'text-zinc-900 font-semibold' : ''}`}>
            Thư mục gốc (Nhân sự nghỉ việc)
          </button>
          {currentFolder && (
            <><ChevronRight className="h-4 w-4 mx-1.5 text-zinc-300" /><span className="text-zinc-900 font-semibold">{currentFolder.name}</span></>
          )}
        </div>

        {loading && <div className="flex items-center justify-center gap-2 py-16 text-zinc-400 text-sm"><Spinner /> Đang tải…</div>}
        {error && !loading && <div className="py-12 text-center text-red-500 text-sm">{error}</div>}

        {/* Root view */}
        {!loading && !error && !currentFolder && (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 uppercase tracking-wide bg-zinc-50 border-b">
              <tr>
                <th className="w-12 px-6 py-3 text-center">
                  <input type="checkbox" className="accent-red-600 rounded"
                    checked={filtered.length > 0 && selectedPersons.length === filtered.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPersons(filtered.map(p => p.name))
                      } else {
                        setSelectedPersons([])
                      }
                    }}
                  />
                </th>
                <th className="px-6 py-3 font-medium">Tên thư mục (Nhân viên)</th>
                <th className="px-6 py-3 font-medium">Số file</th>
                <th className="px-6 py-3 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.name} className="border-b last:border-0 hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4 text-center">
                    <input type="checkbox" className="accent-red-600 rounded cursor-pointer"
                      onClick={e => e.stopPropagation()}
                      checked={selectedPersons.includes(p.name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPersons(prev => [...prev, p.name])
                        } else {
                          setSelectedPersons(prev => prev.filter(name => name !== p.name))
                        }
                      }}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-zinc-900 cursor-pointer hover:underline" onClick={() => setCurrentFolder(p)}>
                        {p.display_name ?? p.name}
                      </span>
                      {p.display_name && <span className="text-xs text-zinc-400">({p.name})</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-500 text-sm">{p.files.length} file</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <a href={downloadPersonDataUrl(p.name)} download className="inline-flex">
                        <Button size="sm" variant="outline">
                          <Download className="h-3.5 w-3.5 mr-1" /> Tải ZIP
                        </Button>
                      </a>
                      {/* <Button size="sm" variant="destructive" onClick={() => handleDeleteFolder(p.name)}>
                        Xóa Vĩnh Viễn
                      </Button> */}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-400 text-sm">
                  {searchName
                    ? <>Không tìm thấy nhân viên nào khớp với "<strong className="text-zinc-600">{searchName}</strong>".</>
                    : 'Không có nhân sự nghỉ việc nào.'}
                </td></tr>
              )}
            </tbody>
          </table>
        )}

        {/* Folder view */}
        {!loading && !error && currentFolder && (
          <div>
            <div className="px-6 py-3 border-b bg-zinc-50/30 flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setCurrentFolder(null)}>
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Quay lại
              </Button>
              <span className="text-sm text-zinc-500">{liveFolder?.files.length ?? 0} file</span>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-500 uppercase tracking-wide bg-zinc-50 border-b">
                <tr>
                  <th className="px-6 py-3 font-medium flex gap-2 items-center">Tên file</th>
                  <th className="px-6 py-3 font-medium">Loại tài liệu</th>
                  <th className="px-6 py-3 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {(liveFolder?.files ?? []).map(f => (
                  <FileRow key={f} filename={f}
                    onPreview={() => setPreview({ person: currentFolder.name, filename: f })}
                    onRename={() => setRenaming({ person: currentFolder.name, filename: f })}
                    onDelete={() => handleDeleteFile(currentFolder.name, f)}
                  />
                ))}
                {(liveFolder?.files.length ?? 0) === 0 && (
                  <tr><td colSpan={3} className="px-6 py-10 text-center text-zinc-400 text-sm">Thư mục trống.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {preview && <PreviewModal person={preview.person} filename={preview.filename} onClose={() => setPreview(null)} />}
      {renaming && <RenameModal person={renaming.person} filename={renaming.filename} onClose={() => setRenaming(null)} onRenamed={() => { refresh(); setRenaming(null) }} />}
    </div>
  )
}
