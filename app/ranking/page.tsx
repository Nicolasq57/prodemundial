import RankingTable from '@/components/RankingTable'

export default function RankingPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Ranking</h1>
        <p className="text-gray-400">Se actualiza en tiempo real a medida que se juegan los partidos.</p>
      </div>

      <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-300 text-sm font-medium">
        🍕 Buena suerte, que gane el mejor. El ganador tiene que pagar las pizzas para todos el lunes 29.
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <RankingTable />
      </div>
    </div>
  )
}
