import { supabase } from '@/lib/supabase'
import { calcularPuntos } from '@/lib/scoring'

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
  const apiMatches = (json.matches as Array<{
    id: number
    stage: string
    status: string
    homeTeam: { name: string; shortName: string; crest: string }
    awayTeam: { name: string; shortName: string; crest: string }
    score: { fullTime: { home: number | null; away: number | null } }
  }>).filter(m => m.stage !== 'GROUP_STAGE')

  let updated = 0

  for (const m of apiMatches) {
    const scoreHome = m.score?.fullTime?.home ?? null
    const scoreAway = m.score?.fullTime?.away ?? null
    const isFinished = m.status === 'FINISHED' && scoreHome !== null && scoreAway !== null

    await supabase
      .from('matches')
      .update({
        team_home: m.homeTeam?.shortName || m.homeTeam?.name || 'Por definir',
        team_away: m.awayTeam?.shortName || m.awayTeam?.name || 'Por definir',
        flag_home: m.homeTeam?.crest || '',
        flag_away: m.awayTeam?.crest || '',
        ...(isFinished ? { score_home: scoreHome, score_away: scoreAway, status: 'finished' } : {}),
      })
      .eq('id', m.id)

    if (isFinished) {
      const { data: predictions } = await supabase
        .from('predictions')
        .select('id, predicted_home, predicted_away')
        .eq('match_id', m.id)

      for (const pred of (predictions ?? [])) {
        const points = calcularPuntos(scoreHome!, scoreAway!, pred.predicted_home, pred.predicted_away)
        await supabase.from('predictions').update({ points }).eq('id', pred.id)
      }
      updated++
    }
  }

  return Response.json({ ok: true, updated, total_knockout: apiMatches.length })
}
