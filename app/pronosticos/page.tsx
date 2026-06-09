'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Match {
  id: number
  match_date: string
  group_name: string
  team_home: string
  team_away: string
  status: string
}

type PredMap = Record<number, { home: string; away: string }>

function formatFecha(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

export default function PronosticosPage() {
  const router = useRouter()
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [nombreParticipante, setNombreParticipante] = useState('')
  const [matches, setMatches] = useState<Match[]>([])
  const [preds, setPreds] = useState<PredMap>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [ahora, setAhora] = useState(() => new Date())

  useEffect(() => {
    async function init() {
      const id = localStorage.getItem('participante_id')
      const nombre = localStorage.getItem('participante_nombre') ?? ''
      if (!id) {
        router.push('/registro')
        return
      }
      setParticipantId(id)
      setNombreParticipante(nombre)
      await load(id)
    }

    async function load(id: string) {
      const [matchesRes, predsRes] = await Promise.all([
        fetch('/api/partidos'),
        fetch(`/api/pronosticos?participant_id=${id}`),
      ])
      const matchesData: Match[] = await matchesRes.json()
      const predsData: Array<{ match_id: number; predicted_home: number; predicted_away: number }> = await predsRes.json()

      setMatches(matchesData)
      setAhora(new Date())

      const predMap: PredMap = {}
      for (const m of matchesData) {
        predMap[m.id] = { home: '', away: '' }
      }
      for (const p of (predsData ?? [])) {
        predMap[p.match_id] = { home: String(p.predicted_home), away: String(p.predicted_away) }
      }
      setPreds(predMap)
      setLoading(false)
    }

    init()
  }, [router])

  function esBloqueado(match: Match) {
    return match.status === 'finished' || ahora >= new Date(match.match_date)
  }

  function handleChange(matchId: number, side: 'home' | 'away', value: string) {
    if (value !== '' && (isNaN(Number(value)) || Number(value) < 0 || Number(value) > 20)) return
    setPreds(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], [side]: value },
    }))
  }

  function completados() {
    return matches.filter(m => {
      const p = preds[m.id]
      return p && p.home !== '' && p.away !== ''
    }).length
  }

  const partidosBloqueados = matches.filter(esBloqueado).length
  const todoBloqueado = matches.length > 0 && partidosBloqueados === matches.length

  async function handleSubmit() {
    const vacios = matches.filter(m => {
      if (esBloqueado(m)) return false // ignorar los ya bloqueados
      const p = preds[m.id]
      return !p || p.home === '' || p.away === ''
    })
    if (vacios.length > 0) {
      setError(`Falta completar ${vacios.length} partido${vacios.length > 1 ? 's' : ''}.`)
      return
    }

    setSaving(true)
    setError('')

    const predictions = matches.map(m => ({
      match_id: m.id,
      predicted_home: Number(preds[m.id].home),
      predicted_away: Number(preds[m.id].away),
    }))

    const res = await fetch('/api/pronosticos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant_id: participantId, predictions }),
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
        <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        Los partidos todavía no fueron cargados. Volvé más tarde.
      </div>
    )
  }

  const grupos = new Map<string, Match[]>()
  for (const m of matches) {
    if (!grupos.has(m.group_name)) grupos.set(m.group_name, [])
    grupos.get(m.group_name)!.push(m)
  }
  const sortedGrupos = Array.from(grupos.entries()).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Mis Pronósticos</h1>
          <p className="text-gray-400 text-sm">
            Hola <strong className="text-white">{nombreParticipante}</strong>.
            {todoBloqueado
              ? ' El torneo ya empezó, tus pronósticos están bloqueados.'
              : partidosBloqueados > 0
              ? ` ${partidosBloqueados} partido${partidosBloqueados > 1 ? 's' : ''} bloqueado${partidosBloqueados > 1 ? 's' : ''}, el resto todavía podés editarlo.`
              : ' Completá los 72 partidos y guardá.'
            }
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-400">{completados()}/72</div>
          <div className="text-xs text-gray-500">completados</div>
        </div>
      </div>

      {/* Banner todo cerrado */}
      {todoBloqueado && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/25 rounded-xl flex items-start gap-3">
          <span className="text-2xl">🔒</span>
          <div>
            <p className="text-red-300 font-medium">Pronósticos cerrados</p>
            <p className="text-red-300/60 text-sm mt-0.5">
              Todos los partidos ya empezaron. Solo podés consultar tus pronósticos.
            </p>
          </div>
        </div>
      )}

      {/* Banner parcialmente cerrado */}
      {!todoBloqueado && partidosBloqueados > 0 && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <p className="text-yellow-300 text-sm">
            <strong>{partidosBloqueados} partido{partidosBloqueados > 1 ? 's' : ''}</strong> ya empezaron y no se pueden modificar. Los demás todavía están abiertos.
          </p>
        </div>
      )}

      {/* Banner guardado */}
      {saved && !cerrado && (
        <div className="mb-6 p-4 bg-green-500/15 border border-green-500/30 rounded-xl text-green-300 font-medium">
          ✅ Pronósticos guardados correctamente. Podés editarlos hasta que empiece el primer partido.
        </div>
      )}

      <div className="flex flex-col gap-8">
        {sortedGrupos.map(([grupo, partidos]) => (
          <div key={grupo} className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-4">
              Grupo {grupo}
            </h2>
            <div className="flex flex-col gap-3">
              {partidos.map(m => {
                const p = preds[m.id] ?? { home: '', away: '' }
                const bloqueado = esBloqueado(m)
                return (
                  <div key={m.id} className={`flex items-center gap-3 ${bloqueado ? 'opacity-60' : ''}`}>
                    <span className="text-gray-300 text-sm flex-1 text-right truncate">{m.team_home}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        className="score-input"
                        value={p.home}
                        onChange={e => handleChange(m.id, 'home', e.target.value)}
                        disabled={bloqueado}
                        placeholder="—"
                      />
                      <span className="text-gray-500 font-bold">:</span>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        className="score-input"
                        value={p.away}
                        onChange={e => handleChange(m.id, 'away', e.target.value)}
                        disabled={bloqueado}
                        placeholder="—"
                      />
                    </div>
                    <span className="text-gray-300 text-sm flex-1 truncate">{m.team_away}</span>
                    <span className="text-gray-600 text-xs hidden sm:block w-28 text-right shrink-0">
                      {formatFecha(m.match_date)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Barra inferior — solo si no todo está cerrado */}
      {!todoBloqueado && (
        <div className="sticky bottom-6 mt-8">
          <div className="bg-[#0a0f1e]/90 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex items-center gap-4 max-w-lg mx-auto shadow-2xl">
            <div className="text-sm text-gray-400 flex-1">
              {(() => {
                const editables = matches.filter(m => !esBloqueado(m))
                const completadosEditables = editables.filter(m => {
                  const p = preds[m.id]
                  return p && p.home !== '' && p.away !== ''
                }).length
                return editables.length === completadosEditables
                  ? <span className="text-green-400">✓ Todos los partidos completados</span>
                  : <span className="text-yellow-400">{editables.length - completadosEditables} partidos sin completar</span>
              })()}
            </div>
            {error && <span className="text-red-400 text-xs">{error}</span>}
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-2.5 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold rounded-xl transition-colors shrink-0"
            >
              {saving ? 'Guardando...' : 'Guardar pronósticos'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
