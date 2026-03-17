import { useCallback, useEffect, useState } from 'react'
import { listPersons } from '@/api/client'
import type { PersonFolder } from '@/types'

interface UsePersonDataReturn {
  persons: PersonFolder[]
  loading: boolean
  error: string | null
  refresh: () => void
}

export function usePersonData(): UsePersonDataReturn {
  const [persons, setPersons] = useState<PersonFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    setError(null)
    listPersons()
      .then(res => setPersons(res.persons))
      .catch(err => setError(err instanceof Error ? err.message : 'Unknown error'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { persons, loading, error, refresh }
}
