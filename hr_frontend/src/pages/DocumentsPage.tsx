import { useState } from 'react'
import {
  Upload, FileText, Eye, CheckCircle2, ShieldAlert,
  ChevronRight, ArrowLeft, Search, X, ScanFace, Pencil, Trash2, Download
} from 'lucide-react'
import {
  filePreviewUrl, deleteFile, renameFile, deletePerson, commitPerson, commitAll, commitFiles,
  personPreviewUrl, deletePersonDataFile, deletePersonData, renamePersonDataFile,
  renamePersonData, renamePerson, downloadPersonsBatch, deletePersonsBatch, clearOutput
} from '@/api/client'
import { useOutputData } from '@/hooks/useOutputData'
import { usePersonData } from '@/hooks/usePersonData'
import { getFolderStatus } from '@/utils/folderStatus'
import { Button, Badge, Modal, Spinner } from '@/components/ui'
import UploadDialog from '@/components/UploadDialog'
import FaceMatchDialog from '@/components/FaceMatchDialog'
import MoveToModal from '@/components/MoveToModal'
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

// ── Preview modal ─────────────────────────────────────────────────────────────
function PreviewModal({ person, filename, type, onClose }: { person: string; filename: string; type: 'main' | 'staging'; onClose: () => void }) {
  const url = type === 'main' ? personPreviewUrl(person, filename) : filePreviewUrl(person, filename)
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

// ── Rename modal ──────────────────────────────────────────────────────────────
function RenameModal({ person, filename, type, onClose, onRenamed }: { person: string; filename: string; type: 'main' | 'staging'; onClose: () => void; onRenamed: () => void }) {
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
      if (type === 'main') {
        await renamePersonDataFile(person, filename, newName)
      } else {
        await renameFile(person, filename, newName)
      }
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

// ── File row ──────────────────────────────────────────────────────────────────
function FileRow({ filename, onPreview, onRename, onDelete, showCheckbox, selected, onToggle }: {
  filename: string; onPreview: () => void; onRename: () => void; onDelete: () => void;
  showCheckbox?: boolean; selected?: boolean; onToggle?: () => void;
}) {
  return (
    <tr className={`border-b last:border-0 hover:bg-zinc-50 transition-colors group ${selected ? 'bg-indigo-50/30' : ''}`}>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2.5">
          {showCheckbox && (
            <input
              type="checkbox"
              className="mr-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
              checked={selected}
              onChange={onToggle}
            />
          )}
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
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Xóa
          </Button>
        </div>
      </td>
    </tr>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const [tab, setTab] = useState<'main' | 'staging'>('main')
  const confirm = useConfirm()

  const { persons: stagingPersons, loading: stagingLoading, error: stagingError, refresh: refreshStaging } = useOutputData()
  const { persons: mainPersons, loading: mainLoading, error: mainError, refresh: refreshMain } = usePersonData()

  const persons = tab === 'main' ? mainPersons : stagingPersons
  const loading = tab === 'main' ? mainLoading : stagingLoading
  const error = tab === 'main' ? mainError : stagingError

  const refresh = () => { refreshMain(); refreshStaging(); }

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [currentFolder, setCurrentFolder] = useState<PersonFolder | null>(null)
  const [searchName, setSearchName] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [faceOpen, setFaceOpen] = useState(false)
  const [moveModalOpen, setMoveModalOpen] = useState(false)

  const [preview, setPreview] = useState<{ person: string; filename: string; type: 'main' | 'staging' } | null>(null)
  const [renaming, setRenaming] = useState<{ person: string; filename: string; type: 'main' | 'staging' } | null>(null)
  const [committing, setCommitting] = useState(false)

  // ── TẠM THỜI: xóa vĩnh viễn ngay lần 1 (bỏ khi hoàn thiện flow) ──────────
  const handlePermDeleteFolder = async (person: string) => {
    const ok = await confirm('CẢNH BÁO: Xóa VĨNH VIỄN hồ sơ, nhân sự, và truy vết dự án của nhân viên này?', { variant: 'destructive', confirmText: 'Xóa Vĩnh Viễn' })
    if (!ok) return
    try {
      await deletePersonsBatch([person])   // bước 1: soft delete → chuyển sang terminated
      await deletePersonData(person)       // bước 2: xóa vĩnh viễn khỏi terminated
      refresh()
      if (currentFolder?.name === person) setCurrentFolder(null)
      toast.success('Đã xóa hồ sơ thành công.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xóa thất bại.')
    }
  }
  const handlePermDeleteFile = async (person: string, filename: string) => {
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
  const handlePermBatchDelete = async (targets: string[]) => {
    const isAll = targets.length === 0
    const msg = isAll
      ? 'CẢNH BÁO: Xóa VĨNH VIỄN TẤT CẢ hồ sơ nhân sự hiện tại? (Không thể hoàn tác)'
      : `CẢNH BÁO: Xóa VĨNH VIỄN ${targets.length} hồ sơ đã chọn? (Không thể hoàn tác)`
    const ok = await confirm(msg, { variant: 'destructive', confirmText: 'Xóa Vĩnh Viễn' })
    if (!ok) return
    setCommitting(true)
    try {
      const toDelete = isAll ? filtered.map(p => p.name) : targets  // Đang là tạm thời để phục vụ phòng HCNS nên gộp hai bước xoá lại (giờ xoá một lầm là xoá vĩnh viễn trong db)
      await deletePersonsBatch(toDelete)                          // bước 1: soft delete chuyển trạng thái nhân sự sang terminated
      await Promise.all(toDelete.map(p => deletePersonData(p)))  // bước 2: xóa vĩnh viễn
      refresh()
      toast.success('Đã xóa vĩnh viễn thành công.')
      setSelectedMainFolders([])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xóa hàng loạt thất bại.')
    } finally {
      setCommitting(false)
    }
  }
  // ── Hết phần tạm thời ────────────────────────────────────────────────────────




  // Selection state for staging tab
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  // Selection state for main tab folders
  const [selectedMainFolders, setSelectedMainFolders] = useState<string[]>([])
  // Selection state for staging folders
  const [selectedStagingFolders, setSelectedStagingFolders] = useState<string[]>([])

  const liveFolder = currentFolder ? (persons.find(p => p.name === currentFolder.name) ?? null) : null

  const handleSelectAll = () => {
    if (!liveFolder) return
    if (selectedFiles.length === liveFolder.files.length) {
      setSelectedFiles([])
    } else {
      setSelectedFiles(liveFolder.files)
    }
  }

  const handleCommitSelected = async (targetPerson?: string) => {
    if (!currentFolder || selectedFiles.length === 0) return
    setCommitting(true)
    try {
      await commitFiles(currentFolder.name, selectedFiles, targetPerson)
      setSelectedFiles([])
      refresh()
      if (selectedFiles.length === liveFolder?.files.length) {
        setCurrentFolder(null)
      }
      toast.success('Đã lưu các file chọn thành công.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lưu thất bại.')
    } finally {
      setCommitting(false)
    }
  }

  const handleDeleteFile = async (person: string, filename: string) => {
    const ok = await confirm(`Xóa file "${filename}"? Hành động này không thể hoàn tác.`, { variant: 'destructive' })
    if (!ok) return
    try {
      if (tab === 'main') {
        await deletePersonDataFile(person, filename)
      } else {
        await deleteFile(person, filename)
      }
      refresh()
      toast.success('Đã xóa thành công.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xóa thất bại.')
    }
  }

  const handleDeleteFolder = async (person: string) => {
    const ok = await confirm('Bạn có chắc muốn xóa hồ sơ này?', { variant: 'destructive', confirmText: 'Xóa' })
    if (!ok) return
    try {
      if (tab === 'main') {
        await deletePersonData(person)
      } else {
        await deletePerson(person)
      }
      refresh()
      toast.success('Đã xóa hồ sơ thành công.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xóa thất bại.')
    }
  }

  const handleBatchDownload = async (targets: string[]) => {
    setCommitting(true)
    try {
      await downloadPersonsBatch(targets)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Tải hàng loạt thất bại.')
    } finally {
      setCommitting(false)
      setSelectedMainFolders([])
    }
  }

  const handleBatchDelete = async (targets: string[]) => {
    const isAll = targets.length === 0
    const msg = isAll
      ? 'Bạn có CHẮC CHẮN muốn XÓA TẤT CẢ hồ sơ nhân sự hiện tại không?'
      : `Bạn có chắc muốn xóa ${targets.length} hồ sơ đã chọn?`
    const ok = await confirm(msg, { variant: 'destructive', confirmText: 'Xóa' })
    if (!ok) return
    setCommitting(true)
    try {
      await deletePersonsBatch(targets)
      refresh()
      toast.success('Đã xóa thành công.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xóa hàng loạt thất bại.')
    } finally {
      setCommitting(false)
      setSelectedMainFolders([])
    }
  }

  const handleBatchDeleteStaging = async (targets: string[]) => {
    const isAll = targets.length === 0
    const msg = isAll
      ? 'Bạn có CHẮC CHẮN muốn XÓA TẤT CẢ hồ sơ đang chờ duyệt không?'
      : `Bạn có chắc muốn xóa ${targets.length} hồ sơ chờ duyệt đã chọn?`
    const ok = await confirm(msg, { variant: 'destructive', confirmText: 'Xóa' })
    if (!ok) return
    setCommitting(true)
    try {
      if (isAll) {
        await clearOutput()
      } else {
        await Promise.all(targets.map(p => deletePerson(p)))
      }
      refresh()
      toast.success('Đã xóa hồ sơ chờ duyệt thành công.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xóa hàng loạt thất bại.')
    } finally {
      setCommitting(false)
      setSelectedStagingFolders([])
    }
  }

  const handleBatchCommitStaging = async (targets: string[]) => {
    const ok = await confirm(`Bạn có chắc muốn duyệt ${targets.length} hồ sơ đã chọn?`)
    if (!ok) return
    setCommitting(true)
    try {
      await Promise.all(targets.map(p => commitPerson(p)))
      refresh()
      toast.success(`Đã duyệt ${targets.length} hồ sơ thành công.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Duyệt hàng loạt thất bại.')
    } finally {
      setCommitting(false)
      setSelectedStagingFolders([])
    }
  }

  const filtered = persons.filter(p => p.name.toLowerCase().includes(searchName.toLowerCase()))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Hồ sơ nhân sự</h2>
          <p className="text-zinc-500 text-sm mt-1">Quản lý thư mục hồ sơ và tài liệu của nhân viên.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setFaceOpen(true)}>
            <ScanFace className="mr-2 h-4 w-4" /> Nhận diện khuôn mặt
          </Button>
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Tải lên hồ sơ
          </Button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-4 border-b border-zinc-200">
          <button
            onClick={() => { setTab('main'); setCurrentFolder(null); }}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${tab === 'main' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}
          >
            Hồ sơ lưu trữ
          </button>
          <button
            onClick={() => { setTab('staging'); setCurrentFolder(null); }}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${tab === 'staging' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}
          >
            Hồ sơ chờ duyệt
            {stagingPersons.length > 0 && (
              <Badge className="bg-red-500 hover:bg-red-600 text-white border-0 px-1.5 py-0.5 text-[10px] leading-none">
                {stagingPersons.length}
              </Badge>
            )}
          </button>
        </div>

        {!currentFolder && (
          <div className="flex w-full max-w-md gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              <input value={searchName} onChange={e => setSearchName(e.target.value)}
                placeholder="Tìm theo tên nhân viên…"
                className="h-10 w-full rounded-md border border-zinc-200 bg-white pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 placeholder:text-zinc-400"
              />
              {searchName && (
                <button onClick={() => setSearchName('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main card */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        {/* Breadcrumb */}
        <div className="px-6 py-3 border-b bg-zinc-50/70 flex items-center text-sm text-zinc-500">
          <button onClick={() => setCurrentFolder(null)} className={`hover:text-zinc-900 transition-colors ${!currentFolder ? 'text-zinc-900 font-semibold' : ''}`}>
            {tab === 'main' ? 'Thư mục gốc (Lưu trữ)' : 'Thư mục gốc (Chờ duyệt)'}
          </button>
          {currentFolder && (
            <><ChevronRight className="h-4 w-4 mx-1.5 text-zinc-300" /><span className="text-zinc-900 font-semibold">{currentFolder.name}</span></>
          )}
        </div>

        {tab === 'main' && !currentFolder && (
          <div className="px-6 py-2 border-b flex gap-2 items-center bg-zinc-50/50 flex-wrap">
            {selectedMainFolders.length > 0 ? (
              <>
                <span className="text-sm font-medium text-emerald-700 mr-2 flex items-center gap-1.5 bg-emerald-100 px-2 py-1 rounded-md shadow-sm">
                  <CheckCircle2 className="w-4 h-4" /> Đã chọn {selectedMainFolders.length} hồ sơ
                </span>
                <Button size="sm" variant="outline" disabled={committing} onClick={() => handleBatchDownload(selectedMainFolders)}>
                  {committing ? <Spinner className="w-4 h-4 mr-1" /> : <Download className="h-4 w-4 mr-1" />} Tải {selectedMainFolders.length} mục
                </Button>
                {/* Tạm thời  */}
                {/* <Button size="sm" variant="destructive" disabled={committing} onClick={() => handleBatchDelete(selectedMainFolders)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Xóa {selectedMainFolders.length} mục
                </Button> */}
                <Button size="sm" variant="destructive" disabled={committing} onClick={() => handlePermBatchDelete(selectedMainFolders)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Xóa ({selectedMainFolders.length})
                </Button>
                {/* Tạm thời  */}
                <Button size="sm" variant="ghost" disabled={committing} onClick={() => setSelectedMainFolders([])} className="ml-auto text-zinc-400 hover:text-zinc-600">
                  Bỏ chọn
                </Button>
              </>
            ) : (
              <>
                <span className="text-sm border border-zinc-200 text-zinc-600 mr-2 bg-white px-2 py-1 rounded-md shadow-sm">Thao tác toàn bộ:</span>
                <Button size="sm" variant="outline" disabled={committing || filtered.length === 0} onClick={() => handleBatchDownload([])}>
                  {committing ? <Spinner className="w-4 h-4 mr-1" /> : <Download className="h-4 w-4 mr-1" />} Tải Tất Cả
                </Button>
                {/* Tạm thời  */}
                {/* <Button size="sm" variant="destructive" disabled={committing || filtered.length === 0} onClick={() => handleBatchDelete([])}>
                  <Trash2 className="h-4 w-4 mr-1" /> Xóa Tất Cả
                </Button> */}
                <Button size="sm" variant="destructive" disabled={committing || filtered.length === 0} onClick={() => handlePermBatchDelete([])}>
                  <Trash2 className="h-4 w-4 mr-1" /> Xóa Tất Cả
                </Button>
                {/* Tạm thời  */}
              </>
            )}
          </div>
        )}

        {tab === 'staging' && !currentFolder && (
          <div className="px-6 py-2 border-b flex gap-2 items-center bg-zinc-50/50 flex-wrap">
            {selectedStagingFolders.length > 0 ? (
              <>
                <span className="text-sm font-medium text-indigo-700 mr-2 flex items-center gap-1.5 bg-indigo-100 px-2 py-1 rounded-md shadow-sm">
                  <CheckCircle2 className="w-4 h-4" /> Đã chọn {selectedStagingFolders.length} hồ sơ
                </span>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={committing} onClick={() => handleBatchCommitStaging(selectedStagingFolders)}>
                  {committing ? <Spinner className="w-4 h-4 mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />} Duyệt {selectedStagingFolders.length} mục
                </Button>
                <Button size="sm" variant="destructive" disabled={committing} onClick={() => handleBatchDeleteStaging(selectedStagingFolders)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Xóa {selectedStagingFolders.length} mục
                </Button>
                <Button size="sm" variant="ghost" disabled={committing} onClick={() => setSelectedStagingFolders([])} className="ml-auto text-zinc-400 hover:text-zinc-600">
                  Bỏ chọn
                </Button>
              </>
            ) : (
              <>
                <span className="text-sm border border-zinc-200 text-zinc-600 mr-2 bg-white px-2 py-1 rounded-md shadow-sm">Thao tác toàn bộ:</span>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={committing || filtered.length === 0} onClick={async () => {
                  const ok = await confirm("Hệ thống sẽ duyệt và lưu TẤT CẢ thư mục đang chờ?")
                  if (!ok) return
                  setCommitting(true)
                  try {
                    await commitAll()
                    refresh()
                    toast.success("Đã lưu hoàn tất tất cả hồ sơ.")
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Lỗi duyệt hồ sơ")
                  } finally {
                    setCommitting(false)
                  }
                }}>
                  {committing ? <Spinner className="w-4 h-4 mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />} Duyệt Tất Cả
                </Button>
                <Button size="sm" variant="destructive" disabled={committing || filtered.length === 0} onClick={() => handleBatchDeleteStaging([])}>
                  <Trash2 className="h-4 w-4 mr-1" /> Xóa Tất Cả
                </Button>
              </>
            )}
          </div>
        )}

        {loading && <div className="flex items-center justify-center gap-2 py-16 text-zinc-400 text-sm"><Spinner /> Đang tải…</div>}
        {error && !loading && <div className="py-12 text-center text-red-500 text-sm">{error}</div>}

        {/* Root view */}
        {!loading && !error && !currentFolder && (
          <>
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-500 uppercase tracking-wide bg-zinc-50 border-b">
                <tr>
                  <th className="px-6 py-3 font-medium flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 h-4 w-4 cursor-pointer"
                      checked={tab === 'main'
                        ? (filtered.length > 0 && selectedMainFolders.length === filtered.length)
                        : (filtered.length > 0 && selectedStagingFolders.length === filtered.length)}
                      onChange={() => {
                        if (tab === 'main') {
                          if (selectedMainFolders.length === filtered.length) {
                            setSelectedMainFolders([])
                          } else {
                            setSelectedMainFolders(filtered.map(f => f.name))
                          }
                        } else {
                          if (selectedStagingFolders.length === filtered.length) {
                            setSelectedStagingFolders([])
                          } else {
                            setSelectedStagingFolders(filtered.map(f => f.name))
                          }
                        }
                      }}
                    />
                    Tên thư mục (Nhân viên)
                  </th>
                  <th className="px-6 py-3 font-medium">Số file</th>
                  {/* <th className="px-6 py-3 font-medium">Tình trạng hồ sơ</th> */}
                  <th className="px-6 py-3 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.name} className={`border-b last:border-0 hover:bg-zinc-50 transition-colors ${selectedMainFolders.includes(p.name) ? 'bg-indigo-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      {editingId === p.name ? (
                        <div className="flex gap-2 items-center">
                          <input
                            className="border px-2 py-1 rounded"
                            value={editingName}
                            onChange={e => setEditingName(e.target.value)}
                            autoFocus
                          />
                          <Button size="sm" className="bg-green-500 text-white" onClick={async () => {
                            if (editingName.trim()) {
                              try {
                                if (tab === 'main') {
                                  await renamePersonData(p.name, editingName.trim())
                                } else {
                                  await renamePerson(p.name, editingName.trim())
                                }
                                setEditingId(null); setEditingName("");
                                refresh()
                                toast.success("Đã đổi tên thành công.")
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : 'Đổi tên thất bại.')
                              }
                            }
                          }}>Lưu</Button>
                          <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditingName(""); }}>Hủy</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 h-4 w-4 cursor-pointer"
                            checked={tab === 'main' ? selectedMainFolders.includes(p.name) : selectedStagingFolders.includes(p.name)}
                            onChange={() => {
                              if (tab === 'main') {
                                if (selectedMainFolders.includes(p.name)) {
                                  setSelectedMainFolders(selectedMainFolders.filter(n => n !== p.name))
                                } else {
                                  setSelectedMainFolders([...selectedMainFolders, p.name])
                                }
                              } else {
                                if (selectedStagingFolders.includes(p.name)) {
                                  setSelectedStagingFolders(selectedStagingFolders.filter(n => n !== p.name))
                                } else {
                                  setSelectedStagingFolders([...selectedStagingFolders, p.name])
                                }
                              }
                            }}
                          />
                          <span className="font-medium text-zinc-900 cursor-pointer hover:underline" onClick={() => setCurrentFolder(p)}>
                            {p.display_name ?? p.name}
                          </span>
                          {/* {p.display_name && <span className="text-xs text-zinc-400">({p.name})</span>} */}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-zinc-500 text-sm">{p.files.length} file</td>
                    {/* <td className="px-6 py-4">
                      {(() => {
                        const { status, issues } = getFolderStatus(p)
                        if (status === 'good') return (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Đầy đủ & Hợp lệ
                          </Badge>
                        )
                        return (
                          <div className="flex flex-col gap-1">
                            {issues.map((issue, i) => (
                              <Badge key={i} className="bg-red-50 text-red-600 border-red-200">
                                <ShieldAlert className="w-3 h-3" /> {issue}
                              </Badge>
                            ))}
                          </div>
                        )
                      })()}
                    </td> */}
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {tab === 'staging' && (
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={async () => {
                            try {
                              await commitPerson(p.name)
                              refresh()
                              toast.success('Đã lưu hồ sơ vào storage chính.')
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : 'Lưu thất bại.')
                            }
                          }}>Lưu hồ sơ</Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => { setEditingId(p.name); setEditingName(p.name); }}>Sửa tên</Button>
                        {/* <Button size="sm" variant="destructive" onClick={() => handleDeleteFolder(p.name)}>Xóa</Button> */}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-400 text-sm">
                    {searchName
                      ? <>Không tìm thấy nhân viên nào khớp với "<strong className="text-zinc-600">{searchName}</strong>".</>
                      : (tab === 'main' ? 'Chưa có hồ sơ nào lưu trữ.' : 'Không có hồ sơ nào đang chờ duyệt.')}
                  </td></tr>
                )}
              </tbody>
            </table>
          </>
        )}

        {/* Folder view */}
        {!loading && !error && currentFolder && (
          <div>
            <div className="pl-6 pr-0 py-3 border-b bg-zinc-50/30 flex items-center gap-3">
              <span className="text-sm text-zinc-500">
                {liveFolder?.files.length ?? 0} file
              </span>

              {/* Đẩy tất cả sang phải */}
              <div className="ml-auto flex items-center gap-2 mr-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentFolder(null)}
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" /> Quay lại
                </Button>

                {tab === 'staging' && selectedFiles.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={committing}
                      onClick={() => setMoveModalOpen(true)}
                    >
                      Chuyển thư mục...
                    </Button>

                    <Button
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      size="sm"
                      disabled={committing}
                      onClick={() => handleCommitSelected()}
                    >
                      {committing ? 'Đang lưu...' : `Lưu (${selectedFiles.length}) file`}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-500 uppercase tracking-wide bg-zinc-50 border-b">
                <tr>
                  <th className="px-6 py-3 font-medium flex gap-2 items-center">
                    {tab === 'staging' && (
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                        checked={liveFolder?.files.length === selectedFiles.length && liveFolder?.files.length > 0}
                        onChange={handleSelectAll}
                      />
                    )}
                    Tên file
                  </th>
                  <th className="px-6 py-3 font-medium">Loại tài liệu</th>
                  <th className="px-6 py-3 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {(liveFolder?.files ?? []).map(f => (
                  <FileRow key={f} filename={f}
                    showCheckbox={tab === 'staging'}
                    selected={selectedFiles.includes(f)}
                    onToggle={() => {
                      if (selectedFiles.includes(f)) {
                        setSelectedFiles(selectedFiles.filter(item => item !== f))
                      } else {
                        setSelectedFiles([...selectedFiles, f])
                      }
                    }}
                    onPreview={() => setPreview({ person: currentFolder.name, filename: f, type: tab })}
                    onRename={() => setRenaming({ person: currentFolder.name, filename: f, type: tab })}
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

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onProcessed={() => { refresh(); setCurrentFolder(null); setTab('staging'); }} />
      <FaceMatchDialog open={faceOpen} onClose={() => setFaceOpen(false)} onMatched={() => { refresh(); setTab('staging'); }} />
      {moveModalOpen && <MoveToModal open onMove={(target) => handleCommitSelected(target)} existingPersons={mainPersons} selectedCount={selectedFiles.length} onClose={() => setMoveModalOpen(false)} />}
      {preview && <PreviewModal person={preview.person} filename={preview.filename} type={preview.type} onClose={() => setPreview(null)} />}
      {renaming && <RenameModal person={renaming.person} filename={renaming.filename} type={renaming.type} onClose={() => setRenaming(null)} onRenamed={() => { refresh(); setRenaming(null) }} />}
    </div>
  )
}
