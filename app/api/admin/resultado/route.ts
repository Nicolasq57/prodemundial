import { supabase } from '@/lib/supabase'
import { calcularPuntos } from '@/lib/scoring'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'prode2026'

export async function POST(request: Request) {
  const { password, match_id, score_home, score_away } = await request.json()

  if (password !== ADMIN_PASSWORD) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (match_id == null || score_home == null || score_away == null) {
    return Response.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  const scoreHome = Number(score_home)
  const scoreAway = Number(score_away)

  const { error: matchError } = await supabase
    .from('matches')
    .update({ score_home: scoreHome, score_away: scoreAway, status: 'finished' })
    .eq('id', match_id)

  if (matchError) {
    return Response.json({ error: matchError.message }, { status: 500 })
  }

  const { data: predictions } = await supabase
    .from('predictions')
    .select('id, predicted_home, predicted_away')
    .eq('match_id', match_id)

  if (predictions && predictions.length > 0) {
    const updates = predictions.map(p => ({
      id: p.id,
      points: calcularPuntos(scoreHome, scoreAway, p.predicted_home, p.predicted_away),
    }))

    for (const update of updates) {
      await supabase
        .from('predictions')
        .update({ points: update.points })
        .eq('id', update.id)
    }
  }

  return Response.json({ ok: true, updated: predictions?.length ?? 0 })
}
