import { useEffect, useState } from 'react'
import { AlertCircle, Clock, Upload } from 'lucide-react'
import { Button, Modal, Spinner } from '@/components/ui'
import { 
  getMissingDocuments, 
  getExpiredDocuments, 
  updateDocumentFile,
  MissingDocument, 
  ExpiredDocument 
} from '@/api/client'
import { toast } from 'react-hot-toast'

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [missingDocs, setMissingDocs] = useState<MissingDocument[]>([])
  const [expiredDocs, setExpiredDocs] = useState<ExpiredDocument[]>([])
  const [activeTab, setActiveTab] = useState<'missing' | 'expired'>('missing')
  
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null)
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const [missingRes, expiredRes] = await Promise.all([
        getMissingDocuments(),
        getExpiredDocuments(30)
      ])
      setMissingDocs(missingRes)
      setExpiredDocs(expiredRes)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tải danh sách thông báo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleUpload = async () => {
    if (!selectedDocId || !fileToUpload) return
    
    setUploading(true)
    try {
      await updateDocumentFile(selectedDocId, fileToUpload)
      toast.success('Cập nhật tài liệu thành công!')
      setUploadOpen(false)
      setFileToUpload(null)
      refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Cập nhật tài liệu thất bại')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Thông báo</h2>
          <p className="text-zinc-500 text-sm mt-1">Quản lý hồ sơ thiếu và giấy tờ sắp hết hạn.</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-zinc-200">
        <button
          className={`pb-2 px-1 text-sm font-medium ${activeTab === 'missing' ? 'border-b-2 border-zinc-900 text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
          onClick={() => setActiveTab('missing')}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>Hồ sơ thiếu ({missingDocs.length})</span>
          </div>
        </button>
        <button
          className={`pb-2 px-1 text-sm font-medium ${activeTab === 'expired' ? 'border-b-2 border-zinc-900 text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
          onClick={() => setActiveTab('expired')}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Sắp / Đã hết hạn ({expiredDocs.length})</span>
          </div>
        </button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        {loading && <div className="flex items-center justify-center gap-2 py-16 text-zinc-400 text-sm"><Spinner /> Đang tải dữ liệu…</div>}
        {error && !loading && <div className="py-12 text-center text-red-500 text-sm">{error}</div>}

        {!loading && !error && activeTab === 'missing' && (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 uppercase tracking-wide bg-zinc-50 border-b">
              <tr>
                <th className="px-6 py-3 font-medium">Nhân sự</th>
                <th className="px-6 py-3 font-medium">Thư mục</th>
                <th className="px-6 py-3 font-medium">Thiếu giấy tờ</th>
              </tr>
            </thead>
            <tbody>
              {missingDocs.map(doc => (
                <tr key={doc.employee_id} className="border-b last:border-0 hover:bg-zinc-50">
                  <td className="px-6 py-4 font-medium text-zinc-900">
                    <div>{doc.full_name}</div>
                    <div className="text-xs text-zinc-500">{doc.employee_code ?? '—'}</div>
                  </td>
                  <td className="px-6 py-4 text-zinc-500">{doc.folder_path}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {doc.missing_docs.map(m => (
                        <span key={m} className="px-2 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-md border border-red-200">
                          {m}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {missingDocs.length === 0 && (
                <tr><td colSpan={3} className="px-6 py-12 text-center text-zinc-400 text-sm">Tuyệt vời, không có nhân sự nào thiếu giấy tờ bắt buộc.</td></tr>
              )}
            </tbody>
          </table>
        )}

        {!loading && !error && activeTab === 'expired' && (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 uppercase tracking-wide bg-zinc-50 border-b">
              <tr>
                <th className="px-6 py-3 font-medium">Nhân sự</th>
                <th className="px-6 py-3 font-medium">Tài liệu</th>
                <th className="px-6 py-3 font-medium">Ngày hết hạn</th>
                <th className="px-6 py-3 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {expiredDocs.map(doc => {
                const isPast = new Date(doc.end_date) < new Date();
                return (
                <tr key={doc.document_id} className="border-b last:border-0 hover:bg-zinc-50">
                  <td className="px-6 py-4 font-medium text-zinc-900">
                    <div>{doc.full_name}</div>
                    <div className="text-xs text-zinc-500">{doc.folder_path}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-zinc-700">{doc.document_name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-md border ${
                      isPast 
                        ? 'bg-red-50 text-red-700 border-red-200' 
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {doc.end_date} {isPast ? '(Đã hết hạn)' : '(Sắp hết)'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedDocId(doc.document_id)
                        setUploadOpen(true)
                      }}
                    >
                      <Upload className="w-4 h-4 mr-2" /> Cập nhật file
                    </Button>
                  </td>
                </tr>
              )})}
              {expiredDocs.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-400 text-sm">Không có tài liệu nào sắp hết hạn.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={uploadOpen}
        onClose={() => { if (!uploading) setUploadOpen(false) }}
        title="Cập nhật tài liệu mới"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">
            Tải lên bản cập nhật mới cho tài liệu này. Hệ thống sẽ trích xuất lại thông tin và thay thế file cũ.
          </p>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700">File tài liệu (PDF, JPG, PNG)</label>
            <input 
              type="file" 
              accept=".pdf,.jpg,.jpeg,.png"
              className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-zinc-50 file:text-zinc-700 hover:file:bg-zinc-100"
              onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setUploadOpen(false)} disabled={uploading}>Hủy</Button>
            <Button
              className="flex-1"
              disabled={uploading || !fileToUpload}
              onClick={handleUpload}
            >
              {uploading ? <><Spinner className="mr-2" />Đang xử lý…</> : 'Cập nhật'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
