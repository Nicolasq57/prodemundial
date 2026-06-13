'use client'

import { useEffect, useState, useCallback } from 'react'

interface Match {
  id: number
  match_date: string
  group_name: string
  team_home: string
  team_away: string
  score_home: number | null
  score_away: number | null
  status: string
}

function formatFecha(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

export default function PartidosPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const fetchMatches = useCallback(async () => {
    const res = await fetch('/api/partidos')
    const data: Match[] = await res.json()
    setMatches(data)
    setLoading(false)
  }, [])

  const syncResultados = useCallback(async () => {
    setSyncing(true)
    await fetch('/api/sync', { method: 'POST' })
    await fetchMatches()
    setLastSync(new Date())
    setSyncing(false)
  }, [fetchMatches])

  useEffect(() => {
    fetchMatches()
    syncResultados()

    // Auto-sync cada 2 minutos mientras la página está abierta
    const interval = setInterval(syncResultados, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchMatches, syncResultados])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-white mb-4">Partidos</h1>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-gray-400">
          Los partidos todavía no fueron cargados.
        </div>
      </div>
    )
  }

  const grupos = new Map<string, Match[]>()
  for (const match of matches) {
    if (!grupos.has(match.group_name)) grupos.set(match.group_name, [])
    grupos.get(match.group_name)!.push(match)
  }
  const sortedGrupos = Array.from(grupos.entries()).sort(([a], [b]) => a.localeCompare(b))

  const finalizados = matches.filter(m => m.status === 'finished').length

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Partidos</h1>
          <p className="text-gray-400 text-sm">
            {finalizados} de {matches.length} finalizados
            {lastSync && (
              <span className="text-gray-600">
                {' · '}actualizado {lastSync.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={syncResultados}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <span className={syncing ? 'animate-spin' : ''}>↻</span>
          {syncing ? 'Actualizando...' : 'Actualizar resultados'}
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {sortedGrupos.map(([grupo, partidos]) => (
          <div key={grupo} className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-4">
              Grupo {grupo}
            </h2>
            <div className="flex flex-col gap-3">
              {partidos.map(m => (
                <div key={m.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-gray-300 flex-1 text-right truncate">{m.team_home}</span>
                  <div className="flex items-center gap-1.5 shrink-0 min-w-[80px] justify-center">
                    {m.status === 'finished' ? (
                      <span className="font-bold text-white bg-white/10 rounded px-2 py-0.5 tabular-nums">
                        {m.score_home} - {m.score_away}
                      </span>
                    ) : (
                      <span className="text-gray-500 text-xs text-center">
                        {formatFecha(m.match_date)}
                      </span>
                    )}
                  </div>
                  <span className="text-gray-300 flex-1 truncate">{m.team_away}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
