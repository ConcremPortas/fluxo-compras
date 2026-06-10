/* ============================================================
   FLUXOCOMPRAS — Página: Ordens de Compra
   ============================================================ */

var Pages = window.Pages || {};

/* ============================================================
   LISTA DE ORDENS
   ============================================================ */
/* ============================================================
   LISTA DE ORDENS · Premium v2
   ============================================================ */
Pages.Ordens = {
  _dados:        [],
  _filtroStatus: 'todos',
  _busca:        '',

  render() {
    document.title = 'Fluxo Compras · Concrem';
    App.setPageTitle('Ordens de Compra');

    document.getElementById('main-content').innerHTML = `
      ${Components.pageHeader({
        title:    'Ordens de Compra',
        subtitle: 'Acompanhe e gerencie as ordens emitidas aos fornecedores',
      })}

      <div class="ordens-filters-card">
        <div class="ordens-search-wrap">
          <span class="ordens-search-icon">🔍</span>
          <input class="ordens-search-input" type="text" id="busca-ordens"
            placeholder="Buscar por número, fornecedor ou requisição..." />
        </div>
        <div id="cs-filtro-status-ordens" style="min-width:200px;"></div>
        <span class="ordens-count" id="ordens-count">—</span>
      </div>

      <div class="ordens-table-wrap" id="container-ordens"></div>`;

    document.getElementById('busca-ordens')
      ?.addEventListener('input', e => { this._busca = e.target.value; this._renderTabela(); });

    CustomSelect.criar(
      document.getElementById('cs-filtro-status-ordens'),
      [
        { value: 'todos',                    label: 'Todos os status' },
        { value: 'Analise de Faturamento',   label: 'Análise de Faturamento',   dotColor: '#6366f1' },
        { value: 'Aguardando Confirmacao',   label: 'Aguardando Confirmação',   dotColor: '#f59e0b' },
        { value: 'Aguardando Recebimento',   label: 'Aguardando Recebimento',   dotColor: '#f59e0b' },
        { value: 'Recebida',                 label: 'Recebida',                 dotColor: '#10b981' },
        { value: 'Concluida',                label: 'Concluída',                dotColor: '#10b981' },
      ],
      { placeholder: 'Todos os status', busca: false, limpar: false, rodape: false, value: 'todos',
        onChange: (val) => { this._filtroStatus = val; this._renderTabela(); } }
    );

    this._carregar();
  },

  async _carregar() {
    const container = document.getElementById('container-ordens');
    if (container) {
      container.innerHTML = `
        <table class="ordens-table">
          <thead>
            <tr>
              <th>Número</th><th>Requisição</th><th>Fornecedor</th>
              <th>Valor Total</th><th>Entrega Prevista</th><th>Status</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${[...Array(3)].map(() => `
              <tr>
                ${[80, 100, 140, 90, 90, 110, 60].map(w =>
                  `<td><div class="skeleton skeleton-text" style="width:${w}px"></div></td>`
                ).join('')}
              </tr>`).join('')}
          </tbody>
        </table>`;
    }

    try {
      this._dados = await Storage.list(TABLES.ordens, {
        order: { column: 'created_at', ascending: false },
      }) || [];
    } catch { this._dados = []; }

    this._renderTabela();
  },

  _filtrados() {
    return this._dados.filter(o => {
      const matchStatus = this._filtroStatus === 'todos' || o.status === this._filtroStatus;
      const q = (this._busca || '').toLowerCase().trim();
      const matchBusca = !q
        || (o.numero || '').toLowerCase().includes(q)
        || (o.numero_requisicao || '').toLowerCase().includes(q)
        || (o.fornecedor_nome || '').toLowerCase().includes(q);
      return matchStatus && matchBusca;
    });
  },

  _getEntregaClass(dataStr) {
    if (!dataStr) return '';
    const dias = Math.ceil((new Date(dataStr) - new Date()) / 86400000);
    if (dias < 0)  return 'oc-entrega-atrasada';
    if (dias <= 3) return 'oc-entrega-proxima';
    return 'oc-entrega-ok';
  },

  _renderTabela() {
    const container = document.getElementById('container-ordens');
    if (!container) return;

    const lista = this._filtrados();

    const count = document.getElementById('ordens-count');
    if (count) {
      const total = this._dados.length;
      const fil   = lista.length;
      count.textContent = fil === total
        ? `${total} ordem${total !== 1 ? 'ns' : ''}`
        : `${fil} de ${total}`;
    }

    if (!lista.length) {
      container.innerHTML = `
        <div class="ordens-empty">
          <div class="cot-empty-icon">📦</div>
          <div class="cot-empty-title">Nenhuma ordem encontrada</div>
          <div class="cot-empty-sub">As ordens são geradas automaticamente ao aprovar uma cotação.</div>
        </div>`;
      return;
    }

    const ocsPendentesAvaliacao = lista.filter(o => o.status === 'Recebida');
    const alertaBanner = ocsPendentesAvaliacao.length > 0 ? `
      <div style="display:flex;align-items:flex-start;gap:12px;padding:14px 18px;
                  background:#fffbeb;border:1px solid #fcd34d;border-radius:12px;
                  margin-bottom:16px;">
        <span style="font-size:20px;line-height:1;flex-shrink:0;">⭐</span>
        <div>
          <div style="font-size:13px;font-weight:700;color:#92400e;font-family:'Manrope',sans-serif;">
            ${ocsPendentesAvaliacao.length} OC${ocsPendentesAvaliacao.length > 1 ? 's' : ''} aguardando avaliação do fornecedor
          </div>
          <div style="font-size:12px;color:#b45309;margin-top:2px;font-family:'Manrope',sans-serif;">
            Material recebido e liberado pela qualidade. Entre em cada OC para avaliar e concluir o processo.
          </div>
        </div>
      </div>` : '';

    const rows = lista.map((o, i) => {
      const fornecedor = o.fornecedor_nome || '—';
      const reqNumero  = o.numero_requisicao || '—';
      const entregaCls = this._getEntregaClass(o.data_entrega_prevista);
      const entrega    = o.data_entrega_prevista
        ? `<span class="${entregaCls}">${Utils.formatDate(o.data_entrega_prevista)}</span>`
        : `<span style="color:#A0AEC0;">—</span>`;

      return `
        <tr style="animation-delay:${i * 40}ms">
          <td>
            <span class="oc-numero-badge btn-ver-ordem" data-id="${Utils.escapeHtml(String(o.id))}">
              ${Utils.escapeHtml(o.numero || '—')}
            </span>
          </td>
          <td style="color:#2D3748;font-weight:500;">${Utils.escapeHtml(reqNumero)}</td>
          <td style="color:#718096;">${Utils.escapeHtml(fornecedor)}</td>
          <td style="font-size:14px;font-weight:700;color:hsl(142,93%,18%);">
            ${Utils.formatCurrency(o.valor_total || 0)}
          </td>
          <td>${entrega}</td>
          <td>${Components.badge(o.status)}</td>
          <td style="text-align:right;">
            <button class="oc-btn-ver btn-ver-ordem" data-id="${Utils.escapeHtml(String(o.id))}">
              👁️ Ver
            </button>
          </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
      ${alertaBanner}
      <table class="ordens-table">
        <thead>
          <tr>
            <th>Número</th>
            <th>Requisição</th>
            <th>Fornecedor</th>
            <th>Valor Total</th>
            <th>Entrega Prevista</th>
            <th>Status</th>
            <th style="text-align:right">Ações</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

    container.querySelectorAll('.btn-ver-ordem').forEach(btn =>
      btn.addEventListener('click', () => App.navigate('ordens/' + btn.dataset.id))
    );
  },
};

/* ============================================================
   DETALHE DA ORDEM
   ============================================================ */
/* ============================================================
   DETALHE DA ORDEM · Premium v2
   ============================================================ */
Pages.DetalheOrdem = {
  _ordem:           null,
  _requisicao:      null,
  _starHover:       0,
  _starSelecionada: 0,

  async render(id) {
    document.title = 'Fluxo Compras · Concrem';
    App.setPageTitle('Ordem de Compra');

    const content = document.getElementById('main-content');
    content.innerHTML = `
      <div class="loading-table">
        ${[...Array(4)].map(() => '<div class="skeleton skeleton-row"></div>').join('')}
      </div>`;

    try {
      const [ordem, requisicoes] = await Promise.all([
        Storage.get(TABLES.ordens, id),
        Storage.list(TABLES.requisicoes).catch(() => []),
      ]);

      if (!ordem) {
        Components.Toast.error('Ordem não encontrada.');
        App.navigate('ordens');
        return;
      }

      this._ordem      = ordem;
      this._requisicao = (requisicoes || []).find(r =>
        r.numero === ordem.numero_requisicao
      ) || null;
      this._starSelecionada = ordem.avaliacao_estrelas || 0;
      this._starHover       = 0;

      App.setPageTitle(ordem.numero || 'Ordem de Compra');
      this._renderDetalhe();
    } catch (err) {
      console.error('[DetalheOrdem]', err);
      Components.Toast.error('Erro ao carregar ordem.');
    }
  },

  _renderDetalhe() {
    const o     = this._ordem;
    const itens = Array.isArray(o.itens) ? o.itens : [];
    const content = document.getElementById('main-content');

    content.innerHTML = `
      <!-- ── HEADER ── -->
      <div class="oc-detalhe-header">
        <div>
          <div class="oc-detalhe-numero">
            ${Utils.escapeHtml(o.numero || '—')}
            ${Components.badge(o.status)}
          </div>
          <span class="oc-detalhe-data">
            Emitida em ${Utils.formatDate(o.created_at)}
            ${o.numero_requisicao
              ? ` · Requisição ${Utils.escapeHtml(o.numero_requisicao)}`
              : ''}
          </span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <button class="req-btn-voltar" id="btn-voltar-ordem">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Voltar
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-exportar-pdf">📄 Exportar PDF</button>
        </div>
      </div>

      <!-- ── LAYOUT 2 COLUNAS ── -->
      <div class="oc-detalhe-layout">

        <!-- ── COLUNA PRINCIPAL ── -->
        <div>

          <!-- Informações da Ordem -->
          <div class="cot-section-card">
            <div class="cot-section-header">
              <div class="cot-section-header-left">
                <span class="cot-section-icon">📋</span>
                <span class="cot-section-title">Informações da Ordem</span>
              </div>
            </div>
            <div class="oc-fields-grid">
              <div>
                <span class="oc-field-label">Número da Ordem</span>
                <span class="oc-field-value">${Utils.escapeHtml(o.numero || '—')}</span>
              </div>
              <div>
                <span class="oc-field-label">Requisição</span>
                <span class="oc-field-value">
                  ${Utils.escapeHtml(o.numero_requisicao || '—')}
                  ${o.requisicao_id ? ` <a href="#requisicoes/${Utils.escapeHtml(String(o.requisicao_id))}"
                    style="font-size:11px;color:hsl(142,72%,26%);">→</a>` : ''}
                </span>
              </div>
              <div>
                <span class="oc-field-label">Cotação</span>
                <span class="oc-field-value">
                  ${o.cotacao_id
                    ? `<a href="#cotacoes/${Utils.escapeHtml(String(o.cotacao_id))}"
                        style="font-size:12px;color:hsl(142,72%,26%);">Ver cotação →</a>`
                    : '—'}
                </span>
              </div>
              <div>
                <span class="oc-field-label">Valor Total</span>
                <span class="oc-field-value" style="font-size:16px;color:hsl(142,72%,26%);">
                  ${Utils.formatCurrency(o.valor_total || 0)}
                </span>
              </div>
              <div>
                <span class="oc-field-label">Data de Emissão</span>
                <span class="oc-field-value">${Utils.formatDate(o.created_at)}</span>
              </div>
              <div>
                <span class="oc-field-label">Entrega Prevista</span>
                <span class="oc-field-value ${o.data_entrega_prevista ? '' : ''}">
                  ${o.data_entrega_prevista ? Utils.formatDate(o.data_entrega_prevista) : '—'}
                </span>
              </div>
              <div>
                <span class="oc-field-label">Condição de Pagamento</span>
                <span class="oc-field-value">${Utils.escapeHtml(o.condicao_pagamento || '—')}</span>
              </div>
              <div>
                <span class="oc-field-label">Status</span>
                <span class="oc-field-value">${Components.badge(o.status)}</span>
              </div>
            </div>
          </div>

          <!-- Dados do Fornecedor -->
          <div class="cot-section-card">
            <div class="cot-section-header">
              <div class="cot-section-header-left">
                <span class="cot-section-icon">🏢</span>
                <span class="cot-section-title">Dados do Fornecedor</span>
              </div>
            </div>
            <div class="oc-fields-grid">
              <div style="grid-column:1/-1;">
                <span class="oc-field-label">Razão Social</span>
                <span class="oc-field-value" style="font-size:16px;">
                  ${Utils.escapeHtml(o.fornecedor_nome || '—')}
                </span>
              </div>
              <div>
                <span class="oc-field-label">CNPJ</span>
                <span class="oc-field-value">${Utils.escapeHtml(o.fornecedor_cnpj || '—')}</span>
              </div>
              <div>
                <span class="oc-field-label">Contato</span>
                <span class="oc-field-value">${Utils.escapeHtml(o.fornecedor_contato || o.fornecedor_email || '—')}</span>
              </div>
              ${o.fornecedor_email && o.fornecedor_contato ? `
              <div>
                <span class="oc-field-label">E-mail</span>
                <span class="oc-field-value">${Utils.escapeHtml(o.fornecedor_email)}</span>
              </div>` : ''}
              ${o.fornecedor_telefone ? `
              <div>
                <span class="oc-field-label">Telefone</span>
                <span class="oc-field-value">${Utils.escapeHtml(o.fornecedor_telefone)}</span>
              </div>` : ''}
            </div>
          </div>

          <!-- Itens do Pedido -->
          <div class="cot-section-card">
            <div class="cot-section-header">
              <div class="cot-section-header-left">
                <span class="cot-section-icon">📦</span>
                <span class="cot-section-title">Itens do Pedido</span>
              </div>
              <span class="req-section-badge" style="color:rgba(255,255,255,.55);font-size:11px;font-family:'Manrope',sans-serif;">
                ${itens.length} item${itens.length !== 1 ? 's' : ''}
              </span>
            </div>
            ${itens.length > 0 ? `
              <table class="oc-itens-table">
                <thead>
                  <tr>
                    <th style="width:32px;text-align:center">#</th>
                    <th>Descrição</th>
                    <th style="width:64px">Unid.</th>
                    <th style="width:60px;text-align:right">Qtd</th>
                    <th style="width:120px;text-align:right">Valor Unit.</th>
                    <th style="width:120px;text-align:right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itens.map((it, i) => {
                    const tot = (parseFloat(it.quantidade) || 0) * (parseFloat(it.valor_unitario) || 0);
                    return `
                      <tr>
                        <td style="text-align:center;color:#A0AEC0;font-size:11px;font-weight:700;">${i+1}</td>
                        <td>${Utils.escapeHtml(it.descricao || '—')}</td>
                        <td>${Utils.escapeHtml(it.unidade || 'UN')}</td>
                        <td style="text-align:right">${it.quantidade || 0}</td>
                        <td style="text-align:right">${Utils.formatCurrency(it.valor_unitario || 0)}</td>
                        <td style="text-align:right;font-weight:600;color:hsl(142,72%,26%);">
                          ${Utils.formatCurrency(tot)}
                        </td>
                      </tr>`;
                  }).join('')}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="5" style="text-align:right;color:#718096;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">
                      Total Geral
                    </td>
                    <td style="text-align:right;font-size:16px;font-weight:800;color:hsl(142,72%,26%);">
                      ${Utils.formatCurrency(o.valor_total || 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>` : `
              <div style="padding:28px 20px;text-align:center;color:#A0AEC0;font-size:13px;">
                Nenhum item registrado.
              </div>`}
          </div>

          <!-- Observações -->
          ${o.observacoes ? `
            <div class="cot-section-card">
              <div class="cot-section-header">
                <div class="cot-section-header-left">
                  <span class="cot-section-icon">📝</span>
                  <span class="cot-section-title">Observações</span>
                </div>
              </div>
              <div style="padding:16px 20px;font-size:13px;color:#2D3748;line-height:1.6;font-family:'Manrope',sans-serif;white-space:pre-wrap;">
                ${Utils.escapeHtml(o.observacoes)}
              </div>
            </div>` : ''}

        </div>

        <!-- ── SIDEBAR ── -->
        <div class="oc-sidebar">
          ${this._renderAcaoContextual()}
        </div>

      </div>`;

    // Animar cards e inicializar datepickers
    requestAnimationFrame(() => {
      document.querySelectorAll('.cot-section-card, .oc-acao-card').forEach(el =>
        el.classList.add('loaded')
      );
      Utils.initDatePicker('input-data-faturamento');
      Utils.initDatePicker('input-data-entrega');
    });

    // Listeners
    document.getElementById('btn-voltar-ordem')?.addEventListener('click', () => App.navigate('ordens'));
    document.getElementById('btn-exportar-pdf')?.addEventListener('click', () => this._exportarPDF());
    this._bindAcaoListeners();
  },

  _renderAcaoContextual() {
    const o = this._ordem;

    if (o.status === 'Analise de Faturamento') {
      return `
        <div class="oc-acao-card oc-acao-faturamento">
          <div class="oc-acao-header">
            <div class="oc-acao-titulo">📄 Análise de Faturamento</div>
            <div class="oc-acao-desc">
              Informe a data de faturamento para confirmar o pedido com o fornecedor.
            </div>
          </div>
          <div class="oc-acao-body">
            <label class="oc-acao-label" for="input-data-faturamento">Data de Faturamento *</label>
            <input type="date" class="oc-acao-input" id="input-data-faturamento"
              value="${o.data_faturamento || ''}" />
            <label class="oc-acao-label" for="input-just-faturamento">Justificativa (opcional)</label>
            <input type="text" class="oc-acao-input" id="input-just-faturamento"
              placeholder="Observações sobre o faturamento..." />
            <button class="oc-btn-acao" id="btn-confirmar-faturamento">
              ✅ Confirmar Faturamento →
            </button>
          </div>
        </div>`;
    }

    if (o.status === 'Aguardando Confirmacao') {
      return `
        <div class="oc-acao-card oc-acao-confirmacao">
          <div class="oc-acao-header">
            <div class="oc-acao-titulo">📦 Confirmar Pedido</div>
            <div class="oc-acao-desc">
              Faturamento registrado em ${Utils.formatDate(o.data_faturamento)}.
              Informe a data de entrega prevista.
            </div>
          </div>
          <div class="oc-acao-body">
            <label class="oc-acao-label" for="input-data-entrega">Data de Entrega Prevista *</label>
            <input type="date" class="oc-acao-input" id="input-data-entrega"
              value="${o.data_entrega_prevista || ''}" />
            <button class="oc-btn-acao" id="btn-confirmar-pedido">
              📦 Confirmar Pedido →
            </button>
          </div>
        </div>`;
    }

    if (o.status === 'Aguardando Recebimento' || o.status === 'Confirmada') {
      return `
        <div class="oc-acao-card oc-acao-aguardando">
          <div class="oc-acao-header">
            <div class="oc-acao-titulo">⏳ Aguardando Recebimento</div>
            <div class="oc-acao-desc">
              Pedido confirmado. Entrega prevista para
              ${Utils.formatDate(o.data_entrega_prevista)}.
              O almoxarife deve registrar o recebimento.
            </div>
          </div>
          <div class="oc-acao-body">
            <div style="display:flex;align-items:center;justify-content:center;gap:10px;
                padding:16px 0;color:#94a3b8;font-size:13px;font-family:'Manrope',sans-serif;">
              <span style="font-size:24px;">🏭</span>
              Aguardando almoxarife
            </div>
          </div>
        </div>`;
    }

    if (o.status === 'Recebida') {
      return `
        <div class="oc-acao-card oc-acao-avaliacao">
          <div class="oc-acao-header">
            <div class="oc-acao-titulo">⭐ Avaliar Fornecedor</div>
            <div class="oc-acao-desc">
              Material recebido! Avalie o fornecedor para concluir o processo.
            </div>
          </div>
          <div class="oc-acao-body">
            <label class="oc-acao-label">Selecione uma nota</label>
            <div class="oc-star-label" id="star-label">
              ${this._starSelecionada > 0
                ? ['','😞 Ruim','😕 Regular','😐 Ok','😊 Bom','🤩 Excelente!'][this._starSelecionada]
                : 'Selecione uma nota'}
            </div>
            <div class="oc-stars" id="star-rating">
              ${[1,2,3,4,5].map(n => `
                <span class="oc-star ${n <= this._starSelecionada ? 'selected' : ''}"
                  data-valor="${n}">★</span>
              `).join('')}
            </div>
            <label class="oc-acao-label" for="input-comentario-avaliacao">Comentário</label>
            <textarea class="oc-acao-input" id="input-comentario-avaliacao" rows="3"
              placeholder="Qualidade, prazo, atendimento..."
              style="resize:vertical;">${Utils.escapeHtml(o.avaliacao_comentario || '')}</textarea>
            <button class="oc-btn-acao" id="btn-concluir-avaliar"
              ${this._starSelecionada === 0 ? 'disabled' : ''}>
              🎉 Concluir e Avaliar →
            </button>
          </div>
        </div>`;
    }

    if (o.status === 'Concluida') {
      const estrelas = o.avaliacao_estrelas || 0;
      return `
        <div class="oc-acao-card oc-acao-concluida">
          <div class="oc-acao-body">
            <div class="oc-concluida-card">
              <div class="oc-concluida-icon">🎉</div>
              <div class="oc-concluida-titulo">Processo Concluído</div>
              <div class="oc-concluida-sub">
                Concluída em ${Utils.formatDate(o.data_conclusao)}
              </div>
              ${estrelas > 0 ? `
                <div class="oc-stars-display">
                  ${[1,2,3,4,5].map(n =>
                    `<span class="oc-star-display ${n <= estrelas ? 'filled' : ''}">★</span>`
                  ).join('')}
                </div>
                <div style="font-size:12px;color:hsl(142,50%,40%);font-family:'Manrope',sans-serif;">
                  ${estrelas}/5 estrelas
                </div>` : ''}
              ${o.avaliacao_comentario ? `
                <div style="margin-top:10px;font-size:12px;color:#718096;
                    font-style:italic;font-family:'Manrope',sans-serif;line-height:1.5;">
                  "${Utils.escapeHtml(o.avaliacao_comentario)}"
                </div>` : ''}
            </div>
          </div>
        </div>`;
    }

    return `
      <div class="oc-acao-card oc-acao-aguardando">
        <div class="oc-acao-header">
          <div class="oc-acao-titulo">📋 ${Utils.escapeHtml(o.status || '—')}</div>
          <div class="oc-acao-desc">Acompanhe o progresso desta ordem.</div>
        </div>
      </div>`;
  },

  _bindAcaoListeners() {
    const LABELS = ['','😞 Ruim','😕 Regular','😐 Ok','😊 Bom','🤩 Excelente!'];

    // Star rating
    document.querySelectorAll('.oc-star').forEach(star => {
      const v = parseInt(star.dataset.valor);

      star.addEventListener('mouseenter', () => {
        document.querySelectorAll('.oc-star').forEach(s =>
          s.classList.toggle('hover', parseInt(s.dataset.valor) <= v)
        );
        const lbl = document.getElementById('star-label');
        if (lbl) lbl.textContent = LABELS[v] || '';
      });

      star.addEventListener('mouseleave', () => {
        document.querySelectorAll('.oc-star').forEach(s => s.classList.remove('hover'));
        const lbl = document.getElementById('star-label');
        if (lbl) lbl.textContent = this._starSelecionada > 0
          ? LABELS[this._starSelecionada] : 'Selecione uma nota';
      });

      star.addEventListener('click', () => {
        this._starSelecionada = v;
        document.querySelectorAll('.oc-star').forEach(s =>
          s.classList.toggle('selected', parseInt(s.dataset.valor) <= this._starSelecionada)
        );
        const lbl = document.getElementById('star-label');
        if (lbl) lbl.textContent = LABELS[this._starSelecionada];
        const btn = document.getElementById('btn-concluir-avaliar');
        if (btn) btn.disabled = false;
      });
    });

    // Ação buttons
    document.getElementById('btn-confirmar-faturamento')
      ?.addEventListener('click', () => this._confirmarFaturamento());
    document.getElementById('btn-confirmar-pedido')
      ?.addEventListener('click', () => this._confirmarPedido());
    document.getElementById('btn-concluir-avaliar')
      ?.addEventListener('click', () => this._concluirEAvaliar());
  },

  // ── LÓGICA DE NEGÓCIO — mantida intacta ──

  async _confirmarFaturamento() {
    const dataFat = Utils.getDataISO('input-data-faturamento');
    if (!dataFat) { Components.Toast.warning('Informe a data de faturamento.'); return; }

    const dataValida = new Date(dataFat + 'T00:00:00');
    if (isNaN(dataValida.getTime())) {
      Components.Toast.warning('Data de faturamento inválida.'); return;
    }

    const btn = document.getElementById('btn-confirmar-faturamento');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Salvando...'; }

    try {
      await Storage.update(TABLES.ordens, this._ordem.id, {
        data_faturamento: dataFat,
        status:           'Aguardando Confirmacao',
      });
      this._ordem.data_faturamento = dataFat;
      this._ordem.status           = 'Aguardando Confirmacao';
      Components.Toast.success('Faturamento confirmado. Aguardando confirmação do pedido.');
      this._renderDetalhe();
    } catch (err) {
      Components.Toast.error('Erro ao confirmar faturamento: ' + err.message);
      if (btn) { btn.disabled = false; btn.textContent = '✅ Confirmar Faturamento →'; }
    }
  },

  async _confirmarPedido() {
    const dataEntrega = Utils.getDataISO('input-data-entrega');
    if (!dataEntrega) { Components.Toast.warning('Informe a data de entrega prevista.'); return; }

    const btn = document.getElementById('btn-confirmar-pedido');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Salvando...'; }

    try {
      await Storage.update(TABLES.ordens, this._ordem.id, {
        data_entrega_prevista: dataEntrega,
        status:                'Aguardando Recebimento',
      });
      if (this._requisicao) {
        await Storage.update(TABLES.requisicoes, this._requisicao.id, {
          status: 'Aguardando Recebimento',
        });
      }
      this._ordem.data_entrega_prevista = dataEntrega;
      this._ordem.status                = 'Aguardando Recebimento';
      Components.Toast.success('Pedido confirmado. Aguardando recebimento no almoxarifado.');
      this._renderDetalhe();
    } catch (err) {
      Components.Toast.error('Erro ao confirmar pedido: ' + err.message);
      if (btn) { btn.disabled = false; btn.textContent = '📦 Confirmar Pedido →'; }
    }
  },

  async _concluirEAvaliar() {
    if (this._starSelecionada === 0) {
      Components.Toast.warning('Selecione ao menos 1 estrela para avaliar o fornecedor.');
      return;
    }
    const comentario = document.getElementById('input-comentario-avaliacao')?.value?.trim() || '';
    const estrelas   = this._starSelecionada;

    Components.Modal.confirm({
      title:        'Concluir e Avaliar',
      message:      `Confirma a avaliação de ${estrelas} estrela${estrelas !== 1 ? 's' : ''} para ${Utils.escapeHtml(this._ordem.fornecedor_nome || 'este fornecedor')}? Esta ação não pode ser desfeita.`,
      type:         'success',
      icon:         '🎉',
      confirmLabel: 'Concluir',
      onConfirm: async () => {
        try {
          const hoje = new Date().toISOString().split('T')[0];
          await Storage.update(TABLES.ordens, this._ordem.id, {
            status:               'Concluida',
            avaliacao_estrelas:   estrelas,
            avaliacao_comentario: comentario,
            data_conclusao:       hoje,
          });
          await this._recalcularNotaFornecedor(estrelas);
          if (this._requisicao) {
            await Storage.update(TABLES.requisicoes, this._requisicao.id, { status: 'Concluida' }).catch(() => {});
          }
          if (this._ordem.cotacao_id) {
            await Storage.update(TABLES.cotacoes, this._ordem.cotacao_id, { status: 'Concluida' }).catch(() => {});
          }
          this._ordem.status               = 'Concluida';
          this._ordem.avaliacao_estrelas   = estrelas;
          this._ordem.avaliacao_comentario = comentario;
          this._ordem.data_conclusao       = hoje;
          Components.Toast.success('Ordem concluída e fornecedor avaliado com sucesso!');
          App._loadAllBadges?.();
          this._renderDetalhe();
        } catch (err) {
          Components.Toast.error('Erro ao concluir: ' + err.message);
        }
      },
    });
  },

  async _recalcularNotaFornecedor(novaEstrela) {
    try {
      const fornId = this._ordem.fornecedor_id;
      if (!fornId) return;
      const todasOrdens  = await Storage.list(TABLES.ordens, {}) || [];
      const ordensDoForn = todasOrdens.filter(o =>
        o.fornecedor_id === fornId && o.avaliacao_estrelas && o.id !== this._ordem.id
      );
      const total = ordensDoForn.length + 1;
      const soma  = ordensDoForn.reduce((acc, o) => acc + (o.avaliacao_estrelas || 0), novaEstrela);
      const media = Math.round((soma / total) * 10) / 10;
      await Storage.update(TABLES.fornecedores, fornId, {
        nota_media_qualidade: media,
        total_avaliacoes:     total,
      });
    } catch { /* não crítico */ }
  },

  async _exportarPDF() {
    const o = this._ordem;
    if (!o) { Components.Toast.error('Nenhuma ordem carregada.'); return; }

    Components.Toast.info('Gerando PDF...');

    const logoB64    = await PdfPrint.fetchLogoBase64();
    const fornecedor = o.fornecedor_nome || o.fornecedor || '—';
    const itens      = Array.isArray(o.itens) ? o.itens : [];

    const html = `
      <div class="pdf-pagina">

        ${PdfPrint.header(logoB64, 'Ordem de Compra', o.numero || '—')}

        ${PdfPrint.meta([
          { label: 'Emissao',    valor: Utils.formatDate(o.created_at) },
          { label: 'Fornecedor', valor: fornecedor },
          { label: 'Total',      valor: Utils.formatCurrency(o.valor_total || 0) },
          { label: 'Status',     valor: o.status || '—' },
        ])}

        ${PdfPrint.secao('Informacoes da Ordem')}

        ${PdfPrint.campos([
          { label: 'Numero da OC',     valor: o.numero || '—' },
          { label: 'Requisicao',       valor: o.numero_requisicao || '—' },
          { label: 'Data de Emissao',  valor: Utils.formatDate(o.created_at) },
          { label: 'Entrega Prevista', valor: o.data_entrega_prevista ? Utils.formatDate(o.data_entrega_prevista) : '—' },
          { label: 'Cond. Pagamento',  valor: o.condicao_pagamento || '—' },
          { label: 'Faturamento',      valor: o.data_faturamento ? Utils.formatDate(o.data_faturamento) : '—' },
          { label: 'CNPJ Fornecedor',  valor: o.fornecedor_cnpj || '—' },
          { label: 'Contato',          valor: o.fornecedor_contato || o.fornecedor_email || '—' },
        ])}

        ${PdfPrint.secao('Itens do Pedido')}

        ${PdfPrint.tabela(
          [
            { label: '#',           classe: 'center' },
            { label: 'Descricao'                     },
            { label: 'Unid.',       classe: 'center' },
            { label: 'Qtd',         classe: 'right'  },
            { label: 'Valor Unit.', classe: 'right'  },
            { label: 'Total',       classe: 'right'  },
          ],
          itens.map((it, i) => [
            { valor: i + 1,                                                                      classe: 'center'     },
            { valor: it.descricao || '—'                                                                              },
            { valor: it.unidade   || 'UN',                                                       classe: 'center'     },
            { valor: it.quantidade || 0,                                                          classe: 'right'      },
            { valor: Utils.formatCurrency(it.valor_unitario || 0),                               classe: 'right'      },
            { valor: Utils.formatCurrency((it.quantidade||0)*(it.valor_unitario||0)), classe: 'right bold' },
          ]),
          [
            { valor: '' },
            { valor: '' },
            { valor: '' },
            { valor: '' },
            { valor: 'TOTAL GERAL',                              classe: 'right' },
            { valor: Utils.formatCurrency(o.valor_total || 0),  classe: 'right' },
          ]
        )}

        ${PdfPrint.assinaturas([
          { titulo: 'Compras',     nome: o.responsavel || 'Responsavel pela Emissao' },
          { titulo: 'Fornecedor',  nome: fornecedor },
          { titulo: 'Recebimento', nome: 'Almoxarife / Qualidade' },
        ])}

        ${PdfPrint.rodape(
          'Fluxo Compras — Concrem Portas Premium',
          'OC emitida em ' + Utils.formatDate(o.created_at)
        )}

      </div>`;

    PdfPrint.abrir(html);
  },
};

window.Pages = Pages;
