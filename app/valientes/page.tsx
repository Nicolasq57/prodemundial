'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface KnockoutMatch {
  id: number
  match_date: string
  group_name: string
  team_home: string
  team_away: string
  flag_home: string
  flag_away: string
  score_home: number | null
  score_away: number | null
  status: string
}

type PredMap = Record<number, { home: string; away: string }>

const ROUNDS = [
  { stage: 'LAST_32', label: '16avos de Final' },
  { stage: 'LAST_16', label: '8vos de Final' },
  { stage: 'QUARTER_FINALS', label: 'Cuartos de Final' },
  { stage: 'SEMI_FINALS', label: 'Semifinales' },
  { stage: 'THIRD_PLACE', label: 'Tercer Puesto' },
  { stage: 'FINAL', label: 'Final' },
]

function formatFecha(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

function TeamFlag({ url, name }: { url: string; name: string }) {
  if (!url) return <span className="text-gray-500 text-xs">🏳</span>
  return <img src={url} alt={name} className="w-5 h-5 object-contain" />
}

export default function ValientesPage() {
  const router = useRouter()
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [nombreParticipante, setNombreParticipante] = useState('')
  const [matches, setMatches] = useState<KnockoutMatch[]>([])
  const [preds, setPreds] = useState<PredMap>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [ahora, setAhora] = useState(() => new Date())

  const fetchData = useCallback(async (id: string) => {
    const res = await fetch(`/api/valientes?participant_id=${id}`)
    if (!res.ok) return
    const { matches: m, predictions: p } = await res.json()

    setAhora(new Date())
    setMatches(m)

    const predMap: PredMap = {}
    for (const match of m) {
      predMap[match.id] = { home: '', away: '' }
    }
    for (const pred of (p ?? [])) {
      predMap[pred.match_id] = {
        home: String(pred.predicted_home),
        away: String(pred.predicted_away),
      }
    }
    setPreds(prev => {
      // Preserve any unsaved changes the user may have typed
      const merged: PredMap = { ...predMap }
      for (const id in prev) {
        if (prev[id].home !== '' || prev[id].away !== '') {
          merged[id] = prev[id]
        }
      }
      return merged
    })
    setLoading(false)
  }, [])

  const syncKnockout = useCallback(async (id: string) => {
    setSyncing(true)
    await fetch('/api/sync-knockout', { method: 'POST' })
    await fetchData(id)
    setLastSync(new Date())
    setSyncing(false)
  }, [fetchData])

  useEffect(() => {
    const id = localStorage.getItem('participante_id')
    const nombre = localStorage.getItem('participante_nombre') ?? ''
    if (!id) {
      router.push('/registro')
      return
    }
    setParticipantId(id)
    setNombreParticipante(nombre)
    fetchData(id)
    syncKnockout(id)

    const interval = setInterval(() => syncKnockout(id), 2 * 60 * 1000)

    const channel = supabase
      .channel('valientes-matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => fetchData(id))
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [router, fetchData, syncKnockout])

  function esBloqueado(match: KnockoutMatch) {
    return match.status === 'finished' || ahora >= new Date(match.match_date)
  }

  function handleChange(matchId: number, side: 'home' | 'away', value: string) {
    if (value !== '' && (isNaN(Number(value)) || Number(value) < 0 || Number(value) > 20)) return
    setPreds(prev => ({ ...prev, [matchId]: { ...prev[matchId], [side]: value } }))
    setSaved(false)
  }

  async function handleSave() {
    if (!participantId) return
    const openPreds = matches
      .filter(m => !esBloqueado(m))
      .filter(m => {
        const p = preds[m.id]
        return p && p.home !== '' && p.away !== ''
      })
      .map(m => ({
        match_id: m.id,
        predicted_home: Number(preds[m.id].home),
        predicted_away: Number(preds[m.id].away),
      }))

    if (openPreds.length === 0) {
      setError('No hay pronósticos para guardar.')
      return
    }

    setSaving(true)
    setError('')

    const res = await fetch('/api/pronosticos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant_id: participantId, predictions: openPreds }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Error al guardar')
      setSaving(false)
      return
    }

    setSaved(true)
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Solo para Valientes 🔥</h1>
        <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-10 text-center text-gray-400">
          <p className="text-2xl mb-3">⏳</p>
          <p className="font-medium text-white">Los cruces todavía no están definidos.</p>
          <p className="text-sm mt-1">Volvé cuando termine la fase de grupos.</p>
        </div>
      </div>
    )
  }

  const openCount = matches.filter(m => !esBloqueado(m)).length
  const completedOpen = matches.filter(m => {
    if (esBloqueado(m)) return false
    const p = preds[m.id]
    return p && p.home !== '' && p.away !== ''
  }).length

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Solo para Valientes 🔥</h1>
          <p className="text-gray-400 text-sm">
            Hola <strong className="text-white">{nombreParticipante}</strong>.
            Pronósticos de la fase eliminatoria · a 90 minutos.
          </p>
        </div>
        <button
          onClick={() => participantId && syncKnockout(participantId)}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <span className={syncing ? 'animate-spin' : ''}>↻</span>
          {syncing ? 'Actualizando...' : 'Actualizar cruces'}
          {lastSync && (
            <span className="text-gray-500 text-xs">
              {lastSync.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </button>
      </div>

      {saved && (
        <div className="mb-6 p-4 bg-green-500/15 border border-green-500/30 rounded-xl text-green-300 font-medium">
          ✅ Pronósticos guardados.
        </div>
      )}

      {/* Rondas */}
      <div className="flex flex-col gap-8">
        {ROUNDS.map(({ stage, label }) => {
          const roundMatches = matches.filter(m => m.group_name === stage)
          if (roundMatches.length === 0) return null

          return (
            <div key={stage}>
              <h2 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-3">
                {label}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {roundMatches.map(m => {
                  const p = preds[m.id] ?? { home: '', away: '' }
                  const bloqueado = esBloqueado(m)
                  const indefinido = !m.team_home || !m.team_away || m.team_home === 'Por definir' || m.team_away === 'Por definir'

                  return (
                    <div
                      key={m.id}
                      className={`bg-white/5 border rounded-2xl p-4 transition-opacity ${bloqueado ? 'border-white/5 opacity-70' : 'border-white/10'}`}
                    >
                      {/* Fecha y estado */}
                      <div className="flex items-center justify-between mb-3 text-xs text-gray-500">
                        <span>{formatFecha(m.match_date)}</span>
                        {bloqueado && !m.score_home !== null ? (
                          <span className="text-red-400/70">🔒 cerrado</span>
                        ) : m.status === 'finished' ? null : (
                          <span className="text-green-400/70">abierto</span>
                        )}
                      </div>

                      {/* Equipos y predicción */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 justify-end">
                          <span className={`text-sm font-medium ${indefinido ? 'text-gray-500 italic' : 'text-gray-200'}`}>
                            {m.team_home}
                          </span>
                          <TeamFlag url={m.flag_home} name={m.team_home} />
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number" min="0" max="20"
                            className="score-input"
                            value={p.home}
                            onChange={e => handleChange(m.id, 'home', e.target.value)}
                            disabled={bloqueado || indefinido}
                            placeholder="—"
                          />
                          <span className="text-gray-500 font-bold text-xs">:</span>
                          <input
                            type="number" min="0" max="20"
                            className="score-input"
                            value={p.away}
                            onChange={e => handleChange(m.id, 'away', e.target.value)}
                            disabled={bloqueado || indefinido}
                            placeholder="—"
                          />
                        </div>

                        <div className="flex-1 flex items-center gap-2">
                          <TeamFlag url={m.flag_away} name={m.team_away} />
                          <span className={`text-sm font-medium ${indefinido ? 'text-gray-500 italic' : 'text-gray-200'}`}>
                            {m.team_away}
                          </span>
                        </div>
                      </div>

                      {/* Resultado real */}
                      {m.status === 'finished' && m.score_home !== null && (
                        <div className="mt-3 pt-3 border-t border-white/10 text-center text-sm">
                          <span className="text-gray-400">Resultado: </span>
                          <span className="text-white font-bold">{m.score_home} - {m.score_away}</span>
                          {p.home !== '' && p.away !== '' && (() => {
                            const ph = Number(p.home), pa = Number(p.away)
                            if (ph === m.score_home && pa === m.score_away) {
                              return <span className="ml-2 text-green-400 text-xs font-bold">+3 exacto ⭐</span>
                            }
                            const realSign = Math.sign(m.score_home - m.score_away!)
                            const predSign = Math.sign(ph - pa)
                            if (realSign === predSign) {
                              return <span className="ml-2 text-blue-400 text-xs font-bold">+1 resultado ✓</span>
                            }
                            return <span className="ml-2 text-red-400/70 text-xs">✗</span>
                          })()}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Barra inferior de guardado */}
      {openCount > 0 && (
        <div className="sticky bottom-6 mt-8">
          <div className="bg-[#0a0f1e]/90 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex items-center gap-4 max-w-lg mx-auto shadow-2xl">
            <div className="text-sm flex-1">
              {completedOpen < openCount
                ? <span className="text-yellow-400">{openCount - completedOpen} partidos sin completar</span>
                : <span className="text-green-400">✓ Todos completados</span>
              }
            </div>
            {error && <span className="text-red-400 text-xs">{error}</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shrink-0"
            >
              {saving ? 'Guardando...' : 'Guardar pronósticos'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
