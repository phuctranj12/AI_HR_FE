import { useRef, useState, useEffect } from 'react'
import { Upload, FileText, CheckCircle2, AlertCircle, Play, Ban, RefreshCw, X } from 'lucide-react'
import JSZip from 'jszip'
import { uploadAndProcess, commitAll } from '@/api/client'
import { Button, Modal, Spinner, Toast } from '@/components/ui'
import type { FileProcessResult } from '@/types'

type FileStatus = 'pending' | 'uploading' | 'processing' | 'done' | 'error' | 'cancelled'

interface QueuedFile {
  id: string
  file: File
  status: FileStatus
  progress: number
  result?: FileProcessResult
  error?: string
  abortController?: AbortController
}

export default function UploadDialog() {
  const [open, setOpen] = useState(false)
  const [queue, setQueue] = useState<QueuedFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [message, setMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleOpen = () => setOpen(true)
    window.addEventListener('open-upload', handleOpen)
    return () => window.removeEventListener('open-upload', handleOpen)
  }, [])

  // Listen to refresh-documents event (triggered when commit from outside modal)
  useEffect(() => {
    const handleRefresh = () => {
      // If there are done files and queue is not empty, clear done files
      setQueue(prev => {
        const doneItems = prev.filter(q => q.status === 'done')
        if (doneItems.length > 0) {
          // Keep only non-done items
          return prev.filter(q => q.status !== 'done')
        }
        return prev
      })
    }
    window.addEventListener('refresh-documents', handleRefresh)
    return () => window.removeEventListener('refresh-documents', handleRefresh)
  }, [])

  // Listen to files-committed event (triggered when specific files are committed)
  useEffect(() => {
    const handleFilesCommitted = (event: Event) => {
      const customEvent = event as CustomEvent
      const { person, files } = customEvent.detail || {}
      if (person && files && Array.isArray(files)) {
        setQueue(prev =>
          prev.filter(q => !(files.includes(q.file.name) && q.status === 'done'))
        )
      }
    }
    window.addEventListener('files-committed', handleFilesCommitted)
    return () => window.removeEventListener('files-committed', handleFilesCommitted)
  }, [])

  // Listen to person-committed event (triggered when full person folder is committed)
  useEffect(() => {
    const handlePersonCommitted = (event: Event) => {
      const customEvent = event as CustomEvent
      const { person } = customEvent.detail || {}
      if (person) {
        // Remove all done files from this person from queue
        setQueue(prev =>
          prev.filter(q => {
            // Check if file belongs to this person in queue result
            if (q.status === 'done' && q.result?.person_name) {
              // If person matches, remove it from queue
              return q.result.person_name !== person
            }
            return true
          })
        )
      }
    }
    window.addEventListener('person-committed', handlePersonCommitted)
    return () => window.removeEventListener('person-committed', handlePersonCommitted)
  }, [])

  const activeCount = queue.filter(q => q.status === 'uploading' || q.status === 'processing').length
  const pendingCount = queue.filter(q => q.status === 'pending').length
  const doneCount = queue.filter(q => q.status === 'done').length
  const errorCount = queue.filter(q => q.status === 'error').length
  const totalCount = queue.length

  const isRunning = isProcessing && (activeCount > 0 || pendingCount > 0)

  const reset = () => {
    // Abort any ongoing requests before resetting
    queue.forEach(q => {
      if (q.abortController && (q.status === 'uploading' || q.status === 'processing')) {
        q.abortController.abort()
      }
    })
    setQueue([])
    setIsProcessing(false)
    setMessage('')
  }

  const handleClose = () => {
    setOpen(false)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    const picked = Array.from(e.target.files)
    const newFiles: QueuedFile[] = []

    for (const f of picked) {
      if (f.name.endsWith('.zip')) {
        const zip = await JSZip.loadAsync(f)
        for (const [name, entry] of Object.entries(zip.files)) {
          if (!entry.dir && /\.(pdf|png|jpe?g)$/i.test(name)) {
            const blob = await entry.async('blob')
            const fileObj = new File([blob], name.split('/').pop()!, { type: blob.type })
            newFiles.push({
              id: Math.random().toString(36).substr(2, 9),
              file: fileObj,
              status: 'pending',
              progress: 0
            })
          }
        }
      } else {
        newFiles.push({
          id: Math.random().toString(36).substr(2, 9),
          file: f,
          status: 'pending',
          progress: 0
        })
      }
    }

    setQueue(prev => [...prev, ...newFiles])
    setMessage('')
    if (inputRef.current) inputRef.current.value = ''
  }

  // Effect to process the queue with concurrency limit
  useEffect(() => {
    if (!isProcessing) return

    const CONCURRENCY = 3
    const availableSlots = CONCURRENCY - activeCount

    if (availableSlots > 0 && pendingCount > 0) {
      const toStart = queue.filter(q => q.status === 'pending').slice(0, availableSlots)
      toStart.forEach(fileNode => {
        startProcessingFile(fileNode.id, fileNode.file)
      })
    }

    if (activeCount === 0 && pendingCount === 0 && queue.length > 0) {
      setIsProcessing(false)
      setMessage(`Đã hoàn tất quá trình xử lý. Thành công: ${doneCount}/${totalCount}.`)
    }
  }, [queue, isProcessing, activeCount, pendingCount, doneCount, totalCount])

  const startProcessingFile = async (id: string, file: File) => {
    const abortController = new AbortController()

    setQueue(prev => prev.map(q => q.id === id ? { ...q, status: 'uploading', progress: 5, abortController } : q))

    // Fake progress animation
    const progressInterval = setInterval(() => {
      setQueue(prev => prev.map(q => {
        if (q.id === id && (q.status === 'uploading' || q.status === 'processing')) {
          const inc = q.progress < 90 ? Math.random() * 8 + 2 : 0
          return { ...q, progress: Math.min(90, q.progress + inc), status: 'processing' }
        }
        return q
      }))
    }, 600)

    try {
      const result = await uploadAndProcess(file, abortController.signal)
      clearInterval(progressInterval)

      setQueue(prev => prev.map(q => q.id === id ? {
        ...q,
        status: result.status === 'error' ? 'error' : 'done',
        progress: 100,
        result,
      } : q))

      window.dispatchEvent(new CustomEvent('refresh-documents'))
    } catch (error) {
      const err = error as Error
      clearInterval(progressInterval)
      if (err.name === 'AbortError' || err.message?.toLowerCase().includes('aborted')) {
        // It's a cancellation, do nothing as status is updated by cancelFile
      } else {
        setQueue(prev => prev.map(q => q.id === id ? { ...q, status: 'error', progress: 0, error: err.message || 'Lỗi không xác định' } : q))
      }
    }
  }

  const cancelFile = (id: string) => {
    const node = queue.find(q => q.id === id)
    if (node?.abortController) {
      node.abortController.abort()
    }
    setQueue(prev => prev.map(q => q.id === id ? { ...q, status: 'cancelled', progress: 0, error: 'Đã hủy' } : q))
  }

  const retryFile = (id: string) => {
    setQueue(prev => prev.map(q => q.id === id ? { ...q, status: 'pending', progress: 0, error: undefined, result: undefined } : q))
    setIsProcessing(true)
  }

  const handleRunAll = () => {
    setIsProcessing(true)
    setMessage('Hệ thống đang phân tích …')
  }

  const handleCommit = async () => {
    setCommitting(true)
    try {
      await commitAll()
      setMessage('Đã lưu toàn bộ hồ sơ thành công vào storage hệ thống.')
      window.dispatchEvent(new CustomEvent('refresh-documents'))
      reset()
      setOpen(false)
    } catch (error) {
      const err = error as Error
      setMessage(err.message || 'Lưu thất bại.')
    } finally {
      setCommitting(false)
    }
  }

  const removeFile = (id: string) => {
    cancelFile(id) // Ensure abort if running
    setQueue(prev => prev.filter(q => q.id !== id))
  }

  return (
    <Modal open={open} onClose={handleClose} title="Tải tài liệu để xử lý" maxWidth="max-w-6xl">
      <div className="space-y-5">

        {/* Drop zone */}
        <label
          htmlFor="file-upload-dialog"
          className="border-2 border-dashed border-zinc-200 rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:bg-zinc-50 transition-colors"
        >
          <div className="p-3 bg-zinc-100 rounded-full">
            <Upload className="h-5 w-5 text-zinc-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-800">Thêm file hoặc kéo thả</p>
            <p className="text-xs text-zinc-400 mt-0.5">Hỗ trợ PDF, PNG, JPG, ZIP</p>
          </div>
          <input
            id="file-upload-dialog"
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.zip"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {/* Global Stats */}
        {queue.length > 0 && (
          <div className="flex bg-zinc-50 border rounded-lg overflow-hidden divide-x divide-zinc-200">
            <div className="px-4 py-2 flex-1 text-center">
              <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Tổng cộng</div>
              <div className="text-lg font-bold text-zinc-800">{totalCount}</div>
            </div>
            <div className="px-4 py-2 flex-1 text-center">
              <div className="text-xs text-blue-500 font-medium uppercase tracking-wider">Đang chạy</div>
              <div className="text-lg font-bold text-blue-600">{activeCount}</div>
            </div>
            <div className="px-4 py-2 flex-1 text-center">
              <div className="text-xs text-emerald-500 font-medium uppercase tracking-wider">Hoàn tất</div>
              <div className="text-lg font-bold text-emerald-600">{doneCount}</div>
            </div>
            <div className="px-4 py-2 flex-1 text-center">
              <div className="text-xs text-red-500 font-medium uppercase tracking-wider">Lỗi/Hủy</div>
              <div className="text-lg font-bold text-red-600">{errorCount + queue.filter(q => q.status === 'cancelled').length}</div>
            </div>
          </div>
        )}

        {message && (
          <Toast message={message} type={totalCount === doneCount && totalCount > 0 ? 'success' : isRunning ? 'info' : 'error'} />
        )}

        {/* Process Queue Visualizer */}
        {queue.length > 0 && (
          <div className="border border-zinc-200 rounded-xl overflow-hidden max-h-[40vh] overflow-y-auto bg-zinc-50 flex flex-col hide-scrollbar">
            {queue.map(q => (
              <div key={q.id} className="group relative border-b last:border-b-0 border-zinc-200 bg-white hover:bg-zinc-50 transition-colors p-4 pr-16 flex items-center justify-between gap-4">
                {/* Progress background bar purely visual overlay */}
                {(q.status === 'uploading' || q.status === 'processing' || q.status === 'done') && (
                  <div className="absolute inset-y-0 left-0 bg-blue-50/50 transition-all duration-300 pointer-events-none" style={{ width: `${q.progress}%` }} />
                )}

                {/* Left Side: Icon & Title */}
                <div className="flex items-center gap-3 relative z-10 flex-1 min-w-0">
                  <div className="shrink-0">
                    {q.status === 'done' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> :
                      q.status === 'error' ? <AlertCircle className="h-5 w-5 text-red-500" /> :
                        q.status === 'cancelled' ? <Ban className="h-5 w-5 text-zinc-400" /> :
                          (q.status === 'processing' || q.status === 'uploading') ? <Spinner className="h-5 w-5 text-blue-500" /> :
                            <FileText className="h-5 w-5 text-zinc-400" />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate" title={q.file.name}>{q.file.name}</p>
                    <div className="text-xs mt-0.5 truncate text-zinc-500 flex items-center gap-1.5">
                      {q.status === 'pending' && <span>Đang chờ...</span>}
                      {q.status === 'uploading' && <span>Đang đẩy lên server... {Math.round(q.progress)}%</span>}
                      {q.status === 'processing' && <span>Đang phân tích... {Math.round(q.progress)}%</span>}
                      {q.status === 'done' && q.result && (
                        <span className="text-emerald-600 font-medium">Hợp lệ: {q.result.person_name ?? 'Không rõ'} — {q.result.doc_type}</span>
                      )}
                      {q.status === 'error' && <span className="text-red-600">{q.error}</span>}
                      {q.status === 'cancelled' && <span>Đã ngừng xử lý</span>}
                    </div>
                  </div>
                </div>

                {/* Right Side: Actions */}
                <div className="absolute right-4 shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white/80 group-hover:bg-zinc-50/80 p-1 rounded-lg backdrop-blur-sm">
                  {(q.status === 'uploading' || q.status === 'processing') && (
                    <button onClick={() => cancelFile(q.id)} className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-zinc-200/50 rounded-md transition-colors" title="Dừng">
                      <Ban className="h-4 w-4" />
                    </button>
                  )}
                  {(q.status === 'error' || q.status === 'cancelled' || q.status === 'pending') && (
                    <>
                      {q.status !== 'pending' && (
                        <button onClick={() => retryFile(q.id)} className="p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-zinc-200/50 rounded-md transition-colors" title="Thử lại">
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => removeFile(q.id)} className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-zinc-200/50 rounded-md transition-colors" title="Xóa khỏi danh sách">
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 justify-end pt-4 border-t border-zinc-100">
          {queue.length > 0 && (
            <>
              <Button onClick={handleRunAll} disabled={pendingCount === 0 || isRunning} className="px-6 py-2" variant="outline">
                <Play className="h-4 w-4 mr-2" /> Bắt đầu xử lý
              </Button>
              <Button
                onClick={handleCommit}
                disabled={doneCount === 0 || isRunning || committing}
                className="px-6 py-2"
              >
                {committing ? <><Spinner className="mr-2 h-4 w-4" /> Đang lưu...</> : 'Lưu kết quả (Commit)'}
              </Button>
            </>
          )}
          <Button onClick={handleClose} variant="ghost">Đóng</Button>
        </div>

      </div>
    </Modal>
  )
}
