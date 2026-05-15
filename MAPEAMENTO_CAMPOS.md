# Mapeamento de Campos — Pré-Migration
**Data:** 2026-05-12  
**Escopo:** Padronização dos campos `numero_requisicao` / `requisicao_numero` e `fornecedor_nome` / `fornecedor` na tabela `concrem_fxcp_ordens_compra`

---

## Campo: `numero_requisicao` / `requisicao_numero`

### Leituras encontradas — todas já com fallback ✅

| Arquivo | Linha | Padrão em uso | Status |
|---|---|---|---|
| `ordens.js` | 92 | `o.numero_requisicao \|\| o.requisicao_numero \|\| ''` | ✅ OK |
| `ordens.js` | 149 | `o.numero_requisicao \|\| o.requisicao_numero \|\| '—'` | ✅ OK |
| `ordens.js` | 236 | `ordem.numero_requisicao \|\| ordem.requisicao_numero` | ✅ OK |
| `ordens.js` | 264-265 | `o.numero_requisicao \|\| o.requisicao_numero` | ✅ OK |
| `ordens.js` | 302 | `o.numero_requisicao \|\| o.requisicao_numero \|\| '—'` | ✅ OK |
| `ordens.js` | 799 | `o.numero_requisicao \|\| o.requisicao_numero \|\| '—'` | ✅ OK |
| `recebimento.js` | 105 | `oc.numero_requisicao \|\| oc.requisicao_numero \|\| ''` | ✅ OK |
| `relatorios.js` | 804 | `o.numero_requisicao \|\| o.requisicao_numero \|\| '—'` | ✅ CORRIGIDO (era apenas `o.numero_requisicao \|\| '—'`) |

### Escritas encontradas e duplicadas

| Arquivo | Método | Antes | Depois |
|---|---|---|---|
| `cotacoes.js` | `_aprovarDemandante()` | `numero_requisicao: this._cotacao.requisicao_numero` | `numero_requisicao: this._cotacao.requisicao_numero \|\| this._cotacao.numero_requisicao` **+** `requisicao_numero: this._cotacao.requisicao_numero \|\| this._cotacao.numero_requisicao` |
| `cotacoes.js` | `_gerarOCManual()` | `numero_requisicao: cot.requisicao_numero` | `numero_requisicao: cot.requisicao_numero \|\| cot.numero_requisicao` **+** `requisicao_numero: cot.requisicao_numero \|\| cot.numero_requisicao` |
| `recebimento.js` | `confirmarRecebimento()` | *(campo ausente)* | `numero_requisicao: oc.numero_requisicao \|\| oc.requisicao_numero \|\| null` **ADICIONADO** |

---

## Campo: `fornecedor_nome` / `fornecedor`

### Leituras — ordem corrigida para priorizar o nome canônico `fornecedor_nome`

| Arquivo | Linha | Antes | Depois | Status |
|---|---|---|---|---|
| `ordens.js` | 93 | `o.fornecedor \|\| o.fornecedor_nome` | — | ✅ OK (fallback já existia) |
| `ordens.js` | 148 | `o.fornecedor \|\| o.fornecedor_nome \|\| '—'` | — | ✅ OK |
| `ordens.js` | 355 | `o.fornecedor \|\| o.fornecedor_nome \|\| '—'` | — | ✅ OK |
| `ordens.js` | 720 | `this._ordem.fornecedor \|\| this._ordem.fornecedor_nome` | — | ✅ OK |
| `ordens.js` | 790 | `o.fornecedor \|\| o.fornecedor_nome \|\| '—'` | — | ✅ OK |
| `ordens.js` | 834 | `o.fornecedor \|\| o.fornecedor_nome \|\| '—'` | — | ✅ OK |
| `recebimento.js` | 97 | `oc.fornecedor \|\| oc.fornecedor_nome \|\| '—'` | `oc.fornecedor_nome \|\| oc.fornecedor \|\| '—'` | ✅ CORRIGIDO |
| `qualidade.js` | 97 | `oc.fornecedor \|\| oc.fornecedor_nome \|\| rec.fornecedor` | `oc.fornecedor_nome \|\| oc.fornecedor \|\| rec.fornecedor` | ✅ CORRIGIDO |
| `qualidade.js` | 184 | `oc.fornecedor \|\| oc.fornecedor_nome \|\| rec.fornecedor` | `oc.fornecedor_nome \|\| oc.fornecedor \|\| rec.fornecedor` | ✅ CORRIGIDO |
| `qualidade.js` | 436 | `oc.fornecedor \|\| oc.fornecedor_nome \|\| rec.fornecedor` | `oc.fornecedor_nome \|\| oc.fornecedor \|\| rec.fornecedor` | ✅ CORRIGIDO |
| `relatorios.js` | 272 | `o.fornecedor_nome \|\| o.fornecedor \|\| '—'` | — | ✅ OK (já na ordem certa) |
| `relatorios.js` | 805 | `o.fornecedor_nome \|\| o.fornecedor \|\| '—'` | — | ✅ OK |
| `fornecedores.js` | 165-166 | `o.fornecedor_nome \|\| o.fornecedor` | — | ✅ OK |
| `fornecedores.js` | 347-348 | `o.fornecedor_nome \|\| o.fornecedor` | — | ✅ OK |

### Escritas encontradas e duplicadas

| Arquivo | Método | Situação |
|---|---|---|
| `cotacoes.js · _aprovarDemandante()` | `fornecedor: vencedor.nome` + `fornecedor_nome: vencedor.nome` | ✅ Ambos os campos já presentes |
| `cotacoes.js · _gerarOCManual()` | `fornecedor: vencedor.nome` + `fornecedor_nome: vencedor.nome` | ✅ Ambos os campos já presentes |
| `recebimento.js · confirmarRecebimento()` | *(campo ausente)* | `fornecedor_nome: oc.fornecedor_nome \|\| oc.fornecedor \|\| null` **ADICIONADO** |

---

## Campos de cotação (`cotacoes` table) — NÃO afetados pela migration

> Os campos `c.requisicao_numero` em `cotacoes.js` (linhas 93, 136, 237, 371) pertencem à tabela `concrem_fxcp_cotacoes`, que **não** está sendo migrada. Mantidos sem alteração.

---

## Arquivos modificados neste ciclo

| Arquivo | Alterações |
|---|---|
| `js/pages/cotacoes.js` | 2 payloads OC: `numero_requisicao` agora com fallback; `requisicao_numero` adicionado como alias |
| `js/pages/relatorios.js` | 1 leitura: `o.numero_requisicao` → `o.numero_requisicao \|\| o.requisicao_numero` |
| `js/pages/recebimento.js` | 1 leitura: ordem corrigida para `fornecedor_nome` primeiro; 2 campos adicionados ao payload |
| `js/pages/qualidade.js` | 3 leituras: ordem corrigida para `fornecedor_nome` primeiro |

---

## Checklist para execução da migration

Antes de aplicar no banco:
- [x] Todos os writes incluem `numero_requisicao` E `requisicao_numero` simultaneamente
- [x] Todos os writes incluem `fornecedor_nome` E `fornecedor` simultaneamente  
- [x] Todos os reads usam fallback `A || B`
- [x] `numero_requisicao` é priorizado nas leituras
- [x] `fornecedor_nome` é priorizado nas leituras
- [ ] Confirmar no schema Supabase o nome exato das colunas atuais
- [ ] Executar migration: `ALTER TABLE concrem_fxcp_ordens_compra RENAME COLUMN ...` (se necessário)
- [ ] Após migration: remover os aliases nos payloads de escrita

## Status: PRONTO PARA MIGRATION ✅
