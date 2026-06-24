import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const participant_id = searchParams.get('participant_id')

  const { data: matches, error } = await supabase
    .from('matches')
    .select('id, match_date, group_name, team_home, team_away, flag_home, flag_away, score_home, score_away, status')
    .eq('matchday', 0)
    .order('match_date', { ascending: true })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  let predictions: Array<{ match_id: number; predicted_home: number; predicted_away: number; points: number }> = []
  if (participant_id && matches && matches.length > 0) {
    const matchIds = matches.map(m => m.id)
    const { data } = await supabase
      .from('predictions')
      .select('match_id, predicted_home, predicted_away, points')
      .eq('participant_id', participant_id)
      .in('match_id', matchIds)
    predictions = data || []
  }

  return Response.json({ matches: matches || [], predictions })
}
