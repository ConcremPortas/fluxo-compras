# Correções Pós-Auditoria — FluxoCompras
**Data:** 2026-05-12

---

## Pendências Resolvidas

| Item | Status | Detalhe |
|---|---|---|
| **PENDENTE-01** | ✅ Não encontrado — OK | Busca por `"fornecada"` em `cotacoes.js` não retornou resultados. O typo foi corrigido em versão anterior ou nunca existiu neste código. |
| **PENDENTE-03** | ✅ Corrigido | `qualidade.js · concluirAnalise()` — adicionada validação `if (totalItens === 0)` que bloqueia submissão e exibe toast de aviso. |
| **PENDENTE-04** | ✅ Corrigido | `ordens.js · _renderTabela()` — adicionado banner âmbar com contagem de OCs com status `'Recebida'`, visível acima da tabela quando há OCs aguardando avaliação do fornecedor. |
| **PENDENTE-05** | ✅ Corrigido | `cotacoes.js · _gerarOCManual()` — adicionado guard idêntico ao de `_aprovarDemandante()`. Verifica OC ativa existente para o mesmo `requisicao_id` antes de criar. Também reutiliza a lista já carregada para calcular `totalOCs`, eliminando uma chamada Supabase redundante. |

---

## Recomendações Aplicadas

| Item | Status | Arquivos Alterados | Detalhe |
|---|---|---|---|
| **REC-01** Campos padronizados | ✅ Já conformes | — | `ordens.js`, `recebimento.js`, `qualidade.js`, `relatorios.js` já usavam o padrão `o.numero_requisicao \|\| o.requisicao_numero` e `o.fornecedor_nome \|\| o.fornecedor` em todos os acessos. Nenhuma alteração necessária. |
| **REC-02** RC/COT anti-colisão | ✅ Corrigido | `js/utils.js` | `generateRC()` e `generateCOT()` agora combinam timestamp dos últimos 5 dígitos + 1 dígito aleatório (0-9), reduzindo probabilidade de colisão em ~10×. Formato mantido: `RC-XXXXXR` / `COT-XXXXXR`. |
| **REC-03** Timeout formulários | ✅ Corrigido | `js/pages/requisicoes.js` | `NovaRequisicao._submeter()` e `EditarRequisicao._submeter()` — adicionado `setTimeout` de 15 segundos que exibe toast de aviso e re-habilita o botão. O timer é cancelado com `clearTimeout` no `try` (sucesso) e no `finally` (garantia extra). |
| **REC-04** Badge sidebar OCs | ✅ Corrigido | `js/app.js` | `_loadAprovacoesBadge()` agora soma OCs com `status === 'Recebida'` ao total de aprovações pendentes. O badge passa a refletir pendências de aprovação **e** avaliação de fornecedor em um único número. |
| **REC-05** Desconexão global | ✅ Corrigido | `js/storage.js` | Adicionada detecção de erro de rede no helper `_check()` (ponto central de todos os erros Supabase). Detecta `!navigator.onLine`, `'Failed to fetch'`, e `NETWORK_ERROR`, exibindo toast específico antes de relançar o erro. |

---

## Itens que requerem ação futura (banco/infra)

- **Migração de campo `numero_requisicao`** — O código usa fallback `o.numero_requisicao || o.requisicao_numero`. Para remover o fallback, é necessário confirmar o nome exato da coluna no schema Supabase e, se necessário, criar uma migration que renomeia `requisicao_numero` → `numero_requisicao` em `concrem_fxcp_ordens_compra`.

- **Migração de campo `fornecedor_nome`** — Igual ao item acima: confirmar se o banco tem `fornecedor` ou `fornecedor_nome` (ou ambos) e consolidar em um único campo.

- **Auditoria de RLS no Supabase** — As Row Level Security policies não foram auditadas neste ciclo. Recomendado verificar que usuários sem role `admin` não consigam acessar tabelas restritas diretamente via API.

- **Monitoramento de colisão RC/COT em produção** — A nova geração (timestamp 5 dígitos + 1 aleatório) reduz colisões mas não as elimina. Em ambiente de alto volume (> 10 req/seg), considerar sequencial do banco ou UUID como identificador canônico.

- **Notificação proativa para avaliação de fornecedor** — O badge na sidebar (REC-04) agora inclui OCs pendentes, mas não há e-mail nem push notification. Para times distribuídos, considerar trigger no Supabase ou webhook que notifique o responsável quando uma OC passa para `'Recebida'`.

---

## Arquivos Modificados neste ciclo

| Arquivo | Alteração |
|---|---|
| `js/pages/qualidade.js` | PENDENTE-03: validação zero itens |
| `js/pages/cotacoes.js` | PENDENTE-05: guard duplicata em `_gerarOCManual()` |
| `js/pages/ordens.js` | PENDENTE-04: banner âmbar de OCs aguardando avaliação |
| `js/utils.js` | REC-02: `generateRC()` e `generateCOT()` anti-colisão |
| `js/pages/requisicoes.js` | REC-03: timeout 15s em `NovaRequisicao` e `EditarRequisicao` |
| `js/app.js` | REC-04: badge sidebar inclui OCs `'Recebida'` |
| `js/storage.js` | REC-05: detecção de erro de rede em `_check()` |

*Total: 7 arquivos · 8 correções aplicadas*
