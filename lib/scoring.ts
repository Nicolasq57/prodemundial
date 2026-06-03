export function calcularPuntos(
  realHome: number,
  realAway: number,
  predHome: number,
  predAway: number
): number {
  if (predHome === realHome && predAway === realAway) return 3

  const realResult = Math.sign(realHome - realAway)
  const predResult = Math.sign(predHome - predAway)
  if (realResult === predResult) return 1

  return 0
}

export function getOutcome(home: number, away: number): 'home' | 'draw' | 'away' {
  if (home > away) return 'home'
  if (home < away) return 'away'
  return 'draw'
}
