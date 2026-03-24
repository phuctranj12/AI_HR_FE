import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Trash2, Pencil, X } from 'lucide-react'
import { Button, Modal, Spinner } from '@/components/ui'
import { createEmployee, deleteEmployee, listEmployees, updateEmployee } from '@/api/client'
import { toast } from 'react-hot-toast'
import { useConfirm } from '@/hooks/useConfirm'

interface EmployeeRow {
  id: number
  employee_code?: string | null
  full_name: string
  department?: string | null
  position?: string | null
  phone?: string | null
  email?: string | null
  folder_path?: string | null
}

export default function EmployeesPage() {
  const confirm = useConfirm()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [q, setQ] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    id: 0,
    full_name: '',
    employee_code: '',
    department: '',
    position: '',
    phone: '',
    email: '',
  })

  const refresh = async (query?: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await listEmployees(query)
      setEmployees(res.employees as EmployeeRow[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return employees
    return employees.filter(e =>
      e.full_name.toLowerCase().includes(needle) ||
      (e.employee_code ?? '').toLowerCase().includes(needle) ||
      (e.department ?? '').toLowerCase().includes(needle)
    )
  }, [employees, q])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Nhân sự</h2>
          <p className="text-zinc-500 text-sm mt-1">Danh sách nhân sự và thông tin cơ bản (theo DB).</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Thêm nhân sự
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Tìm theo tên / mã / bộ phận…"
          className="h-10 w-full rounded-md border border-zinc-200 bg-white pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 placeholder:text-zinc-400"
        />
        {q && (
          <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        {loading && <div className="flex items-center justify-center gap-2 py-16 text-zinc-400 text-sm"><Spinner /> Đang tải…</div>}
        {error && !loading && <div className="py-12 text-center text-red-500 text-sm">{error}</div>}

        {!loading && !error && (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 uppercase tracking-wide bg-zinc-50 border-b">
              <tr>
                <th className="px-6 py-3 font-medium">Họ tên</th>
                <th className="px-6 py-3 font-medium">Mã</th>
                <th className="px-6 py-3 font-medium">Bộ phận</th>
                <th className="px-6 py-3 font-medium">Chức vụ</th>
                <th className="px-6 py-3 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-zinc-900">{e.full_name}</td>
                  <td className="px-6 py-4 text-zinc-500">{e.employee_code ?? '—'}</td>
                  <td className="px-6 py-4 text-zinc-500">{e.department ?? '—'}</td>
                  <td className="px-6 py-4 text-zinc-500">{e.position ?? '—'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setForm({
                            id: e.id,
                            full_name: e.full_name ?? '',
                            employee_code: e.employee_code ?? '',
                            department: e.department ?? '',
                            position: e.position ?? '',
                            phone: e.phone ?? '',
                            email: e.email ?? '',
                          })
                          setEditOpen(true)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={async () => {
                          const ok = await confirm(`Xóa nhân sự "${e.full_name}"?`, { variant: 'destructive', confirmText: 'Xóa' })
                          if (!ok) return
                          try {
                            await deleteEmployee(e.id)
                            refresh()
                            toast.success('Đã xóa nhân sự.')
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : 'Xóa thất bại.')
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-400 text-sm">
                  Không có nhân sự nào.
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={createOpen}
        onClose={() => { if (!saving) setCreateOpen(false) }}
        title="Thêm nhân sự"
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700">Họ tên *</label>
            <input className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">Mã nhân viên</label>
              <input className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
                value={form.employee_code}
                onChange={e => setForm(f => ({ ...f, employee_code: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">Bộ phận</label>
              <input className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
                value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">Chức vụ</label>
              <input className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
                value={form.position}
                onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">SĐT</label>
              <input className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700">Email</label>
            <input className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>

          <Button
            disabled={saving || !form.full_name.trim()}
            onClick={async () => {
              setSaving(true)
              try {
                await createEmployee({
                  full_name: form.full_name.trim(),
                  employee_code: form.employee_code.trim() || null,
                  department: form.department.trim() || null,
                  position: form.position.trim() || null,
                  phone: form.phone.trim() || null,
                  email: form.email.trim() || null,
                })
                setCreateOpen(false)
                setForm({ id: 0, full_name: '', employee_code: '', department: '', position: '', phone: '', email: '' })
                refresh()
                toast.success('Thêm nhân sự thành công.')
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Tạo thất bại.')
              } finally {
                setSaving(false)
              }
            }}
            className="w-full"
          >
            {saving ? <><Spinner className="mr-2" />Đang lưu…</> : 'Tạo nhân sự'}
          </Button>
        </div>
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => { if (!saving) setEditOpen(false) }}
        title="Sửa nhân sự"
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700">Họ tên *</label>
            <input className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">Mã nhân viên</label>
              <input className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
                value={form.employee_code}
                onChange={e => setForm(f => ({ ...f, employee_code: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">Bộ phận</label>
              <input className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
                value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">Chức vụ</label>
              <input className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
                value={form.position}
                onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">SĐT</label>
              <input className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700">Email</label>
            <input className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setEditOpen(false)} disabled={saving}>Hủy</Button>
            <Button
              className="flex-1"
              disabled={saving || !form.full_name.trim()}
              onClick={async () => {
                setSaving(true)
                try {
                  await updateEmployee(form.id, {
                    full_name: form.full_name.trim(),
                    employee_code: form.employee_code.trim() || null,
                    department: form.department.trim() || null,
                    position: form.position.trim() || null,
                    phone: form.phone.trim() || null,
                    email: form.email.trim() || null,
                  })
                  setEditOpen(false)
                  refresh()
                  toast.success('Cập nhật thông tin thành công.')
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Cập nhật thất bại.')
                } finally {
                  setSaving(false)
                }
              }}
            >
              {saving ? <><Spinner className="mr-2" />Đang lưu…</> : 'Lưu thay đổi'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

