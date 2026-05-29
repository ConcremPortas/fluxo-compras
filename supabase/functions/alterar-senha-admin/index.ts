import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autorizado' }, 401)

    // Verificar identidade do chamador
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) return json({ error: 'Não autorizado' }, 401)

    // Verificar se é admin
    const { data: perfil } = await supabaseClient
      .from('concrem_fxcp_usuarios')
      .select('role, ativo')
      .eq('id', user.id)
      .single()
    if (!perfil || perfil.role !== 'admin' || !perfil.ativo) return json({ error: 'Acesso negado' }, 403)

    const { usuario_id, nova_senha } = await req.json()
    if (!usuario_id || !nova_senha) return json({ error: 'Campos obrigatórios: usuario_id, nova_senha' }, 400)
    if (nova_senha.length < 8) return json({ error: 'Senha deve ter ao menos 8 caracteres' }, 400)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Tentar atualizar a senha do usuário no Auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(usuario_id, {
      password: nova_senha
    })

    if (updateError) {
      const isNotFound = updateError.message?.toLowerCase().includes('not found') ||
                         updateError.message?.toLowerCase().includes('não encontrado') ||
                         updateError.status === 404

      if (!isNotFound) {
        return json({ error: updateError.message }, 400)
      }

      // Usuário não existe no Auth — buscar e-mail na tabela para criar a conta
      const { data: usuarioDB, error: dbError } = await supabaseAdmin
        .from('concrem_fxcp_usuarios')
        .select('id, email, nome, role')
        .eq('id', usuario_id)
        .single()

      if (dbError || !usuarioDB) return json({ error: 'Usuário não encontrado na tabela' }, 404)

      // Criar usuário no Supabase Auth com o mesmo e-mail e nova senha
      const { data: novoAuth, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: usuarioDB.email,
        password: nova_senha,
        email_confirm: true,
      })

      if (createError) return json({ error: 'Erro ao criar conta Auth: ' + createError.message }, 400)

      // Sincronizar o ID do Auth com a tabela (o novo UUID gerado pelo Auth)
      const novoId = novoAuth.user.id
      if (novoId !== usuario_id) {
        await supabaseAdmin
          .from('concrem_fxcp_usuarios')
          .update({ id: novoId })
          .eq('id', usuario_id)
      }
    }

    // Marcar que o usuário deve trocar a senha no próximo login
    await supabaseAdmin
      .from('concrem_fxcp_usuarios')
      .update({ trocar_senha: true })
      .eq('id', usuario_id)

    return json({ success: true })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
})
