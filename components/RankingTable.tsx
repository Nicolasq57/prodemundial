'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { RankingEntry } from '@/lib/database.types'

export default function RankingTable() {
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchRanking = useCallback(async () => {
    const res = await fetch('/api/ranking')
    if (!res.ok) {
      setError('Error al cargar el ranking')
      setLoading(false)
      return
    }
    const data: RankingEntry[] = await res.json()
    setRanking(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRanking()

    const channel = supabase
      .channel('ranking-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, fetchRanking)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchRanking])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return <div className="text-center py-12 text-red-400">{error}</div>
  }

  if (ranking.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        Todavía no hay participantes registrados.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10 text-left text-sm text-gray-400">
            <th className="pb-3 pr-4 w-8">#</th>
            <th className="pb-3 pr-4">Participante</th>
            <th className="pb-3 pr-4 text-center">Pts</th>
            <th className="pb-3 pr-4 text-center hidden sm:table-cell">Exactos</th>
            <th className="pb-3 text-center hidden sm:table-cell">Resultado</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((entry, idx) => (
            <tr
              key={entry.id}
              className={`border-b border-white/5 transition-colors ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-gray-300'}`}
            >
              <td className="py-3 pr-4 font-bold text-lg">
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
              </td>
              <td className="py-3 pr-4 font-medium">{entry.name}</td>
              <td className="py-3 pr-4 text-center font-bold text-xl">{entry.total_points}</td>
              <td className="py-3 pr-4 text-center hidden sm:table-cell text-green-400">
                {entry.exact_results}
              </td>
              <td className="py-3 text-center hidden sm:table-cell text-blue-400">
                {entry.correct_outcomes}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-500 mt-4">
        Pts: exacto=3 · resultado correcto=1 &nbsp;|&nbsp; Exactos: score exacto &nbsp;|&nbsp; Resultado: ganador/empate correcto
      </p>
    </div>
  )
}
