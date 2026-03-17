import { useRef, useState } from 'react'
import { Upload, FileText, CheckCircle2 } from 'lucide-react'
import JSZip from 'jszip'
import { uploadFiles, processDocuments, commitAll } from '@/api/client'
import { Button, Modal, Spinner, Toast } from '@/components/ui'
import type { FileProcessResult } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onProcessed: () => void
}

type Stage = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

export default function UploadDialog({ open, onClose, onProcessed }: Props) {
  const [files, setFiles] = useState<File[]>([])
  const [stage, setStage] = useState<Stage>('idle')
  const [message, setMessage] = useState('')
  const [results, setResults] = useState<FileProcessResult[]>([])
  const [committing, setCommitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setFiles([])
    setStage('idle')
    setMessage('')
    setResults([])
  }

  const handleClose = () => { reset(); onClose() }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    const picked = Array.from(e.target.files)
    const all: File[] = []

    for (const f of picked) {
      if (f.name.endsWith('.zip')) {
        const zip = await JSZip.loadAsync(f)
        for (const [name, entry] of Object.entries(zip.files)) {
          if (!entry.dir && /\.(pdf|png|jpe?g)$/i.test(name)) {
            const blob = await entry.async('blob')
            all.push(new File([blob], name.split('/').pop()!, { type: blob.type }))
          }
        }
      } else {
        all.push(f)
      }
    }
    setFiles(all)
    setStage('idle')
    // Reset input so same file can be re-selected
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleRun = async () => {
    if (!files.length) return

    try {
      setStage('uploading')
      setMessage('Đang tải file lên máy chủ…')
      await uploadFiles(files)

      setStage('processing')
      setMessage('Đang phân tích và chuẩn hóa hồ sơ…')
      const res = await processDocuments()

      setResults(res.results)
      setStage('done')
      setMessage(`Hoàn tất chuẩn hóa — ${res.succeeded}/${res.total} file thành công. Bấm "Lưu vào hồ sơ" để ghi vào folder chính.`)
      onProcessed()
    } catch (err) {
      setStage('error')
      setMessage(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.')
    }
  }

  const isRunning = stage === 'uploading' || stage === 'processing'

  return (
    <Modal open={open} onClose={handleClose} title="Tải lên & Chuẩn hóa hồ sơ">
      <div className="space-y-4">
        {/* Drop zone */}
        <label
          htmlFor="file-upload"
          className="border-2 border-dashed border-zinc-200 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:bg-zinc-50 transition-colors"
        >
          <div className="p-3 bg-zinc-100 rounded-full">
            <Upload className="h-5 w-5 text-zinc-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-800">Chọn file hoặc kéo thả</p>
            <p className="text-xs text-zinc-400 mt-0.5">Hỗ trợ PDF, PNG, JPG, ZIP</p>
          </div>
          <input
            id="file-upload"
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.zip"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              {files.length} file đã chọn
            </p>
            <ul className="space-y-1 max-h-36 overflow-y-auto">
              {files.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-zinc-600 bg-zinc-50 rounded-md px-3 py-1.5">
                  <FileText className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate">{f.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Status */}
        {message && (
          <Toast
            message={message}
            type={stage === 'done' ? 'success' : stage === 'error' ? 'error' : 'info'}
          />
        )}

        {/* Results summary */}
        {stage === 'done' && results.length > 0 && (
          <div className="border rounded-lg overflow-hidden max-h-44 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50 border-b text-zinc-500 uppercase">
                <tr>
                  <th className="px-3 py-2">File gốc</th>
                  <th className="px-3 py-2">Người</th>
                  <th className="px-3 py-2">Loại</th>
                  <th className="px-3 py-2">Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-3 py-2 truncate max-w-[120px]" title={r.original_filename}>{r.original_filename}</td>
                    <td className="px-3 py-2">{r.person_name ?? '—'}</td>
                    <td className="px-3 py-2">{r.doc_type}</td>
                    <td className="px-3 py-2">
                      {r.status === 'ok'
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        : <span className="text-red-500" title={r.error ?? ''}>✗</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {stage === 'done' ? (
          <div className="flex gap-2">
            <Button
              onClick={async () => {
                setCommitting(true)
                try {
                  await commitAll()
                  setMessage('Đã lưu toàn bộ hồ sơ vào storage chính.')
                  onProcessed()
                  handleClose()
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : 'Lưu thất bại.')
                } finally {
                  setCommitting(false)
                }
              }}
              disabled={committing}
              className="flex-1"
            >
              {committing ? <><Spinner className="mr-2" />Đang lưu…</> : 'Lưu vào hồ sơ'}
            </Button>
            <Button onClick={handleClose} variant="outline" className="flex-1">
              <CheckCircle2 className="mr-2 h-4 w-4" /> Đóng
            </Button>
          </div>
        ) : (
          <Button onClick={handleRun} disabled={!files.length || isRunning} className="w-full">
            {isRunning ? (
              <><Spinner className="mr-2" /> Đang xử lý…</>
            ) : (
              'Bắt đầu chuẩn hóa'
            )}
          </Button>
        )}
      </div>
    </Modal>
  )
}
