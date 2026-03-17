import type { PersonFolder, FolderStatusInfo } from '@/types'

const REQUIRED_DOCS = ['CCCD', 'Giay_kham_suc_khoe', 'Bang_dai_hoc']
const REQUIRED_LABELS: Record<string, string> = {
  CCCD: 'CCCD',
  Giay_kham_suc_khoe: 'Giấy khám sức khỏe',
  Bang_dai_hoc: 'Bằng cấp',
}

// Files use pattern: <DocType>[_N].<ext>  e.g. CCCD.pdf, Bang_dai_hoc_2.pdf
function hasDocType(files: string[], docType: string): boolean {
  return files.some(f => {
    const base = f.split('.')[0]                  // "CCCD_2" or "CCCD"
    const root = base.replace(/_\d+$/, '')        // strip trailing _N
    return root === docType
  })
}

export function getFolderStatus(folder: PersonFolder): FolderStatusInfo {
  const { files } = folder
  const issues: string[] = []

  // Missing docs
  const missing = REQUIRED_DOCS.filter(d => !hasDocType(files, d))
  if (missing.length > 0) {
    issues.push(`Thiếu: ${missing.map(d => REQUIRED_LABELS[d]).join(', ')}`)
  }

  const status = issues.length > 0 ? 'critical' : 'good'
  return { status, issues }
}

export function getLastUpdated(_folder: PersonFolder): string {
  // Without mtime from BE we just show "—"; could be extended later
  return '—'
}
