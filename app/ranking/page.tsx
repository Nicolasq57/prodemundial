import RankingTable from '@/components/RankingTable'

export default function RankingPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Ranking</h1>
        <p className="text-gray-400">Se actualiza en tiempo real a medida que se juegan los partidos.</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <RankingTable />
      </div>
    </div>
  )
}
