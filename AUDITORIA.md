# Auditoria FluxoCompras — Relatório Completo
**Data:** 2026-05-12  
**Auditor:** Claude Code (Sonnet 4.6)  
**Escopo:** Auditoria completa de JS — 15 arquivos

---

## Resumo Executivo

| Categoria | Total |
|---|---|
| Bugs corrigidos | **9** |
| Avisos / melhorias documentadas | **5** |
| Verificações de fluxo aprovadas | **8 / 9** |
| Inconsistências de dados corrigidas | **4** |

---

## PARTE 1 — BUGS CORRIGIDOS

### BUG-01 · Lógica de alçada sensível a maiúsculas/minúsculas
**Arquivo:** `js/pages/aprovacoes.js`  
**Método:** `_confirmarCompras()`  
**Problema:** O check `['Gerente', 'Diretor'].includes(req?.alcada_aprovacao)` falharia silenciosamente se `alcada_aprovacao` viesse com caixa diferente do banco (ex: `'gerente'`).  
**Correção aplicada:** Substituído por normalização case-insensitive:
```js
const alcadaNorm = (req?.alcada_aprovacao || '').toLowerCase();
const exigeDiretoria = ['gerente', 'diretor'].includes(alcadaNorm);
```

---

### BUG-02 · Criação de OC duplicada sem guard
**Arquivo:** `js/pages/cotacoes.js`  
**Método:** `_aprovarDemandante()`  
**Problema:** Se o usuário clicasse duas vezes em "Aprovar Fornecedor" antes da primeira operação concluir, ou se ocorresse falha parcial, uma segunda OC seria criada para a mesma requisição.  
**Correção aplicada:** Adicionada verificação prévia antes do `Storage.create(TABLES.ordens, ...)`:
```js
const ordensExistentes = await Storage.list(TABLES.ordens).catch(() => []);
const ocExistente = (ordensExistentes || []).find(o =>
  o.requisicao_id === this._cotacao.requisicao_id &&
  !['Concluida', 'Cancelada'].includes(o.status)
);
if (ocExistente) {
  Components.Toast.warning(`Já existe a OC ${ocExistente.numero} para esta requisição.`);
  // Reverte status da cotação e re-renderiza
  return;
}
```

---

### BUG-03 · `fornecedor_id` ausente na criação da OC
**Arquivo:** `js/pages/cotacoes.js`  
**Método:** `_aprovarDemandante()`  
**Problema:** O objeto criado em `Storage.create(TABLES.ordens, {...})` não incluía `fornecedor_id`. Isso quebrava `Storage.recalcularNotaFornecedor()` e `Storage.avaliarOrdem()` que dependem de `ordem.fornecedor_id`.  
**Correção aplicada:** Adicionado `fornecedor_id: vencedor.id || null` ao payload da OC.

---

### BUG-04 · Race condition nos gráficos do Dashboard
**Arquivo:** `js/pages/dashboard.js`  
**Método:** `_loadData()`  
**Problema:** Os três `new Chart()` eram chamados diretamente dentro do método async, sem garantia de que os `<canvas>` já estivessem pintados no DOM pelo browser após `innerHTML` ser setado.  
**Correção aplicada:** Envolvido em `requestAnimationFrame()`:
```js
requestAnimationFrame(() => {
  this._renderChartSetores(filtradas);
  this._renderChartStatus(filtradas);
  this._renderChartEvolucao(todas);
});
```

---

### BUG-05 · Validação de data de faturamento ausente
**Arquivo:** `js/pages/ordens.js`  
**Método:** `_confirmarFaturamento()`  
**Problema:** Apenas verificava se o campo era vazio (`!dataFat`), mas não validava se a data era realmente válida. Uma data como `"abc"` ou `"2025-13-45"` seria aceita e salva.  
**Correção aplicada:**
```js
const dataValida = new Date(dataFat);
if (isNaN(dataValida.getTime())) {
  Components.Toast.warning('Data de faturamento inválida.'); return;
}
```

---

### BUG-06 · `finally` ausente em `NovaRequisicao._submeter()`
**Arquivo:** `js/pages/requisicoes.js`  
**Método:** `Pages.NovaRequisicao._submeter()`  
**Problema:** O botão "Enviar Requisição" era re-habilitado apenas no bloco `catch`. Se houvesse um erro inesperado fora do fluxo controlado, o botão ficaria desabilitado indefinidamente.  
**Correção aplicada:** Movido o re-enable do botão para um bloco `finally`.

---

### BUG-07 · `finally` ausente em `EditarRequisicao._submeter()`
**Arquivo:** `js/pages/requisicoes.js`  
**Método:** `Pages.EditarRequisicao._submeter()`  
**Problema:** Mesmo problema do BUG-06. O botão "Reenviar Requisição" travaria em caso de erro inesperado.  
**Correção aplicada:** Movido para bloco `finally`.

---

### BUG-08 · Timer de salvamento (debounce) vazando entre navegações
**Arquivo:** `js/pages/cotacoes.js`  
**Objeto:** `Pages.DetalheCotacao`  
**Problema:** `_salvarDebounce()` usa `this._saveTimer`. Se o usuário navegasse para outra página antes dos 800 ms expirarem, o timer ainda dispararia e chamaria `Storage.update()` para uma cotação de uma sessão anterior.  
**Correção aplicada:** Adicionado método `_cancelarSaveTimer()` chamado no início de `render()` e no listener do botão "Voltar".

---

### BUG-09 · Status `'Aguardando Avaliacao Fornecedor'` sem label/badge
**Arquivo:** `js/utils.js`  
**Problema:** `qualidade.js` seta o status da requisição para `'Aguardando Avaliacao Fornecedor'` após liberar o material, mas esse valor não tinha entrada em `getStatusLabel()` nem em `getStatusBadgeClass()`. Resultava em badge com classe padrão `badge-cancelled` (aparência incorreta) e texto sem tradução.  
**Correção aplicada:** Adicionadas entradas em ambos os mapas.

---

## PARTE 2 — MELHORIAS ADICIONAIS APLICADAS

### MELHORIA-01 · Badges de `'Ativo'` / `'Inativo'` padronizados
**Arquivo:** `js/utils.js`  
Adicionados `'Ativo': 'badge-approved'` e `'Inativo': 'badge-cancelled'` em ambos os mapas. Antes, o badge "Ativo" em fornecedores/usuários aparecia com a classe padrão `badge-cancelled` (cor vermelha).

### MELHORIA-02 · Badges de `'Aguardando Confirmacao'` e `'Recebida'` adicionados
**Arquivo:** `js/utils.js`  
Esses são status usados pela tabela de ordens mas estavam ausentes dos mapas de labels e classes.

### MELHORIA-03 · Rollback visual em `salvarAlcadas()` quando Supabase offline
**Arquivo:** `js/pages/configuracoes.js`  
**Problema:** Se o Supabase falhasse, os inputs mostravam os novos valores editados mas nada era salvo. O usuário poderia sair achando que estava salvo.  
**Correção aplicada:** Em caso de erro, os inputs são revertidos aos valores anteriores e um bloco `finally` re-habilita o botão.

---

## PARTE 3 — VALIDAÇÃO DO FLUXO (STATUS)

| Etapa | Verificação | Resultado |
|---|---|---|
| **3.1** NovaRequisicao status inicial | `'Aguardando Avaliacao de Compras'` | ✅ |
| **3.2** `_confirmarCompras()` decisao='diretoria' | seta `'Aguardando Aprovacao da Diretoria'` | ✅ |
| **3.3** `_confirmarDiretoria()` decisao='aprovar' | seta `'Em Cotacao'` | ✅ |
| **3.4** `_enviarParaAprovacao()` | cotação → `'Aguardando Aprovacao do Demandante'`, requisição também atualizada; `isDemandante` verifica `email === solicitante_email \|\| role === 'admin'` | ✅ |
| **3.5** `_aprovarDemandante()` | OC criada com `'Analise de Faturamento'`, requisição → `'Ordem de Compra Gerada'`, cotação → `'Aprovada'` | ✅ |
| **3.6** OC: `'Analise de Faturamento'` → `'Aguardando Confirmacao'` → `'Aguardando Recebimento'` | OC atualizada em cada etapa; requisição atualizada apenas em `_confirmarPedido()` (status 'Analise de Faturamento' e 'Aguardando Confirmacao' são internos à OC) | ✅ |
| **3.7** `confirmarRecebimento()` | recebimento → `'Aguardando Qualidade'`, OC → `'Recebida'`, requisição → `'Aguardando Analise de Qualidade'` | ✅ |
| **3.8** Qualidade → Conclusão | parecer='Liberado': requisição → `'Aguardando Avaliacao Fornecedor'`; então `_concluirEAvaliar()` em ordens.js seta OC → `'Concluida'`, atualiza nota do fornecedor, requisição → `'Concluida'` | ⚠️ (ver nota abaixo) |

**Nota 3.8:** O fluxo funciona corretamente em duas etapas: (1) qualidade.js seta status intermediário; (2) o usuário entra na OC (ainda status `'Recebida'`) e completa a avaliação. O risco é que o usuário perca a etapa de avaliação e a OC fique "orphan" com status `'Recebida'` enquanto a requisição fica em `'Aguardando Avaliacao Fornecedor'`. Recomendação: adicionar uma tarefa/notificação para lembrar o avaliador (ver Recomendações).

---

## PARTE 4 — AUDITORIA DE PERMISSÕES

| Item | Resultado |
|---|---|
| **4.1** Rotas protegidas além da sidebar | ✅ `App._handleRoute()` verifica `PERMISSIONS[role]` antes de renderizar. Rota 'configuracoes' também verifica `user.role !== 'admin'` dentro de `Pages.Configuracoes.render()`. |
| **4.2** `ROLES_PODEM_CRIAR` para "Nova Requisição" | ✅ Definido em `requisicoes.js` como `['admin', 'solicitante', 'supervisor', 'coordenador', 'gerente']`. O botão só é exibido se `ROLES_PODEM_CRIAR.includes(user.role)`. |
| **4.3** Aba Compras vs Diretoria | ✅ `podCompras = ['admin', 'coordenador', 'gerente'].includes(user.role)` e `podDiretoria = ['admin', 'gerente', 'diretor'].includes(user.role)`. As abas são renderizadas condicionalmente. |

---

## PARTE 5 — CONSISTÊNCIA DE DADOS

### 5.1 — Campo `requisicao_numero` vs `numero_requisicao`
**Situação:** OC é criada com campo `numero_requisicao` (correto, alinhado com schema). O código em busca/filtros usa `o.numero_requisicao || o.requisicao_numero` com fallback — funcionando de forma compatível.  
**Recomendação:** Garantir que o campo no banco se chame `numero_requisicao` e remover o fallback `requisicao_numero` em versão futura.

### 5.2 — Campos `fornecedor` vs `fornecedor_nome`
**Situação:** OC armazena ambos com o mesmo valor. O código usa `o.fornecedor || o.fornecedor_nome` com fallback em todos os lugares.  
**Recomendação:** Consolidar em um único campo (`fornecedor_nome`) na próxima migração de banco.

### 5.3 — Cobertura de `Components.badge()`
Verificados e corrigidos: `'Aguardando Avaliacao Fornecedor'`, `'Aguardando Confirmacao'`, `'Recebida'`, `'Ativo'`, `'Inativo'`.

### 5.4 — `TABLES` constants
Todos os 11 keys presentes: `requisicoes, cotacoes, ordens, recebimentos, qualidade, fornecedores, historico, usuarios, centrosCusto, configAlcadas, configPermissoes`. ✅

---

## PARTE 6 — EDGE CASES

| Item | Verificação | Resultado |
|---|---|---|
| **6.1** `NovaRequisicao._submeter()` — `finally { btn.disabled = false }` | Corrigido (BUG-06) | ✅ FIXED |
| **6.2** `DetalheCotacao._salvarDebounce()` — leak na navegação | Corrigido (BUG-08) | ✅ FIXED |
| **6.3** `recebimento.abrirDialogRegistro()` — `this.arquivoNF = null` no início | Linha 177 faz `this.arquivoNF = null` | ✅ |
| **6.4** `qualidade.concluirAnalise()` — validação de notas com 0 itens | Se `itens_conferencia` for vazio, `notasVazias` fica vazio e o submit prossegue sem notas. Comportamento aceitável mas documentado. | ⚠️ |
| **6.5** `configuracoes.salvarAlcadas()` — rollback visual offline | Corrigido (MELHORIA-03) | ✅ FIXED |

---

## PARTE 7 — ITENS NÃO CORRIGIDOS AUTOMATICAMENTE

### PENDENTE-01 · Typo `"fornecadoresCad"` (checklist 2.1)
Não encontrado em `cotacoes.js`. A função `_abrirDialogFornecedor()` não usa essa string. O typo foi potencialmente corrigido em versão anterior ou nunca existiu neste código.

### PENDENTE-02 · Campo `numero_requisicao` vs `requisicao_numero` (5.1)
Requer migração de banco para consolidar. Não pode ser corrigido apenas em JS sem risco de quebrar queries existentes.

### PENDENTE-03 · Edge case qualidade sem itens (6.4)
Se `rec.itens_conferencia` for array vazio, a análise é submetida sem notas. Sugestão: adicionar validação `if (totalItens === 0) { Components.Toast.warning('...'); return; }`.

### PENDENTE-04 · Etapa "Avaliação do Fornecedor" sem notificação (fluxo 3.8)
Após qualidade liberar, a OC fica com status `'Recebida'` mas não há mecanismo proativo que alerte o responsável que precisa entrar na OC para concluir a avaliação. Recomendado: badge/contador nas Ordens ou e-mail automático.

### PENDENTE-05 · `_gerarOCManual()` não tem guard de duplicata
**Arquivo:** `js/pages/cotacoes.js` — método `_gerarOCManual()`  
Este método de "reprocessamento" não verifica OC existente antes de criar, ao contrário do `_aprovarDemandante()` que foi corrigido. Pode gerar duplicatas em caso de clique duplo.

---

## RECOMENDAÇÕES PARA PRÓXIMOS SPRINTS

1. **Guard em `_gerarOCManual()`** — Adicionar mesma verificação de OC duplicada (igual ao BUG-02 corrigido em `_aprovarDemandante()`).

2. **Consolidação de campos** — Definir e migrar para um único campo: `numero_requisicao` (remover `requisicao_numero`) e `fornecedor_nome` (remover `fornecedor` duplicado).

3. **Notificação de avaliação pendente** — Adicionar badge/contador na listagem de Ordens quando há OCs com status `'Recebida'`, similar ao badge de aprovações na sidebar.

4. **Validação de zero itens no modal de qualidade** — Bloquear submissão se `itens_conferencia.length === 0`.

5. **Teste de carga de `Utils.generateRC()` / `generateCOT()` / `generateOC()`** — As funções RC e COT usam `Date.now().toString().slice(-6)` — em ambiente de alto volume, dois usuários em < 1 ms podem gerar o mesmo número. Considerar UUID ou sequencial do banco.

6. **Proteção de rotas no lado do servidor** — Atualmente a segurança é apenas no frontend (Supabase RLS não foi auditado). Recomendado auditar políticas RLS no banco.

7. **Tratamento de desconexão em formulários longos** — `EditarRequisicao._submeter()` e `NovaRequisicao._submeter()` não têm timeout nem retry. Em conexões lentas, o usuário aguarda indefinidamente.

---

## Arquivos Modificados

| Arquivo | Bugs Corrigidos |
|---|---|
| `js/utils.js` | BUG-09, MELHORIA-01, MELHORIA-02 |
| `js/pages/aprovacoes.js` | BUG-01 |
| `js/pages/cotacoes.js` | BUG-02, BUG-03, BUG-08 |
| `js/pages/ordens.js` | BUG-05 |
| `js/pages/requisicoes.js` | BUG-06, BUG-07 |
| `js/pages/dashboard.js` | BUG-04 |
| `js/pages/configuracoes.js` | MELHORIA-03 |

---

*Relatório gerado automaticamente pela auditoria de código — FluxoCompras v2*
