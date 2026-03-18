import type {
  CommitPersonResponse,
  CommitAllResponse,
  MatchFacesResponse,
  OutputListResponse,
  ProcessDocumentsResponse,
  UploadResponse,
} from '@/types'

const BASE = '/api/v1'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 15000)
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
  return request<ProcessDocumentsResponse>('/documents/process', { method: 'POST' })
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

export async function commitFiles(person: string, files: string[], targetPerson?: string): Promise<any> {
  return request(`/documents/output/${encodeURIComponent(person)}/commit_files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, target_person: targetPerson })
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

export async function listEmployees(q?: string): Promise<{ employees: any[] }> {
  const params = q ? `?q=${encodeURIComponent(q)}` : ''
  return request(`/employees${params}`)
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
  return request<MatchFacesResponse>('/faces/match', { method: 'POST' })
}

// ── File preview URL ─────────────────────────────────────────────────────────

export function filePreviewUrl(person: string, filename: string): string {
  return `/api/v1/documents/output/${encodeURIComponent(person)}/${encodeURIComponent(filename)}`
}

export function downloadPersonUrl(person: string): string {
  return `/api/v1/documents/output/${encodeURIComponent(person)}/download`
}

// ── Persons (Main Storage) ───────────────────────────────────────────────────

export async function listPersons(): Promise<OutputListResponse> {
  return request<OutputListResponse>('/persons')
}

export async function deletePersonDataFile(person: string, filename: string): Promise<void> {
  await request(`/persons/${encodeURIComponent(person)}/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  })
}

export async function deletePersonData(person: string): Promise<void> {
  await request(`/persons/${encodeURIComponent(person)}`, {
    method: 'DELETE',
  })
}

export async function renamePersonDataFile(person: string, filename: string, newName: string): Promise<void> {
  await request(`/persons/${encodeURIComponent(person)}/${encodeURIComponent(filename)}`, {
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
