import { useEffect, useMemo, useState } from 'react'
import { Plus, Users, Calendar, ArrowLeft, Trash2, Search, Pencil, Settings2 } from 'lucide-react'
import { Button, Badge, Modal } from '@/components/ui'
import {
  addProjectMembersBatch,
  createDocumentType,
  createProject as createProjectReq,
  deleteDocumentType,
  deleteProject,
  getProjectTree,
  listDocumentTypes,
  listEmployees,
  listProjectMembers,
  listProjectRequirements,
  listProjects,
  removeProjectMember,
  setProjectRequirements,
  updateProject,
  updateProjectTree,
} from '@/api/client'
import ProjectTree from '@/components/ProjectTree'
import AddProjectMemberModal from '@/components/AddProjectMemberModal'
import { toast } from 'react-hot-toast'
import { useConfirm } from '@/hooks/useConfirm'

interface Project {
  id: number
  project_name: string
  start_date?: string | null
  end_date?: string | null
  location?: string | null
  function?: string | null
  scale?: string | null
  status_id?: number | null
}

interface MemberRow {
  employee_id: number
  project_id: number
  role?: string | null
  start_date: string
  end_date?: string | null
  full_name: string
  employee_code?: string | null
  department?: string | null
  position?: string | null
}

interface DocumentTypeRow {
  id: number
  type_name: string
}

const today = new Date()

function projectStatusInfo(endDate?: string | null) {
  if (!endDate) return { label: 'Chưa có hạn', cls: 'bg-zinc-100 text-zinc-500 border-zinc-200' }
  const end = new Date(endDate)
  if (end < today) return { label: 'Đã kết thúc', cls: 'bg-zinc-100 text-zinc-500 border-zinc-200' }
  const days = (end.getTime() - today.getTime()) / 86_400_000
  if (days < 30) return { label: 'Sắp kết thúc', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
  return { label: 'Đang thực hiện', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
}

export default function ProjectsPage() {
  const confirm = useConfirm()
  const [projects, setProjects] = useState<Project[]>([])
  const [selected, setSelected] = useState<Project | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [reqOpen, setReqOpen] = useState(false)
  const [docTypeOpen, setDocTypeOpen] = useState(false)
  const [newProj, setNewProj] = useState({ project_name: '', start_date: '', end_date: '' })
  const [members, setMembers] = useState<MemberRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [docTypes, setDocTypes] = useState<DocumentTypeRow[]>([])
  const [reqIds, setReqIds] = useState<number[]>([])
  const [newDocType, setNewDocType] = useState('')
  const [editForm, setEditForm] = useState({
    project_name: '',
    location: '',
    function: '',
    scale: '',
    start_date: '',
    end_date: '',
  })

  // New state
  const [activeTab, setActiveTab] = useState<'list' | 'tree'>('list')
  const [allEmployees, setAllEmployees] = useState<any[]>([])
  const [treeData, setTreeData] = useState<any>(null)

  const refreshProjects = async () => {
    try {
      setError(null)
      const res = await listProjects()
      setProjects(res.projects as Project[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch')
    }
  }

  const refreshMembers = async (projectId: number) => {
    try {
      setError(null)
      const res = await listProjectMembers(projectId)
      setMembers(res.members as MemberRow[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch')
    }
  }

  const refreshDocTypes = async () => {
    try {
      const res = await listDocumentTypes()
      setDocTypes(res.document_types as DocumentTypeRow[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch')
    }
  }

  const refreshRequirements = async (projectId: number) => {
    try {
      const res = await listProjectRequirements(projectId)
      const ids = (res.requirements ?? []).map((r: any) => Number(r.document_type_id)).filter((x: any) => Number.isFinite(x))
      setReqIds(ids)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch')
    }
  }

  useEffect(() => { refreshProjects() }, [])
  useEffect(() => { if (selected) refreshMembers(selected.id) }, [selected?.id])
  useEffect(() => { refreshDocTypes() }, [])

  const createProject = () => {
    if (!newProj.project_name) return
    if (newProj.start_date && newProj.end_date) {
      const start = new Date(newProj.start_date)
      const end = new Date(newProj.end_date)

      if (start > end) {
        toast.error('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc')
        return
      }
    }
    createProjectApi()
  }

  const createProjectApi = async () => {
    await createProjectReq({ ...newProj, start_date: newProj.start_date || null, end_date: newProj.end_date || null })
    setNewProj({ project_name: '', start_date: '', end_date: '' })
    setNewOpen(false)
    await refreshProjects()
  }

  const removeMember = async (employeeId: number) => {
    if (!selected) return
    await removeProjectMember(selected.id, employeeId)
    await refreshMembers(selected.id)
  }

  const openAddMemberModal = () => {
    setAddOpen(true)
  }

  const handleAddMembers = async (employeeIds: number[]) => {
    if (!selected || employeeIds.length === 0) return
    try {
      const todayStr = new Date().toISOString().slice(0, 10)
      await addProjectMembersBatch(
        selected.id,
        employeeIds.map(id => ({ employee_id: id, start_date: todayStr }))
      )
      setAddOpen(false)
      await refreshMembers(selected.id)
      toast.success('Thêm thành viên thành công.')
    } catch (e) {
      toast.error('Thêm thất bại: ' + (e instanceof Error ? e.message : ''))
    }
  }

  const fetchTree = async (projectId: number) => {
    try {
      const res = await getProjectTree(projectId)
      setTreeData(res.tree_data)
      // Make sure employees are loaded for the sidebar
      if (allEmployees.length === 0) {
        const empRes = await listEmployees()
        setAllEmployees(empRes.employees)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const saveTree = async (data: any) => {
    if (!selected) return
    try {
      await updateProjectTree(selected.id, data)
      setTreeData(data)
      toast.success('Đã lưu sơ đồ tổ chức.')
    } catch (e) {
      toast.error('Lưu thất bại: ' + (e instanceof Error ? e.message : ''))
    }
  }

  useEffect(() => {
    if (selected && activeTab === 'tree') {
      fetchTree(selected.id)
    }
  }, [selected?.id, activeTab])

  const filteredMembers = useMemo(() => members, [members])

  // ── Team view ────────────────────────────────────────────────────────────────
  if (selected) {
    const liveProject = projects.find(p => p.id === selected.id) ?? selected

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setSelected(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">{liveProject.project_name}</h2>
            <div className="flex items-center gap-4 text-xs text-zinc-400 mt-1">
              {liveProject.start_date && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{liveProject.start_date}</span>}
              {liveProject.end_date && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{liveProject.end_date}</span>}
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditForm({
                  project_name: liveProject.project_name ?? '',
                  location: liveProject.location ?? '',
                  function: liveProject.function ?? '',
                  scale: liveProject.scale ?? '',
                  start_date: (liveProject.start_date ?? '') as string,
                  end_date: (liveProject.end_date ?? '') as string,
                })
                setEditOpen(true)
              }}
            >
              <Pencil className="mr-2 h-4 w-4" /> Sửa dự án
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                await refreshDocTypes()
                await refreshRequirements(liveProject.id)
                setReqOpen(true)
              }}
            >
              <Settings2 className="mr-2 h-4 w-4" /> Giấy tờ yêu cầu
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                const ok = await confirm(`Xóa dự án "${liveProject.project_name}"?`, { variant: 'destructive', confirmText: 'Xóa' })
                if (!ok) return
                try {
                  await deleteProject(liveProject.id)
                  setSelected(null)
                  toast.success('Đã xóa dự án.')
                  refreshProjects()
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Xóa thất bại.')
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Xóa
            </Button>
          </div>
        </div>

        <div className="flex space-x-4 border-b">
          <button
            className={`pb-2 text-sm font-medium border-b-2 ${activeTab === 'list' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
            onClick={() => setActiveTab('list')}
          >
            Danh sách nhân sự
          </button>
          <button
            className={`pb-2 text-sm font-medium border-b-2 ${activeTab === 'tree' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
            onClick={() => setActiveTab('tree')}
          >
            Sơ đồ tổ chức
          </button>
        </div>

        {activeTab === 'list' && (
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <p className="font-semibold text-zinc-900">Thành viên dự án</p>
                <p className="text-xs text-zinc-400 mt-0.5">{members.length} thành viên</p>
              </div>
              <Button onClick={openAddMemberModal}><Plus className="mr-2 h-4 w-4" />Thêm thành viên</Button>
            </div>

            {filteredMembers.length === 0 ? (
              <div className="py-14 text-center text-zinc-400">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Chưa có thành viên nào.</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-b">
                  <tr>
                    <th className="px-6 py-3">Tên</th>
                    <th className="px-6 py-3">Phòng ban</th>
                    <th className="px-6 py-3">Chức vụ</th>
                    <th className="px-6 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map(e => (
                    <tr key={e.employee_id} className="border-b last:border-0 hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-zinc-900">{e.full_name}</td>
                      <td className="px-6 py-4 text-zinc-500">{e.department ?? '—'}</td>
                      <td className="px-6 py-4"><Badge className="bg-zinc-100 text-zinc-600 border-zinc-200">{e.position ?? '—'}</Badge></td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => removeMember(e.employee_id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'tree' && (
          <ProjectTree
            treeData={treeData}
            onChange={saveTree}
            employees={allEmployees}
            onLoadEmployees={async () => {
              if (allEmployees.length === 0) {
                const res = await listEmployees();
                setAllEmployees(res.employees);
              }
            }}
          />
        )}

        {/* Add member modal */}
        <AddProjectMemberModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          projectName={liveProject.project_name}
          onAdd={handleAddMembers}
        />

        {/* Edit project modal */}
        <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Chỉnh sửa dự án" maxWidth="max-w-2xl">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">Tên dự án</label>
              <input className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
                value={editForm.project_name}
                onChange={e => setEditForm(f => ({ ...f, project_name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">Địa điểm</label>
                <input className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
                  value={editForm.location}
                  onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">Quy mô</label>
                <input className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
                  value={editForm.scale}
                  onChange={e => setEditForm(f => ({ ...f, scale: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">Chức năng dự án</label>
              <input className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
                value={editForm.function}
                onChange={e => setEditForm(f => ({ ...f, function: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">Ngày bắt đầu</label>
                <input type="date" className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
                  value={editForm.start_date}
                  onChange={e => setEditForm(f => ({ ...f, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">Ngày kết thúc</label>
                <input type="date" className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
                  value={editForm.end_date}
                  min={editForm.start_date}
                  onChange={e => setEditForm(f => ({ ...f, end_date: e.target.value }))}
                />
              </div>
            </div>
            <Button
              onClick={async () => {
                try {
                  await updateProject(liveProject.id, {
                    project_name: editForm.project_name || null,
                    location: editForm.location || null,
                    function: editForm.function || null,
                    scale: editForm.scale || null,
                    start_date: editForm.start_date || null,
                    end_date: editForm.end_date || null,
                  })
                  setEditOpen(false)
                  await refreshProjects()
                  const updated = (await listProjects()).projects.find((p: any) => p.id === liveProject.id) as Project | undefined
                  if (updated) setSelected(updated)
                  toast.success('Cập nhật thành công.')
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Cập nhật thất bại.')
                }
              }}
              disabled={!editForm.project_name.trim()}
              className="w-full"
            >
              Lưu thay đổi
            </Button>
          </div>
        </Modal>

        {/* Requirements modal */}
        <Modal open={reqOpen} onClose={() => setReqOpen(false)} title="Giấy tờ yêu cầu (nhà thầu)" maxWidth="max-w-3xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-zinc-500">
                Tick chọn các loại giấy tờ bắt buộc cho dự án. Người dùng sẽ dựa vào danh sách này để hoàn thiện hồ sơ.
              </p>
              <Button variant="outline" onClick={() => { setDocTypeOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Quản lý loại giấy tờ
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 border-b text-xs text-zinc-500 uppercase">
                  <tr>
                    <th className="px-4 py-2 w-10" />
                    <th className="px-4 py-2 text-left">Loại giấy tờ</th>
                  </tr>
                </thead>
                <tbody>
                  {docTypes.map(dt => (
                    <tr key={dt.id} className="border-b last:border-0 hover:bg-zinc-50">
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={reqIds.includes(dt.id)}
                          onChange={() => setReqIds(prev => prev.includes(dt.id) ? prev.filter(x => x !== dt.id) : [...prev, dt.id])}
                          className="accent-zinc-900"
                        />
                      </td>
                      <td className="px-4 py-2">{dt.type_name}</td>
                    </tr>
                  ))}
                  {docTypes.length === 0 && (
                    <tr><td colSpan={2} className="px-4 py-8 text-center text-zinc-400 text-sm">Chưa có loại giấy tờ nào.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <Button
              onClick={async () => {
                try {
                  await setProjectRequirements(liveProject.id, reqIds)
                  setReqOpen(false)
                  toast.success('Đã lưu giấy tờ yêu cầu cho dự án.')
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Lưu thất bại.')
                }
              }}
              className="w-full"
            >
              Lưu giấy tờ yêu cầu
            </Button>
          </div>
        </Modal>

        {/* Document types management modal */}
        <Modal open={docTypeOpen} onClose={() => setDocTypeOpen(false)} title="Quản lý loại giấy tờ" maxWidth="max-w-2xl">
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                value={newDocType}
                onChange={e => setNewDocType(e.target.value)}
                placeholder="VD: Hop_dong_lao_dong"
                className="h-10 flex-1 rounded-md border border-zinc-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              <Button
                onClick={async () => {
                  const name = newDocType.trim()
                  if (!name) return
                  try {
                    await createDocumentType(name)
                    setNewDocType('')
                    await refreshDocTypes()
                    toast.success('Đã thêm loại giấy tờ.')
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Tạo thất bại.')
                  }
                }}
              >
                Thêm
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 border-b text-xs text-zinc-500 uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left">Loại giấy tờ</th>
                    <th className="px-4 py-2 w-24 text-right">Xóa</th>
                  </tr>
                </thead>
                <tbody>
                  {docTypes.map(dt => (
                    <tr key={dt.id} className="border-b last:border-0 hover:bg-zinc-50">
                      <td className="px-4 py-2">{dt.type_name}</td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={async () => {
                            const ok = await confirm(`Xóa loại giấy tờ "${dt.type_name}"?`, { variant: 'destructive', confirmText: 'Xóa' })
                            if (!ok) return
                            try {
                              await deleteDocumentType(dt.id)
                              await refreshDocTypes()
                              setReqIds(prev => prev.filter(x => x !== dt.id))
                              toast.success('Đã xóa loại giấy tờ.')
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : 'Xóa thất bại.')
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {docTypes.length === 0 && (
                    <tr><td colSpan={2} className="px-4 py-8 text-center text-zinc-400 text-sm">Chưa có dữ liệu.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <Button variant="outline" onClick={async () => { await refreshDocTypes(); setDocTypeOpen(false) }} className="w-full">
              Đóng
            </Button>
          </div>
        </Modal>
      </div>
    )
  }

  // ── Project grid ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Quản lý dự án</h2>
          <p className="text-zinc-500 text-sm mt-1">Quản lý dự án và phân công nhân sự.</p>
        </div>
        <Button onClick={() => setNewOpen(true)}><Plus className="mr-2 h-4 w-4" />Tạo dự án</Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map(p => {
          const si = projectStatusInfo(p.end_date)
          return (
            <div key={p.id} className="rounded-xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <div className="p-5 border-b flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-zinc-900 leading-snug">{p.project_name}</h3>
                  <Badge className={`shrink-0 ${si.cls}`}>{si.label}</Badge>
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2">{p.location || 'Không có mô tả.'}</p>
                <div className="mt-3 flex flex-col gap-1 text-xs text-zinc-400">
                  {p.start_date && <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Bắt đầu: {p.start_date}</span>}
                  {p.end_date && <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Kết thúc: {p.end_date}</span>}
                </div>
              </div>
              <div className="px-5 py-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm text-zinc-500">
                  <Users className="h-4 w-4 text-zinc-300" />
                  —
                </span>
                <Button variant="outline" size="sm" onClick={() => setSelected(p)}>Quản lý team</Button>
              </div>
            </div>
          )
        })}
        {projects.length === 0 && (
          <div className="col-span-full py-16 text-center text-zinc-400 border rounded-xl border-dashed text-sm">
            Chưa có dự án nào. Tạo một dự án để bắt đầu.
          </div>
        )}
      </div>

      {/* New project modal */}
      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="Tạo dự án mới">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700">Tên dự án</label>
            <input
              value={newProj.project_name}
              onChange={e => setNewProj(p => ({ ...p, project_name: e.target.value }))}
              placeholder="VD: Dự án ABC"
              className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(['start_date', 'end_date'] as const).map(key => (
              <div key={key} className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">
                  {key === 'start_date' ? 'Ngày bắt đầu' : 'Ngày kết thúc'}
                </label>
                <input
                  type="date"
                  value={newProj[key]}
                  onChange={e => setNewProj(p => ({ ...p, [key]: e.target.value }))}
                  className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
            ))}
          </div>
          <Button onClick={createProject} disabled={!newProj.project_name} className="w-full">Tạo dự án</Button>
        </div>
      </Modal>
    </div>
  )
}
