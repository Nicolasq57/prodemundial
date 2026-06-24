import { supabase } from '@/lib/supabase'

const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY || ''

export async function POST() {
  if (!FOOTBALL_API_KEY) {
    return Response.json({ error: 'FOOTBALL_API_KEY no configurada' }, { status: 500 })
  }

  const res = await fetch(
    'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
    { headers: { 'X-Auth-Token': FOOTBALL_API_KEY } }
  )

  if (!res.ok) {
    return Response.json({ error: `API error: ${res.status}` }, { status: 500 })
  }

  const json = await res.json()
  const allMatches = json.matches as Array<{
    id: number
    utcDate: string
    stage: string
    homeTeam: { name: string; shortName: string; crest: string }
    awayTeam: { name: string; shortName: string; crest: string }
  }>

  const knockout = allMatches.filter(m => m.stage !== 'GROUP_STAGE')

  if (knockout.length === 0) {
    return Response.json({ ok: true, seeded: 0, message: 'Todavía no hay partidos eliminatorios en la API' })
  }

  const rows = knockout.map(m => ({
    id: m.id,
    match_date: m.utcDate,
    matchday: 0,
    group_name: m.stage,
    stage: m.stage,
    team_home: m.homeTeam?.shortName || m.homeTeam?.name || 'Por definir',
    team_away: m.awayTeam?.shortName || m.awayTeam?.name || 'Por definir',
    flag_home: m.homeTeam?.crest || '',
    flag_away: m.awayTeam?.crest || '',
    status: 'scheduled' as const,
  }))

  const { error } = await supabase
    .from('matches')
    .upsert(rows, { onConflict: 'id' })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true, seeded: rows.length })
}
