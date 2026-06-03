import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  const { participant_id, predictions } = await request.json()

  if (!participant_id || !Array.isArray(predictions)) {
    return Response.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const rows = predictions.map((p: { match_id: number; predicted_home: number; predicted_away: number }) => ({
    participant_id,
    match_id: p.match_id,
    predicted_home: p.predicted_home,
    predicted_away: p.predicted_away,
    points: 0,
  }))

  const { error } = await supabase
    .from('predictions')
    .upsert(rows, { onConflict: 'participant_id,match_id' })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true, count: rows.length })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const participant_id = searchParams.get('participant_id')

  if (!participant_id) {
    return Response.json({ error: 'participant_id requerido' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('predictions')
    .select('match_id, predicted_home, predicted_away, points')
    .eq('participant_id', participant_id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}
