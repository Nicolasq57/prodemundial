import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  const { name, code } = await request.json()

  if (!name || !code) {
    return Response.json({ error: 'Nombre y código requeridos' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('participants')
    .insert({ name: name.trim(), code })
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data, { status: 201 })
}

// Buscar participante por código (para login)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')?.toUpperCase()

  if (!code) {
    return Response.json({ error: 'Código requerido' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('participants')
    .select('id, name, code')
    .eq('code', code)
    .single()

  if (error || !data) {
    return Response.json({ error: 'Código no encontrado' }, { status: 404 })
  }

  return Response.json(data)
}
