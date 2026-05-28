import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { data: perfil } = await supabaseClient.from('concrem_fxcp_usuarios').select('role, ativo').eq('id', user.id).single()
    if (!perfil || perfil.role !== 'admin' || !perfil.ativo) return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { usuario_id } = await req.json()
    if (!usuario_id) return new Response(JSON.stringify({ error: 'ID do usuário não informado' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    if (usuario_id === user.id) return new Response(JSON.stringify({ error: 'Você não pode excluir sua própria conta' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

    const { error: dbErr } = await supabaseAdmin.from('concrem_fxcp_usuarios').delete().eq('id', usuario_id)
    if (dbErr) return new Response(JSON.stringify({ error: dbErr.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(usuario_id)
    if (authErr) return new Response(JSON.stringify({ error: authErr.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
