'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function generarCodigo(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

function guardarSesion(id: string, name: string, code: string) {
  localStorage.setItem('participante_id', id)
  localStorage.setItem('participante_nombre', name)
  localStorage.setItem('participante_code', code)
}

export default function RegistroPage() {
  const router = useRouter()
  const [modo, setModo] = useState<'elegir' | 'nuevo' | 'codigo' | 'listo'>('elegir')
  const [nombre, setNombre] = useState('')
  const [codigoIngresado, setCodigoIngresado] = useState('')
  const [codigoGenerado, setCodigoGenerado] = useState('')
  const [nombreMostrado, setNombreMostrado] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRegistro(e: React.FormEvent) {
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

    guardarSesion(data.id, data.name, data.code)
    setCodigoGenerado(data.code)
    setNombreMostrado(data.name)
    setModo('listo')
    setLoading(false)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const code = codigoIngresado.trim().toUpperCase()
    if (!code) return
    setLoading(true)
    setError('')

    const res = await fetch(`/api/participantes?code=${code}`)
    const data = await res.json()

    if (!res.ok) {
      setError('Código no encontrado. Verificá que esté bien escrito.')
      setLoading(false)
      return
    }

    guardarSesion(data.id, data.name, data.code)
    router.push('/pronosticos')
  }

  // Pantalla de elección
  if (modo === 'elegir') {
    return (
      <div className="max-w-md mx-auto mt-12 flex flex-col gap-4">
        <h1 className="text-3xl font-bold text-white text-center mb-2">Prode Mundial 2026</h1>
        <p className="text-gray-400 text-center mb-4">¿Ya participás o es tu primera vez?</p>

        <button
          onClick={() => setModo('nuevo')}
          className="w-full py-4 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition-colors text-lg"
        >
          Primera vez — Registrarme
        </button>

        <button
          onClick={() => setModo('codigo')}
          className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors text-lg"
        >
          Ya tengo un código
        </button>
      </div>
    )
  }

  // Pantalla de registro nuevo
  if (modo === 'nuevo') {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <button onClick={() => setModo('elegir')} className="text-gray-500 hover:text-gray-300 text-sm mb-4 flex items-center gap-1">
            ← Volver
          </button>
          <h1 className="text-2xl font-bold text-white mb-2">Registrarme</h1>
          <p className="text-gray-400 mb-6 text-sm">
            Al registrarte recibís un código único. Guardalo — lo vas a necesitar para acceder desde otro dispositivo.
          </p>
          <form onSubmit={handleRegistro} className="flex flex-col gap-4">
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
              className="py-3 bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-colors"
            >
              {loading ? 'Registrando...' : 'Registrarme →'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Pantalla de ingreso con código
  if (modo === 'codigo') {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <button onClick={() => setModo('elegir')} className="text-gray-500 hover:text-gray-300 text-sm mb-4 flex items-center gap-1">
            ← Volver
          </button>
          <h1 className="text-2xl font-bold text-white mb-2">Ingresar con código</h1>
          <p className="text-gray-400 mb-6 text-sm">
            Ingresá el código de 6 caracteres que recibiste al registrarte.
          </p>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Tu código</label>
              <input
                type="text"
                value={codigoIngresado}
                onChange={e => setCodigoIngresado(e.target.value.toUpperCase())}
                placeholder="Ej: K7MNP3"
                maxLength={6}
                className="w-full px-4 py-3 bg-white/7 border border-white/15 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-400 transition-colors tracking-widest text-center text-xl font-mono"
                autoFocus
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || codigoIngresado.length < 6}
              className="py-3 bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-colors"
            >
              {loading ? 'Buscando...' : 'Ingresar →'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Pantalla de código generado — mostrar bien grande
  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h1 className="text-2xl font-bold text-white mb-1">¡Bienvenido, {nombreMostrado}!</h1>
        <p className="text-gray-400 text-sm mb-8">
          Tu código de acceso es:
        </p>

        <div className="bg-black/40 border-2 border-green-400 rounded-2xl p-6 mb-6">
          <div className="text-5xl font-mono font-bold text-green-400 tracking-widest">
            {codigoGenerado}
          </div>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-8 text-left">
          <p className="text-yellow-300 text-sm font-medium mb-1">⚠️ Guardá este código</p>
          <p className="text-yellow-200/70 text-xs">
            Es la única forma de acceder a tus pronósticos desde otro dispositivo o si limpiás el caché. Anotalo o sacale una foto.
          </p>
        </div>

        <button
          onClick={() => router.push('/pronosticos')}
          className="w-full py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition-colors text-lg"
        >
          Cargar mis pronósticos →
        </button>
      </div>
    </div>
  )
}
