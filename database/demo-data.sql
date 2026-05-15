/* ============================================================
   FLUXOCOMPRAS — Dados de Demonstração
   Execute este script no SQL Editor do Supabase APÓS criar
   todas as tabelas com database/schema.sql.

   Ordem de execução:
   1. Limpar dados existentes (opcional)
   2. Inserir requisições em cada estágio do fluxo
   3. Inserir histórico de transições
   4. Inserir cotação e ordem de compra associadas
   5. Inserir recebimento e análise de qualidade
   ============================================================ */

-- ============================================================
-- 0. LIMPAR DADOS DE DEMONSTRAÇÃO ANTERIORES (opcional)
--    Descomente para reiniciar do zero
-- ============================================================
/*
TRUNCATE TABLE
  concrem_fxcp_qualidade,
  concrem_fxcp_recebimentos,
  concrem_fxcp_ordens_compra,
  concrem_fxcp_cotacoes,
  concrem_fxcp_historico,
  concrem_fxcp_requisicoes
RESTART IDENTITY CASCADE;
*/

-- ============================================================
-- 1. REQUISIÇÕES EM DIFERENTES ESTÁGIOS DO FLUXO
-- ============================================================

-- RC-100001: Aguardando Avaliação de Compras (urgente)
INSERT INTO concrem_fxcp_requisicoes (
  numero, solicitante_nome, solicitante_email, setor,
  data_necessidade, urgente, justificativa_urgencia,
  itens, valor_total, fornecedor_sugerido, forma_pagamento,
  alcada_aprovacao, observacoes, status
) VALUES (
  'RC-100001',
  'Carlos Solicitante', 'carlos@empresa.com',
  'Tecnologia da Informacao',
  CURRENT_DATE + 7, true,
  'Equipamentos necessarios para novo colaborador que inicia na proxima semana.',
  '[
    {"descricao":"Notebook Dell i7 16GB","quantidade":2,"unidade":"UN","valor_unitario":4500.00,"valor_total":9000.00},
    {"descricao":"Monitor 27 pol Full HD","quantidade":2,"unidade":"UN","valor_unitario":1200.00,"valor_total":2400.00},
    {"descricao":"Teclado e Mouse sem fio","quantidade":2,"unidade":"KIT","valor_unitario":280.00,"valor_total":560.00}
  ]'::jsonb,
  11960.00, 'TechSupply Ltda', '30 dias',
  'coordenador',
  'Equipamentos para onboarding do novo time de desenvolvimento.',
  'Aguardando Avaliacao de Compras'
) ON CONFLICT (numero) DO NOTHING;

-- RC-100002: Aguardando Aprovação da Diretoria
INSERT INTO concrem_fxcp_requisicoes (
  numero, solicitante_nome, solicitante_email, setor,
  data_necessidade, urgente,
  itens, valor_total, forma_pagamento,
  alcada_aprovacao, status,
  parecer_compras, avaliador_compras, data_avaliacao_compras
) VALUES (
  'RC-100002',
  'Ana Supervisora', 'ana@empresa.com',
  'Operacoes',
  CURRENT_DATE + 30, false,
  '[
    {"descricao":"Empilhadeira Eletrica 2T","quantidade":1,"unidade":"UN","valor_unitario":85000.00,"valor_total":85000.00},
    {"descricao":"Carregador de Bateria Industrial","quantidade":2,"unidade":"UN","valor_unitario":8500.00,"valor_total":17000.00}
  ]'::jsonb,
  102000.00, '30/60/90 dias',
  'diretor',
  'Aguardando Aprovacao da Diretoria',
  'Equipamentos essenciais para expansao do Centro de Distribuicao. Fornecedores avaliados e preco competitivo conforme pesquisa de mercado.',
  'Bruno Coordenador',
  NOW() - INTERVAL '2 days'
) ON CONFLICT (numero) DO NOTHING;

-- RC-100003: Em Cotação
INSERT INTO concrem_fxcp_requisicoes (
  numero, solicitante_nome, solicitante_email, setor,
  data_necessidade, urgente,
  itens, valor_total, forma_pagamento,
  alcada_aprovacao, status,
  parecer_compras, avaliador_compras, data_avaliacao_compras
) VALUES (
  'RC-100003',
  'Carlos Solicitante', 'carlos@empresa.com',
  'Tecnologia da Informacao',
  CURRENT_DATE + 15, false,
  '[
    {"descricao":"Licenca Microsoft 365 Business","quantidade":20,"unidade":"UN","valor_unitario":420.00,"valor_total":8400.00},
    {"descricao":"Antivirus Corporativo Kaspersky","quantidade":20,"unidade":"LIC","valor_unitario":180.00,"valor_total":3600.00}
  ]'::jsonb,
  12000.00, '30 dias',
  'coordenador',
  'Em Cotacao',
  'Renovacao anual de licencas. Cotacao com 3 fornecedores solicitada para garantir melhor preco.',
  'Bruno Coordenador',
  NOW() - INTERVAL '5 days'
) ON CONFLICT (numero) DO NOTHING;

-- RC-100004: Aguardando Recebimento (tem OC associada)
INSERT INTO concrem_fxcp_requisicoes (
  numero, solicitante_nome, solicitante_email, setor,
  data_necessidade, urgente,
  itens, valor_total, forma_pagamento,
  alcada_aprovacao, status,
  parecer_compras, avaliador_compras, data_avaliacao_compras
) VALUES (
  'RC-100004',
  'Ana Supervisora', 'ana@empresa.com',
  'Recursos Humanos',
  CURRENT_DATE - 5, false,
  '[
    {"descricao":"Cadeira Ergonomica Presidente Plus","quantidade":10,"unidade":"UN","valor_unitario":1850.00,"valor_total":18500.00},
    {"descricao":"Mesa de Escritorio em L 160cm","quantidade":5,"unidade":"UN","valor_unitario":920.00,"valor_total":4600.00}
  ]'::jsonb,
  23100.00, '30/60 dias',
  'gerente',
  'Aguardando Recebimento',
  'Mobiliario aprovado conforme orcamento anual do setor de RH. Produto em conformidade com laudo ergonomico.',
  'Fernanda Gerente',
  NOW() - INTERVAL '10 days'
) ON CONFLICT (numero) DO NOTHING;

-- RC-100005: Concluída (fluxo completo)
INSERT INTO concrem_fxcp_requisicoes (
  numero, solicitante_nome, solicitante_email, setor,
  data_necessidade, urgente,
  itens, valor_total, forma_pagamento,
  alcada_aprovacao, status,
  parecer_compras, avaliador_compras, data_avaliacao_compras,
  data_conclusao
) VALUES (
  'RC-100005',
  'Carlos Solicitante', 'carlos@empresa.com',
  'Tecnologia da Informacao',
  CURRENT_DATE - 20, false,
  '[
    {"descricao":"Cabo de Rede Cat6 (caixa 305m)","quantidade":3,"unidade":"CX","valor_unitario":320.00,"valor_total":960.00},
    {"descricao":"Switch 24 portas Gigabit TP-Link","quantidade":2,"unidade":"UN","valor_unitario":1450.00,"valor_total":2900.00}
  ]'::jsonb,
  3860.00, 'A Vista',
  'supervisor',
  'Concluida',
  'Materiais padrao de infraestrutura de rede. Aprovado diretamente pelo coordenador.',
  'Bruno Coordenador',
  NOW() - INTERVAL '18 days',
  NOW() - INTERVAL '5 days'
) ON CONFLICT (numero) DO NOTHING;

-- RC-100006: Devolvida ao Solicitante
INSERT INTO concrem_fxcp_requisicoes (
  numero, solicitante_nome, solicitante_email, setor,
  data_necessidade, urgente,
  itens, valor_total, forma_pagamento,
  alcada_aprovacao, status,
  parecer_compras, avaliador_compras, data_avaliacao_compras
) VALUES (
  'RC-100006',
  'Ana Supervisora', 'ana@empresa.com',
  'Marketing',
  CURRENT_DATE + 10, false,
  '[
    {"descricao":"Camera DSLR Canon EOS 90D","quantidade":1,"unidade":"UN","valor_unitario":7800.00,"valor_total":7800.00},
    {"descricao":"Lente 24-105mm f/4L IS","quantidade":1,"unidade":"UN","valor_unitario":3200.00,"valor_total":3200.00}
  ]'::jsonb,
  11000.00, 'A Vista',
  'coordenador',
  'Devolvida ao Solicitante',
  'Necessario justificar necessidade de compra vs. opcao de aluguel para uso pontual. Favor detalhar frequencia de uso e ROI esperado.',
  'Bruno Coordenador',
  NOW() - INTERVAL '1 day'
) ON CONFLICT (numero) DO NOTHING;

-- RC-100007: Aguardando Análise de Qualidade
INSERT INTO concrem_fxcp_requisicoes (
  numero, solicitante_nome, solicitante_email, setor,
  data_necessidade, urgente,
  itens, valor_total, forma_pagamento,
  alcada_aprovacao, status,
  parecer_compras, avaliador_compras, data_avaliacao_compras
) VALUES (
  'RC-100007',
  'Fernanda Gerente', 'fernanda@empresa.com',
  'Manutencao',
  CURRENT_DATE - 15, false,
  '[
    {"descricao":"Compressor de Ar Industrial 100L","quantidade":1,"unidade":"UN","valor_unitario":4200.00,"valor_total":4200.00},
    {"descricao":"Kit Ferramentas Pneumaticas","quantidade":2,"unidade":"KIT","valor_unitario":850.00,"valor_total":1700.00}
  ]'::jsonb,
  5900.00, '30 dias',
  'coordenador',
  'Aguardando Analise de Qualidade',
  'Equipamentos de manutencao essenciais. Aprovado com urgencia moderada.',
  'Bruno Coordenador',
  NOW() - INTERVAL '12 days'
) ON CONFLICT (numero) DO NOTHING;

-- ============================================================
-- 2. HISTÓRICO DE TRANSIÇÕES
-- ============================================================

-- RC-100001
INSERT INTO concrem_fxcp_historico
  (requisicao_id, acao, usuario, usuario_email, detalhes, status_anterior, status_novo)
SELECT id,
  'Requisicao Criada', 'Carlos Solicitante', 'carlos@empresa.com',
  'Requisicao RC-100001 criada. Valor: R$ 11.960,00. URGENTE — onboarding semana seguinte.',
  NULL, 'Aguardando Avaliacao de Compras'
FROM concrem_fxcp_requisicoes WHERE numero = 'RC-100001'
ON CONFLICT DO NOTHING;

-- RC-100002
INSERT INTO concrem_fxcp_historico
  (requisicao_id, acao, usuario, usuario_email, detalhes, status_anterior, status_novo)
SELECT id,
  'Requisicao Criada', 'Ana Supervisora', 'ana@empresa.com',
  'Requisicao RC-100002 criada. Valor: R$ 102.000,00. Aguardando avaliacao de compras.',
  NULL, 'Aguardando Avaliacao de Compras'
FROM concrem_fxcp_requisicoes WHERE numero = 'RC-100002'
ON CONFLICT DO NOTHING;

INSERT INTO concrem_fxcp_historico
  (requisicao_id, acao, usuario, usuario_email, detalhes, status_anterior, status_novo,
   created_at)
SELECT id,
  'Encaminhado para Diretoria', 'Bruno Coordenador', 'bruno@empresa.com',
  'Valor acima da alcada de coordenador (R$ 20.000). Encaminhado para aprovacao da diretoria.',
  'Aguardando Avaliacao de Compras', 'Aguardando Aprovacao da Diretoria',
  NOW() - INTERVAL '2 days'
FROM concrem_fxcp_requisicoes WHERE numero = 'RC-100002'
ON CONFLICT DO NOTHING;

-- RC-100003
INSERT INTO concrem_fxcp_historico
  (requisicao_id, acao, usuario, usuario_email, detalhes, status_anterior, status_novo)
SELECT id,
  'Requisicao Criada', 'Carlos Solicitante', 'carlos@empresa.com',
  'Requisicao RC-100003 criada. Valor: R$ 12.000,00.',
  NULL, 'Aguardando Avaliacao de Compras'
FROM concrem_fxcp_requisicoes WHERE numero = 'RC-100003'
ON CONFLICT DO NOTHING;

INSERT INTO concrem_fxcp_historico
  (requisicao_id, acao, usuario, usuario_email, detalhes, status_anterior, status_novo,
   created_at)
SELECT id,
  'Aprovado por Compras', 'Bruno Coordenador', 'bruno@empresa.com',
  'Renovacao anual aprovada. Encaminhado para cotacao com 3 fornecedores.',
  'Aguardando Avaliacao de Compras', 'Em Cotacao',
  NOW() - INTERVAL '5 days'
FROM concrem_fxcp_requisicoes WHERE numero = 'RC-100003'
ON CONFLICT DO NOTHING;

-- RC-100004
INSERT INTO concrem_fxcp_historico
  (requisicao_id, acao, usuario, usuario_email, detalhes, status_anterior, status_novo,
   created_at)
SELECT id,
  'Requisicao Criada', 'Ana Supervisora', 'ana@empresa.com',
  'Requisicao RC-100004 criada. Valor: R$ 23.100,00.',
  NULL, 'Aguardando Avaliacao de Compras',
  NOW() - INTERVAL '15 days'
FROM concrem_fxcp_requisicoes WHERE numero = 'RC-100004'
ON CONFLICT DO NOTHING;

INSERT INTO concrem_fxcp_historico
  (requisicao_id, acao, usuario, usuario_email, detalhes, status_anterior, status_novo,
   created_at)
SELECT id,
  'Aprovado por Compras', 'Fernanda Gerente', 'fernanda@empresa.com',
  'Mobiliario aprovado conforme orcamento do setor. Encaminhado para cotacao.',
  'Aguardando Avaliacao de Compras', 'Em Cotacao',
  NOW() - INTERVAL '12 days'
FROM concrem_fxcp_requisicoes WHERE numero = 'RC-100004'
ON CONFLICT DO NOTHING;

INSERT INTO concrem_fxcp_historico
  (requisicao_id, acao, usuario, usuario_email, detalhes, status_anterior, status_novo,
   created_at)
SELECT id,
  'Fornecedor Aprovado — OC Emitida', 'Fernanda Gerente', 'fernanda@empresa.com',
  'Fornecedor OfficeMax selecionado. Ordem de Compra OC-0001 emitida. Valor: R$ 23.100,00.',
  'Em Cotacao', 'Aguardando Recebimento',
  NOW() - INTERVAL '10 days'
FROM concrem_fxcp_requisicoes WHERE numero = 'RC-100004'
ON CONFLICT DO NOTHING;

-- RC-100005 (completo)
INSERT INTO concrem_fxcp_historico
  (requisicao_id, acao, usuario, usuario_email, detalhes, status_anterior, status_novo,
   created_at)
SELECT id,
  'Requisicao Criada', 'Carlos Solicitante', 'carlos@empresa.com',
  'Requisicao RC-100005 criada. Valor: R$ 3.860,00.',
  NULL, 'Aguardando Avaliacao de Compras',
  NOW() - INTERVAL '25 days'
FROM concrem_fxcp_requisicoes WHERE numero = 'RC-100005'
ON CONFLICT DO NOTHING;

INSERT INTO concrem_fxcp_historico
  (requisicao_id, acao, usuario, usuario_email, detalhes, status_anterior, status_novo,
   created_at)
SELECT id,
  'Aprovado por Compras', 'Bruno Coordenador', 'bruno@empresa.com',
  'Materiais padrao de infraestrutura. Aprovado. Encaminhado para cotacao.',
  'Aguardando Avaliacao de Compras', 'Em Cotacao',
  NOW() - INTERVAL '22 days'
FROM concrem_fxcp_requisicoes WHERE numero = 'RC-100005'
ON CONFLICT DO NOTHING;

INSERT INTO concrem_fxcp_historico
  (requisicao_id, acao, usuario, usuario_email, detalhes, status_anterior, status_novo,
   created_at)
SELECT id,
  'OC Emitida', 'Bruno Coordenador', 'bruno@empresa.com',
  'Fornecedor InfraNet selecionado. OC-0002 emitida. Valor: R$ 3.860,00.',
  'Em Cotacao', 'Aguardando Recebimento',
  NOW() - INTERVAL '18 days'
FROM concrem_fxcp_requisicoes WHERE numero = 'RC-100005'
ON CONFLICT DO NOTHING;

INSERT INTO concrem_fxcp_historico
  (requisicao_id, acao, usuario, usuario_email, detalhes, status_anterior, status_novo,
   created_at)
SELECT id,
  'Material Recebido', 'Paulo Almoxarife', 'paulo@empresa.com',
  'Recebimento registrado. NF 4521 confirmada. Todos os itens conferidos.',
  'Aguardando Recebimento', 'Aguardando Analise de Qualidade',
  NOW() - INTERVAL '8 days'
FROM concrem_fxcp_requisicoes WHERE numero = 'RC-100005'
ON CONFLICT DO NOTHING;

INSERT INTO concrem_fxcp_historico
  (requisicao_id, acao, usuario, usuario_email, detalhes, status_anterior, status_novo,
   created_at)
SELECT id,
  'Processo Concluido', 'Lucia Qualidade', 'lucia@empresa.com',
  'Material liberado na analise de qualidade. Fornecedor avaliado com 5/5 estrelas. Processo encerrado.',
  'Aguardando Analise de Qualidade', 'Concluida',
  NOW() - INTERVAL '5 days'
FROM concrem_fxcp_requisicoes WHERE numero = 'RC-100005'
ON CONFLICT DO NOTHING;

-- RC-100006
INSERT INTO concrem_fxcp_historico
  (requisicao_id, acao, usuario, usuario_email, detalhes, status_anterior, status_novo,
   created_at)
SELECT id,
  'Requisicao Criada', 'Ana Supervisora', 'ana@empresa.com',
  'Requisicao RC-100006 criada. Valor: R$ 11.000,00.',
  NULL, 'Aguardando Avaliacao de Compras',
  NOW() - INTERVAL '3 days'
FROM concrem_fxcp_requisicoes WHERE numero = 'RC-100006'
ON CONFLICT DO NOTHING;

INSERT INTO concrem_fxcp_historico
  (requisicao_id, acao, usuario, usuario_email, detalhes, status_anterior, status_novo,
   created_at)
SELECT id,
  'Devolvida ao Solicitante', 'Bruno Coordenador', 'bruno@empresa.com',
  'Necessario justificar compra vs. aluguel. Devolvida para complementar informacoes.',
  'Aguardando Avaliacao de Compras', 'Devolvida ao Solicitante',
  NOW() - INTERVAL '1 day'
FROM concrem_fxcp_requisicoes WHERE numero = 'RC-100006'
ON CONFLICT DO NOTHING;

-- RC-100007
INSERT INTO concrem_fxcp_historico
  (requisicao_id, acao, usuario, usuario_email, detalhes, status_anterior, status_novo,
   created_at)
SELECT id,
  'Requisicao Criada', 'Fernanda Gerente', 'fernanda@empresa.com',
  'Requisicao RC-100007 criada. Valor: R$ 5.900,00.',
  NULL, 'Aguardando Avaliacao de Compras',
  NOW() - INTERVAL '15 days'
FROM concrem_fxcp_requisicoes WHERE numero = 'RC-100007'
ON CONFLICT DO NOTHING;

INSERT INTO concrem_fxcp_historico
  (requisicao_id, acao, usuario, usuario_email, detalhes, status_anterior, status_novo,
   created_at)
SELECT id,
  'OC Emitida', 'Bruno Coordenador', 'bruno@empresa.com',
  'Fornecedor FerramentasPro aprovado. OC-0003 emitida.',
  'Em Cotacao', 'Aguardando Recebimento',
  NOW() - INTERVAL '10 days'
FROM concrem_fxcp_requisicoes WHERE numero = 'RC-100007'
ON CONFLICT DO NOTHING;

INSERT INTO concrem_fxcp_historico
  (requisicao_id, acao, usuario, usuario_email, detalhes, status_anterior, status_novo,
   created_at)
SELECT id,
  'Material Recebido', 'Paulo Almoxarife', 'paulo@empresa.com',
  'Recebimento registrado. NF 7892. Item 2 recebido com avaria leve — anotado na conferencia.',
  'Aguardando Recebimento', 'Aguardando Analise de Qualidade',
  NOW() - INTERVAL '3 days'
FROM concrem_fxcp_requisicoes WHERE numero = 'RC-100007'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. FORNECEDORES
-- ============================================================

INSERT INTO concrem_fxcp_fornecedores
  (nome, cnpj, email, telefone, contato, cidade, uf, segmento, ativo)
VALUES
  ('TechSupply Ltda',         '12.345.678/0001-90', 'vendas@techsupply.com.br',    '(11) 3456-7890', 'Marcos Vendas',  'Sao Paulo',    'SP', 'Informatica e TI',     true),
  ('OfficeMax Distribuidora', '98.765.432/0001-10', 'carla@officemax.com.br',      '(11) 2233-4455', 'Carla Santos',   'Sao Paulo',    'SP', 'Mobiliario e Escritorio', true),
  ('InfraNet Comercio',       '45.678.901/0001-23', 'comercial@infranet.com.br',   '(21) 3344-5566', 'Pedro Costa',    'Rio de Janeiro','RJ', 'Informatica e TI',     true),
  ('FerramentasPro',          '67.890.123/0001-45', 'contato@ferramentaspro.com',  '(31) 4455-6677', 'Joao Silva',     'Belo Horizonte','MG', 'Ferramentas e Manutencao', true),
  ('SoftLicencas Brasil',     '23.456.789/0001-67', 'licencas@softbr.com.br',      '(11) 5566-7788', 'Patricia Lima',  'Sao Paulo',    'SP', 'Software e Licencas',  true),
  ('MoveisConfort',           '89.012.345/0001-89', 'vendas@moveisconfort.com.br', '(41) 6677-8899', 'Ricardo Moveis', 'Curitiba',     'PR', 'Mobiliario e Escritorio', true),
  ('EletroIndustrial SA',     '34.567.890/0001-12', 'comercial@eletroin.com.br',   '(51) 7788-9900', 'Sandra Elétrica','Porto Alegre', 'RS', 'Equipamentos Industriais', true),
  ('LogiSuprimentos',         '56.789.012/0001-34', 'pedidos@logisup.com.br',      '(11) 8899-0011', 'Fabio Logistica','Campinas',     'SP', 'Suprimentos e Papelaria', false)
ON CONFLICT (cnpj) DO UPDATE SET
  nome     = EXCLUDED.nome,
  email    = EXCLUDED.email,
  telefone = EXCLUDED.telefone;

-- ============================================================
-- 4. COTAÇÃO DEMO (para RC-100003 — Em Cotação)
-- ============================================================

INSERT INTO concrem_fxcp_cotacoes (
  numero, requisicao_id, requisicao_numero,
  fornecedores, fornecedor_vencedor,
  justificativa, status, criado_por
)
SELECT
  'CT-0001',
  r.id, 'RC-100003',
  '[
    {
      "id": "f1",
      "nome": "SoftLicencas Brasil",
      "cnpj": "23.456.789/0001-67",
      "contato": "Patricia Lima",
      "email": "licencas@softbr.com.br",
      "itens": [
        {"descricao":"Licenca Microsoft 365 Business","quantidade":20,"valor_unitario":415.00,"valor_total":8300.00},
        {"descricao":"Antivirus Corporativo Kaspersky","quantidade":20,"valor_unitario":175.00,"valor_total":3500.00}
      ],
      "total": 11800.00,
      "prazo_entrega": "5 dias",
      "condicao_pagamento": "30 dias",
      "vencedor": false
    },
    {
      "id": "f2",
      "nome": "TechSupply Ltda",
      "cnpj": "12.345.678/0001-90",
      "contato": "Marcos Vendas",
      "email": "vendas@techsupply.com.br",
      "itens": [
        {"descricao":"Licenca Microsoft 365 Business","quantidade":20,"valor_unitario":420.00,"valor_total":8400.00},
        {"descricao":"Antivirus Corporativo Kaspersky","quantidade":20,"valor_unitario":180.00,"valor_total":3600.00}
      ],
      "total": 12000.00,
      "prazo_entrega": "3 dias",
      "condicao_pagamento": "30 dias",
      "vencedor": false
    }
  ]'::jsonb,
  NULL,
  NULL,
  'Em Andamento',
  'Bruno Coordenador'
FROM concrem_fxcp_requisicoes r
WHERE r.numero = 'RC-100003'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. ORDEM DE COMPRA — OC-0001 (RC-100004 — Aguardando Recebimento)
-- ============================================================

INSERT INTO concrem_fxcp_ordens_compra (
  numero, requisicao_id, requisicao_numero,
  fornecedor, fornecedor_cnpj, fornecedor_contato,
  itens, valor_total, condicao_pagamento,
  data_entrega_prevista, data_faturamento,
  confirmacao_pedido, data_confirmacao,
  status, criado_por
)
SELECT
  'OC-0001',
  r.id, 'RC-100004',
  'OfficeMax Distribuidora',
  '98.765.432/0001-10',
  'carla@officemax.com.br',
  r.itens,
  r.valor_total,
  '30/60 dias',
  CURRENT_DATE + 3,
  CURRENT_DATE - 7,
  true,
  NOW() - INTERVAL '7 days',
  'Aguardando Recebimento',
  'Fernanda Gerente'
FROM concrem_fxcp_requisicoes r
WHERE r.numero = 'RC-100004'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. ORDEM DE COMPRA — OC-0002 (RC-100005 — Concluída)
-- ============================================================

INSERT INTO concrem_fxcp_ordens_compra (
  numero, requisicao_id, requisicao_numero,
  fornecedor, fornecedor_cnpj, fornecedor_contato,
  itens, valor_total, condicao_pagamento,
  data_entrega_prevista, data_faturamento,
  confirmacao_pedido, data_confirmacao,
  avaliacao_estrelas, avaliacao_nota,
  data_conclusao, status, criado_por
)
SELECT
  'OC-0002',
  r.id, 'RC-100005',
  'InfraNet Comercio',
  '45.678.901/0001-23',
  'pedro@infranet.com.br',
  r.itens,
  r.valor_total,
  'A Vista',
  CURRENT_DATE - 10,
  CURRENT_DATE - 18,
  true,
  NOW() - INTERVAL '18 days',
  5,
  4.8,
  NOW() - INTERVAL '5 days',
  'Concluida',
  'Bruno Coordenador'
FROM concrem_fxcp_requisicoes r
WHERE r.numero = 'RC-100005'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. ORDEM DE COMPRA — OC-0003 (RC-100007 — Aguardando Qualidade)
-- ============================================================

INSERT INTO concrem_fxcp_ordens_compra (
  numero, requisicao_id, requisicao_numero,
  fornecedor, fornecedor_cnpj, fornecedor_contato,
  itens, valor_total, condicao_pagamento,
  data_entrega_prevista, data_faturamento,
  confirmacao_pedido, data_confirmacao,
  status, criado_por
)
SELECT
  'OC-0003',
  r.id, 'RC-100007',
  'FerramentasPro',
  '67.890.123/0001-45',
  'joao@ferramentaspro.com',
  r.itens,
  r.valor_total,
  '30 dias',
  CURRENT_DATE - 5,
  CURRENT_DATE - 12,
  true,
  NOW() - INTERVAL '10 days',
  'Recebida',
  'Bruno Coordenador'
FROM concrem_fxcp_requisicoes r
WHERE r.numero = 'RC-100007'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 8. RECEBIMENTO — para OC-0002 (Concluída)
-- ============================================================

INSERT INTO concrem_fxcp_recebimentos (
  ordem_compra_id, ordem_compra_numero, requisicao_id,
  numero_nf, data_nf, nota_fiscal_url,
  itens_recebidos, conferente, observacoes,
  status, created_at
)
SELECT
  oc.id, 'OC-0002', oc.requisicao_id,
  '4521', CURRENT_DATE - 8,
  '[arquivo: NF-4521-InfraNet.pdf]',
  '[
    {"descricao":"Cabo de Rede Cat6 (caixa 305m)","quantidade_pedida":3,"quantidade_recebida":3,"unidade":"CX","condicao":"Conforme","observacao":""},
    {"descricao":"Switch 24 portas Gigabit TP-Link","quantidade_pedida":2,"quantidade_recebida":2,"unidade":"UN","condicao":"Conforme","observacao":"Embalagem original lacrada"}
  ]'::jsonb,
  'Paulo Almoxarife',
  'Todos os itens conferidos e em conformidade com a OC.',
  'Aprovado',
  NOW() - INTERVAL '8 days'
FROM concrem_fxcp_ordens_compra oc
WHERE oc.numero = 'OC-0002'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 9. RECEBIMENTO — para OC-0003 (Aguardando Qualidade)
-- ============================================================

INSERT INTO concrem_fxcp_recebimentos (
  ordem_compra_id, ordem_compra_numero, requisicao_id,
  numero_nf, data_nf, nota_fiscal_url,
  itens_recebidos, conferente, observacoes,
  status, created_at
)
SELECT
  oc.id, 'OC-0003', oc.requisicao_id,
  '7892', CURRENT_DATE - 3,
  '[arquivo: NF-7892-FerramentasPro.pdf]',
  '[
    {"descricao":"Compressor de Ar Industrial 100L","quantidade_pedida":1,"quantidade_recebida":1,"unidade":"UN","condicao":"Conforme","observacao":""},
    {"descricao":"Kit Ferramentas Pneumaticas","quantidade_pedida":2,"quantidade_recebida":2,"unidade":"KIT","condicao":"Com Avaria","observacao":"Uma caixa com amassado na embalagem externa. Produto interno aparentemente OK."}
  ]'::jsonb,
  'Paulo Almoxarife',
  'Item 2 apresentou avaria na embalagem. Encaminhado para analise de qualidade.',
  'Aguardando Qualidade',
  NOW() - INTERVAL '3 days'
FROM concrem_fxcp_ordens_compra oc
WHERE oc.numero = 'OC-0003'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 10. ANÁLISE DE QUALIDADE — para OC-0002 (Concluída)
-- ============================================================

INSERT INTO concrem_fxcp_qualidade (
  recebimento_id, ordem_compra_id, ordem_compra_numero, requisicao_id,
  itens_analisados, nota_media, parecer, analista, observacoes_finais,
  created_at
)
SELECT
  rec.id, oc.id, 'OC-0002', oc.requisicao_id,
  '[
    {"descricao":"Cabo de Rede Cat6 (caixa 305m)","criterio":"Especificacao Tecnica","resultado":"Aprovado","nota":5,"observacao":"Certificado Cat6 conferido. Testado com cabo tester."},
    {"descricao":"Switch 24 portas Gigabit TP-Link","criterio":"Especificacao Tecnica","resultado":"Aprovado","nota":5,"observacao":"Todos os 24 portas funcionais. Velocidade Gigabit confirmada."}
  ]'::jsonb,
  5.0,
  'Liberado',
  'Lucia Qualidade',
  'Todos os materiais de rede em plena conformidade com as especificacoes tecnicas. Liberados para uso imediato.',
  NOW() - INTERVAL '5 days'
FROM concrem_fxcp_recebimentos rec
JOIN concrem_fxcp_ordens_compra oc ON oc.numero = 'OC-0002'
WHERE rec.ordem_compra_numero = 'OC-0002'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 11. ATUALIZAR NOTA DO FORNECEDOR InfraNet (OC-0002 concluída com 5 estrelas)
-- ============================================================

UPDATE concrem_fxcp_fornecedores
SET
  nota_media_qualidade = 5.0,
  total_avaliacoes = 1
WHERE cnpj = '45.678.901/0001-23';

-- ============================================================
-- 12. VERIFICAÇÃO FINAL
-- ============================================================

SELECT 'Requisicoes'   AS tabela, COUNT(*) AS registros FROM concrem_fxcp_requisicoes
UNION ALL
SELECT 'Historico',      COUNT(*) FROM concrem_fxcp_historico
UNION ALL
SELECT 'Fornecedores',   COUNT(*) FROM concrem_fxcp_fornecedores
UNION ALL
SELECT 'Cotacoes',       COUNT(*) FROM concrem_fxcp_cotacoes
UNION ALL
SELECT 'Ordens Compra',  COUNT(*) FROM concrem_fxcp_ordens_compra
UNION ALL
SELECT 'Recebimentos',   COUNT(*) FROM concrem_fxcp_recebimentos
UNION ALL
SELECT 'Qualidade',      COUNT(*) FROM concrem_fxcp_qualidade
ORDER BY tabela;
