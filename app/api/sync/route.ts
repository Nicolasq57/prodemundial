import { supabase } from '@/lib/supabase'
import { calcularPuntos } from '@/lib/scoring'

const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY || ''

export async function POST() {
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
  const apiMatches = json.matches as Array<{
    id: number
    stage: string
    status: string
    score: { fullTime: { home: number | null; away: number | null } }
  }>

  const finished = apiMatches.filter(
    m => m.stage === 'GROUP_STAGE' && m.status === 'FINISHED' &&
    m.score.fullTime.home !== null && m.score.fullTime.away !== null
  )

  let updated = 0

  for (const m of finished) {
    const scoreHome = m.score.fullTime.home!
    const scoreAway = m.score.fullTime.away!

    // Solo actualizar si cambió algo
    const { data: existing } = await supabase
      .from('matches')
      .select('score_home, score_away, status')
      .eq('id', m.id)
      .single()

    if (
      existing &&
      existing.status === 'finished' &&
      existing.score_home === scoreHome &&
      existing.score_away === scoreAway
    ) {
      continue
    }

    await supabase
      .from('matches')
      .update({ score_home: scoreHome, score_away: scoreAway, status: 'finished' })
      .eq('id', m.id)

    // Recalcular puntos de todos los pronósticos de este partido
    const { data: predictions } = await supabase
      .from('predictions')
      .select('id, predicted_home, predicted_away')
      .eq('match_id', m.id)

    for (const pred of (predictions ?? [])) {
      const points = calcularPuntos(scoreHome, scoreAway, pred.predicted_home, pred.predicted_away)
      await supabase.from('predictions').update({ points }).eq('id', pred.id)
    }

    updated++
  }

  return Response.json({ ok: true, updated, total_finished: finished.length })
}
