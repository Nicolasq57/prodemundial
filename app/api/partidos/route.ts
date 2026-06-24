import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('matches')
    .select('id, match_date, group_name, team_home, team_away, flag_home, flag_away, score_home, score_away, status, matchday')
    .gt('matchday', 0)
    .order('match_date', { ascending: true })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}
