'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function generarCodigo(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase()
}

export default function RegistroPage() {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Si ya está registrado, ofrecer continuar
  const yaRegistrado = typeof window !== 'undefined' && localStorage.getItem('participante_id')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    setLoading(true)
    setError('')

    const code = generarCodigo()

    const res = await fetch('/api/participantes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nombre.trim(), code }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Error al registrarse')
      setLoading(false)
      return
    }

    localStorage.setItem('participante_id', data.id)
    localStorage.setItem('participante_nombre', data.name)
    localStorage.setItem('participante_code', data.code)

    router.push('/pronosticos')
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-white mb-2">Registrarse</h1>
        <p className="text-gray-400 mb-8 text-sm">
          Ingresá tu nombre para participar. Después podrás cargar tus pronósticos de los 72 partidos de la fase de grupos.
        </p>

        {yaRegistrado ? (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-sm">
            <p className="text-yellow-300 font-medium">Ya estás registrado como <strong>{localStorage.getItem('participante_nombre')}</strong>.</p>
            <Link href="/pronosticos" className="text-yellow-400 underline mt-1 inline-block">
              Ir a mis pronósticos →
            </Link>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">Tu nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Martín López"
              maxLength={40}
              className="w-full px-4 py-3 bg-white/7 border border-white/15 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-400 transition-colors"
              autoFocus
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || !nombre.trim()}
            className="mt-2 py-3 bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-colors"
          >
            {loading ? 'Registrando...' : 'Registrarme y cargar pronósticos →'}
          </button>
        </form>
      </div>
    </div>
  )
}
