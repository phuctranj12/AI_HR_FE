import type {
  CommitPersonResponse,
  CommitAllResponse,
  MatchFacesResponse,
  OutputListResponse,
  ProcessDocumentsResponse,
  UploadResponse,
  FileProcessResult
} from '@/types'

const BASE = '/api/v1'

interface CustomRequestInit extends RequestInit {
  timeout?: number
}

async function request<T>(path: string, init?: CustomRequestInit): Promise<T> {
  const controller = new AbortController()
  const ms = init?.timeout ?? 15000
  const timeout = window.setTimeout(() => controller.abort(), ms)
  const res = await fetch(`${BASE}${path}`, { ...init, signal: controller.signal })
  window.clearTimeout(timeout)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.detail ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ── Documents ────────────────────────────────────────────────────────────────

export async function uploadFiles(files: File[]): Promise<UploadResponse> {
  const form = new FormData()
  files.forEach(f => form.append('files', f))
  return request<UploadResponse>('/documents/upload', { method: 'POST', body: form })
}

export async function processDocuments(): Promise<ProcessDocumentsResponse> {
  return request<ProcessDocumentsResponse>('/documents/process', { method: 'POST', timeout: 600000 })
}

export async function uploadAndProcess(file: File, signal?: AbortSignal): Promise<FileProcessResult> {
  const form = new FormData()
  form.append('file', file)
  return request<FileProcessResult>('/documents/upload-and-process', {
    method: 'POST',
    body: form,
    signal,
    timeout: 300000 // 5 minutes max per file
  })
}

export async function listOutput(): Promise<OutputListResponse> {
  return request<OutputListResponse>('/documents/output')
}

export async function clearInput(): Promise<void> {
  await request('/documents/input', { method: 'DELETE' })
}

export async function clearOutput(): Promise<void> {
  await request('/documents/output', { method: 'DELETE' })
}

export async function deleteFile(person: string, filename: string): Promise<void> {
  await request(`/documents/output/${encodeURIComponent(person)}/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  })
}

export async function deletePerson(person: string): Promise<void> {
  await request(`/documents/output/${encodeURIComponent(person)}`, {
    method: 'DELETE',
  })
}

export async function renameFile(person: string, filename: string, newName: string): Promise<void> {
  await request(`/documents/output/${encodeURIComponent(person)}/${encodeURIComponent(filename)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_name: newName }),
  })
}

export async function commitPerson(person: string): Promise<CommitPersonResponse> {
  return request<CommitPersonResponse>(`/documents/output/${encodeURIComponent(person)}/commit`, {
    method: 'POST',
  })
}

export async function commitFiles(person: string, target_person: string, files: string[]): Promise<any> {
  return request(`/documents/output/${person}/commit_files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, target_person })
  })
}

export async function commitBatch(persons: string[]): Promise<any> {
  return request('/documents/output/batch-commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persons }),
    timeout: 300000
  })
}

export async function deleteOutputPerson(person: string): Promise<void> {
  return request(`/documents/output/${person}`, { method: 'DELETE' })
}

export async function deleteOutputBatch(persons: string[]): Promise<any> {
  return request('/documents/output/batch', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persons })
  })
}

export async function commitAll(): Promise<CommitAllResponse> {
  return request<CommitAllResponse>('/documents/commit', { method: 'POST' })
}

// ── Projects ────────────────────────────────────────────────────────────────

export async function listProjects(): Promise<{ projects: any[] }> {
  return request('/projects')
}

export async function createProject(payload: any): Promise<any> {
  return request('/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function listProjectMembers(projectId: number): Promise<{ members: any[] }> {
  return request(`/projects/${projectId}/members`)
}

export async function addProjectMember(projectId: number, payload: any): Promise<any> {
  return request(`/projects/${projectId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function removeProjectMember(projectId: number, employeeId: number): Promise<any> {
  return request(`/projects/${projectId}/members/${employeeId}`, { method: 'DELETE' })
}

export async function addProjectMembersBatch(projectId: number, employees: any[]): Promise<any> {
  return request(`/projects/${projectId}/members/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employees }),
  })
}

export async function getProjectTree(projectId: number): Promise<{ tree_data: any }> {
  return request(`/projects/${projectId}/tree`)
}

export async function updateProjectTree(projectId: number, treeData: any): Promise<any> {
  return request(`/projects/${projectId}/tree`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tree_data: treeData }),
  })
}

export async function updateProject(projectId: number, payload: any): Promise<any> {
  return request(`/projects/${projectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function deleteProject(projectId: number): Promise<any> {
  return request(`/projects/${projectId}`, { method: 'DELETE' })
}

export async function listProjectRequirements(projectId: number): Promise<{ requirements: any[] }> {
  return request(`/projects/${projectId}/requirements`)
}

export async function setProjectRequirements(projectId: number, documentTypeIds: number[]): Promise<any> {
  return request(`/projects/${projectId}/requirements`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_type_ids: documentTypeIds }),
  })
}

// ── Employees ───────────────────────────────────────────────────────────────

export async function listEmployees(q?: string, terminated?: boolean, page: number = 1, size: number = 50): Promise<{ total: number, employees: any[] }> {
  const params = new URLSearchParams()
  if (q) params.append('q', q)
  if (terminated) params.append('terminated', 'true')
  params.append('page', page.toString())
  params.append('size', size.toString())
  const qs = params.toString()
  return request(`/employees${qs ? '?' + qs : ''}`)
}

export async function createEmployee(payload: any): Promise<any> {
  return request('/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function updateEmployee(id: number, payload: any): Promise<any> {
  return request(`/employees/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function deleteEmployee(id: number): Promise<any> {
  return request(`/employees/${id}`, { method: 'DELETE' })
}

// ── Catalog ────────────────────────────────────────────────────────────────

export async function listDocumentTypes(): Promise<{ document_types: any[] }> {
  return request('/catalog/document-types')
}

export async function createDocumentType(type_name: string): Promise<any> {
  return request('/catalog/document-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type_name }),
  })
}

export async function deleteDocumentType(id: number): Promise<any> {
  return request(`/catalog/document-types/${id}`, { method: 'DELETE' })
}

// ── Faces ────────────────────────────────────────────────────────────────────

export async function matchFaces(): Promise<MatchFacesResponse> {
  return request<MatchFacesResponse>('/faces/match', { method: 'POST', timeout: 600000 })
}

// ── File preview URL ─────────────────────────────────────────────────────────

export function filePreviewUrl(person: string, filename: string): string {
  return `/api/v1/documents/output/${encodeURIComponent(person)}/${encodeURIComponent(filename)}`
}

export function downloadPersonUrl(person: string): string {
  return `/api/v1/documents/output/${encodeURIComponent(person)}/download`
}

// ── Persons (Main Storage) ───────────────────────────────────────────────────

export async function listPersons(terminated?: boolean): Promise<OutputListResponse> {
  const query = terminated ? '?terminated=true' : ''
  return request<OutputListResponse>(`/persons${query}`)
}

export async function deletePersonDataFile(person: string, filename: string): Promise<void> {
  await request(`/persons/${encodeURIComponent(person)}/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  })
}

export async function deletePersonData(person: string): Promise<void> {
  return request(`/persons/${person}`, { method: 'DELETE', timeout: 60000 })
}

export async function deletePersonDataBatch(persons: string[]): Promise<any> {
  return request(`/persons/batch`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persons })
  })
}

export async function renamePersonDataFile(person: string, filename: string, newName: string): Promise<void> {
  await request(`/persons/${encodeURIComponent(person)}/${encodeURIComponent(filename)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_name: newName }),
  })
}

export async function renamePersonData(person: string, newName: string): Promise<void> {
  await request(`/persons/${encodeURIComponent(person)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_name: newName }),
  })
}

export async function renamePerson(person: string, newName: string): Promise<void> {
  await request(`/documents/output/${encodeURIComponent(person)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_name: newName }),
  })
}

export function personPreviewUrl(person: string, filename: string): string {
  return `/api/v1/persons/${encodeURIComponent(person)}/${encodeURIComponent(filename)}`
}

export function downloadPersonDataUrl(person: string): string {
  return `/api/v1/persons/${encodeURIComponent(person)}/download`
}

export async function downloadPersonsBatch(persons: string[]): Promise<void> {
  const res = await fetch(`${BASE}/persons/download-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persons }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.detail ?? `HTTP ${res.status}`)
  }
  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = persons.length > 0 ? 'Ho_so_nhan_su_batch.zip' : 'Toan_bo_ho_so.zip'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

// ── Notifications ────────────────────────────────────────────────────────────

export async function deletePersonsBatch(persons: string[]): Promise<void> {
  await request(`/persons/batch`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persons }),
  })
}

export interface MissingDocument {
  employee_id: number
  employee_code: string | null
  full_name: string
  folder_path: string
  missing_docs: string[]
}

export interface ExpiredDocument {
  employee_id: number
  employee_code: string | null
  full_name: string
  folder_path: string
  document_id: number
  document_name: string
  doc_type: string
  end_date: string
}

export async function getMissingDocuments(): Promise<MissingDocument[]> {
  return request('/notifications/missing-documents')
}

export async function getExpiredDocuments(days: number = 30): Promise<ExpiredDocument[]> {
  return request(`/notifications/expired-documents?days=${days}`)
}

export async function updateDocumentFile(docId: number, file: File): Promise<any> {
  const form = new FormData()
  form.append('file', file)
  return request(`/documents/${docId}/file`, { 
    method: 'PATCH', 
    body: form 
  })
}

// ── Search Folders ──────────────────────────────────────────────────────────

export async function searchFolders(params: { name?: string, cccd?: string, mnv?: string }): Promise<OutputListResponse> {
  return request('/persons/search-folders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
}
