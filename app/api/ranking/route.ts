import { supabase } from '@/lib/supabase'
import type { RankingEntry } from '@/lib/database.types'

export async function GET() {
  const [{ data: participants }, { data: predictions }] = await Promise.all([
    supabase.from('participants').select('id, name'),
    supabase.from('predictions').select('participant_id, points'),
  ])

  if (!participants) {
    return Response.json([])
  }

  const rankingMap = new Map<string, RankingEntry>()
  for (const p of participants) {
    rankingMap.set(p.id, {
      id: p.id,
      name: p.name,
      total_points: 0,
      exact_results: 0,
      correct_outcomes: 0,
      predictions_count: 0,
    })
  }

  for (const pred of (predictions ?? [])) {
    const entry = rankingMap.get(pred.participant_id)
    if (!entry) continue
    entry.total_points += pred.points
    entry.predictions_count++
    if (pred.points === 3) entry.exact_results++
    if (pred.points === 1) entry.correct_outcomes++
  }

  const sorted = Array.from(rankingMap.values()).sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points
    return b.exact_results - a.exact_results
  })

  return Response.json(sorted)
}
