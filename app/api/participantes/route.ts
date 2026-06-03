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
