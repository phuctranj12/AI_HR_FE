import { useState } from 'react'
import { matchFaces } from '@/api/client'
import { Button, Modal, Spinner, Toast } from '@/components/ui'
import type { FaceMatchResult } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onMatched: () => void
}

export default function FaceMatchDialog({ open, onClose, onMatched }: Props) {
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState('')
  const [results, setResults] = useState<FaceMatchResult[]>([])
  const [done, setDone] = useState(false)

  const handleClose = () => {
    if (running) return
    setMessage('')
    setResults([])
    setDone(false)
    onClose()
  }

  const handleRun = async () => {
    setRunning(true)
    setMessage('Đang xây dựng anchor từ CCCD và nhận diện khuôn mặt…')
    setResults([])
    setDone(false)

    try {
      const res = await matchFaces()
      setResults(res.results)
      setMessage(
        `Hoàn tất — ${res.anchors_built} anchor | ${res.photos_processed} ảnh xử lý.`
      )
      setDone(true)
      onMatched()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Đã xảy ra lỗi.')
      setDone(false)
    } finally {
      setRunning(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Matching ảnh thẻ bằng nhận diện khuôn mặt">
      <div className="space-y-4">
        <p className="text-sm text-zinc-500">
          Hệ thống sẽ lấy khuôn mặt từ <strong>CCCD.pdf</strong> của từng người làm anchor,
          sau đó so sánh với các ảnh thẻ trong thư mục <code className="bg-zinc-100 px-1 rounded text-xs">_unknown/</code>.
        </p>

        {message && (
          <Toast
            message={message}
            type={done ? 'success' : running ? 'info' : 'error'}
          />
        )}

        {results.length > 0 && (
          <div className="border rounded-lg overflow-hidden max-h-52 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50 border-b text-zinc-500 uppercase">
                <tr>
                  <th className="px-3 py-2">Ảnh</th>
                  <th className="px-3 py-2">Khớp với</th>
                  <th className="px-3 py-2">Khoảng cách</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-3 py-2 truncate max-w-[140px]">{r.photo_filename}</td>
                    <td className="px-3 py-2 font-medium">{r.matched_person ?? <span className="text-zinc-400">_unknown</span>}</td>
                    <td className="px-3 py-2 text-zinc-400">
                      {r.distance != null ? r.distance.toFixed(3) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Button onClick={handleRun} disabled={running} className="w-full">
          {running ? <><Spinner className="mr-2" /> Đang xử lý…</> : 'Bắt đầu nhận diện khuôn mặt'}
        </Button>
      </div>
    </Modal>
  )
}
