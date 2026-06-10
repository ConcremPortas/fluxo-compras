/* ============================================================
   FLUXOCOMPRAS — Página: Cotações (Lista + Detalhe)
   ============================================================ */

var Pages = window.Pages || {};

/* ============================================================
   A — LISTA DE COTAÇÕES · Premium v2
   ============================================================ */
Pages.Cotacoes = {
  _dados:           [],
  _filtrados:       [],
  _requisicoesDisp: [],
  _reqSemCotacao:   [],

  _STATUS_FILTROS: [
    { status: '',                                    label: 'Todos'             },
    { status: 'Em Andamento',                        label: 'Em Andamento'      },
    { status: 'Aguardando Aprovacao do Demandante',  label: 'Aguard. Demandante'},
    { status: 'Em Revisao',                          label: 'Em Revisão'        },
    { status: 'Aprovada',                            label: 'Aprovada'          },
    { status: 'Concluida',                           label: 'Concluída'         },
    { status: 'Cancelada',                           label: 'Cancelada'         },
  ],

  _filtroStatusAtivo: 'Em Andamento',

  async render() {
    document.title = 'Cotações';
    App.setPageTitle('Cotações');

    document.getElementById('main-content').innerHTML = `
      ${Components.pageHeader({
        title:   'Cotações',
        subtitle: 'Comparativo de preços e seleção de fornecedores',
        actions: [{ label: '＋ Nova Cotação', primary: true, id: 'btn-nova-cotacao' }],
      })}

      <div id="pills-container-cot"></div>

      <div class="cot-filters-card">
        <div class="cot-search-wrap">
          <span class="cot-search-icon">🔍</span>
          <input class="cot-search-input" type="text" id="search-cot"
            placeholder="Buscar por número, requisição ou responsável..." />
        </div>
        <span class="cot-count" id="cot-count">—</span>
      </div>

      <div class="cot-table-wrap" id="tabela-cotacoes"></div>`;

    this._filtroStatusAtivo = 'Em Andamento';

    document.getElementById('search-cot')
      ?.addEventListener('input', () => this._aplicarFiltros());
    document.getElementById('btn-nova-cotacao')
      ?.addEventListener('click', () => this._abrirDialogNova());

    await this._loadDados();
  },

  async _loadDados() {
    const container = document.getElementById('tabela-cotacoes');
    if (container) {
      container.innerHTML = `
        <table class="cot-table">
          <thead>
            <tr>
              <th>Número</th><th>Requisição</th><th>Fornecedores</th>
              <th>Valor Final</th><th>Responsável</th><th>Status</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${[...Array(3)].map(() => `
              <tr>
                ${[80, 100, 90, 90, 120, 100, 60].map(w =>
                  `<td><div class="skeleton skeleton-text" style="width:${w}px"></div></td>`
                ).join('')}
              </tr>`).join('')}
          </tbody>
        </table>`;
    }

    try {
      const [cotacoes, todasReqs] = await Promise.all([
        Storage.list(TABLES.cotacoes, { order: { column: 'created_at', ascending: false } }),
        Storage.list(TABLES.requisicoes).catch(() => []),
      ]);
      this._dados = cotacoes || [];

      // Requisições aprovadas aguardando cotação (sem cotação em andamento)
      const cotsAtivas = new Set((this._dados || [])
        .filter(c => !['Concluida', 'Cancelada'].includes(c.status))
        .map(c => c.requisicao_id).filter(Boolean));
      this._reqSemCotacao = (todasReqs || []).filter(r =>
        r.status === 'Em Cotacao' && !cotsAtivas.has(r.id)
      );

      const pillsContainer = document.getElementById('pills-container-cot');
      if (pillsContainer) {
        pillsContainer.innerHTML = this._renderBannerReqPendentes() + this._renderPillsFiltro();
      }
      document.getElementById('cot-status-pills')
        ?.addEventListener('click', e => {
          const pill = e.target.closest('.req-status-pill');
          if (!pill) return;
          this._filtroStatusAtivo = pill.dataset.status;
          document.querySelectorAll('#cot-status-pills .req-status-pill').forEach(p => {
            p.classList.toggle('ativo', p.dataset.status === this._filtroStatusAtivo);
          });
          this._aplicarFiltros();
        });

      this._aplicarFiltros();
    } catch (e) {
      console.error('[Cotacoes]', e);
      Components.Toast.error('Erro ao carregar cotações.');
    }
  },

  _renderBannerReqPendentes() {
    const reqs = this._reqSemCotacao || [];
    if (reqs.length === 0) return '';
    const itens = reqs.slice(0, 5).map(r => `
      <span style="display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.7);
                   border:1px solid #fde68a;border-radius:6px;padding:3px 8px;font-size:12px;
                   font-weight:600;color:#92400e;cursor:pointer;white-space:nowrap;"
            onclick="Pages.Cotacoes._abrirDialogNovaDe('${Utils.escapeHtml(String(r.id))}')">
        📋 ${Utils.escapeHtml(r.numero)}
        <span style="font-weight:400;color:#b45309;">${Utils.escapeHtml(r.setor || '')}</span>
        <span style="color:#15803d;font-weight:700;">${Utils.formatCurrency(r.valor_total)}</span>
      </span>`).join('');
    const extra = reqs.length > 5 ? `<span style="font-size:12px;color:#92400e;padding:4px 6px;">+${reqs.length - 5} mais</span>` : '';
    return `
      <div style="background:#fffbeb;border:1.5px solid #fde68a;border-radius:10px;
                  padding:12px 16px;margin-bottom:12px;display:flex;flex-wrap:wrap;
                  align-items:center;gap:8px;">
        <span style="font-size:16px;">⚠️</span>
        <span style="font-size:13px;font-weight:700;color:#92400e;white-space:nowrap;">
          ${reqs.length} requisição${reqs.length > 1 ? 'ões' : ''} aprovada${reqs.length > 1 ? 's' : ''} aguardando cotação:
        </span>
        <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
          ${itens}${extra}
        </div>
        <button onclick="Pages.Cotacoes._abrirDialogNova()"
          style="margin-left:auto;padding:5px 12px;border-radius:7px;border:1.5px solid #f59e0b;
                 background:#fef3c7;color:#92400e;font-size:12px;font-weight:700;cursor:pointer;
                 white-space:nowrap;">
          ＋ Nova Cotação
        </button>
      </div>`;
  },

  _renderPillsFiltro() {
    const contagem = {};
    this._dados.forEach(c => {
      contagem[c.status] = (contagem[c.status] || 0) + 1;
    });

    const pills = this._STATUS_FILTROS
      .filter(f => f.status === '' || (contagem[f.status] || 0) > 0)
      .map(f => {
        const cnt   = f.status === '' ? this._dados.length : (contagem[f.status] || 0);
        const ativo = f.status === this._filtroStatusAtivo ? ' ativo' : '';
        return `<button class="req-status-pill${ativo}" data-status="${Utils.escapeHtml(f.status)}">
          ${Utils.escapeHtml(f.label)}
          <span class="pill-count">${cnt}</span>
        </button>`;
      }).join('');

    return `<div class="req-status-filters" id="cot-status-pills">${pills}</div>`;
  },

  _aplicarFiltros() {
    const busca = (document.getElementById('search-cot')?.value || '').toLowerCase().trim();

    this._filtrados = this._dados.filter(c => {
      const matchBusca  = !busca || [c.numero, c.requisicao_numero, c.responsavel]
        .some(v => v && String(v).toLowerCase().includes(busca));
      const matchStatus = !this._filtroStatusAtivo || c.status === this._filtroStatusAtivo;
      return matchBusca && matchStatus;
    });

    const count = document.getElementById('cot-count');
    if (count) {
      const total = this._dados.length;
      const fil   = this._filtrados.length;
      count.textContent = fil === total
        ? `${total} cotaç${total !== 1 ? 'ões' : 'ão'}`
        : `${fil} de ${total}`;
    }

    this._renderTabela(this._filtrados);
  },

  _renderTabela(dados) {
    const container = document.getElementById('tabela-cotacoes');
    if (!container) return;

    if (!dados || dados.length === 0) {
      container.innerHTML = `
        <div class="cot-empty">
          <div class="cot-empty-icon">💰</div>
          <div class="cot-empty-title">Nenhuma cotação encontrada</div>
          <div class="cot-empty-sub">Clique em "Nova Cotação" para iniciar o processo.</div>
        </div>`;
      return;
    }

    const rows = dados.map((c, i) => {
      const fornCount = Array.isArray(c.fornecedores) ? c.fornecedores.length : 0;

      return `
        <tr style="animation-delay:${i * 40}ms">
          <td>
            <span class="cot-numero-badge btn-ver-cot" data-id="${Utils.escapeHtml(String(c.id))}">
              ${Utils.escapeHtml(c.numero || '—')}
            </span>
          </td>
          <td style="color:#2D3748;font-weight:500;">
            ${Utils.escapeHtml(c.requisicao_numero || '—')}
          </td>
          <td>
            ${fornCount > 0
              ? `<span class="cot-forn-pill">🏢 ${fornCount} fornecedor${fornCount > 1 ? 'es' : ''}</span>`
              : `<span style="color:#A0AEC0;">—</span>`}
          </td>
          <td>
            ${c.valor_total_final
              ? `<span class="cot-valor-destaque">${Utils.formatCurrency(c.valor_total_final)}</span>`
              : `<span style="color:#A0AEC0;">—</span>`}
          </td>
          <td style="color:#718096;">${Utils.escapeHtml(c.responsavel || '—')}</td>
          <td>${Components.badge(c.status)}</td>
          <td style="text-align:right;">
            <button class="cot-btn-ver btn-ver-cot" data-id="${Utils.escapeHtml(String(c.id))}">
              👁️ Ver
            </button>
          </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
      <table class="cot-table">
        <thead>
          <tr>
            <th>Número</th>
            <th>Requisição</th>
            <th>Fornecedores</th>
            <th>Valor Final</th>
            <th>Responsável</th>
            <th>Status</th>
            <th style="text-align:right">Ações</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

    container.querySelectorAll('.btn-ver-cot').forEach(btn =>
      btn.addEventListener('click', () => App.navigate('cotacoes/' + btn.dataset.id))
    );
  },

  async _abrirDialogNova() {
    try {
      const todas = await Storage.list(TABLES.requisicoes) || [];
      this._requisicoesDisp = todas.filter(r => r.status === 'Em Cotacao');
    } catch (_) {
      this._requisicoesDisp = [];
    }

    const opcoesReq = this._requisicoesDisp.length > 0
      ? this._requisicoesDisp.map(r =>
          `<option value="${Utils.escapeHtml(String(r.id))}">
            ${Utils.escapeHtml(r.numero)} — ${Utils.escapeHtml(r.setor || '')} — ${Utils.formatCurrency(r.valor_total)}
          </option>`
        ).join('')
      : '<option value="" disabled>Nenhuma requisição em cotação</option>';

    Components.Modal.show({
      title:   'Nova Cotação',
      size:    'sm',
      content: `
        <div class="drawer-field">
          <label class="drawer-label">Requisição <span class="required">*</span></label>
          <div id="cs-select-requisicao"></div>
        </div>
        <div class="drawer-field">
          <label class="drawer-label" for="cot-responsavel">Responsável</label>
          <input type="text" class="drawer-input" id="cot-responsavel"
            value="${Utils.escapeHtml(App.currentUser.nome)}" />
        </div>`,
      footer: `
        <button class="drawer-btn-cancelar" id="btn-cancelar-nova-cot">Cancelar</button>
        <button class="drawer-btn-salvar"   id="btn-criar-cot">💰 Criar Cotação</button>`,
    });

    this._csCotRequisicao = CustomSelect.criar(
      document.getElementById('cs-select-requisicao'),
      this._requisicoesDisp.map(r => ({
        value:    String(r.id),
        label:    `${r.numero} — ${r.setor || ''}`,
        sublabel: Utils.formatCurrency(r.valor_total),
      })),
      { placeholder: '— Selecione a requisição —', limpar: false, rodape: false, value: '' }
    );

    document.getElementById('btn-cancelar-nova-cot')?.addEventListener('click', () => Components.Modal.hide());
    document.getElementById('btn-criar-cot')?.addEventListener('click', () => this._criarCotacao());
  },

  async _abrirDialogNovaDe(reqId) {
    await this._abrirDialogNova();
    // Pré-selecionar a requisição no CustomSelect após o modal abrir
    if (this._csCotRequisicao && reqId) {
      this._csCotRequisicao.setValue(String(reqId));
    }
  },

  async _criarCotacao() {
    const reqId = this._csCotRequisicao?.getValue();
    const resp  = document.getElementById('cot-responsavel')?.value.trim();
    if (!reqId) { Components.Toast.warning('Selecione uma requisição.'); return; }

    const btn = document.getElementById('btn-criar-cot');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Criando...'; }

    try {
      const req  = this._requisicoesDisp.find(r => String(r.id) === String(reqId));
      const user = App.currentUser;

      const nova = await Storage.create(TABLES.cotacoes, {
        numero:               Utils.generateCOT(),
        requisicao_id:        reqId,
        requisicao_numero:    req?.numero || '',
        fornecedores:         [],
        status:               'Em Andamento',
        aprovacao_demandante: 'Pendente',
        responsavel:          resp || user.nome,
        responsavel_email:    user.email,
        valor_total_final:    0,
      });

      Components.Modal.hide();
      Components.Toast.success('Cotação criada! Adicione os fornecedores.');
      App.navigate('cotacoes/' + nova.id);
    } catch (e) {
      console.error('[Cotacoes] Erro ao criar:', e);
      Components.Toast.error('Erro ao criar a cotação.');
      if (btn) { btn.disabled = false; btn.textContent = '💰 Criar Cotação'; }
    }
  },
};

/* ============================================================
   B — DETALHE DA COTAÇÃO
   ============================================================ */
/* ============================================================
   B — DETALHE DA COTAÇÃO · Premium v2
   ============================================================ */
Pages.DetalheCotacao = {
  _cotacao:     null,
  _requisicao:  null,
  _ocExistente: null,
  _saveTimer:   null,

  /** Cancela o timer de salvamento pendente (chamar ao navegar para fora). */
  _cancelarSaveTimer() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }
  },

  async render(id) {
    // Cancelar qualquer save pendente da sessão anterior antes de carregar nova
    this._cancelarSaveTimer();
    document.title = 'Cotação';
    App.setPageTitle('Carregando...');

    const content = document.getElementById('main-content');
    content.innerHTML = `
      <div class="loading-table">
        ${[...Array(4)].map(() => '<div class="skeleton skeleton-row"></div>').join('')}
      </div>`;

    try {
      const cot = await Storage.get(TABLES.cotacoes, id);
      if (!cot) {
        Components.Toast.error('Cotação não encontrada.');
        App.navigate('cotacoes');
        return;
      }

      // Normalizar fornecedores
      if (typeof cot.fornecedores === 'string') {
        try { cot.fornecedores = JSON.parse(cot.fornecedores); } catch { cot.fornecedores = []; }
      }
      if (!Array.isArray(cot.fornecedores)) cot.fornecedores = [];

      const [req, todasOrdens] = await Promise.all([
        Storage.get(TABLES.requisicoes, cot.requisicao_id).catch(() => null),
        Storage.list(TABLES.ordens).catch(() => []),
      ]);

      this._cotacao    = cot;
      this._requisicao = req;
      // Verifica se já existe OC vinculada a esta cotação
      this._ocExistente = (todasOrdens || []).find(o => String(o.cotacao_id) === String(cot.id)) || null;

      App.setPageTitle(cot.numero || 'Cotação');
      this._renderDetalhe();
    } catch (e) {
      console.error('[DetalheCotacao]', e);
      Components.Toast.error('Erro ao carregar a cotação.');
      App.navigate('cotacoes');
    }
  },

  _renderDetalhe() {
    const cot  = this._cotacao;
    const req  = this._requisicao;
    const user = App.currentUser;

    const statusFinal   = ['Aprovada', 'Concluida', 'Cancelada'].includes(cot.status);
    const podEditar     = ['admin', 'gerente'].includes(user.role) && !statusFinal;
    const isDemandante  = req && (req.solicitante_email === user.email || user.role === 'admin');

    const podeAdicionar = podEditar && ['Em Andamento', 'Em Revisao'].includes(cot.status);
    const podeEnviar    = podEditar && ['Em Andamento', 'Em Revisao'].includes(cot.status);
    const podeAprovar   = isDemandante && cot.status === 'Aguardando Aprovacao do Demandante';
    const estaEmRevisao = podEditar && cot.status === 'Em Revisao';

    const vencedor = cot.fornecedores.find(f => f.selecionado);

    const aprovMap = { Pendente: 'badge-waiting', Aprovada: 'badge-approved', Revisao: 'badge-returned' };
    const aprovLbl = { Pendente: 'Pendente', Aprovada: 'Aprovada', Revisao: 'Revisão' };
    const aprovVal = cot.aprovacao_demandante || 'Pendente';
    const aprovBadge = `<span class="badge ${aprovMap[aprovVal] || 'badge-cancelled'}">${aprovLbl[aprovVal] || aprovVal}</span>`;

    const content = document.getElementById('main-content');
    content.innerHTML = `
      <!-- ── HEADER ── -->
      <div class="cot-detalhe-header">
        <div>
          <div class="cot-detalhe-numero">
            ${Utils.escapeHtml(cot.numero || '—')}
            ${Components.badge(cot.status)}
          </div>
          <span class="cot-detalhe-data">Criada em ${Utils.formatDate(cot.created_at)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <button class="req-btn-voltar" id="btn-voltar-cot">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Voltar
          </button>
          ${podeAdicionar ? `
            <button class="btn btn-primary btn-sm" id="btn-add-forn">
              ＋ Adicionar Fornecedor
            </button>` : ''}
        </div>
      </div>

      <!-- ── INFO CARDS ── -->
      <div class="cot-info-grid">
        <div class="cot-info-card">
          <span class="cot-info-label">📋 Requisição</span>
          <span class="cot-info-value">${Utils.escapeHtml(cot.requisicao_numero || '—')}</span>
          ${req ? `<a href="#requisicoes/${Utils.escapeHtml(String(req.id))}"
            style="font-size:11px;color:hsl(142,72%,26%);">Ver requisição →</a>` : ''}
        </div>
        <div class="cot-info-card">
          <span class="cot-info-label">💰 Valor Final</span>
          <span class="cot-info-value" style="color:hsl(142,72%,26%);" id="info-valor-final">
            ${vencedor ? Utils.formatCurrency(vencedor.valor_total)
              : (cot.valor_total_final ? Utils.formatCurrency(cot.valor_total_final) : '—')}
          </span>
          ${vencedor ? `<span class="cot-info-sub">${Utils.escapeHtml(vencedor.nome)}</span>` : ''}
        </div>
        <div class="cot-info-card">
          <span class="cot-info-label">👤 Responsável</span>
          <span class="cot-info-value">${Utils.escapeHtml(cot.responsavel || '—')}</span>
        </div>
        <div class="cot-info-card">
          <span class="cot-info-label">✅ Aprovação Demandante</span>
          <span class="cot-info-value">${aprovBadge}</span>
          ${req ? `<span class="cot-info-sub">${Utils.escapeHtml(req.solicitante_nome || '')}</span>` : ''}
        </div>
      </div>

      <!-- ── FORNECEDORES ── -->
      <div class="cot-section-card">
        <div class="cot-section-header">
          <div class="cot-section-header-left">
            <span class="cot-section-icon">🏢</span>
            <span class="cot-section-title">Fornecedores Cotados (${cot.fornecedores.length})</span>
          </div>
        </div>
        <div style="padding:16px 20px;" id="fornecedores-container">
          ${cot.fornecedores.length === 0 ? `
            <div class="cot-empty" style="padding:36px 0;">
              <div class="cot-empty-icon">🏢</div>
              <div class="cot-empty-title">Nenhum fornecedor adicionado</div>
              ${podeAdicionar ? `<div class="cot-empty-sub">Clique em "＋ Adicionar Fornecedor" para começar.</div>` : ''}
            </div>`
            : cot.fornecedores.map((f, fi) => this._renderFornecedorCard(f, fi, podEditar)).join('')}
        </div>
      </div>

      <!-- ── PAINEL ENVIO ── -->
      ${podeEnviar ? this._renderPainelEnvio(vencedor, cot.justificativa_selecao) : ''}

      <!-- ── PAINEL DEMANDANTE ── -->
      ${podeAprovar ? this._renderPainelAprovacaoDemandante(vencedor) : ''}

      <!-- ── PAINEL REVISÃO ── -->
      ${estaEmRevisao ? this._renderPainelRevisao() : ''}

      <!-- ── PAINEL OC AUSENTE (cotação aprovada sem OC vinculada) ── -->
      ${(cot.status === 'Aprovada' && !this._ocExistente) ? `
        <div style="background:#f0fdf4;border:2px solid hsl(142,70%,40%);border-left-width:5px;
            border-radius:14px;padding:18px 20px;margin-bottom:16px;display:flex;
            align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;">
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <span style="font-size:22px;flex-shrink:0;">📋</span>
            <div>
              <div style="font-size:14px;font-weight:700;color:hsl(142,72%,26%);font-family:'Manrope',sans-serif;margin-bottom:4px;">
                Ordem de Compra não gerada
              </div>
              <div style="font-size:13px;color:#166534;font-family:'Manrope',sans-serif;line-height:1.5;">
                Esta cotação está aprovada mas a OC não foi criada (erro anterior).
                Clique em "Gerar Ordem de Compra" para corrigir.
              </div>
            </div>
          </div>
          <button class="aprov-btn-confirmar" id="btn-gerar-oc-manual" style="flex-shrink:0;">
            📋 Gerar Ordem de Compra
          </button>
        </div>` : ''}

      <!-- ── LINK PARA OC EXISTENTE ── -->
      ${(cot.status === 'Aprovada' && this._ocExistente) ? `
        <div style="background:#f0fdf4;border:1.5px solid hsl(142,70%,40%);border-radius:14px;
            padding:14px 20px;margin-bottom:16px;display:flex;align-items:center;
            justify-content:space-between;flex-wrap:wrap;gap:10px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:18px;">✅</span>
            <div>
              <div style="font-size:13px;font-weight:700;color:hsl(142,72%,26%);font-family:'Manrope',sans-serif;">
                Ordem de Compra Gerada
              </div>
              <div style="font-size:12px;color:#166534;font-family:'Manrope',sans-serif;">
                ${Utils.escapeHtml(this._ocExistente.numero || '—')}
              </div>
            </div>
          </div>
          <button class="cot-btn-selecionar" onclick="App.navigate('ordens/${Utils.escapeHtml(String(this._ocExistente.id))}')">
            Ver Ordem de Compra →
          </button>
        </div>` : ''}`;

    // Animar cards
    requestAnimationFrame(() => {
      document.querySelectorAll('.cot-info-card, .cot-section-card, .cot-envio-panel, .cot-demandante-panel, .cot-revisao-panel')
        .forEach(el => el.classList.add('loaded'));
    });

    // Listeners
    document.getElementById('btn-voltar-cot')?.addEventListener('click', () => {
      this._cancelarSaveTimer();
      App.navigate('cotacoes');
    });
    document.getElementById('btn-add-forn')?.addEventListener('click',   () => this._abrirDialogFornecedor());
    document.getElementById('btn-enviar-aprovacao')?.addEventListener('click', () => this._enviarParaAprovacao());
    document.getElementById('btn-gerar-oc-direta')?.addEventListener('click',  () => this._gerarOCDireta());
    document.getElementById('btn-aprovar-demandante')?.addEventListener('click', () => this._aprovarDemandante());
    document.getElementById('btn-solicitar-revisao')?.addEventListener('click',  () => this._solicitarRevisao());
    document.getElementById('btn-reabrir-cotacao')?.addEventListener('click',    () => this._reabrirCotacao());
    document.getElementById('btn-gerar-oc-manual')?.addEventListener('click',    () => this._gerarOCManual());

    // Delegação — preços e campos extra
    document.getElementById('fornecedores-container')?.addEventListener('input', e => {
      const fi = parseInt(e.target.dataset.fi ?? e.target.dataset.forn, 10);
      if (isNaN(fi)) return;

      if (e.target.classList.contains('cot-preco-input') || e.target.classList.contains('preco-input')) {
        const ii = parseInt(e.target.dataset.ii ?? e.target.dataset.item, 10);
        this._calcularPrecoItem(fi, ii);
        this._calcularTotalFornecedor(fi);
        this._atualizarValorFinal();
        this._salvarDebounce();
      }
      if (e.target.classList.contains('cot-forn-extra-input')) {
        const tipo = e.target.dataset.tipo;
        if (tipo) { this._cotacao.fornecedores[fi][tipo] = e.target.value; this._salvarDebounce(); }
      }
      // compat: prazo-input / condicao-input
      if (e.target.classList.contains('prazo-input')) {
        this._cotacao.fornecedores[fi].prazo_entrega = e.target.value; this._salvarDebounce();
      }
      if (e.target.classList.contains('condicao-input')) {
        this._cotacao.fornecedores[fi].condicao_pagamento = e.target.value; this._salvarDebounce();
      }
    });

    document.getElementById('fornecedores-container')?.addEventListener('click', e => {
      const btnSel = e.target.closest('.btn-selecionar-forn') || e.target.closest('.btn-selecionar-vencedor');
      const btnRem = e.target.closest('.btn-remover-forn');
      if (btnSel) this._selecionarVencedor(parseInt(btnSel.dataset.fi, 10));
      if (btnRem) this._removerFornecedor(parseInt(btnRem.dataset.fi, 10));

      const btnVer = e.target.closest('.btn-ver-anexo');
      if (btnVer) {
        const fi = parseInt(btnVer.dataset.fi, 10);
        const ai = parseInt(btnVer.dataset.ai, 10);
        const anexo = this._cotacao.fornecedores[fi]?.anexos?.[ai];
        if (anexo) {
          const win = window.open();
          win.document.write(`<iframe src="${anexo.dados}" style="width:100%;height:100vh;border:none;"></iframe>`);
        }
      }

      const btnRemAnexo = e.target.closest('.btn-remover-anexo');
      if (btnRemAnexo) {
        const fi = parseInt(btnRemAnexo.dataset.fi, 10);
        const ai = parseInt(btnRemAnexo.dataset.ai, 10);
        this._cotacao.fornecedores[fi].anexos.splice(ai, 1);
        this._salvarDebounce();
        this._reRenderCard(fi);
      }
    });

    document.getElementById('fornecedores-container')?.addEventListener('change', e => {
      const input = e.target.closest('.cot-upload-input');
      if (!input) return;
      const fi   = parseInt(input.dataset.fi, 10);
      const file = input.files[0];
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
        Components.Toast.error('Arquivo muito grande. Máximo 10 MB.');
        input.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (!this._cotacao.fornecedores[fi].anexos) this._cotacao.fornecedores[fi].anexos = [];
        this._cotacao.fornecedores[fi].anexos.push({
          nome:    file.name,
          tipo:    file.type,
          tamanho: file.size,
          dados:   reader.result,
          data:    new Date().toISOString(),
        });
        this._salvarDebounce();
        this._reRenderCard(fi);
        Components.Toast.success(`📎 "${file.name}" anexado.`);
      };
      reader.readAsDataURL(file);
    });
  },

  _reRenderCard(fi) {
    const forn     = this._cotacao.fornecedores[fi];
    const podEditar = ['aberta', 'rascunho'].includes(this._cotacao.status);
    const card     = document.getElementById(`cot-forn-${fi}`);
    if (!card) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = this._renderFornecedorCard(forn, fi, podEditar);
    card.replaceWith(tmp.firstElementChild);
  },

  _renderFornecedorCard(forn, fi, podEditar) {
    const itens = forn.itens || [];
    const itensHtml = itens.map((item, ii) => `
      <tr>
        <td>${Utils.escapeHtml(item.descricao || '—')}</td>
        <td style="text-align:center;">${item.quantidade}</td>
        <td>${Utils.escapeHtml(item.unidade || 'UN')}</td>
        <td>
          ${podEditar
            ? `<input type="number" class="cot-preco-input" min="0" step="0.01"
                 value="${item.valor_unitario || ''}" placeholder="0,00"
                 data-fi="${fi}" data-ii="${ii}" data-forn="${fi}" data-item="${ii}" />`
            : Utils.formatCurrency(item.valor_unitario)}
        </td>
        <td style="text-align:right;">
          <span class="cot-preco-total" id="total-f${fi}-i${ii}">
            ${Utils.formatCurrency(item.valor_total || 0)}
          </span>
        </td>
      </tr>`).join('');

    return `
      <div class="cot-forn-card ${forn.selecionado ? 'vencedor' : ''}" id="cot-forn-${fi}" data-fi="${fi}">
        <div class="cot-forn-header">
          <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;">
            <span class="cot-forn-nome">${Utils.escapeHtml(forn.nome || '—')}</span>
            ${forn.cnpj ? `<span class="cot-forn-cnpj">${Utils.escapeHtml(forn.cnpj)}</span>` : ''}
            ${forn.nota_historica
              ? `<span class="cot-nota-historica">⭐ ${forn.nota_historica} (histórico)</span>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${forn.selecionado ? `<span class="cot-vencedor-badge">🏆 Vencedor</span>` : ''}
            ${podEditar ? `<button class="cot-btn-remover btn-remover-forn" data-fi="${fi}" title="Remover">🗑</button>` : ''}
          </div>
        </div>

        ${itens.length > 0 ? `
          <table class="cot-preco-table">
            <thead>
              <tr>
                <th>Item</th>
                <th style="width:60px;text-align:center">Qtd</th>
                <th style="width:70px">Unid.</th>
                <th style="width:140px">Valor Unit. (R$)</th>
                <th style="width:120px;text-align:right">Total</th>
              </tr>
            </thead>
            <tbody>${itensHtml}</tbody>
          </table>
          <div class="cot-forn-total-row">
            <span class="cot-forn-total-label">Total do Fornecedor:</span>
            <span class="cot-forn-total-valor" id="forn-total-${fi}">
              ${Utils.formatCurrency(forn.valor_total || 0)}
            </span>
          </div>` : ''}

        <div class="cot-forn-extra">
          <div>
            <span class="cot-forn-extra-label">Prazo de Entrega</span>
            ${podEditar
              ? `<input type="text" class="cot-forn-extra-input prazo-input"
                   value="${Utils.escapeHtml(forn.prazo_entrega || '')}"
                   placeholder="Ex: 15 dias úteis"
                   data-fi="${fi}" data-tipo="prazo_entrega" />`
              : `<div style="font-size:13px;color:#2D3748;">${Utils.escapeHtml(forn.prazo_entrega || '—')}</div>`}
          </div>
          <div>
            <span class="cot-forn-extra-label">Condição de Pagamento</span>
            ${podEditar
              ? `<input type="text" class="cot-forn-extra-input condicao-input"
                   value="${Utils.escapeHtml(forn.condicao_pagamento || '')}"
                   placeholder="Ex: 30/60 dias"
                   data-fi="${fi}" data-tipo="condicao_pagamento" />`
              : `<div style="font-size:13px;color:#2D3748;">${Utils.escapeHtml(forn.condicao_pagamento || '—')}</div>`}
          </div>
        </div>

        <div class="cot-forn-anexos">
          <div class="cot-forn-extra-label" style="margin-bottom:8px;">📎 Orçamentos Anexados</div>
          ${(forn.anexos || []).length === 0
            ? `<span class="cot-anexo-vazio">Nenhum arquivo anexado.</span>`
            : (forn.anexos || []).map((a, ai) => `
              <div class="cot-anexo-item">
                <span class="cot-anexo-icone">${a.tipo?.includes('pdf') ? '📄' : '🖼️'}</span>
                <span class="cot-anexo-nome" title="${Utils.escapeHtml(a.nome)}">${Utils.escapeHtml(a.nome)}</span>
                <span class="cot-anexo-tamanho">${(a.tamanho / 1024).toFixed(0)} KB</span>
                <button class="cot-anexo-btn btn-ver-anexo" data-fi="${fi}" data-ai="${ai}" title="Visualizar">👁️</button>
                ${podEditar ? `<button class="cot-anexo-btn btn-remover-anexo" data-fi="${fi}" data-ai="${ai}" title="Remover">🗑️</button>` : ''}
              </div>`).join('')}
          ${podEditar ? `
            <label class="cot-anexo-upload-label">
              + Anexar Orçamento
              <input type="file" class="cot-upload-input" data-fi="${fi}"
                     accept=".pdf,.jpg,.jpeg,.png,.webp" style="display:none;" />
            </label>` : ''}
        </div>

        ${podEditar ? `
          <div class="cot-forn-footer">
            ${forn.selecionado
              ? `<button class="cot-btn-selecionado">🏆 Vencedor Selecionado</button>`
              : `<button class="cot-btn-selecionar btn-selecionar-forn" data-fi="${fi}">
                   🏆 Selecionar como Vencedor
                 </button>`}
          </div>` : ''}
      </div>`;
  },

  _renderPainelEnvio(vencedor, justificativaAtual) {
    return `
      <div class="cot-envio-panel">
        <div class="cot-envio-header">
          <span class="cot-section-icon">📤</span>
          <span class="cot-section-title">Finalizar Cotação</span>
        </div>
        <div style="padding:16px 20px;">
          <div style="margin-bottom:14px;">
            <div style="font-size:11px;font-weight:600;color:#A0AEC0;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Fornecedor Vencedor</div>
            <div style="font-size:15px;font-weight:700;color:${vencedor ? '#1a202c' : '#ef4444'};">
              ${vencedor ? Utils.escapeHtml(vencedor.nome) : '⚠️ Nenhum selecionado'}
            </div>
            ${vencedor ? `<div style="font-size:12px;color:#A0AEC0;margin-top:2px;">
              Valor: ${Utils.formatCurrency(vencedor.valor_total)}</div>` : ''}
          </div>
          <div style="margin-bottom:14px;">
            <label style="display:block;font-size:12px;font-weight:700;color:#718096;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px;"
              for="justificativa-selecao">Justificativa da Seleção *</label>
            <textarea class="aprov-parecer-textarea" id="justificativa-selecao" rows="3"
              placeholder="Descreva os critérios utilizados para selecionar este fornecedor..."
              >${Utils.escapeHtml(justificativaAtual || '')}</textarea>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:8px;">
            <button class="aprov-btn-cancelar-modal" id="btn-gerar-oc-direta"
              style="background:#f0fdf4;color:hsl(142,70%,30%);border-color:#bbf7d0;">
              ⚡ Gerar OC Diretamente
            </button>
            <button class="aprov-btn-confirmar" id="btn-enviar-aprovacao">
              📤 Enviar para Aprovação do Demandante
            </button>
          </div>
        </div>
      </div>`;
  },

  _renderPainelAprovacaoDemandante(vencedor) {
    return `
      <div class="cot-demandante-panel">
        <div class="cot-demandante-header">
          <span style="font-size:22px;flex-shrink:0;">⚡</span>
          <div>
            <span class="cot-demandante-title">Aguardando sua Aprovação</span>
            <span class="cot-demandante-sub">Você é o solicitante desta requisição. Avalie a cotação e decida.</span>
          </div>
        </div>
        <div style="padding:16px 20px;">
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:14px;">
            <div>
              <div style="font-size:11px;font-weight:600;color:#A0AEC0;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Fornecedor Vencedor</div>
              <div style="font-size:14px;font-weight:700;color:#1a202c;">${vencedor ? Utils.escapeHtml(vencedor.nome) : '—'}</div>
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;color:#A0AEC0;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Valor Total</div>
              <div style="font-size:15px;font-weight:800;color:hsl(142,72%,26%);">${vencedor ? Utils.formatCurrency(vencedor.valor_total) : '—'}</div>
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;color:#A0AEC0;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Cond. de Pagamento</div>
              <div style="font-size:14px;font-weight:700;color:#1a202c;">${vencedor ? Utils.escapeHtml(vencedor.condicao_pagamento || '—') : '—'}</div>
            </div>
          </div>
          ${this._cotacao.justificativa_selecao ? `
            <div style="background:#F8FAFC;border-radius:10px;padding:12px 14px;margin-bottom:14px;border:1px solid #E2E8F0;">
              <div style="font-size:11px;font-weight:600;color:#A0AEC0;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Justificativa do Comprador</div>
              <div style="font-size:13px;color:#2D3748;line-height:1.6;">${Utils.escapeHtml(this._cotacao.justificativa_selecao)}</div>
            </div>` : ''}
          <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button class="aprov-btn-cancelar-modal" id="btn-solicitar-revisao">🔄 Solicitar Revisão</button>
            <button class="aprov-btn-confirmar" id="btn-aprovar-demandante">✅ Aprovar Fornecedor</button>
          </div>
        </div>
      </div>`;
  },

  _renderPainelRevisao() {
    const comentario = this._cotacao.comentario_demandante;
    return `
      <div class="cot-revisao-panel">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:${comentario ? '12px' : '0'};">
          <span style="font-size:20px;">🔄</span>
          <span style="font-size:14px;font-weight:700;color:#9a3412;font-family:'Manrope',sans-serif;">Cotação em Revisão</span>
        </div>
        ${comentario ? `
          <div style="background:rgba(249,115,22,.06);border-radius:8px;padding:12px 14px;margin-bottom:14px;border:1px solid rgba(249,115,22,.20);">
            <div style="font-size:11px;font-weight:600;color:#c2410c;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Comentário do demandante:</div>
            <div style="font-size:13px;color:#9a3412;line-height:1.6;">${Utils.escapeHtml(comentario)}</div>
          </div>` : ''}
        <div style="display:flex;justify-content:flex-end;">
          <button class="btn btn-secondary btn-sm" id="btn-reabrir-cotacao">✏️ Reabrir para Edição</button>
        </div>
      </div>`;
  },

  _salvarDebounce() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(async () => {
      try {
        await Storage.update(TABLES.cotacoes, this._cotacao.id, {
          fornecedores:      this._cotacao.fornecedores,
          valor_total_final: this._cotacao.valor_total_final || 0,
        });
      } catch (e) { console.warn('[DetalheCotacao] Erro ao salvar:', e); }
    }, 800);
  },

  async _abrirDialogFornecedor() {
    let fornecedores = [];
    try {
      fornecedores = await Storage.getFornecedores(true) || [];
    } catch (e) {
      Components.Toast.error('Erro ao carregar fornecedores.');
      return;
    }

    const jaAdicionados = new Set(this._cotacao.fornecedores.map(f => String(f.id)));
    const disponiveis   = fornecedores.filter(f => !jaAdicionados.has(String(f.id)));

    if (disponiveis.length === 0) {
      Components.Toast.info('Todos os fornecedores ativos já foram adicionados a esta cotação.');
      return;
    }

    Components.Modal.show({
      title:   'Adicionar Fornecedor',
      size:    'sm',
      content: `
        <div class="drawer-field">
          <label class="drawer-label">Fornecedor <span class="required">*</span></label>
          <div id="cs-select-fornecedor"></div>
        </div>`,
      footer: `
        <button class="drawer-btn-cancelar" id="btn-cancelar-add-forn">Cancelar</button>
        <button class="drawer-btn-salvar"   id="btn-confirmar-add-forn">Adicionar</button>`,
    });

    this._csCotFornecedor = CustomSelect.criar(
      document.getElementById('cs-select-fornecedor'),
      disponiveis.map(f => ({
        value:      String(f.id),
        label:      f.nome,
        sublabel:   f.cnpj || '',
        badge:      f.nota_media_qualidade ? `⭐ ${f.nota_media_qualidade}` : null,
        badgeColor: 'green',
      })),
      { placeholder: '— Selecione o fornecedor —', limpar: false, rodape: false, value: '' }
    );

    document.getElementById('btn-cancelar-add-forn')?.addEventListener('click', () => Components.Modal.hide());
    document.getElementById('btn-confirmar-add-forn')?.addEventListener('click', async () => {
      const fornId = this._csCotFornecedor?.getValue();
      if (!fornId) { Components.Toast.warning('Selecione um fornecedor.'); return; }

      const forn = disponiveis.find(f => String(f.id) === String(fornId));
      if (!forn) return;

      const btn = document.getElementById('btn-confirmar-add-forn');
      if (btn) { btn.disabled = true; btn.textContent = '⏳ Adicionando...'; }

      const req = this._requisicao;
      const itensReq = Array.isArray(req?.itens)
        ? req.itens
        : (typeof req?.itens === 'string' ? (() => { try { return JSON.parse(req.itens); } catch { return []; } })() : []);

      const novoForn = {
        id:                 forn.id,
        nome:               forn.nome,
        cnpj:               forn.cnpj || '',
        contato:            forn.contato_email || '',
        nota_historica:     forn.nota_media_qualidade || null,
        itens:              itensReq.map(i => ({
          descricao:       i.descricao,
          quantidade:      i.quantidade,
          unidade:         i.unidade || 'UN',
          valor_unitario:  0,
          valor_total:     0,
        })),
        prazo_entrega:      '',
        condicao_pagamento: '',
        valor_total:        0,
        selecionado:        false,
      };

      this._cotacao.fornecedores.push(novoForn);

      try {
        await Storage.update(TABLES.cotacoes, this._cotacao.id, {
          fornecedores: this._cotacao.fornecedores,
        });
        Components.Modal.hide();
        Components.Toast.success(`${forn.nome} adicionado à cotação.`);
        await this.render(this._cotacao.id);
      } catch (e) {
        console.error('[DetalheCotacao] Erro ao adicionar fornecedor:', e);
        Components.Toast.error('Erro ao salvar. Tente novamente.');
        this._cotacao.fornecedores.pop();
        if (btn) { btn.disabled = false; btn.textContent = 'Adicionar'; }
      }
    });

  },

  _calcularPrecoItem(fi, ii) {
    const forn = this._cotacao.fornecedores[fi];
    if (!forn || !forn.itens[ii]) return;
    const input = document.querySelector(
      `input[data-fi="${fi}"][data-ii="${ii}"], input[data-forn="${fi}"][data-item="${ii}"]`
    );
    const val = parseFloat(input?.value) || 0;
    forn.itens[ii].valor_unitario = val;
    forn.itens[ii].valor_total    = val * (forn.itens[ii].quantidade || 0);
    const totalEl = document.getElementById(`total-f${fi}-i${ii}`);
    if (totalEl) totalEl.textContent = Utils.formatCurrency(forn.itens[ii].valor_total);
  },

  _calcularTotalFornecedor(fi) {
    const forn = this._cotacao.fornecedores[fi];
    if (!forn) return;
    forn.valor_total = (forn.itens || []).reduce((s, i) => s + (i.valor_total || 0), 0);
    const el = document.getElementById(`forn-total-${fi}`);
    if (el) el.textContent = Utils.formatCurrency(forn.valor_total);
  },

  _atualizarValorFinal() {
    const vencedor = this._cotacao.fornecedores.find(f => f.selecionado);
    const valor    = vencedor ? vencedor.valor_total : 0;
    this._cotacao.valor_total_final = valor;
    const el = document.getElementById('info-valor-final');
    if (el) el.textContent = valor > 0 ? Utils.formatCurrency(valor) : '—';
  },

  _selecionarVencedor(index) {
    this._cotacao.fornecedores.forEach((f, i) => {
      f.selecionado = (i === index);
      // suporta ambos os IDs (novo e compat)
      const card = document.getElementById(`cot-forn-${i}`) || document.getElementById(`forn-${i}`);
      if (card) {
        card.classList.toggle('vencedor', i === index);
        // Atualizar badge vencedor
        const badge = card.querySelector('.cot-vencedor-badge');
        if (badge) badge.style.display = i === index ? '' : 'none';
        // Atualizar botão selecionar
        const footer = card.querySelector('.cot-forn-footer');
        if (footer) {
          footer.innerHTML = i === index
            ? `<button class="cot-btn-selecionado">🏆 Vencedor Selecionado</button>`
            : `<button class="cot-btn-selecionar btn-selecionar-forn" data-fi="${i}">🏆 Selecionar como Vencedor</button>`;
        }
      }
    });

    this._cotacao.fornecedor_vencedor = this._cotacao.fornecedores[index]?.nome || '';
    this._atualizarValorFinal();
    this._salvarDebounce();
    Components.Toast.success(`🏆 ${this._cotacao.fornecedores[index]?.nome} selecionado como vencedor!`);
  },

  async _removerFornecedor(index) {
    const forn = this._cotacao.fornecedores[index];
    if (!forn) return;

    Components.Modal.confirm({
      title:        'Remover Fornecedor',
      message:      `Remover "${forn.nome}" desta cotação?`,
      danger:       true,
      icon:         '🗑️',
      confirmLabel: 'Remover',
      onConfirm: async () => {
        this._cotacao.fornecedores.splice(index, 1);
        try {
          await Storage.update(TABLES.cotacoes, this._cotacao.id, {
            fornecedores:      this._cotacao.fornecedores,
            valor_total_final: this._cotacao.fornecedores.find(f => f.selecionado)?.valor_total || 0,
          });
          Components.Toast.success('Fornecedor removido.');
          await this.render(this._cotacao.id);
        } catch (e) {
          Components.Toast.error('Erro ao remover fornecedor.');
          this._cotacao.fornecedores.splice(index, 0, forn); // reverter
        }
      },
    });
  },

  async _enviarParaAprovacao() {
    const justificativa = document.getElementById('justificativa-selecao')?.value.trim();
    const vencedor = this._cotacao.fornecedores.find(f => f.selecionado);

    if (!vencedor)      { Components.Toast.warning('Selecione um fornecedor vencedor antes de enviar.'); return; }
    if (!justificativa) { Components.Toast.warning('A justificativa de seleção é obrigatória.'); return; }

    const btn = document.getElementById('btn-enviar-aprovacao');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Enviando...'; }

    try {
      const user = App.currentUser;

      await Storage.update(TABLES.cotacoes, this._cotacao.id, {
        status:                'Aguardando Aprovacao do Demandante',
        justificativa_selecao: justificativa,
        fornecedor_vencedor:   vencedor.nome,
        valor_total_final:     vencedor.valor_total,
        fornecedores:          this._cotacao.fornecedores,
      });

      if (this._cotacao.requisicao_id) {
        await Storage.update(TABLES.requisicoes, this._cotacao.requisicao_id, {
          status: 'Aguardando Aprovacao do Demandante',
        });

        await Storage.create(TABLES.historico, {
          requisicao_id:   this._cotacao.requisicao_id,
          acao:            'Cotação Enviada para Aprovação',
          usuario:         user.nome,
          usuario_email:   user.email,
          status_anterior: 'Em Cotacao',
          status_novo:     'Aguardando Aprovacao do Demandante',
        });
      }

      Components.Toast.success('Cotação enviada para aprovação do demandante!');
      await this.render(this._cotacao.id);
    } catch (e) {
      console.error('[DetalheCotacao] Erro ao enviar:', e);
      Components.Toast.error('Erro ao enviar para aprovação.');
      if (btn) { btn.disabled = false; btn.textContent = '📤 Enviar para Aprovação do Demandante'; }
    }
  },

  async _gerarOCDireta() {
    const justificativa = document.getElementById('justificativa-selecao')?.value.trim();
    const vencedor = this._cotacao.fornecedores.find(f => f.selecionado);

    if (!vencedor)      { Components.Toast.warning('Selecione um fornecedor vencedor antes de gerar a OC.'); return; }
    if (!justificativa) { Components.Toast.warning('A justificativa de seleção é obrigatória.'); return; }

    Components.Modal.confirm({
      title:        'Gerar OC Diretamente',
      message:      `Gerar Ordem de Compra para "${vencedor.nome}" por ${Utils.formatCurrency(vencedor.valor_total)}?\n\nA aprovação do demandante será pulada.`,
      type:         'success',
      icon:         '⚡',
      confirmLabel: 'Gerar OC',
      onConfirm: async () => {
        const btn = document.getElementById('btn-gerar-oc-direta');
        if (btn) { btn.disabled = true; btn.textContent = '⏳ Gerando...'; }
        try {
          const user = App.currentUser;

          // Marcar cotação como aprovada
          await Storage.update(TABLES.cotacoes, this._cotacao.id, {
            status:                'Aprovada',
            aprovacao_demandante:  'Aprovada',
            justificativa_selecao: justificativa,
            fornecedor_vencedor:   vencedor.nome,
            valor_total_final:     vencedor.valor_total,
            fornecedores:          this._cotacao.fornecedores,
          });

          // Criar OC
          let novaOC;
          try {
            const ordensExistentes = await Storage.list(TABLES.ordens).catch(() => []);
            const ocExistente = (ordensExistentes || []).find(o =>
              o.requisicao_id === this._cotacao.requisicao_id &&
              !['Concluida', 'Cancelada'].includes(o.status)
            );
            if (ocExistente) {
              Components.Toast.warning(`Já existe a OC ${ocExistente.numero} para esta requisição.`);
              await Storage.update(TABLES.cotacoes, this._cotacao.id, {
                status: 'Aguardando Aprovacao do Demandante',
                aprovacao_demandante: 'Pendente',
              }).catch(() => {});
              await this.render(this._cotacao.id);
              return;
            }

            novaOC = await Storage.create(TABLES.ordens, {
              numero:             Utils.generateOC(ordensExistentes.length),
              requisicao_id:      this._cotacao.requisicao_id,
              numero_requisicao:  this._cotacao.requisicao_numero,
              cotacao_id:         this._cotacao.id,
              fornecedor_nome:    vencedor.nome,
              fornecedor_id:      vencedor.id || null,
              fornecedor_cnpj:    vencedor.cnpj || '',
              fornecedor_contato: vencedor.contato || '',
              itens:              vencedor.itens,
              valor_total:        vencedor.valor_total,
              condicao_pagamento: vencedor.condicao_pagamento || '',
              status:             'Analise de Faturamento',
            });
          } catch (ocErr) {
            await Storage.update(TABLES.cotacoes, this._cotacao.id, {
              status:               'Em Andamento',
              aprovacao_demandante: 'Pendente',
            }).catch(() => {});
            throw ocErr;
          }

          if (this._cotacao.requisicao_id) {
            await Storage.update(TABLES.requisicoes, this._cotacao.requisicao_id, {
              status: 'Ordem de Compra Gerada',
            });
            await Storage.create(TABLES.historico, {
              requisicao_id:   this._cotacao.requisicao_id,
              acao:            `OC ${novaOC.numero} Gerada (sem aprovação do demandante)`,
              usuario:         user.nome,
              usuario_email:   user.email,
              status_anterior: 'Em Cotacao',
              status_novo:     'Ordem de Compra Gerada',
            });
          }

          Components.Toast.success(`OC ${novaOC.numero} gerada com sucesso!`);
          await this.render(this._cotacao.id);
        } catch (e) {
          console.error('[DetalheCotacao] Erro ao gerar OC direta:', e);
          Components.Toast.error('Erro ao gerar OC: ' + (e.message || e));
          if (btn) { btn.disabled = false; btn.textContent = '⚡ Gerar OC Diretamente'; }
        }
      },
    });
  },

  async _aprovarDemandante() {
    const vencedor = this._cotacao.fornecedores.find(f => f.selecionado);
    if (!vencedor) { Components.Toast.error('Nenhum fornecedor vencedor encontrado.'); return; }

    Components.Modal.confirm({
      title:        'Confirmar Aprovação',
      message:      `Aprovar "${vencedor.nome}" por ${Utils.formatCurrency(vencedor.valor_total)}? Uma Ordem de Compra será gerada automaticamente.`,
      type:         'success',
      icon:         '✅',
      confirmLabel: 'Aprovar',
      onConfirm: async () => {
        try {
          const user = App.currentUser;

          // Marcar cotação como aprovada
          await Storage.update(TABLES.cotacoes, this._cotacao.id, {
            status:               'Aprovada',
            aprovacao_demandante: 'Aprovada',
          });

          // Criar OC — se falhar reverte status da cotação
          let novaOC;
          try {
            let totalOCs = 0;
            try { const ordens = await Storage.list(TABLES.ordens) || []; totalOCs = ordens.length; } catch { totalOCs = 0; }

            // Guard: evitar OC duplicada para a mesma requisição
            const ordensExistentes = await Storage.list(TABLES.ordens).catch(() => []);
            const ocExistente = (ordensExistentes || []).find(o =>
              o.requisicao_id === this._cotacao.requisicao_id &&
              !['Concluida', 'Cancelada'].includes(o.status)
            );
            if (ocExistente) {
              Components.Toast.warning(`Já existe a OC ${ocExistente.numero} para esta requisição.`);
              // Reverter status da cotação
              await Storage.update(TABLES.cotacoes, this._cotacao.id, {
                status:               'Aguardando Aprovacao do Demandante',
                aprovacao_demandante: 'Pendente',
              }).catch(() => {});
              await this.render(this._cotacao.id);
              return;
            }

            novaOC = await Storage.create(TABLES.ordens, {
              numero:             Utils.generateOC(totalOCs),
              requisicao_id:      this._cotacao.requisicao_id,
              numero_requisicao:  this._cotacao.requisicao_numero,
              cotacao_id:         this._cotacao.id,
              fornecedor_nome:    vencedor.nome,
              fornecedor_id:      vencedor.id || null,
              fornecedor_cnpj:    vencedor.cnpj || '',
              fornecedor_contato: vencedor.contato || '',
              itens:              vencedor.itens,
              valor_total:        vencedor.valor_total,
              condicao_pagamento: vencedor.condicao_pagamento || '',
              status:             'Analise de Faturamento',
            });
          } catch (ocErr) {
            // Reverter status da cotação para não ficar inconsistente
            await Storage.update(TABLES.cotacoes, this._cotacao.id, {
              status:               'Aguardando Aprovacao do Demandante',
              aprovacao_demandante: 'Pendente',
            }).catch(() => {});
            throw ocErr;
          }

          if (this._cotacao.requisicao_id) {
            await Storage.update(TABLES.requisicoes, this._cotacao.requisicao_id, {
              status: 'Ordem de Compra Gerada',
            });
            await Storage.create(TABLES.historico, {
              requisicao_id:   this._cotacao.requisicao_id,
              acao:            `Cotação Aprovada — OC ${novaOC.numero} Gerada`,
              usuario:         user.nome,
              usuario_email:   user.email,
              status_anterior: 'Aguardando Aprovacao do Demandante',
              status_novo:     'Ordem de Compra Gerada',
            });
          }

          Components.Toast.success(`OC ${novaOC.numero} gerada com sucesso!`);
          Notificacoes.notificarNovo('oc', 'Ordem de Compra criada',
            `${novaOC.numero} gerada automaticamente`, 'ordens');
          App.navigate('ordens/' + novaOC.id);
        } catch (e) {
          console.error('[DetalheCotacao] Erro ao aprovar:', e);
          Components.Toast.error('Erro ao processar aprovação. Status revertido.');
          await this.render(this._cotacao.id);
        }
      },
    });
  },

  async _gerarOCManual() {
    const cot     = this._cotacao;
    const vencedor = cot.fornecedores.find(f => f.selecionado);
    if (!vencedor) { Components.Toast.error('Nenhum fornecedor vencedor definido na cotação.'); return; }

    const btn = document.getElementById('btn-gerar-oc-manual');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Gerando...'; }

    try {
      const user = App.currentUser;

      // Guard: evitar OC duplicada para a mesma requisição
      const ordensExistentes = await Storage.list(TABLES.ordens).catch(() => []);
      const ocExistente = (ordensExistentes || []).find(o =>
        o.requisicao_id === this._cotacao?.requisicao_id &&
        !['Concluida', 'Cancelada'].includes(o.status)
      );
      if (ocExistente) {
        Components.Toast.warning(`Já existe a OC ${ocExistente.numero} para esta requisição.`);
        if (btn) { btn.disabled = false; }
        return;
      }

      let totalOCs = (ordensExistentes || []).length;

      const novaOC = await Storage.create(TABLES.ordens, {
        numero:             Utils.generateOC(totalOCs),
        requisicao_id:      cot.requisicao_id,
        numero_requisicao:  cot.requisicao_numero,
        cotacao_id:         cot.id,
        fornecedor_nome:    vencedor.nome,
        fornecedor_cnpj:    vencedor.cnpj || '',
        fornecedor_contato: vencedor.contato || '',
        itens:              vencedor.itens,
        valor_total:        vencedor.valor_total,
        condicao_pagamento: vencedor.condicao_pagamento || '',
        status:             'Analise de Faturamento',
      });

      if (cot.requisicao_id) {
        await Storage.update(TABLES.requisicoes, cot.requisicao_id, { status: 'Ordem de Compra Gerada' });
        await Storage.create(TABLES.historico, {
          requisicao_id:   cot.requisicao_id,
          acao:            `OC ${novaOC.numero} Gerada (reprocessamento)`,
          usuario:         user.nome,
          usuario_email:   user.email,
          status_anterior: 'Ordem de Compra Gerada',
          status_novo:     'Ordem de Compra Gerada',
        });
      }

      Components.Toast.success(`OC ${novaOC.numero} gerada com sucesso!`);
      Notificacoes.notificarNovo('oc', 'Ordem de Compra criada',
        `${novaOC.numero} gerada manualmente`, 'ordens');
      App.navigate('ordens/' + novaOC.id);
    } catch (e) {
      console.error('[DetalheCotacao] Erro ao gerar OC manual:', e);
      Components.Toast.error('Erro ao gerar OC. Tente novamente.');
      if (btn) { btn.disabled = false; btn.textContent = '📋 Gerar Ordem de Compra'; }
    }
  },

  async _solicitarRevisao() {
    Components.Modal.show({
      title:   'Solicitar Revisão',
      size:    'sm',
      content: `
        <div class="drawer-field">
          <label class="drawer-label" for="comentario-revisao">
            Comentário / Motivo da Revisão <span class="required">*</span>
          </label>
          <textarea class="drawer-textarea" id="comentario-revisao" rows="4"
            placeholder="Descreva o que precisa ser revisado..."></textarea>
        </div>`,
      footer: `
        <button class="drawer-btn-cancelar" id="btn-cancelar-revisao">Cancelar</button>
        <button class="drawer-btn-salvar"   id="btn-confirmar-revisao">🔄 Solicitar Revisão</button>`,
    });

    document.getElementById('btn-cancelar-revisao')?.addEventListener('click', () => Components.Modal.hide());
    document.getElementById('btn-confirmar-revisao')?.addEventListener('click', async () => {
      const comentario = document.getElementById('comentario-revisao')?.value.trim();
      if (!comentario) { Components.Toast.warning('Descreva o motivo da revisão.'); return; }

      const btn = document.getElementById('btn-confirmar-revisao');
      if (btn) { btn.disabled = true; btn.textContent = '⏳ Salvando...'; }

      try {
        const user = App.currentUser;

        await Storage.update(TABLES.cotacoes, this._cotacao.id, {
          status:                'Em Revisao',
          aprovacao_demandante:  'Revisao',
          comentario_demandante: comentario,
        });

        if (this._cotacao.requisicao_id) {
          await Storage.create(TABLES.historico, {
            requisicao_id:   this._cotacao.requisicao_id,
            acao:            'Revisão de Cotação Solicitada',
            usuario:         user.nome,
            usuario_email:   user.email,
            status_anterior: 'Aguardando Aprovacao do Demandante',
            status_novo:     'Em Revisao',
          });
        }

        Components.Modal.hide();
        Components.Toast.warning('Revisão solicitada. A cotação voltou ao comprador.');
        await this.render(this._cotacao.id);
      } catch (e) {
        console.error('[DetalheCotacao] Erro ao solicitar revisão:', e);
        Components.Toast.error('Erro ao solicitar revisão.');
        if (btn) { btn.disabled = false; btn.textContent = '🔄 Solicitar Revisão'; }
      }
    });
  },

  async _reabrirCotacao() {
    Components.Modal.confirm({
      title:        'Reabrir Cotação',
      message:      'Reabrir esta cotação para edição? O fornecedor vencedor será desmarcado.',
      type:         'warning',
      icon:         '✏️',
      confirmLabel: 'Reabrir',
      onConfirm: async () => {
        try {
          const user = App.currentUser;

          this._cotacao.fornecedores.forEach(f => { f.selecionado = false; });

          await Storage.update(TABLES.cotacoes, this._cotacao.id, {
            status:               'Em Andamento',
            aprovacao_demandante: 'Pendente',
            fornecedor_vencedor:  null,
            valor_total_final:    0,
            fornecedores:         this._cotacao.fornecedores,
          });

          if (this._cotacao.requisicao_id) {
            await Storage.create(TABLES.historico, {
              requisicao_id:   this._cotacao.requisicao_id,
              acao:            'Cotação Reaberta para Edição',
              usuario:         user.nome,
              usuario_email:   user.email,
              status_anterior: 'Em Revisao',
              status_novo:     'Em Cotacao',
            });
          }

          Components.Toast.info('Cotação reaberta para edição.');
          await this.render(this._cotacao.id);
        } catch (e) {
          Components.Toast.error('Erro ao reabrir cotação.');
        }
      },
    });
  },
};

/* Registrar rota DetalheCotacao no roteador via Pages */
window.Pages = Pages;
