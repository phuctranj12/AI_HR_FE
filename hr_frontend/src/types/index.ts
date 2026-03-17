// ── Document types (matches BE DocType enum) ────────────────────────────────
export type DocType =
  | 'CCCD'
  | 'Bang_dai_hoc'
  | 'Giay_kham_suc_khoe'
  | 'Anh_the'
  | 'Ly_lich'
  | 'Khac'

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  CCCD: 'CCCD',
  Bang_dai_hoc: 'Bằng đại học',
  Giay_kham_suc_khoe: 'Giấy khám sức khỏe',
  Anh_the: 'Ảnh thẻ',
  Ly_lich: 'Lý lịch',
  Khac: 'Khác',
}

// ── Upload ───────────────────────────────────────────────────────────────────
export interface UploadResponse {
  saved: string[]
  rejected: string[]
}

// ── Process ──────────────────────────────────────────────────────────────────
export interface FileProcessResult {
  original_filename: string
  person_name: string | null
  doc_type: DocType
  destination: string
  status: 'ok' | 'error'
  error: string | null
}

export interface ProcessDocumentsResponse {
  total: number
  succeeded: number
  failed: number
  results: FileProcessResult[]
}

// ── Face match ───────────────────────────────────────────────────────────────
export interface FaceMatchResult {
  photo_filename: string
  matched_person: string | null
  distance: number | null
  destination: string
  status: 'ok' | 'error'
  error: string | null
}

export interface MatchFacesResponse {
  anchors_built: number
  photos_processed: number
  results: FaceMatchResult[]
}

// ── Output listing ────────────────────────────────────────────────────────────
export interface PersonFolder {
  name: string
  display_name?: string | null
  files: string[]
}

export interface OutputListResponse {
  persons: PersonFolder[]
}

// ── Commit (Save) ────────────────────────────────────────────────────────────
export interface CommitPersonResponse {
  person: string
  display_name?: string
  person_folder: string
  people_path: string
  moved: { from: string; to: string }[]
}

export interface CommitAllResponse {
  committed: CommitPersonResponse[]
  skipped: string[]
}

// ── UI helpers ────────────────────────────────────────────────────────────────
export type FolderStatus = 'good' | 'warning' | 'critical'

export interface FolderStatusInfo {
  status: FolderStatus
  issues: string[]
}
