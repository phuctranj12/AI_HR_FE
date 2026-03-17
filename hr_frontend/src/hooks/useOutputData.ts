import { useCallback, useEffect, useState } from 'react'
import { listOutput } from '@/api/client'
import type { PersonFolder } from '@/types'

interface UseOutputDataReturn {
  persons: PersonFolder[]
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useOutputData(): UseOutputDataReturn {
  const [persons, setPersons] = useState<PersonFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    setError(null)
    listOutput()
      .then(res => setPersons(res.persons))
      .catch(err => setError(err instanceof Error ? err.message : 'Unknown error'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { persons, loading, error, refresh }
}
