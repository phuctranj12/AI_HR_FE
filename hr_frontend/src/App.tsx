import { useState } from 'react'
import { Users, FolderTree } from 'lucide-react'
import DocumentsPage from '@/pages/DocumentsPage'
import ProjectsPage from '@/pages/ProjectsPage'
import EmployeesPage from '@/pages/EmployeesPage'
import TerminatedPersonsPage from '@/pages/TerminatedPersonsPage'

type Tab = 'documents' | 'employees' | 'projects' | 'terminated_persons'

const TABS: { id: Tab; label: string; Icon: typeof Users }[] = [
  { id: 'documents', label: 'Hồ sơ nhân sự', Icon: FolderTree },
  // { id: 'employees', label: 'Nhân sự (DB)', Icon: Users },
  { id: 'terminated_persons', label: 'DS Nghỉ việc', Icon: FolderTree },
  { id: 'projects', label: 'Quản lý dự án', Icon: Users },

]

export default function App() {
  const [active, setActive] = useState<Tab>('documents')

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 flex flex-col">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-16 items-center">
          <div className="flex items-center gap-2.5">
            <div className="bg-zinc-900 p-2 rounded-lg">
              <Users className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">HR Agent Workspace</span>
          </div>
          <nav className="flex gap-1">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${active === id
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ marginBottom: "20px" }}>
        {active === 'documents' && <DocumentsPage />}
        {active === 'employees' && <EmployeesPage />}
        {active === 'projects' && <ProjectsPage />}
        {active === 'terminated_persons' && <TerminatedPersonsPage />}
      </main>
    </div>
  )
}
