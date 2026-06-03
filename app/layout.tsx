import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Prode Mundial 2026',
  description: 'Pronósticos del Mundial 2026 con tus compañeros',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <nav className="border-b border-white/10 bg-black/30 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 flex items-center gap-6 h-14">
            <Link href="/" className="font-bold text-white flex items-center gap-2">
              <span className="text-xl">⚽</span>
              <span className="hidden sm:inline">Prode 2026</span>
            </Link>
            <div className="flex items-center gap-1 sm:gap-4 ml-auto text-sm">
              <Link href="/pronosticos" className="px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                Pronósticos
              </Link>
              <Link href="/ranking" className="px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                Ranking
              </Link>
              <Link href="/partidos" className="px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                Partidos
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
