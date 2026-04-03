import { useEffect, useState } from 'react'
import { Search, X, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react'
import { Button, Modal } from '@/components/ui'
import { listEmployees } from '@/api/client'

interface Employee {
  id: number;
  full_name: string;
  department?: string | null;
}

interface AddProjectMemberModalProps {
  open: boolean;
  onClose: () => void;
  projectName: string;
  onAdd: (employeeIds: number[]) => Promise<void>;
}

export default function AddProjectMemberModal({ open, onClose, projectName, onAdd }: AddProjectMemberModalProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(15)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Map<number, Employee>>(new Map())
  const [submitting, setSubmitting] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1) // reset to first page on search
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!open) return
    const fetchEmps = async () => {
      setLoading(true)
      try {
        const res = await listEmployees(debouncedSearch, false, page, pageSize)
        setEmployees(res.employees)
        setTotal(res.total)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchEmps()
  }, [open, debouncedSearch, page, pageSize])

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setSearch('')
      setDebouncedSearch('')
      setPage(1)
      setSelected(new Map())
    }
  }, [open])

  const toggleSelect = (emp: Employee) => {
    const newMap = new Map(selected)
    if (newMap.has(emp.id)) {
      newMap.delete(emp.id)
    } else {
      newMap.set(emp.id, emp)
    }
    setSelected(newMap)
  }

  const toggleSelectAll = (checked: boolean) => {
    const newMap = new Map(selected)
    if (checked) {
      employees.forEach(e => newMap.set(e.id, e))
    } else {
      employees.forEach(e => newMap.delete(e.id))
    }
    setSelected(newMap)
  }

  const handleAdd = async () => {
    setSubmitting(true)
    try {
      await onAdd(Array.from(selected.keys()))
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const allOnPageSelected = employees.length > 0 && employees.every(e => selected.has(e.id))
  const totalPages = Math.ceil(total / pageSize)

  return (
    <Modal open={open} onClose={onClose} title={`Thêm thành viên dự án: ${projectName}`} maxWidth="max-w-4xl">
      {/* Search Bar */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Tìm theo tên..." 
          className="h-10 w-full rounded-md border border-zinc-200 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" 
        />
      </div>

      <div className="flex gap-4 h-[450px]">
        {/* Left Side: Employee List */}
        <div className="flex-[2] border rounded-xl overflow-hidden flex flex-col bg-white">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm shrink-0">
              <thead className="bg-zinc-50 border-b text-xs text-zinc-500 uppercase sticky top-0 z-10">
                <tr>
                  <th className="w-12 px-4 py-3 text-center">
                    <input 
                      type="checkbox"
                      className="accent-zinc-900 w-4 h-4 rounded cursor-pointer"
                      checked={allOnPageSelected}
                      onChange={e => toggleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Họ và tên</th>
                  <th className="px-4 py-3 text-left font-medium">Phòng ban</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-zinc-400">Đang tải dữ liệu...</td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-zinc-400">Không tìm thấy nhân viên.</td>
                  </tr>
                ) : (
                  employees.map(e => (
                    <tr 
                      key={e.id} 
                      className={`hover:bg-zinc-50 cursor-pointer transition-colors ${selected.has(e.id) ? 'bg-zinc-50' : ''}`}
                      onClick={() => toggleSelect(e)}
                    >
                      <td className="px-4 py-3 text-center" onClick={ev => ev.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="accent-zinc-900 w-4 h-4 rounded cursor-pointer" 
                          checked={selected.has(e.id)} 
                          onChange={() => toggleSelect(e)} 
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-900">{e.full_name}</td>
                      <td className="px-4 py-3 text-zinc-500">{e.department || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="border-t px-4 py-3 flex items-center justify-between bg-zinc-50">
            <div className="text-xs text-zinc-500">
              {total > 0 ? (
                <>Hiển thị <span className="font-medium text-zinc-900">{(page - 1) * pageSize + 1}</span> - <span className="font-medium text-zinc-900">{Math.min(page * pageSize, total)}</span> / <span className="font-medium text-zinc-900">{total}</span></>
              ) : '0 kết quả'}
            </div>
            <div className="flex gap-1.5 items-center">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                disabled={page <= 1} 
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-2 text-sm font-medium text-zinc-700">
                {page} / {Math.max(1, totalPages)}
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                disabled={page >= totalPages} 
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Side: Selected List */}
        <div className="flex-1 border rounded-xl bg-zinc-50 flex flex-col overflow-hidden min-w-[240px]">
          <div className="px-4 py-3 border-b bg-white flex items-center justify-between shadow-sm z-10">
            <h4 className="font-medium text-sm text-zinc-900 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-zinc-500" />
              Đã chọn
            </h4>
            <span className="bg-zinc-100 text-zinc-600 text-xs font-medium px-2 py-0.5 rounded-full">
              {selected.size}
            </span>
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-2 relative">
            {selected.size === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 text-sm p-6 text-center">
                Hãy tích chọn nhân viên ở danh sách bên trái.
              </div>
            ) : (
              Array.from(selected.values()).map(emp => (
                <div key={emp.id} className="flex items-center justify-between px-3 py-2 bg-white border border-zinc-200 shadow-sm rounded-lg group hover:border-zinc-300 transition-colors">
                  <div className="overflow-hidden pr-2">
                    <p className="text-sm font-medium text-zinc-900 truncate">{emp.full_name}</p>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">{emp.department || '—'}</p>
                  </div>
                  <button 
                    onClick={() => {
                      const newMap = new Map(selected)
                      newMap.delete(emp.id)
                      setSelected(newMap)
                    }}
                    className="text-zinc-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                    title="Xóa khỏi danh sách"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={submitting}>Hủy</Button>
        <Button onClick={handleAdd} disabled={selected.size === 0 || submitting}>
          {submitting ? 'Đang thêm...' : `Thêm ${selected.size} thành viên`}
        </Button>
      </div>
    </Modal>
  )
}
