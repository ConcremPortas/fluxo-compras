/* ============================================================
   FLUXOCOMPRAS — Storage: Abstração do Supabase
   Substitua SUPABASE_URL_PLACEHOLDER e SUPABASE_KEY_PLACEHOLDER
   pelas credenciais reais do seu projeto Supabase.
   ============================================================ */

// Lê credenciais do js/config.js (carregado antes no index.html)
const SUPABASE_URL = (typeof CONFIG !== 'undefined') ? CONFIG.SUPABASE_URL : 'SUPABASE_URL_PLACEHOLDER';
const SUPABASE_KEY = (typeof CONFIG !== 'undefined') ? CONFIG.SUPABASE_KEY : 'SUPABASE_KEY_PLACEHOLDER';

/* ----------------------------------------------------------
   Nomes das tabelas (prefixo obrigatório: concrem_fxcp_)
---------------------------------------------------------- */
const TABLES = {
  usuarios:          'concrem_fxcp_usuarios',
  centrosCusto:      'concrem_fxcp_centros_custo',
  fornecedores:      'concrem_fxcp_fornecedores',
  requisicoes:       'concrem_fxcp_requisicoes',
  cotacoes:          'concrem_fxcp_cotacoes',
  ordens:            'concrem_fxcp_ordens_compra',
  recebimentos:      'concrem_fxcp_recebimentos',
  qualidade:         'concrem_fxcp_qualidade',
  historico:         'concrem_fxcp_historico',
  configAlcadas:     'concrem_fxcp_config_alcadas',
  configPermissoes:  'concrem_fxcp_config_permissoes',
  catalogoItens:      'concrem_fxcp_catalogo_itens',
  catalogoCategorias: 'concrem_fxcp_catalogo_categorias',
  alertasCusto:           'concrem_fxcp_alertas_custo',
  configFluxoAprovacao:   'concrem_fxcp_config_fluxo_aprovacao',
};

const BUCKET = (typeof CONFIG !== 'undefined') ? CONFIG.SUPABASE_BUCKET : 'concrem-fxcp-arquivos';


/* ----------------------------------------------------------
   Helper interno: lança erro padronizado
---------------------------------------------------------- */
function _check(error) {
  if (!error) return;
  const msg = error.message || JSON.stringify(error);
  // Detectar erros de rede antes de relançar
  if (!navigator.onLine) {
    if (typeof Components !== 'undefined') Components.Toast?.error('Sem conexão com a internet. Verifique sua rede e tente novamente.');
  } else if (msg.includes('Failed to fetch') || error.code === 'NETWORK_ERROR' || msg.includes('NetworkError')) {
    if (typeof Components !== 'undefined') Components.Toast?.error('Erro de conexão com o servidor. Tente novamente em instantes.');
  }
  throw new Error(msg);
}

/* ----------------------------------------------------------
   Helper interno: garante que o cliente existe
---------------------------------------------------------- */
function _client() {
  if (!_sb) throw new Error('Supabase não configurado. Substitua as credenciais em storage.js.');
  return _sb;
}

/* ============================================================
   OBJETO PRINCIPAL
   ============================================================ */
const Storage = {

  supabase: _sb,
  TABLES,
  BUCKET,

  /* ----------------------------------------------------------
     AUTH (não utilizado no modo demo — reservado para produção)
  ---------------------------------------------------------- */

  async login(email, password) {
    const { data, error } = await _client().auth.signInWithPassword({ email, password });
    _check(error);
    return data;
  },

  async logout() {
    const { error } = await _client().auth.signOut();
    _check(error);
  },

  async getUser() {
    const { data: { user }, error } = await _client().auth.getUser();
    _check(error);
    return user;
  },

  async onAuthChange(callback) {
    _client().auth.onAuthStateChange((_event, session) => callback(session?.user || null));
  },

  /* ----------------------------------------------------------
     CRUD GENÉRICO
  ---------------------------------------------------------- */

  /**
   * Lista registros de uma tabela.
   * @param {string} table  — use TABLES.xxx
   * @param {{ select?: string, order?: { column: string, ascending?: boolean }, limit?: number, filters?: Array<{ column: string, op: string, value: any }> }} opts
   */
  async list(table, opts = {}) {
    let q = _client().from(table).select(opts.select || '*');

    (opts.filters || []).forEach(f => { q = q.filter(f.column, f.op, f.value); });

    if (opts.order) {
      const { column, ascending = true } = opts.order;
      q = q.order(column, { ascending });
    }
    if (opts.limit) q = q.limit(opts.limit);

    const { data, error } = await q;
    _check(error);
    return data;
  },

  /** Busca um registro pelo id. */
  async get(table, id) {
    const { data, error } = await _client().from(table).select('*').eq('id', id).single();
    _check(error);
    return data;
  },

  /** Cria um novo registro e retorna o inserido. */
  async create(table, data) {
    const { data: result, error } = await _client().from(table).insert(data).select().single();
    _check(error);
    return result;
  },

  /** Atualiza um registro pelo id e retorna o atualizado. */
  async update(table, id, data) {
    const { data: result, error } = await _client().from(table).update(data).eq('id', id).select().single();
    _check(error);
    return result;
  },

  /** Remove um registro pelo id. */
  async delete(table, id) {
    const { error } = await _client().from(table).delete().eq('id', id);
    _check(error);
    return true;
  },

  /** Filtra registros por coluna = valor. */
  async filter(table, column, value) {
    const { data, error } = await _client().from(table).select('*').eq(column, value);
    _check(error);
    return data;
  },

  /* ----------------------------------------------------------
     USUÁRIOS
  ---------------------------------------------------------- */

  async getUsuarios() {
    return this.list(TABLES.usuarios, { order: { column: 'nome' } });
  },

  async getUsuarioByEmail(email) {
    const { data, error } = await _client()
      .from(TABLES.usuarios)
      .select('*')
      .eq('email', email)
      .single();
    _check(error);
    return data;
  },

  /* ----------------------------------------------------------
     CENTROS DE CUSTO
  ---------------------------------------------------------- */

  async getCentrosCusto() {
    return this.list(TABLES.centrosCusto, {
      filters: [{ column: 'ativo', op: 'eq', value: true }],
      order: { column: 'nome' },
      limit: 5000,
    });
  },

  /* ----------------------------------------------------------
     FORNECEDORES
  ---------------------------------------------------------- */

  async getFornecedores(apenasAtivos = true) {
    const opts = { order: { column: 'nome' } };
    if (apenasAtivos) opts.filters = [{ column: 'ativo', op: 'eq', value: true }];
    return this.list(TABLES.fornecedores, opts);
  },

  async getFornecedor(id) {
    return this.get(TABLES.fornecedores, id);
  },

  async criarFornecedor(dados) {
    return this.create(TABLES.fornecedores, dados);
  },

  async atualizarFornecedor(id, dados) {
    return this.update(TABLES.fornecedores, id, dados);
  },

  /** Atualiza nota média e total de compras do fornecedor após avaliação. */
  async recalcularNotaFornecedor(id) {
    const fornecedor = await this.get(TABLES.fornecedores, id);
    const ordens = await this.filter(TABLES.ordens, 'fornecedor_id', id);

    const avaliacoes = ordens.filter(o => o.avaliacao_nota !== null);
    if (avaliacoes.length === 0) return;

    const soma  = avaliacoes.reduce((acc, o) => acc + o.avaliacao_nota, 0);
    const media = (soma / avaliacoes.length).toFixed(2);

    await this.update(TABLES.fornecedores, id, {
      nota_media_qualidade: media,
      total_avaliacoes: avaliacoes.length,
    });
  },

  /* ----------------------------------------------------------
     REQUISIÇÕES
  ---------------------------------------------------------- */

  /**
   * Retorna requisições filtradas por role do usuário.
   * Solicitantes veem apenas as próprias; outros veem todas.
   */
  async getRequisicoes(userId, role, filtros = {}) {
    let q = _client()
      .from(TABLES.requisicoes)
      .select('*')
      .order('created_at', { ascending: false });

    if (Utils.getVisibility(role) === 'own') {
      q = q.eq('solicitante_id', userId);
    }
    if (filtros.status)  q = q.eq('status', filtros.status);
    if (filtros.urgente) q = q.eq('urgente', filtros.urgente === 'urgente');

    const { data, error } = await q;
    _check(error);
    return data;
  },

  async getRequisicao(id) {
    return this.get(TABLES.requisicoes, id);
  },

  async criarRequisicao(dados) {
    // Resolve o UUID do solicitante pelo e-mail, se ainda não veio preenchido
    if (!dados.solicitante_id && dados.solicitante_email) {
      try {
        const u = await this.getUsuarioByEmail(dados.solicitante_email);
        if (u) dados.solicitante_id = u.id;
      } catch (_) { /* continua sem o id */ }
    }
    const result = await this.create(TABLES.requisicoes, dados);
    await this._registrarHistorico(result.id, 'Requisição criada', dados.solicitante_nome, dados.solicitante_email, null, dados.status);
    return result;
  },

  async atualizarRequisicao(id, dados, usuarioNome, usuarioEmail) {
    const anterior = await this.get(TABLES.requisicoes, id);
    const result   = await this.update(TABLES.requisicoes, id, dados);

    if (dados.status && dados.status !== anterior.status) {
      await this._registrarHistorico(id, `Status alterado para: ${dados.status}`, usuarioNome, usuarioEmail, anterior.status, dados.status);
    }
    return result;
  },

  /** Retorna requisições aguardando aprovação de acordo com o role do aprovador. */
  async getRequisicoesPendentesAprovacao(role) {
    let statusFiltro;
    if (['supervisor', 'gerente'].includes(role)) {
      statusFiltro = 'Aguardando Avaliacao de Compras';
    } else if (role === 'diretor' || role === 'admin') {
      statusFiltro = 'Aguardando Aprovacao da Diretoria';
    } else {
      return [];
    }

    const { data, error } = await _client()
      .from(TABLES.requisicoes)
      .select('*')
      .eq('status', statusFiltro)
      .order('urgente', { ascending: false })
      .order('created_at', { ascending: true });
    _check(error);
    return data;
  },

  /* ----------------------------------------------------------
     COTAÇÕES
  ---------------------------------------------------------- */

  async getCotacoes() {
    const { data, error } = await _client()
      .from(TABLES.cotacoes)
      .select('*')
      .order('created_at', { ascending: false });
    _check(error);
    return data;
  },

  async getCotacao(id) {
    return this.get(TABLES.cotacoes, id);
  },

  async getCotacaoPorRequisicao(requisicaoId) {
    const { data, error } = await _client()
      .from(TABLES.cotacoes)
      .select('*')
      .eq('requisicao_id', requisicaoId)
      .single();
    if (error?.code === 'PGRST116') return null; // not found
    _check(error);
    return data;
  },

  async criarCotacao(dados) {
    const result = await this.create(TABLES.cotacoes, dados);
    // Atualiza status da requisição para Em Cotacao
    if (dados.requisicao_id) {
      await this.update(TABLES.requisicoes, dados.requisicao_id, { status: 'Em Cotacao' });
      await this._registrarHistorico(dados.requisicao_id, `Cotação ${result.numero} criada`, dados.responsavel, dados.responsavel_email, 'Aprovada pela Diretoria', 'Em Cotacao');
    }
    return result;
  },

  async atualizarCotacao(id, dados) {
    return this.update(TABLES.cotacoes, id, dados);
  },

  /* ----------------------------------------------------------
     ORDENS DE COMPRA
  ---------------------------------------------------------- */

  async getOrdens() {
    const { data, error } = await _client()
      .from(TABLES.ordens)
      .select('*')
      .order('created_at', { ascending: false });
    _check(error);
    return data;
  },

  async getOrdem(id) {
    return this.get(TABLES.ordens, id);
  },

  async criarOrdem(dados) {
    const result = await this.create(TABLES.ordens, dados);
    if (dados.requisicao_id) {
      await this.update(TABLES.requisicoes, dados.requisicao_id, { status: 'Ordem de Compra Gerada' });
      await this._registrarHistorico(dados.requisicao_id, `Ordem ${result.numero} gerada`, dados.responsavel || 'Sistema', null, 'Em Cotacao', 'Ordem de Compra Gerada');
    }
    return result;
  },

  async atualizarOrdem(id, dados) {
    return this.update(TABLES.ordens, id, dados);
  },

  async avaliarOrdem(id, nota, comentario, usuarioNome) {
    const result = await this.update(TABLES.ordens, id, {
      avaliacao_nota:      nota,
      avaliacao_comentario: comentario,
      avaliado_por:        usuarioNome,
      data_avaliacao:      new Date().toISOString(),
    });
    const ordem = await this.get(TABLES.ordens, id);
    if (ordem.fornecedor_id) {
      await this.recalcularNotaFornecedor(ordem.fornecedor_id);
    }
    return result;
  },

  /* ----------------------------------------------------------
     RECEBIMENTOS
  ---------------------------------------------------------- */

  async getRecebimentos() {
    const { data, error } = await _client()
      .from(TABLES.recebimentos)
      .select('*')
      .order('created_at', { ascending: false });
    _check(error);
    return data;
  },

  async getRecebimento(id) {
    return this.get(TABLES.recebimentos, id);
  },

  async criarRecebimento(dados) {
    const result = await this.create(TABLES.recebimentos, dados);
    if (dados.requisicao_id) {
      await this.update(TABLES.requisicoes, dados.requisicao_id, { status: 'Aguardando Analise de Qualidade' });
      if (dados.ordem_compra_id) {
        await this.update(TABLES.ordens, dados.ordem_compra_id, { status: 'Aguardando Qualidade' });
      }
      await this._registrarHistorico(dados.requisicao_id, 'Material recebido — aguardando qualidade', dados.almoxarife, dados.almoxarife_email, 'Aguardando Recebimento', 'Aguardando Analise de Qualidade');
    }
    return result;
  },

  async atualizarRecebimento(id, dados) {
    return this.update(TABLES.recebimentos, id, dados);
  },

  /* ----------------------------------------------------------
     QUALIDADE
  ---------------------------------------------------------- */

  async getQualidade() {
    const { data, error } = await _client()
      .from(TABLES.qualidade)
      .select('*')
      .order('created_at', { ascending: false });
    _check(error);
    return data;
  },

  async criarAnaliseQualidade(dados) {
    const result = await this.create(TABLES.qualidade, dados);
    return result;
  },

  async concluirQualidade(id, aprovado, parecer, usuarioNome, usuarioEmail) {
    const analise    = await this.get(TABLES.qualidade, id);
    const novoStatus = aprovado ? 'Aprovado' : 'Reprovado';
    const result     = await this.update(TABLES.qualidade, id, { status: novoStatus, parecer_final: parecer });

    if (analise.requisicao_id) {
      const statusReq = aprovado ? 'Concluida' : 'Aguardando Recebimento';
      await this.update(TABLES.requisicoes, analise.requisicao_id, {
        status: statusReq,
        data_conclusao: aprovado ? new Date().toISOString() : null,
      });
      await this._registrarHistorico(
        analise.requisicao_id,
        `Qualidade: ${novoStatus}. ${parecer || ''}`,
        usuarioNome,
        usuarioEmail,
        'Aguardando Analise de Qualidade',
        statusReq,
      );
    }
    return result;
  },

  /* ----------------------------------------------------------
     HISTÓRICO
  ---------------------------------------------------------- */

  async getHistorico(requisicaoId) {
    const { data, error } = await _client()
      .from(TABLES.historico)
      .select('*')
      .eq('requisicao_id', requisicaoId)
      .order('created_at', { ascending: true });
    _check(error);
    return data;
  },

  /** Registra uma entrada no histórico de uma requisição. */
  async _registrarHistorico(requisicaoId, acao, usuario, usuarioEmail, statusAnterior, statusNovo) {
    try {
      await this.create(TABLES.historico, {
        requisicao_id:   requisicaoId,
        acao,
        usuario:         usuario || 'Sistema',
        usuario_email:   usuarioEmail || null,
        status_anterior: statusAnterior || null,
        status_novo:     statusNovo || null,
      });
    } catch (e) {
      console.warn('Erro ao registrar histórico:', e.message);
    }
  },

  /* ----------------------------------------------------------
     CONFIGURAÇÕES
  ---------------------------------------------------------- */

  async getConfigAlcadas() {
    const { data, error } = await _client()
      .from(TABLES.configAlcadas)
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    if (error?.code === 'PGRST116') return null;
    _check(error);
    return data;
  },

  async salvarConfigAlcadas(alcadas, usuarioNome) {
    const existente = await this.getConfigAlcadas();
    const payload   = { alcadas, updated_by: usuarioNome, updated_at: new Date().toISOString() };

    if (existente) {
      return this.update(TABLES.configAlcadas, existente.id, payload);
    }
    return this.create(TABLES.configAlcadas, payload);
  },

  async getConfigPermissoes() {
    const { data, error } = await _client()
      .from(TABLES.configPermissoes)
      .select('*')
      .limit(1)
      .single();
    if (error?.code === 'PGRST116') return null;
    _check(error);
    return data;
  },

  /* ----------------------------------------------------------
     DASHBOARD — estatísticas agregadas
  ---------------------------------------------------------- */

  async getDashboardStats(userId, role) {
    const requisicoes = await this.getRequisicoes(userId, role);

    const countByStatus = requisicoes.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    const valorTotal = requisicoes
      .filter(r => r.status !== 'Cancelada' && r.status !== 'Nao Aprovada')
      .reduce((acc, r) => acc + (r.valor_total || 0), 0);

    const urgentes = requisicoes.filter(r =>
      r.urgente && !['Concluida', 'Cancelada', 'Nao Aprovada'].includes(r.status)
    ).length;

    // 8 mais recentes para o feed de atividade
    const recentes = [...requisicoes]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 8)
      .map(r => ({
        numero:    r.numero,
        descricao: r.descricao,
        status:    r.status,
        created_at: r.created_at,
      }));

    return { countByStatus, valorTotal, urgentes, total: requisicoes.length, recentes };
  },

  /* ----------------------------------------------------------
     RELATÓRIOS
  ---------------------------------------------------------- */

  /** Retorna requisições de um período para relatórios. */
  async getRequisicoesPorPeriodo(dataInicio, dataFim) {
    const { data, error } = await _client()
      .from(TABLES.requisicoes)
      .select('*')
      .gte('data_requisicao', dataInicio)
      .lte('data_requisicao', dataFim)
      .order('data_requisicao', { ascending: true });
    _check(error);
    return data;
  },

  /** Retorna ordens com avaliações para relatório de fornecedores. */
  async getRelatorioFornecedores() {
    const { data, error } = await _client()
      .from(TABLES.ordens)
      .select('fornecedor, fornecedor_id, avaliacao_nota, valor_total, created_at')
      .not('avaliacao_nota', 'is', null)
      .order('fornecedor');
    _check(error);
    return data;
  },

  /* ----------------------------------------------------------
     UPLOAD DE ARQUIVOS
  ---------------------------------------------------------- */

  /**
   * Faz upload de um arquivo no bucket concrem-fxcp-arquivos.
   * @param {string} path  — ex: 'nf/OC-0001/nota.pdf'
   * @param {File}   file  — objeto File do input
   */
  async uploadFile(path, file) {
    const { data, error } = await _client().storage
      .from(BUCKET)
      .upload(path, file, { upsert: true });
    _check(error);
    return data;
  },

  /**
   * Retorna URL pública de um arquivo no bucket.
   * @param {string} path — mesmo path usado no upload
   */
  getFileUrl(path) {
    const { data } = _client().storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },

  /**
   * Remove um arquivo do bucket.
   * @param {string} path
   */
  async deleteFile(path) {
    const { error } = await _client().storage.from(BUCKET).remove([path]);
    _check(error);
  },
};
