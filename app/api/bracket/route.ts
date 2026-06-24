import { supabase } from '@/lib/supabase'

// GET: devuelve los 16 cruces de 16avos (base del bracket) + las elecciones guardadas del participante
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const participant_id = searchParams.get('participant_id')

  const { data: matches, error } = await supabase
    .from('matches')
    .select('id, match_date, group_name, team_home, team_away, flag_home, flag_away, score_home, score_away, status')
    .eq('matchday', 0)
    .eq('group_name', 'LAST_32')
    .order('match_date', { ascending: true })
    .order('id', { ascending: true })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const r32 = (matches || []).map(m => ({
    id: m.id,
    date: m.match_date,
    home: m.team_home,
    away: m.team_away,
    flagHome: m.flag_home,
    flagAway: m.flag_away,
    scoreHome: m.score_home,
    scoreAway: m.score_away,
    status: m.status,
  }))

  let picks: Record<string, string> = {}
  if (participant_id) {
    const { data } = await supabase
      .from('brackets')
      .select('picks')
      .eq('participant_id', participant_id)
      .maybeSingle()
    if (data?.picks) picks = data.picks
  }

  return Response.json({ r32, picks })
}

// POST: guarda el bracket completo del participante (upsert del JSON de elecciones)
export async function POST(request: Request) {
  const { participant_id, picks } = await request.json()

  if (!participant_id || typeof picks !== 'object') {
    return Response.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const { error } = await supabase
    .from('brackets')
    .upsert(
      { participant_id, picks, updated_at: new Date().toISOString() },
      { onConflict: 'participant_id' }
    )

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
