import { useState, useEffect } from 'react'
import { Plus, Trash2, Printer, Search, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { toast } from 'react-hot-toast'
import { useConfirm } from '@/hooks/useConfirm'

export interface TreeNode {
  id: string
  title: string
  employee_id: number | null
  employee_name: string | null
  children: TreeNode[]
}

interface ProjectTreeProps {
  treeData: any
  onChange: (data: any) => void
  employees: any[]
  onLoadEmployees: () => Promise<void>
}

export default function ProjectTree({ treeData, onChange, employees, onLoadEmployees }: ProjectTreeProps) {
  const confirm = useConfirm()
  const [tree, setTree] = useState<TreeNode>({
    id: 'root', title: 'Project Manager', employee_id: null, employee_name: null, children: []
  })
  const [search, setSearch] = useState('')

  useEffect(() => {
    onLoadEmployees()
    if (treeData) setTree(treeData)
  }, [treeData])

  const notifyChange = (newTree: TreeNode) => {
    setTree(newTree)
    onChange(newTree)
  }

  const updateNode = (node: TreeNode, targetId: string, updater: (n: TreeNode) => void): boolean => {
    if (node.id === targetId) {
      updater(node)
      return true
    }
    for (const child of node.children) {
      if (updateNode(child, targetId, updater)) return true
    }
    return false
  }

  const removeChildNode = (node: TreeNode, targetId: string): boolean => {
    const idx = node.children.findIndex(c => c.id === targetId)
    if (idx !== -1) {
      node.children.splice(idx, 1)
      return true
    }
    for (const child of node.children) {
      if (removeChildNode(child, targetId)) return true
    }
    return false
  }

  const handleDrop = (nodeId: string, empId: number, empName: string) => {
    const newTree = JSON.parse(JSON.stringify(tree))
    updateNode(newTree, nodeId, n => {
      n.employee_id = empId
      n.employee_name = empName
    })
    notifyChange(newTree)
  }

  const handleAddChild = (nodeId: string) => {
    const title = prompt('Nhập tên vị trí mới (VD: Tech Lead, Developer):')
    if (!title || !title.trim()) return
    const newTree = JSON.parse(JSON.stringify(tree))
    updateNode(newTree, nodeId, n => {
      n.children.push({
        id: Math.random().toString(36).substring(2, 9),
        title: title.trim(),
        employee_id: null,
        employee_name: null,
        children: []
      })
    })
    notifyChange(newTree)
  }

  const handleRemoveNode = async (nodeId: string) => {
    if (nodeId === 'root') {
      toast.error('Không thể xóa Project Manager gốc.')
      return
    }
    const ok = await confirm('Bạn có chắc muốn xóa nhánh này và tất cả cấp dưới?', { variant: 'destructive', confirmText: 'Xóa nhánh' })
    if (!ok) return
    const newTree = JSON.parse(JSON.stringify(tree))
    removeChildNode(newTree, nodeId)
    notifyChange(newTree)
    toast.success('Đã xóa nhánh thành công.')
  }

  const handleClearEmp = (nodeId: string) => {
    const newTree = JSON.parse(JSON.stringify(tree))
    updateNode(newTree, nodeId, n => {
      n.employee_id = null
      n.employee_name = null
    })
    notifyChange(newTree)
  }

  const renderTree = (node: TreeNode) => (
    <li key={node.id}>
      <div 
        className="inline-block border-2 border-zinc-200 bg-white rounded-lg p-3 w-48 text-center shadow-sm hover:border-zinc-300 transition-colors relative group"
        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-zinc-900', 'bg-zinc-50') }}
        onDragLeave={e => { e.currentTarget.classList.remove('border-zinc-900', 'bg-zinc-50') }}
        onDrop={e => {
          e.currentTarget.classList.remove('border-zinc-900', 'bg-zinc-50')
          const eid = e.dataTransfer.getData('empId')
          const ename = e.dataTransfer.getData('empName')
          if (eid) handleDrop(node.id, Number(eid), ename)
        }}
      >
        <div className="font-semibold text-zinc-900 mb-2 truncate text-sm" title={node.title}>{node.title}</div>
        
        {node.employee_id ? (
          <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-2 py-1.5 text-xs flex justify-between items-center group/emp">
            <span className="truncate" title={node.employee_name || ''}>{node.employee_name}</span>
            <button onClick={() => handleClearEmp(node.id)} className="opacity-0 group-hover/emp:opacity-100 hover:text-emerald-900 ml-1">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="text-zinc-400 text-[11px] py-1 border border-dashed rounded bg-zinc-50">
            Kéo thả nhân sự vào đây
          </div>
        )}

        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 w-max">
          <button onClick={() => handleAddChild(node.id)} className="bg-zinc-900 text-white rounded-full p-1 shadow hover:bg-zinc-800" title="Thêm nhánh bên dưới">
            <Plus className="w-3 h-3" />
          </button>
          {node.id !== 'root' && (
            <button onClick={() => handleRemoveNode(node.id)} className="bg-red-100 text-red-600 rounded-full p-1 shadow hover:bg-red-200 hover:text-red-700" title="Xóa nhánh tổ chức">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      
      {node.children.length > 0 && (
        <ul>
          {node.children.map(child => renderTree(child))}
        </ul>
      )}
    </li>
  )

  return (
    <div className="flex bg-white rounded-xl border border-zinc-200 overflow-hidden h-[600px]">
      <div className="w-64 border-r bg-zinc-50 flex flex-col no-print shrink-0">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-zinc-900 mb-2">Danh sách nhân sự</h3>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
            <input 
              value={search} onChange={e => setSearch(e.target.value)} 
              placeholder="Tìm theo tên..." 
              className="w-full text-sm pl-8 pr-3 py-2 rounded-md border border-zinc-200 focus:outline-none focus:border-zinc-400 bg-white" 
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {employees.filter(e => e.full_name.toLowerCase().includes(search.toLowerCase())).map(e => (
            <div 
              key={e.id}
              draggable
              onDragStart={ev => {
                ev.dataTransfer.setData('empId', String(e.id))
                ev.dataTransfer.setData('empName', e.full_name)
              }}
              className="px-3 py-2 text-sm bg-white border border-zinc-200 rounded-md cursor-grab active:cursor-grabbing hover:border-zinc-400 hover:shadow-sm transition-colors"
            >
              <div className="font-medium text-zinc-900">{e.full_name}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{e.department || 'Không có phòng ban'}</div>
            </div>
          ))}
          {employees.length === 0 && <div className="text-zinc-400 text-xs text-center pt-4">Không có dữ liệu</div>}
        </div>
      </div>
      
      <div className="flex-1 relative overflow-auto bg-zinc-50/50 p-8 flex flex-col items-center">
        <div className="absolute top-4 right-4 no-print flex gap-2 z-10">
          <Button variant="outline" onClick={() => window.print()} className="bg-white">
            <Printer className="mr-2 h-4 w-4" /> Xuất PDF (Print)
          </Button>
        </div>
        
        <div className="print-area min-w-max p-4 pt-10 pb-20">
          <style dangerouslySetInnerHTML={{__html: `
            .org-tree * { margin: 0; padding: 0; }
            .org-tree ul {
                padding-top: 20px; position: relative;
                transition: all 0.5s;
                display: flex; justify-content: center;
            }
            .org-tree li {
                float: left; text-align: center;
                list-style-type: none;
                position: relative;
                padding: 20px 8px 0 8px;
                transition: all 0.5s;
            }
            .org-tree li::before, .org-tree li::after{
                content: '';
                position: absolute; top: 0; right: 50%;
                border-top: 2px solid #e4e4e7; /* zinc-200 */
                width: 50%; height: 20px;
            }
            .org-tree li::after{
                right: auto; left: 50%;
                border-left: 2px solid #e4e4e7;
            }
            .org-tree li:only-child::after, .org-tree li:only-child::before {
                display: none;
            }
            .org-tree li:only-child{ padding-top: 0;}
            .org-tree li:first-child::before, .org-tree li:last-child::after{
                border: 0 none;
            }
            .org-tree li:last-child::before{
                border-right: 2px solid #e4e4e7;
                border-radius: 0 4px 0 0;
            }
            .org-tree li:first-child::after{
                border-radius: 4px 0 0 0;
            }
            .org-tree ul ul::before{
                content: '';
                position: absolute; top: 0; left: 50%;
                border-left: 2px solid #e4e4e7;
                width: 0; height: 20px;
                transform: translateX(-50%);
            }
            
            /* Print Layout adjustments */
            @media print {
              body * { visibility: hidden; }
              .print-area, .print-area * { visibility: visible; }
              .print-area { 
                 position: absolute; left: 0; top: 0; 
                 width: 100%; display: flex; justify-content: center; 
              }
              .no-print { display: none !important; }
              @page { size: landscape; margin: 10mm; }
            }
          `}} />
          <div className="org-tree">
            <ul>
              {renderTree(tree)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
