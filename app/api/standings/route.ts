import { supabase } from '@/lib/supabase'

interface Row {
  team: string
  flag: string
  pj: number
  g: number
  e: number
  p: number
  gf: number
  gc: number
  dg: number
  pts: number
}

// Calcula la tabla de posiciones de cada grupo a partir de los resultados reales cargados
export async function GET() {
  const { data: matches, error } = await supabase
    .from('matches')
    .select('group_name, team_home, team_away, flag_home, flag_away, score_home, score_away, status, matchday')
    .gt('matchday', 0)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const groups: Record<string, Map<string, Row>> = {}

  function ensure(group: string, team: string, flag: string): Row {
    if (!groups[group]) groups[group] = new Map()
    const m = groups[group]
    if (!m.has(team)) {
      m.set(team, { team, flag, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0 })
    }
    const r = m.get(team)!
    if (flag && !r.flag) r.flag = flag
    return r
  }

  for (const mt of (matches || [])) {
    const g = mt.group_name
    if (!g) continue
    const home = ensure(g, mt.team_home, mt.flag_home)
    const away = ensure(g, mt.team_away, mt.flag_away)

    if (mt.status !== 'finished' || mt.score_home == null || mt.score_away == null) continue

    const sh = mt.score_home, sa = mt.score_away
    home.pj++; away.pj++
    home.gf += sh; home.gc += sa
    away.gf += sa; away.gc += sh

    if (sh > sa) { home.g++; home.pts += 3; away.p++ }
    else if (sh < sa) { away.g++; away.pts += 3; home.p++ }
    else { home.e++; away.e++; home.pts++; away.pts++ }
  }

  const result: Record<string, Row[]> = {}
  for (const g of Object.keys(groups)) {
    const rows = Array.from(groups[g].values())
    for (const r of rows) r.dg = r.gf - r.gc
    rows.sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.team.localeCompare(b.team))
    result[g] = rows
  }

  return Response.json(result)
}
