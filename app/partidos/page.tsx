import { supabase } from '@/lib/supabase'
import type { Match } from '@/lib/database.types'

function formatFecha(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

export const revalidate = 60

export default async function PartidosPage() {
  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .order('match_date', { ascending: true })

  const grupos = new Map<string, Match[]>()
  for (const match of (matches ?? []) as Match[]) {
    const g = match.group_name
    if (!grupos.has(g)) grupos.set(g, [])
    grupos.get(g)!.push(match)
  }

  const sortedGrupos = Array.from(grupos.entries()).sort(([a], [b]) => a.localeCompare(b))

  if (sortedGrupos.length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-white mb-4">Partidos</h1>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-gray-400">
          Los partidos todavía no fueron cargados. El admin debe hacer el seed desde el panel.
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">Partidos — Fase de Grupos</h1>

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
                  <div className="flex items-center gap-1.5 shrink-0">
                    {m.status === 'finished' ? (
                      <span className="font-bold text-white bg-white/10 rounded px-2 py-0.5">
                        {m.score_home} - {m.score_away}
                      </span>
                    ) : (
                      <span className="text-gray-500 text-xs">
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
