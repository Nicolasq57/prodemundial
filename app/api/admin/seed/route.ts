import { supabase } from '@/lib/supabase'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'prode2026'
const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY || ''

export async function POST(request: Request) {
  const { password } = await request.json()

  if (password !== ADMIN_PASSWORD) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!FOOTBALL_API_KEY) {
    return Response.json({ error: 'FOOTBALL_API_KEY no configurada' }, { status: 500 })
  }

  const res = await fetch(
    'https://api.football-data.org/v4/competitions/WC/matches?season=2026&stage=GROUP_STAGE',
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
    matchday: number
    group: string
    homeTeam: { name: string; shortName: string; crest: string }
    awayTeam: { name: string; shortName: string; crest: string }
  }>

  const matches = allMatches.filter(m => m.stage === 'GROUP_STAGE')

  const rows = matches.map((m, idx) => ({
    id: m.id ?? idx + 1,
    match_date: m.utcDate,
    matchday: m.matchday ?? 1,
    group_name: m.group?.replace('GROUP_', '') ?? '?',
    team_home: m.homeTeam.shortName ?? m.homeTeam.name,
    team_away: m.awayTeam.shortName ?? m.awayTeam.name,
    flag_home: m.homeTeam.crest ?? '',
    flag_away: m.awayTeam.crest ?? '',
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
