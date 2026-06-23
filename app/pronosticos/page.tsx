'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Match {
  id: number
  match_date: string
  group_name: string
  team_home: string
  team_away: string
  matchday: number
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
  const [allMatches, setAllMatches] = useState<Match[]>([])
  const [preds, setPreds] = useState<PredMap>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [ahora, setAhora] = useState(() => new Date())
  const [fechaActiva, setFechaActiva] = useState(1)

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

      const now = new Date()
      setAhora(now)
      setAllMatches(matchesData)

      // Determinar qué fecha mostrar: la más baja que todavía tenga partidos sin empezar
      // o la última disponible si todo empezó
      const fechasDisponibles = [...new Set(matchesData.map(m => m.matchday))].sort()
      const fechaAbierta = fechasDisponibles.find(f =>
        matchesData.filter(m => m.matchday === f).some(m => now < new Date(m.match_date))
      )
      setFechaActiva(fechaAbierta ?? fechasDisponibles[fechasDisponibles.length - 1] ?? 1)

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

  async function handleSubmit() {
    const matchesFecha = allMatches.filter(m => m.matchday === fechaActiva)
    const vacios = matchesFecha.filter(m => {
      if (esBloqueado(m)) return false
      const p = preds[m.id]
      return !p || p.home === '' || p.away === ''
    })
    if (vacios.length > 0) {
      setError(`Falta completar ${vacios.length} partido${vacios.length > 1 ? 's' : ''}.`)
      return
    }

    setSaving(true)
    setError('')

    const predictions = matchesFecha.map(m => ({
      match_id: m.id,
      predicted_home: Number(preds[m.id]?.home ?? 0),
      predicted_away: Number(preds[m.id]?.away ?? 0),
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

  if (allMatches.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        Los partidos todavía no fueron cargados. Volvé más tarde.
      </div>
    )
  }

  // Medianoche hora Argentina (UTC-3)
  const CIERRE_FECHA2 = new Date('2026-06-18T03:00:00Z')
  const CIERRE_FECHA3 = new Date('2026-06-24T03:00:00Z')

  const fechasDisponibles = [...new Set(allMatches.map(m => m.matchday))].sort()
  const matchesFecha = allMatches.filter(m => m.matchday === fechaActiva)
  const todoBloqueadoFecha =
    matchesFecha.some(esBloqueado) ||
    (fechaActiva === 2 && ahora >= CIERRE_FECHA2) ||
    (fechaActiva === 3 && ahora >= CIERRE_FECHA3)
  const completadosFecha = matchesFecha.filter(m => {
    const p = preds[m.id]
    return p && p.home !== '' && p.away !== ''
  }).length

  // Agrupar por grupo
  const grupos = new Map<string, Match[]>()
  for (const m of matchesFecha) {
    if (!grupos.has(m.group_name)) grupos.set(m.group_name, [])
    grupos.get(m.group_name)!.push(m)
  }
  const sortedGrupos = Array.from(grupos.entries()).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Mis Pronósticos</h1>
          <p className="text-gray-400 text-sm">
            Hola <strong className="text-white">{nombreParticipante}</strong>.
            {todoBloqueadoFecha
              ? ' Esta fecha ya empezó, solo podés consultar.'
              : ' Completá todos los partidos de la fecha y guardá.'
            }
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-400">{completadosFecha}/{matchesFecha.length}</div>
          <div className="text-xs text-gray-500">completados</div>
        </div>
      </div>

      {/* Selector de fechas */}
      {fechasDisponibles.length > 1 && (
        <div className="flex gap-2 mb-6">
          {fechasDisponibles.map(f => {
            const matchesF = allMatches.filter(m => m.matchday === f)
            const bloqueadaF = matchesF.every(esBloqueado)
            const completadaF = matchesF.every(m => {
              const p = preds[m.id]
              return p && p.home !== '' && p.away !== ''
            })
            return (
              <button
                key={f}
                onClick={() => { setFechaActiva(f); setSaved(false); setError('') }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  fechaActiva === f
                    ? 'bg-green-500 text-black'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                Fecha {f}
                {bloqueadaF ? ' 🔒' : completadaF ? ' ✓' : ''}
              </button>
            )
          })}
        </div>
      )}

      {/* Banner bloqueado */}
      {todoBloqueadoFecha && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/25 rounded-xl flex items-start gap-3">
          <span className="text-2xl">🔒</span>
          <div>
            <p className="text-red-300 font-medium">Fecha {fechaActiva} cerrada</p>
            <p className="text-red-300/60 text-sm mt-0.5">Los partidos de esta fecha ya empezaron. Solo podés consultar.</p>
          </div>
        </div>
      )}

      {/* Banner guardado */}
      {saved && (
        <div className="mb-6 p-4 bg-green-500/15 border border-green-500/30 rounded-xl text-green-300 font-medium">
          ✅ Pronósticos de la Fecha {fechaActiva} guardados.
        </div>
      )}

      {/* Partidos */}
      <div className="flex flex-col gap-6">
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
                        type="number" min="0" max="20"
                        className="score-input"
                        value={p.home}
                        onChange={e => handleChange(m.id, 'home', e.target.value)}
                        disabled={bloqueado}
                        placeholder="—"
                      />
                      <span className="text-gray-500 font-bold">:</span>
                      <input
                        type="number" min="0" max="20"
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

      {/* Barra inferior */}
      {!todoBloqueadoFecha && (
        <div className="sticky bottom-6 mt-8">
          <div className="bg-[#0a0f1e]/90 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex items-center gap-4 max-w-lg mx-auto shadow-2xl">
            <div className="text-sm flex-1">
              {completadosFecha < matchesFecha.filter(m => !esBloqueado(m)).length
                ? <span className="text-yellow-400">
                    {matchesFecha.filter(m => !esBloqueado(m)).length - completadosFecha} partidos sin completar
                  </span>
                : <span className="text-green-400">✓ Todos los partidos completados</span>
              }
            </div>
            {error && <span className="text-red-400 text-xs">{error}</span>}
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-2.5 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold rounded-xl transition-colors shrink-0"
            >
              {saving ? 'Guardando...' : `Guardar Fecha ${fechaActiva}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
