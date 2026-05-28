-- ============================================================
--  FLUXOCOMPRAS — Schema Completo do Banco de Dados
--  Supabase / PostgreSQL
--
--  Execute este arquivo no SQL Editor do Supabase Dashboard
--  em ordem (de cima para baixo, uma vez).
--
--  Prefix de todas as tabelas: concrem_fxcp_
-- ============================================================

-- ------------------------------------------------------------
-- 0. EXTENSÕES
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- 1. USUÁRIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS concrem_fxcp_usuarios (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome       TEXT        NOT NULL,
  email      TEXT        NOT NULL UNIQUE,
  role       TEXT        NOT NULL CHECK (role IN (
               'admin','solicitante','supervisor','coordenador',
               'gerente','diretor','almoxarife','qualidade')),
  ativo      BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE concrem_fxcp_usuarios DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- 2. CENTROS DE CUSTO
-- ============================================================
CREATE TABLE IF NOT EXISTS concrem_fxcp_centros_custo (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome       TEXT        NOT NULL,
  codigo     TEXT,
  ativo      BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE concrem_fxcp_centros_custo DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- 3. FORNECEDORES
-- ============================================================
CREATE TABLE IF NOT EXISTS concrem_fxcp_fornecedores (
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome                  TEXT          NOT NULL,
  cnpj                  TEXT,
  contato               TEXT,            -- nome do contato
  contato_email         TEXT,
  telefone              TEXT,
  endereco              TEXT,
  cidade                TEXT,
  estado                CHAR(2),
  cep                   TEXT,
  categoria             TEXT,            -- ex: TI, Materiais, Serviços
  nota_media_qualidade  NUMERIC(3,1),
  total_avaliacoes      INTEGER       NOT NULL DEFAULT 0,
  ativo                 BOOLEAN       NOT NULL DEFAULT true,
  observacoes           TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE concrem_fxcp_fornecedores DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_forn_ativo ON concrem_fxcp_fornecedores (ativo);
CREATE INDEX IF NOT EXISTS idx_forn_nome  ON concrem_fxcp_fornecedores (nome);


-- ============================================================
-- 4. REQUISIÇÕES DE COMPRA
-- ============================================================
CREATE TABLE IF NOT EXISTS concrem_fxcp_requisicoes (
  id                        UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero                    TEXT          NOT NULL UNIQUE,   -- ex: RC-202501-001

  -- Solicitante
  solicitante_nome          TEXT,
  solicitante_email         TEXT,
  solicitante_id            UUID          REFERENCES concrem_fxcp_usuarios (id) ON DELETE SET NULL,

  -- Dados gerais
  setor                     TEXT,
  centro_custo              TEXT,
  data_requisicao           DATE,
  data_necessidade          DATE,
  forma_pagamento           TEXT,
  fornecedor_sugerido       TEXT,
  observacoes               TEXT,
  urgente                   BOOLEAN       NOT NULL DEFAULT false,
  justificativa_urgencia    TEXT,

  -- Itens (array JSON: [{descricao, quantidade, unidade, valor_unitario, valor_total}])
  itens                     JSONB         NOT NULL DEFAULT '[]',
  valor_total               NUMERIC(15,2) NOT NULL DEFAULT 0,

  -- Alçada e status
  alcada_aprovacao          TEXT,          -- Supervisor | Coordenador | Gerente | Diretor
  status                    TEXT          NOT NULL DEFAULT 'Rascunho',

  -- Aprovação de Compras
  parecer_compras           TEXT,
  avaliador_compras         TEXT,
  data_avaliacao_compras    TIMESTAMPTZ,

  -- Aprovação de Diretoria
  parecer_diretoria         TEXT,
  aprovador_diretoria       TEXT,
  data_aprovacao_diretoria  TIMESTAMPTZ,
  consideracoes_diretoria   TEXT,

  -- Rejeição / Conclusão
  justificativa_rejeicao    TEXT,
  data_conclusao            TIMESTAMPTZ,

  created_at                TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE concrem_fxcp_requisicoes DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_req_status         ON concrem_fxcp_requisicoes (status);
CREATE INDEX IF NOT EXISTS idx_req_solicitante_id ON concrem_fxcp_requisicoes (solicitante_id);
CREATE INDEX IF NOT EXISTS idx_req_created_at     ON concrem_fxcp_requisicoes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_req_urgente        ON concrem_fxcp_requisicoes (urgente);


-- ============================================================
-- 5. COTAÇÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS concrem_fxcp_cotacoes (
  id                   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero               TEXT          NOT NULL UNIQUE,   -- ex: COT-202501-001

  -- Vínculo
  requisicao_id        UUID          REFERENCES concrem_fxcp_requisicoes (id) ON DELETE SET NULL,
  requisicao_numero    TEXT,

  -- Responsável
  responsavel          TEXT,
  responsavel_email    TEXT,

  -- Fornecedores cotados (array JSON com preços por item)
  -- [{id, nome, cnpj, contato, email, telefone, itens:[{descricao,qtd,preco_unit,total}],
  --   valor_total, prazo_entrega, condicao_pagamento, selecionado, nota_historica}]
  fornecedores         JSONB         NOT NULL DEFAULT '[]',

  -- Resultado
  fornecedor_vencedor  JSONB,         -- snapshot do fornecedor vencedor
  valor_total_final    NUMERIC(15,2),
  justificativa_selecao TEXT,

  -- Aprovação do demandante
  aprovacao_demandante TEXT,          -- Pendente | Aprovado | Revisao
  comentario_demandante TEXT,

  status               TEXT          NOT NULL DEFAULT 'Em Andamento',

  created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE concrem_fxcp_cotacoes DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_cot_requisicao_id ON concrem_fxcp_cotacoes (requisicao_id);
CREATE INDEX IF NOT EXISTS idx_cot_status        ON concrem_fxcp_cotacoes (status);


-- ============================================================
-- 6. ORDENS DE COMPRA
-- ============================================================
CREATE TABLE IF NOT EXISTS concrem_fxcp_ordens_compra (
  id                   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero               TEXT          NOT NULL UNIQUE,   -- ex: OC-202501-001

  -- Vínculos
  numero_requisicao    TEXT,
  numero_cotacao       TEXT,
  requisicao_id        UUID          REFERENCES concrem_fxcp_requisicoes (id) ON DELETE SET NULL,
  cotacao_id           UUID          REFERENCES concrem_fxcp_cotacoes    (id) ON DELETE SET NULL,

  -- Fornecedor (snapshot para preservar histórico)
  fornecedor           TEXT,          -- razão social (alias de fornecedor_nome)
  fornecedor_nome      TEXT,
  fornecedor_cnpj      TEXT,
  fornecedor_contato   TEXT,
  fornecedor_email     TEXT,
  fornecedor_telefone  TEXT,
  fornecedor_id        UUID          REFERENCES concrem_fxcp_fornecedores (id) ON DELETE SET NULL,

  -- Pedido
  itens                JSONB         NOT NULL DEFAULT '[]',
  valor_total          NUMERIC(15,2) NOT NULL DEFAULT 0,
  condicao_pagamento   TEXT,
  observacoes          TEXT,

  -- Datas de fluxo
  data_faturamento     DATE,
  data_entrega_prevista DATE,
  data_conclusao       DATE,

  -- Status
  -- Analise de Faturamento → Aguardando Confirmacao → Aguardando Recebimento
  -- → Recebida → Concluida
  status               TEXT          NOT NULL DEFAULT 'Analise de Faturamento',

  -- Avaliação do fornecedor (preenchida ao concluir)
  avaliacao_estrelas   SMALLINT      CHECK (avaliacao_estrelas BETWEEN 1 AND 5),
  avaliacao_nota       NUMERIC(3,1)  CHECK (avaliacao_nota BETWEEN 1 AND 5),
  avaliacao_comentario TEXT,
  avaliado_por         TEXT,
  data_avaliacao       TIMESTAMPTZ,

  created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE concrem_fxcp_ordens_compra DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_oc_status        ON concrem_fxcp_ordens_compra (status);
CREATE INDEX IF NOT EXISTS idx_oc_requisicao_id ON concrem_fxcp_ordens_compra (requisicao_id);
CREATE INDEX IF NOT EXISTS idx_oc_fornecedor_id ON concrem_fxcp_ordens_compra (fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_oc_created_at    ON concrem_fxcp_ordens_compra (created_at DESC);


-- ============================================================
-- 7. RECEBIMENTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS concrem_fxcp_recebimentos (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Vínculos
  ordem_compra_id      UUID        REFERENCES concrem_fxcp_ordens_compra  (id) ON DELETE SET NULL,
  ordem_compra_numero  TEXT,
  requisicao_id        UUID        REFERENCES concrem_fxcp_requisicoes     (id) ON DELETE SET NULL,

  -- Nota Fiscal
  numero_nota_fiscal   TEXT,
  nota_fiscal_url      TEXT,        -- URL pública do arquivo no Storage

  -- Recebimento
  data_recebimento     DATE,
  almoxarife           TEXT,
  almoxarife_email     TEXT,
  fornecedor           TEXT,        -- snapshot do nome do fornecedor

  -- Conferência item a item (array JSON)
  -- [{descricao, quantidade_esperada, quantidade_recebida, recebido, condicao, observacoes}]
  itens_conferencia    JSONB       NOT NULL DEFAULT '[]',

  observacoes          TEXT,

  -- Aguardando Qualidade | Concluida | Retida
  status               TEXT        NOT NULL DEFAULT 'Aguardando Qualidade',

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE concrem_fxcp_recebimentos DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_rec_status        ON concrem_fxcp_recebimentos (status);
CREATE INDEX IF NOT EXISTS idx_rec_oc_id         ON concrem_fxcp_recebimentos (ordem_compra_id);
CREATE INDEX IF NOT EXISTS idx_rec_requisicao_id ON concrem_fxcp_recebimentos (requisicao_id);


-- ============================================================
-- 8. QUALIDADE
-- ============================================================
CREATE TABLE IF NOT EXISTS concrem_fxcp_qualidade (
  id                   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Vínculos
  recebimento_id       UUID          REFERENCES concrem_fxcp_recebimentos (id) ON DELETE SET NULL,
  requisicao_id        UUID          REFERENCES concrem_fxcp_requisicoes   (id) ON DELETE SET NULL,
  ordem_compra_numero  TEXT,
  fornecedor           TEXT,

  -- Análise por item (array JSON)
  -- [{descricao, criterio, resultado, nota, observacoes}]
  itens_analise        JSONB         NOT NULL DEFAULT '[]',

  -- Resultado
  nota_media           NUMERIC(3,1),
  parecer_final        TEXT,          -- Liberado | Retido | Devolvido ao Fornecedor

  -- Analista
  analista             TEXT,
  analista_email       TEXT,
  observacoes_gerais   TEXT,

  -- Em Andamento | Concluida
  status               TEXT          NOT NULL DEFAULT 'Em Andamento',

  created_at           TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE concrem_fxcp_qualidade DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_qual_status        ON concrem_fxcp_qualidade (status);
CREATE INDEX IF NOT EXISTS idx_qual_recebimento   ON concrem_fxcp_qualidade (recebimento_id);
CREATE INDEX IF NOT EXISTS idx_qual_requisicao_id ON concrem_fxcp_qualidade (requisicao_id);


-- ============================================================
-- 9. HISTÓRICO DE REQUISIÇÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS concrem_fxcp_historico (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  requisicao_id    UUID        REFERENCES concrem_fxcp_requisicoes (id) ON DELETE CASCADE,
  acao             TEXT        NOT NULL,
  usuario          TEXT,
  usuario_email    TEXT,
  status_anterior  TEXT,
  status_novo      TEXT,
  detalhes         TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE concrem_fxcp_historico DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_hist_requisicao_id ON concrem_fxcp_historico (requisicao_id);
CREATE INDEX IF NOT EXISTS idx_hist_created_at    ON concrem_fxcp_historico (created_at DESC);


-- ============================================================
-- 10. CONFIGURAÇÃO DE ALÇADAS
-- ============================================================
CREATE TABLE IF NOT EXISTS concrem_fxcp_config_alcadas (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- JSON com os limites: {"Supervisor":5000,"Coordenador":20000,"Gerente":100000,"Diretor":999999}
  alcadas    JSONB       NOT NULL DEFAULT '{}',
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE concrem_fxcp_config_alcadas DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- 11. CONFIGURAÇÃO DE PERMISSÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS concrem_fxcp_config_permissoes (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- JSON mapa role → array de rotas permitidas
  permissoes  JSONB       NOT NULL DEFAULT '{}',
  updated_by  TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE concrem_fxcp_config_permissoes DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- 12. STORAGE BUCKET
-- ============================================================

-- Cria o bucket público para notas fiscais e anexos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'concrem-fxcp-arquivos',
  'concrem-fxcp-arquivos',
  true,
  10485760,   -- 10 MB
  ARRAY['application/pdf','image/jpeg','image/jpg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public            = true,
      file_size_limit   = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Política de storage: leitura pública
CREATE POLICY "storage_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'concrem-fxcp-arquivos');

-- Política de storage: upload público (modo demo sem auth)
CREATE POLICY "storage_public_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'concrem-fxcp-arquivos');

-- Política de storage: atualização pública
CREATE POLICY "storage_public_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'concrem-fxcp-arquivos');

-- Política de storage: exclusão pública
CREATE POLICY "storage_public_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'concrem-fxcp-arquivos');


-- ============================================================
-- 13. DADOS INICIAIS (SEED)
-- ============================================================

-- Alçadas padrão
INSERT INTO concrem_fxcp_config_alcadas (alcadas, updated_by)
VALUES (
  '{"Supervisor":5000,"Coordenador":20000,"Gerente":100000,"Diretor":9999999}',
  'Sistema'
)
ON CONFLICT DO NOTHING;

-- Centros de custo padrão
INSERT INTO concrem_fxcp_centros_custo (nome, codigo, ativo) VALUES
  ('Administrativo',   'ADM', true),
  ('Obras',            'OBR', true),
  ('Manutenção',       'MAN', true),
  ('Tecnologia',       'TI',  true),
  ('Financeiro',       'FIN', true),
  ('Comercial',        'COM', true),
  ('RH / Pessoal',     'RH',  true),
  ('Almoxarifado',     'ALM', true)
ON CONFLICT DO NOTHING;


-- ============================================================
-- FIM DO SCHEMA
-- ============================================================
--
--  Resumo das tabelas criadas:
--
--  concrem_fxcp_usuarios           — cadastro de usuários do sistema
--  concrem_fxcp_centros_custo      — centros de custo para requisições
--  concrem_fxcp_fornecedores       — fornecedores homologados
--  concrem_fxcp_requisicoes        — requisições de compra (core do fluxo)
--  concrem_fxcp_cotacoes           — cotações vinculadas às requisições
--  concrem_fxcp_ordens_compra      — ordens de compra emitidas
--  concrem_fxcp_recebimentos       — registros de recebimento no almoxarifado
--  concrem_fxcp_qualidade          — análises de qualidade dos materiais
--  concrem_fxcp_historico          — log de eventos de cada requisição
--  concrem_fxcp_config_alcadas     — configuração dos limites de alçada
--  concrem_fxcp_config_permissoes  — configuração de permissões por role
--
--  Bucket de storage: concrem-fxcp-arquivos (público, máx 10MB)
--
--  RLS desabilitado em todas as tabelas (modo demo sem Supabase Auth).
--  Para produção com auth real, reabilite o RLS e crie policies
--  baseadas em auth.uid() e auth.jwt().
-- ============================================================
