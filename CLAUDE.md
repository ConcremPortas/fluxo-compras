# CLAUDE.md — [PROJECT_NAME]

Template de referência para apps web com Vanilla JS + Supabase + Vercel.
Leia antes de qualquer alteração. Preencha os placeholders ao reutilizar.

| Placeholder | Substituir por |
|-------------|---------------|
| `[PROJECT_NAME]` | Nome do projeto |
| `[PROJECT_PREFIX]` | Prefixo das tabelas no banco (ex: `myapp_`) |
| `[PROJECT_REF]` | Project ref do Supabase (ex: `abcdefghij`) |
| `[TURNSTILE_SITE_KEY]` | Site Key pública do Cloudflare Turnstile |
| `[TURNSTILE_SECRET_KEY]` | Secret Key do Turnstile (somente no Supabase Secrets) |
| `[VITE_SUPABASE_URL]` | URL do projeto Supabase |
| `[VITE_SUPABASE_ANON_KEY]` | Anon key pública do Supabase |

---

## 1. Visão Geral do Projeto

[PROJECT_NAME] é um app web com acesso restrito por login, controle de permissões
granular por nível de usuário e operações privilegiadas isoladas em Edge Functions.

**Funcionalidades do projeto:**
- [FEATURE_1]
- [FEATURE_2]
- [FEATURE_N]
- Gerenciamento de usuários e permissões (somente administrador)
- Troca de senha obrigatória no primeiro login

---

## 2. Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML5 + CSS3 + JavaScript puro (vanilla JS, sem frameworks) |
| Build | Vite (injeção de variáveis `.env` e bundle) |
| Autenticação | Supabase Auth (email/password + suporte a username) |
| Banco de dados | Supabase (PostgreSQL) com RLS |
| Edge Functions | Deno/TypeScript no Supabase |
| Proteção de login | Cloudflare Turnstile (modo Managed) |
| Deploy frontend | Vercel |

**Regra absoluta:** sem frameworks CSS (Bootstrap, Tailwind) nem JS (jQuery, React, Vue).

---

## 3. Estrutura de Arquivos

```
index.html                  ← HTML principal + carregamento de scripts
vercel.json                 ← headers de segurança e config de deploy
package.json                ← scripts: dev, build, preview
vite.config.js              ← injeção de variáveis de ambiente
.env                        ← VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (nunca commitar)
CLAUDE.md                   ← este arquivo

src/
  css/
    styles.css              ← todo o CSS do projeto
  js/
    data.js                 ← dados e variáveis de estado global
    render.js               ← funções de renderização e navegação
    auth.js                 ← autenticação, permissões, gestão de usuários
    [feature].js            ← módulos de funcionalidades específicas

supabase/
  functions/
    criar-usuario/          ← cria usuário no Auth + tabela (requer admin)
    alterar-senha/          ← altera senha via service_role + histórico de hashes
    excluir-usuario/        ← exclui do Auth + tabela (requer admin)
    verificar-turnstile/    ← valida token Turnstile (--no-verify-jwt)
```

**Ordem de carregamento dos scripts em `index.html`:**
1. Scripts de dados e estado global
2. Scripts de renderização
3. Scripts de features (cada um pode interceptar funções anteriores)
4. `auth.js` — autenticação (chama `initApp()` após login bem-sucedido)
5. Scripts de UI complementares (selects customizados, microinterações, etc.)

Nunca alterar esta ordem sem verificar dependências entre os módulos.

---

## 4. Padrões de Segurança Obrigatórios

### Autenticação e login
- Login aceita **e-mail** ou **username** (campo `username` na tabela de usuários)
- Se o campo não contém `@`, busca o e-mail correspondente pelo username no banco
- **Cloudflare Turnstile obrigatório**: botão de submit fica desabilitado até
  `onTurnstileSuccess` ser chamado pelo widget
- Site Key pública `[TURNSTILE_SITE_KEY]`: pode ficar no HTML (atributo `data-sitekey`)
- Secret Key `[TURNSTILE_SECRET_KEY]`: **somente** no Supabase Secret (jamais no frontend)
- A função `verificar-turnstile` deve ser deployada com `--no-verify-jwt`
  (é chamada antes do login, sem token de sessão)

### Senhas
- Mínimo **8 caracteres** (validado no frontend e revalidado na Edge Function)
- **Bloqueio das últimas 5 senhas** (tabela `[PROJECT_PREFIX]senha_historico`,
  comparação via SHA-256 com `crypto.subtle.digest`)
- Troca de senha obrigatória controlada pelo campo `trocar_senha BOOLEAN` na tabela de usuários
- Administrador pode ativar/desativar a obrigatoriedade individualmente por usuário

### Chaves e secrets
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` → somente no `.env` (Vite injeta no build)
- `SUPABASE_SERVICE_ROLE_KEY` → somente nas Edge Functions via `Deno.env.get()`
- **Nunca** expor `service_role` no código frontend, mesmo que ofuscado ou em variável de build

### RLS (Row Level Security)
- Todas as tabelas do projeto devem ter RLS habilitado
- Políticas por nível: administrador acessa tudo; outros perfis acessam apenas o necessário
- Operações sensíveis (criar/excluir/alterar senha de outro usuário) passam
  obrigatoriamente por Edge Functions com `service_role`

---

## 5. Padrões de Edge Functions

### Estrutura padrão

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verificar Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Verificar identidade com anon key (NUNCA pular este passo)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 3. Verificar nível de permissão se necessário
    const { data: perfil } = await supabaseClient
      .from('[PROJECT_PREFIX]usuarios')
      .select('nivel, ativo')
      .eq('id', user.id)
      .single()
    if (!perfil || perfil.nivel !== 'administrador' || !perfil.ativo) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 4. Operação privilegiada com service_role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    // ... lógica da função

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

### Regras
- **Sempre** incluir `x-client-info` e `apikey` no `corsHeaders`
- **Sempre** verificar identidade via `anon key` antes de qualquer `service_role`
- **Sempre** responder ao método `OPTIONS` com `corsHeaders` (preflight CORS)
- Funções públicas (sem sessão, ex: Turnstile): deploy com `--no-verify-jwt`
- Funções privadas: JWT é verificado automaticamente pelo Supabase (não usar `--no-verify-jwt`)
- Nunca usar `service_role` diretamente no cliente — sempre via Edge Function

---

## 6. Padrões de Banco de Dados

### Prefixo de tabelas
Todas as tabelas do projeto usam o prefixo `[PROJECT_PREFIX]`:

| Tabela | Finalidade |
|--------|-----------|
| `[PROJECT_PREFIX]usuarios` | Perfis (id, nome, email, username, nivel, ativo, trocar_senha) |
| `[PROJECT_PREFIX]permissoes_perfil` | Permissões padrão por nível de acesso |
| `[PROJECT_PREFIX]permissoes_usuario` | Overrides individuais por usuário |
| `[PROJECT_PREFIX]senha_historico` | Hashes SHA-256 das últimas senhas usadas |
| `[PROJECT_PREFIX]audit_*` | Tabelas de auditoria de operações |

### Convenções SQL obrigatórias

```sql
-- Chave primária
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- Timestamps
criado_em     TIMESTAMPTZ DEFAULT NOW()
atualizado_em TIMESTAMPTZ DEFAULT NOW()

-- Foreign keys com cascade
usuario_id UUID REFERENCES [PROJECT_PREFIX]usuarios(id) ON DELETE CASCADE

-- UNIQUE onde aplicável
username TEXT UNIQUE
email    TEXT UNIQUE
```

---

## 7. Padrões de Permissões

### Três níveis de acesso

| Nível | Descrição |
|-------|-----------|
| `administrador` | Acesso total — gerencia usuários, permissões e configurações |
| `gerente` | Acesso intermediário — sem gestão de usuários |
| `vendedor` | Acesso básico — somente leitura ou ações limitadas |

### Como funciona o carregamento de permissões

A função `iniciarApp()` carrega permissões em três camadas (ordem de precedência):

```
PERMISSOES_PADRAO[nivel]          ← fallback hardcoded no frontend (auth.js)
        ↓ merge
[PROJECT_PREFIX]permissoes_perfil ← override por nível (editável pelo admin)
        ↓ merge
[PROJECT_PREFIX]permissoes_usuario ← override individual por usuário
        ↓
window.permissoes                 ← resultado final usado em temPermissao()
```

### Regra para adicionar uma nova permissão

1. Adicionar em `PERMISSOES_PADRAO` nos três perfis em `auth.js`
2. Adicionar em `PERM_LABELS` em `permissoes.js` (rótulo para a UI)
3. Adicionar na categoria correta em `PERM_CATS` em `permissoes.js`
4. Usar `temPermissao('chave')` no frontend para verificar acesso
5. Nunca verificar permissões apenas no frontend para operações destrutivas —
   validar também na Edge Function

---

## 8. Padrões de Deploy

### Frontend — Vercel

Variáveis de ambiente obrigatórias no painel da Vercel:
```
VITE_SUPABASE_URL=[VITE_SUPABASE_URL]
VITE_SUPABASE_ANON_KEY=[VITE_SUPABASE_ANON_KEY]
```

`vercel.json` deve conter headers de segurança para todas as rotas (`source: "/(.*)"`)  :

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options",           "value": "SAMEORIGIN" },
        { "key": "X-Content-Type-Options",    "value": "nosniff" },
        { "key": "Referrer-Policy",           "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy",        "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "Content-Security-Policy",   "value": "default-src 'self'; ..." }
      ]
    }
  ]
}
```

**CSP mínima para este stack:**

| Diretiva | Domínios obrigatórios |
|----------|-----------------------|
| `script-src` | `cdn.jsdelivr.net`, `fonts.googleapis.com`, `challenges.cloudflare.com` |
| `style-src` | `fonts.googleapis.com`, `fonts.gstatic.com`, `challenges.cloudflare.com` |
| `connect-src` | `*.supabase.co`, `wss://*.supabase.co`, `challenges.cloudflare.com`, `cdn.jsdelivr.net` |
| `frame-src` | `challenges.cloudflare.com` |
| `worker-src` | `blob:` |

**Ao adicionar novos scripts ou iframes externos, atualizar `vercel.json` antes do deploy.**

### Edge Functions — Supabase

```bash
# Deploy com JWT (funções privadas — padrão)
supabase functions deploy <nome> --project-ref [PROJECT_REF]

# Deploy sem JWT (funções públicas, ex: verificar-turnstile)
supabase functions deploy verificar-turnstile --project-ref [PROJECT_REF] --no-verify-jwt
```

### Cloudflare Turnstile

1. Cadastrar o hostname do site no painel da Cloudflare
2. Colocar a Site Key no HTML: `data-sitekey="[TURNSTILE_SITE_KEY]"`
3. Configurar a Secret Key como Supabase Secret:
   ```bash
   supabase secrets set TURNSTILE_SECRET_KEY=[TURNSTILE_SECRET_KEY] --project-ref [PROJECT_REF]
   ```

---

## 9. Comandos Úteis

```bash
# Desenvolvimento local
npm run dev

# Build para produção
npm run build

# Deploy de Edge Function (com JWT — padrão)
supabase functions deploy <nome> --project-ref [PROJECT_REF]

# Deploy de Edge Function (sem JWT — funções públicas)
supabase functions deploy <nome> --project-ref [PROJECT_REF] --no-verify-jwt

# Configurar secret
supabase secrets set CHAVE=valor --project-ref [PROJECT_REF]

# Listar secrets configurados
supabase secrets list --project-ref [PROJECT_REF]

# Ver logs de Edge Function em tempo real
supabase functions logs <nome> --project-ref [PROJECT_REF]
```

---

## 10. O Que NUNCA Fazer (Anti-patterns)

### Frontend
- **Nunca** usar frameworks CSS (Bootstrap, Tailwind) ou JS (jQuery, React, Vue)
- **Nunca** expor `SUPABASE_SERVICE_ROLE_KEY` em nenhum arquivo do frontend,
  mesmo que ofuscado ou injetado via variável de build
- **Nunca** sobrescrever dados originais em memória — cálculos derivados (acréscimos,
  reajustes) são aplicados na exibição, os dados base permanecem intocados
- **Nunca** alterar a ordem de carregamento dos scripts sem verificar dependências

### Segurança
- **Nunca** chamar `service_role` diretamente do frontend
- **Nunca** pular a verificação de identidade (`auth.getUser()`) antes de operações privilegiadas
- **Nunca** remover o Turnstile do fluxo de login
- **Nunca** armazenar senhas em texto plano — usar hash SHA-256 no histórico
- **Nunca** permitir que um usuário exclua ou altere conta alheia sem verificar
  nível de permissão na Edge Function
- **Nunca** permitir que um usuário exclua a própria conta (`usuario_id !== user.id`)

### Deploy
- **Nunca** commitar o arquivo `.env`
- **Nunca** usar `--no-verify-jwt` em funções que requerem usuário autenticado
- **Nunca** adicionar domínio externo (script, iframe, fonte, API) sem atualizar
  o `Content-Security-Policy` no `vercel.json`

### Banco de dados
- **Nunca** criar tabelas sem o prefixo `[PROJECT_PREFIX]`
- **Nunca** desabilitar RLS em tabelas de produção
- **Nunca** usar `ON DELETE SET NULL` em foreign keys críticas — preferir `CASCADE`
  ou proteger no nível da aplicação
- **Nunca** fazer operações de escrita sensíveis diretamente do frontend —
  sempre via Edge Function com `service_role`
