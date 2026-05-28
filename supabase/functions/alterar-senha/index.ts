import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function hashSenha(senha: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(senha)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { nova_senha } = await req.json()
    if (!nova_senha || nova_senha.length < 8) return new Response(JSON.stringify({ error: 'Senha deve ter ao menos 8 caracteres' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

    const novoHash = await hashSenha(nova_senha)
    const { data: historico } = await supabaseAdmin.from('concrem_fxcp_senha_historico').select('senha_hash').eq('usuario_id', user.id).order('criado_em', { ascending: false }).limit(5)
    const jaUsada = (historico || []).some((h: any) => h.senha_hash === novoHash)
    if (jaUsada) return new Response(JSON.stringify({ error: 'Esta senha já foi utilizada anteriormente. Escolha uma senha diferente.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password: nova_senha })
    if (updateError) return new Response(JSON.stringify({ error: updateError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    await supabaseAdmin.from('concrem_fxcp_usuarios').update({ trocar_senha: false }).eq('id', user.id)
    await supabaseAdmin.from('concrem_fxcp_senha_historico').insert({ usuario_id: user.id, senha_hash: novoHash })

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
