'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface R32Match {
  id: number
  date: string
  home: string
  away: string
  flagHome: string
  flagAway: string
  scoreHome: number | null
  scoreAway: number | null
  status: string
}

type Picks = Record<string, string>

// Estructura del bracket: cada ronda toma los ganadores de la anterior
const ROUNDS = [
  { key: 'R32', count: 16, label: '16avos de Final' },
  { key: 'R16', count: 8, label: 'Octavos de Final' },
  { key: 'QF', count: 4, label: 'Cuartos de Final' },
  { key: 'SF', count: 2, label: 'Semifinales' },
  { key: 'FINAL', count: 1, label: 'Final' },
] as const

const PREV: Record<string, string> = { R16: 'R32', QF: 'R16', SF: 'QF', FINAL: 'SF' }

function indefinido(t: string) {
  return !t || t === 'Por definir'
}

export default function ValientesPage() {
  const router = useRouter()
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [r32, setR32] = useState<R32Match[]>([])
  const [picks, setPicks] = useState<Picks>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Competidores de una posición según las elecciones actuales
  const getCompetitors = useCallback((pos: string, p: Picks, base: R32Match[]): [string, string] => {
    const [key, nStr] = pos.split('-')
    const n = Number(nStr)
    if (key === 'R32') {
      const m = base[n - 1]
      return m ? [m.home, m.away] : ['', '']
    }
    if (key === 'THIRD') {
      const loser = (sf: string, qfA: string, qfB: string) => {
        const w = p[sf], a = p[qfA], b = p[qfB]
        if (!w || !a || !b) return ''
        return w === a ? b : a
      }
      return [loser('SF-1', 'QF-1', 'QF-2'), loser('SF-2', 'QF-3', 'QF-4')]
    }
    const prev = PREV[key]
    return [p[`${prev}-${2 * n - 1}`] || '', p[`${prev}-${2 * n}`] || '']
  }, [])

  // Limpia elecciones que dejaron de ser válidas cuando se cambia algo aguas arriba
  const normalize = useCallback((p: Picks, base: R32Match[]): Picks => {
    const next = { ...p }
    const order: string[] = []
    for (let i = 1; i <= 16; i++) order.push(`R32-${i}`)
    for (let i = 1; i <= 8; i++) order.push(`R16-${i}`)
    for (let i = 1; i <= 4; i++) order.push(`QF-${i}`)
    for (let i = 1; i <= 2; i++) order.push(`SF-${i}`)
    order.push('FINAL-1', 'THIRD-1')
    for (const pos of order) {
      const [a, b] = getCompetitors(pos, next, base)
      if (next[pos] && next[pos] !== a && next[pos] !== b) delete next[pos]
    }
    return next
  }, [getCompetitors])

  const fetchData = useCallback(async (id: string) => {
    const res = await fetch(`/api/bracket?participant_id=${id}`)
    if (!res.ok) { setLoading(false); return }
    const { r32: base, picks: saved } = await res.json()
    setR32(base)
    setPicks(prev => {
      // Si el usuario ya estaba editando, mantenemos sus cambios sobre lo guardado
      const merged = Object.keys(prev).length > 0 ? prev : (saved || {})
      return normalize(merged, base)
    })
    setLoading(false)
  }, [normalize])

  const syncCruces = useCallback(async (id: string) => {
    await fetch('/api/sync-knockout', { method: 'POST' })
    await fetchData(id)
  }, [fetchData])

  useEffect(() => {
    const id = localStorage.getItem('participante_id')
    const n = localStorage.getItem('participante_nombre') ?? ''
    if (!id) { router.push('/registro'); return }
    setParticipantId(id)
    setNombre(n)
    fetchData(id)
    syncCruces(id)

    const interval = setInterval(() => syncCruces(id), 2 * 60 * 1000)
    const channel = supabase
      .channel('bracket-matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => fetchData(id))
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [router, fetchData, syncCruces])

  function elegir(pos: string, team: string) {
    if (indefinido(team)) return
    setPicks(prev => normalize({ ...prev, [pos]: team }, r32))
    setSaved(false)
    setError('')
  }

  async function guardar() {
    if (!participantId) return
    setSaving(true)
    setError('')
    const res = await fetch('/api/bracket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant_id: participantId, picks }),
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

  const bracketListo = r32.length === 16 && r32.every(m => !indefinido(m.home) && !indefinido(m.away))

  if (!bracketListo) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Solo para Valientes 🔥</h1>
        <p className="text-gray-400 text-sm mb-8">El bracket de la fase eliminatoria.</p>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center text-gray-400">
          <p className="text-3xl mb-3">⏳</p>
          <p className="font-medium text-white">Los cruces de 16avos todavía no están definidos.</p>
          <p className="text-sm mt-1">
            Cuando termine la fase de grupos van a aparecer los 32 clasificados y vas a poder armar tu llave completa hasta la final.
          </p>
        </div>
      </div>
    )
  }

  // Mapa de banderas (todos los equipos aparecen en 16avos)
  const flags: Record<string, string> = {}
  for (const m of r32) {
    if (m.home) flags[m.home] = m.flagHome
    if (m.away) flags[m.away] = m.flagAway
  }

  const campeon = picks['FINAL-1']
  const totalPos = 16 + 8 + 4 + 2 + 1
  const completados = ROUNDS.reduce((acc, r) => {
    let c = 0
    for (let i = 1; i <= r.count; i++) if (picks[`${r.key}-${i}`]) c++
    return acc + c
  }, 0)

  function TeamBtn({ team, pos, picked }: { team: string; pos: string; picked: boolean }) {
    const vacio = indefinido(team)
    return (
      <button
        onClick={() => elegir(pos, team)}
        disabled={vacio}
        className={`flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-sm transition-colors text-left ${
          vacio
            ? 'text-gray-600 cursor-default'
            : picked
              ? 'bg-red-500/25 text-white font-semibold ring-1 ring-red-400/50'
              : 'text-gray-300 hover:bg-white/10'
        }`}
      >
        {team && flags[team]
          ? <img src={flags[team]} alt="" className="w-5 h-5 object-contain shrink-0" />
          : <span className="w-5 h-5 shrink-0 text-center text-gray-600">·</span>}
        <span className="truncate">{vacio ? 'Por definir' : team}</span>
        {picked && <span className="ml-auto text-red-400 text-xs shrink-0">✓</span>}
      </button>
    )
  }

  function MatchCard({ pos }: { pos: string }) {
    const [a, b] = getCompetitors(pos, picks, r32)
    const winner = picks[pos] || ''
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-1.5 flex flex-col gap-1">
        <TeamBtn team={a} pos={pos} picked={!!winner && winner === a} />
        <div className="h-px bg-white/5 mx-2" />
        <TeamBtn team={b} pos={pos} picked={!!winner && winner === b} />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Solo para Valientes 🔥</h1>
          <p className="text-gray-400 text-sm">
            Hola <strong className="text-white">{nombre}</strong>. Elegí el ganador de cada cruce y armá tu llave hasta la final.
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-red-400">{completados}/{totalPos}</div>
          <div className="text-xs text-gray-500">elegidos</div>
        </div>
      </div>

      {/* Campeón */}
      {campeon && (
        <div className="mb-6 p-4 bg-gradient-to-r from-yellow-500/15 to-red-500/15 border border-yellow-500/30 rounded-2xl flex items-center gap-3">
          <span className="text-3xl">🏆</span>
          <div>
            <p className="text-xs text-yellow-300/70 uppercase tracking-wider">Tu campeón del mundo</p>
            <div className="flex items-center gap-2 mt-0.5">
              {flags[campeon] && <img src={flags[campeon]} alt="" className="w-6 h-6 object-contain" />}
              <span className="text-xl font-bold text-white">{campeon}</span>
            </div>
          </div>
        </div>
      )}

      {saved && (
        <div className="mb-6 p-4 bg-green-500/15 border border-green-500/30 rounded-xl text-green-300 font-medium">
          ✅ Tu bracket fue guardado.
        </div>
      )}

      {/* Bracket: columnas con scroll horizontal */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {ROUNDS.map(round => (
            <div key={round.key} className="flex flex-col" style={{ width: 200 }}>
              <h2 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3 text-center">
                {round.label}
              </h2>
              <div className="flex flex-col justify-around flex-1 gap-3">
                {Array.from({ length: round.count }, (_, i) => (
                  <MatchCard key={`${round.key}-${i + 1}`} pos={`${round.key}-${i + 1}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Barra de guardado */}
      <div className="sticky bottom-6 mt-8">
        <div className="bg-[#0a0f1e]/90 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex items-center gap-4 max-w-lg mx-auto shadow-2xl">
          <div className="text-sm flex-1">
            {completados < totalPos
              ? <span className="text-yellow-400">Te faltan {totalPos - completados} cruces</span>
              : <span className="text-green-400">✓ Bracket completo</span>}
          </div>
          {error && <span className="text-red-400 text-xs">{error}</span>}
          <button
            onClick={guardar}
            disabled={saving}
            className="px-6 py-2.5 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shrink-0"
          >
            {saving ? 'Guardando...' : 'Guardar bracket'}
          </button>
        </div>
      </div>
    </div>
  )
}
