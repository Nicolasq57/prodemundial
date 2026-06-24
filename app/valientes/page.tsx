'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Picks = Record<string, string>

interface StandingRow {
  team: string
  flag: string
  pj: number
  dg: number
  gf: number
  pts: number
}

// ============================================================
// Cuadro oficial Mundial 2026 (fuente: bracket TyC Sports)
// Cada cruce de 16avos define dos "slots" por posición de grupo:
//   W:X  = 1º del grupo X   ·   RU:X = 2º del grupo X
//   T:XYZ = 3º (uno de los mejores terceros de esos grupos)
// El orden (izquierda 1-8, derecha 1-8) hace que el árbol binario
// (1v2, 3v4, ...) reproduzca exactamente las llaves del cuadro.
// ============================================================
const BRACKET_R32: { home: string; away: string }[] = [
  { home: 'W:E', away: 'T:ABCDF' },   // 1
  { home: 'W:I', away: 'T:CDFGH' },   // 2
  { home: 'RU:A', away: 'RU:B' },     // 3
  { home: 'W:F', away: 'RU:C' },      // 4
  { home: 'RU:K', away: 'RU:L' },     // 5
  { home: 'W:H', away: 'RU:J' },      // 6
  { home: 'W:D', away: 'T:BEFD' },    // 7
  { home: 'W:G', away: 'T:AEHD' },    // 8
  { home: 'W:C', away: 'RU:F' },      // 9
  { home: 'RU:E', away: 'RU:I' },     // 10
  { home: 'W:A', away: 'T:CEFHI' },   // 11
  { home: 'W:L', away: 'T:EHJK' },    // 12
  { home: 'W:J', away: 'RU:H' },      // 13
  { home: 'RU:D', away: 'RU:G' },     // 14
  { home: 'W:B', away: 'T:EFGD' },    // 15
  { home: 'W:K', away: 'T:DEIJL' },   // 16
]

const ROUNDS = [
  { key: 'R32', count: 16, label: '16avos' },
  { key: 'R16', count: 8, label: 'Octavos' },
  { key: 'QF', count: 4, label: 'Cuartos' },
  { key: 'SF', count: 2, label: 'Semis' },
  { key: 'FINAL', count: 1, label: 'Final' },
] as const

const PREV: Record<string, string> = { R16: 'R32', QF: 'R16', SF: 'QF', FINAL: 'SF' }

interface Resolved {
  display: string
  flag: string | null
  decided: boolean
  empty: boolean
}

function resolveSlot(code: string, standings: Record<string, StandingRow[]>): Resolved {
  if (!code) return { display: '', flag: null, decided: false, empty: true }
  const [kind, groups] = code.split(':')
  if (kind === 'W' || kind === 'RU') {
    const g = groups
    const rows = standings[g]
    const complete = rows && rows.length >= 4 && rows.every(r => r.pj >= 3)
    const idx = kind === 'W' ? 0 : 1
    if (complete && rows[idx]) {
      return { display: rows[idx].team, flag: rows[idx].flag, decided: true, empty: false }
    }
    return { display: `${kind === 'W' ? '1º' : '2º'} ${g}`, flag: null, decided: false, empty: false }
  }
  // Tercero: se resuelve recién al final, mostramos los grupos posibles
  return { display: `3º ${groups}`, flag: null, decided: false, empty: false }
}

export default function ValientesPage() {
  const router = useRouter()
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [picks, setPicks] = useState<Picks>({})
  const [standings, setStandings] = useState<Record<string, StandingRow[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const getCompetitors = useCallback((pos: string, p: Picks): [string, string] => {
    const [key, nStr] = pos.split('-')
    const n = Number(nStr)
    if (key === 'R32') {
      const m = BRACKET_R32[n - 1]
      return m ? [m.home, m.away] : ['', '']
    }
    const prev = PREV[key]
    return [p[`${prev}-${2 * n - 1}`] || '', p[`${prev}-${2 * n}`] || '']
  }, [])

  const normalize = useCallback((p: Picks): Picks => {
    const next = { ...p }
    const order: string[] = []
    for (let i = 1; i <= 8; i++) order.push(`R16-${i}`)
    for (let i = 1; i <= 4; i++) order.push(`QF-${i}`)
    for (let i = 1; i <= 2; i++) order.push(`SF-${i}`)
    order.push('FINAL-1')
    for (const pos of order) {
      const [a, b] = getCompetitors(pos, next)
      if (next[pos] && next[pos] !== a && next[pos] !== b) delete next[pos]
    }
    return next
  }, [getCompetitors])

  const fetchData = useCallback(async (id: string) => {
    const [res, stRes] = await Promise.all([
      fetch(`/api/bracket?participant_id=${id}`),
      fetch('/api/standings'),
    ])
    if (stRes.ok) setStandings(await stRes.json())
    if (res.ok) {
      const { picks: saved } = await res.json()
      setPicks(prev => normalize(Object.keys(prev).length > 0 ? prev : (saved || {})))
    }
    setLoading(false)
  }, [normalize])

  const sync = useCallback(async (id: string) => {
    await Promise.all([
      fetch('/api/sync', { method: 'POST' }),
      fetch('/api/sync-knockout', { method: 'POST' }),
    ])
    await fetchData(id)
  }, [fetchData])

  useEffect(() => {
    const id = localStorage.getItem('participante_id')
    const n = localStorage.getItem('participante_nombre') ?? ''
    if (!id) { router.push('/registro'); return }
    setParticipantId(id)
    setNombre(n)
    fetchData(id)
    sync(id)

    const interval = setInterval(() => sync(id), 2 * 60 * 1000)
    const channel = supabase
      .channel('bracket-matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => fetchData(id))
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [router, fetchData, sync])

  function elegir(pos: string, code: string) {
    if (!code) return
    setPicks(prev => normalize({ ...prev, [pos]: code }))
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

  const campeon = picks['FINAL-1'] ? resolveSlot(picks['FINAL-1'], standings) : null
  const totalPos = 16 + 8 + 4 + 2 + 1
  const completados = ROUNDS.reduce((acc, r) => {
    let c = 0
    for (let i = 1; i <= r.count; i++) if (picks[`${r.key}-${i}`]) c++
    return acc + c
  }, 0)
  const gruposOrdenados = Object.keys(standings).sort()

  function TeamBtn({ code, pos, picked }: { code: string; pos: string; picked: boolean }) {
    const r = resolveSlot(code, standings)
    return (
      <button
        onClick={() => elegir(pos, code)}
        disabled={r.empty}
        className={`flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-sm transition-colors text-left ${
          r.empty
            ? 'text-gray-600 cursor-default'
            : picked
              ? 'bg-red-500/25 text-white font-semibold ring-1 ring-red-400/50'
              : 'text-gray-300 hover:bg-white/10'
        }`}
      >
        {r.flag
          ? <img src={r.flag} alt="" className="w-5 h-5 object-contain shrink-0" />
          : <span className="w-5 h-5 shrink-0 flex items-center justify-center text-[10px] text-gray-600">{r.empty ? '·' : '?'}</span>}
        <span className={`truncate ${!r.empty && !r.decided ? 'italic text-gray-400' : ''}`}>
          {r.empty ? 'Por definir' : r.display}
        </span>
        {picked && <span className="ml-auto text-red-400 text-xs shrink-0">✓</span>}
      </button>
    )
  }

  function MatchCard({ pos }: { pos: string }) {
    const [a, b] = getCompetitors(pos, picks)
    const winner = picks[pos] || ''
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-1.5 flex flex-col gap-1">
        <TeamBtn code={a} pos={pos} picked={!!winner && winner === a} />
        <div className="h-px bg-white/5 mx-2" />
        <TeamBtn code={b} pos={pos} picked={!!winner && winner === b} />
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

      <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/25 rounded-xl text-blue-200/80 text-xs">
        Los cruces siguen el cuadro oficial. Donde el grupo todavía no terminó se muestra la posición (ej. <span className="italic">2º H</span>);
        cuando el grupo cierra, aparece el equipo real automáticamente.
      </div>

      {/* Campeón */}
      {campeon && (
        <div className="mb-6 p-4 bg-gradient-to-r from-yellow-500/15 to-red-500/15 border border-yellow-500/30 rounded-2xl flex items-center gap-3">
          <span className="text-3xl">🏆</span>
          <div>
            <p className="text-xs text-yellow-300/70 uppercase tracking-wider">Tu campeón del mundo</p>
            <div className="flex items-center gap-2 mt-0.5">
              {campeon.flag && <img src={campeon.flag} alt="" className="w-6 h-6 object-contain" />}
              <span className={`text-xl font-bold text-white ${!campeon.decided ? 'italic' : ''}`}>{campeon.display}</span>
            </div>
          </div>
        </div>
      )}

      {saved && (
        <div className="mb-6 p-4 bg-green-500/15 border border-green-500/30 rounded-xl text-green-300 font-medium">
          ✅ Tu bracket fue guardado.
        </div>
      )}

      {/* Bracket */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {ROUNDS.map(round => (
            <div key={round.key} className="flex flex-col" style={{ width: 190 }}>
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
      <div className="sticky bottom-6 mt-4">
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

      {/* Posiciones en vivo (referencia) */}
      {gruposOrdenados.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-white mb-1">Cómo van los grupos</h2>
          <p className="text-gray-500 text-xs mb-4">Provisional · se actualiza con cada resultado</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gruposOrdenados.map(g => (
              <div key={g} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-3">Grupo {g}</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] text-gray-500 uppercase">
                      <th className="text-left font-medium pb-1.5">Equipo</th>
                      <th className="font-medium pb-1.5 w-7 text-center">PJ</th>
                      <th className="font-medium pb-1.5 w-7 text-center">DG</th>
                      <th className="font-medium pb-1.5 w-7 text-center">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings[g].map((r, idx) => (
                      <tr key={r.team} className="border-t border-white/5">
                        <td className="py-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-4 text-xs font-bold text-center ${
                              idx === 0 ? 'text-green-400' : idx === 1 ? 'text-blue-400' : idx === 2 ? 'text-yellow-400' : 'text-gray-600'
                            }`}>{idx + 1}</span>
                            {r.flag
                              ? <img src={r.flag} alt="" className="w-5 h-5 object-contain shrink-0" />
                              : <span className="w-5 h-5 shrink-0" />}
                            <span className={`truncate ${idx < 2 ? 'text-white' : idx === 2 ? 'text-gray-200' : 'text-gray-400'}`}>
                              {r.team}
                            </span>
                          </div>
                        </td>
                        <td className="text-center text-gray-400">{r.pj}</td>
                        <td className="text-center text-gray-400">{r.dg > 0 ? `+${r.dg}` : r.dg}</td>
                        <td className="text-center text-white font-bold">{r.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
