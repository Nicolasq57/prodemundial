'use client'

import { useState } from 'react'

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
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(false)
  const [seedStatus, setSeedStatus] = useState('')
  const [seedKnockoutStatus, setSeedKnockoutStatus] = useState('')
  const [resultados, setResultados] = useState<Record<number, { home: string; away: string }>>({})
  const [saving, setSaving] = useState<number | null>(null)
  const [msg, setMsg] = useState<{ id: number; text: string; ok: boolean } | null>(null)

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setAuthed(true)
    loadMatches()
  }

  async function loadMatches() {
    setLoading(true)
    const res = await fetch('/api/partidos')
    const data: Match[] = await res.json()
    setMatches(data)

    const map: Record<number, { home: string; away: string }> = {}
    for (const m of data) {
      map[m.id] = {
        home: m.score_home != null ? String(m.score_home) : '',
        away: m.score_away != null ? String(m.score_away) : '',
      }
    }
    setResultados(map)
    setLoading(false)
  }

  async function seedFromApi() {
    setSeedStatus('Importando desde API...')
    const res = await fetch('/api/admin/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const data = await res.json()
    if (res.ok) {
      setSeedStatus(`✅ ${data.seeded} partidos importados`)
      loadMatches()
    } else {
      setSeedStatus(`❌ ${data.error}`)
    }
  }

  async function seedKnockout() {
    setSeedKnockoutStatus('Importando eliminatorias...')
    const res = await fetch('/api/admin/seed-knockout', {
      method: 'POST',
    })
    const data = await res.json()
    if (res.ok) {
      setSeedKnockoutStatus(data.seeded === 0
        ? `⏳ ${data.message}`
        : `✅ ${data.seeded} partidos eliminatorios importados`)
    } else {
      setSeedKnockoutStatus(`❌ ${data.error}`)
    }
  }

  async function guardarResultado(matchId: number) {
    const r = resultados[matchId]
    if (!r || r.home === '' || r.away === '') return

    setSaving(matchId)
    const res = await fetch('/api/admin/resultado', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password,
        match_id: matchId,
        score_home: Number(r.home),
        score_away: Number(r.away),
      }),
    })
    const data = await res.json()
    setMsg({
      id: matchId,
      text: res.ok ? `✅ Guardado · ${data.updated} pronósticos actualizados` : `❌ ${data.error}`,
      ok: res.ok,
    })
    setSaving(null)
    if (res.ok) loadMatches()
    setTimeout(() => setMsg(null), 4000)
  }

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto mt-20">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <h1 className="text-xl font-bold text-white mb-6">Panel Admin</h1>
          <form onSubmit={login} className="flex flex-col gap-4">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Contraseña admin"
              className="px-4 py-3 bg-white/7 border border-white/15 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-400"
              autoFocus
            />
            <button type="submit" className="py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl">
              Entrar
            </button>
          </form>
        </div>
      </div>
    )
  }

  const pendientes = matches.filter(m => m.status !== 'finished')
  const finalizados = matches.filter(m => m.status === 'finished')

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Panel Admin</h1>
          <p className="text-gray-400 text-sm">{matches.length} partidos · {finalizados.length} finalizados · {pendientes.length} pendientes</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={seedFromApi}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-sm transition-colors"
          >
            Importar fixture desde API
          </button>
          <button
            onClick={seedKnockout}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white font-medium rounded-xl text-sm transition-colors"
          >
            🔥 Importar eliminatorias
          </button>
          <button
            onClick={loadMatches}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl text-sm transition-colors"
          >
            Actualizar
          </button>
        </div>
      </div>

      {seedStatus && (
        <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300">
          {seedStatus}
        </div>
      )}

      {seedKnockoutStatus && (
        <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300">
          {seedKnockoutStatus}
        </div>
      )}

      {msg && (
        <div className={`mb-4 p-3 border rounded-xl text-sm ${msg.ok ? 'bg-green-500/10 border-green-500/20 text-green-300' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Cargar resultados</h2>
          <div className="flex flex-col gap-2">
            {pendientes.length === 0 && (
              <p className="text-gray-500 text-sm py-4">No hay partidos pendientes.</p>
            )}
            {pendientes.map(m => (
              <div key={m.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex-wrap">
                <span className="text-xs text-gray-500 w-20 shrink-0">{formatFecha(m.match_date)}</span>
                <span className="text-xs text-green-400 font-medium w-12">Grp {m.group_name}</span>
                <span className="text-gray-300 text-sm flex-1 text-right">{m.team_home}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number" min="0" max="20"
                    className="score-input"
                    value={resultados[m.id]?.home ?? ''}
                    onChange={e => setResultados(prev => ({ ...prev, [m.id]: { ...prev[m.id], home: e.target.value } }))}
                    placeholder="0"
                  />
                  <span className="text-gray-500 font-bold">:</span>
                  <input
                    type="number" min="0" max="20"
                    className="score-input"
                    value={resultados[m.id]?.away ?? ''}
                    onChange={e => setResultados(prev => ({ ...prev, [m.id]: { ...prev[m.id], away: e.target.value } }))}
                    placeholder="0"
                  />
                </div>
                <span className="text-gray-300 text-sm flex-1">{m.team_away}</span>
                <button
                  onClick={() => guardarResultado(m.id)}
                  disabled={saving === m.id}
                  className="px-3 py-1.5 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold rounded-lg text-sm transition-colors shrink-0"
                >
                  {saving === m.id ? '...' : 'Guardar'}
                </button>
              </div>
            ))}
          </div>

          {finalizados.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-white mb-4">Finalizados</h2>
              <div className="flex flex-col gap-2">
                {finalizados.map(m => (
                  <div key={m.id} className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-sm opacity-60">
                    <span className="text-gray-500 w-20 text-xs shrink-0">{formatFecha(m.match_date)}</span>
                    <span className="text-green-400 text-xs font-medium w-12">Grp {m.group_name}</span>
                    <span className="text-gray-400 flex-1 text-right">{m.team_home}</span>
                    <span className="text-white font-bold px-2 bg-white/10 rounded">
                      {m.score_home} - {m.score_away}
                    </span>
                    <span className="text-gray-400 flex-1">{m.team_away}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
