import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center gap-8">
      <div>
        <div className="text-7xl mb-4">⚽🏆</div>
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">
          Prode Mundial 2026
        </h1>
        <p className="text-gray-400 text-lg max-w-md">
          Cargá tus pronósticos de la fase de grupos y competí con tus compañeros en tiempo real.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/registro"
          className="px-8 py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition-colors text-lg"
        >
          Participar →
        </Link>
        <Link
          href="/ranking"
          className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors text-lg"
        >
          Ver Ranking
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6 mt-4 text-center">
        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-3xl font-bold text-green-400">3 pts</div>
          <div className="text-sm text-gray-400 mt-1">Resultado exacto</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-3xl font-bold text-blue-400">1 pt</div>
          <div className="text-sm text-gray-400 mt-1">Ganador/empate</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-3xl font-bold text-red-400">0 pts</div>
          <div className="text-sm text-gray-400 mt-1">Error</div>
        </div>
      </div>
    </div>
  )
}
