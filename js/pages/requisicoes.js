/* ============================================================
   FLUXOCOMPRAS — Página: Requisições (Lista, Nova, Detalhe)
   ============================================================ */

var Pages = window.Pages || {};

/* ============================================================
   CONSTANTES COMPARTILHADAS
   ============================================================ */
const REQ_STATUS_LIST = [
  'Aguardando Avaliacao de Compras',
  'Devolvida ao Solicitante',
  'Aguardando Aprovacao da Diretoria',
  'Aprovada pela Diretoria',
  'Nao Aprovada',
  'Em Cotacao',
  'Ordem de Compra Gerada',
  'Aguardando Recebimento',
  'Aguardando Analise de Qualidade',
  'Concluida',
  'Cancelada',
];

const ROLES_PODEM_CRIAR = ['admin', 'solicitante', 'supervisor', 'gerente'];

/* ============================================================
   A — LISTA DE REQUISIÇÕES
   ============================================================ */
Pages.Requisicoes = {
  _dados:     [],
  _filtrados: [],

  _STATUS_FILTROS: [
    { status: '',                                   label: 'Todos'              },
    { status: 'Aguardando Avaliacao de Compras',    label: 'Aguard. Avaliação'  },
    { status: 'Devolvida ao Solicitante',           label: 'Devolvida'          },
    { status: 'Aguardando Aprovacao da Diretoria',  label: 'Aguard. Diretoria'  },
    { status: 'Em Cotacao',                         label: 'Em Cotação'         },
    { status: 'Aguardando Aprovacao do Demandante', label: 'Aguard. Demandante' },
    { status: 'Ordem de Compra Gerada',             label: 'OC Gerada'          },
    { status: 'Aguardando Recebimento',             label: 'Aguard. Recebimento'},
    { status: 'Aguardando Analise de Qualidade',    label: 'Aguard. Qualidade'  },
    { status: 'Concluida',                          label: 'Concluída'          },
    { status: 'Nao Aprovada',                       label: 'Não Aprovada'       },
    { status: 'Cancelada',                          label: 'Cancelada'          },
  ],

  _filtroStatusAtivo: 'Aguardando Avaliacao de Compras',

  async render() {
    document.title = 'Fluxo Compras — Requisições';
    App.setPageTitle('Requisições');

    const user   = App.currentUser;
    const canNew = ROLES_PODEM_CRIAR.includes(user.role);

    document.getElementById('main-content').innerHTML = `

      <!-- Header da página -->
      <div class="page-header" style="margin-bottom:20px;">
        <div class="page-header-info">
          <h1 style="font-size:24px;font-weight:800;color:#1a202c;letter-spacing:-0.5px;margin-bottom:3px;">
            Requisições
          </h1>
          <p style="font-size:13px;color:#718096;">Gerencie todas as solicitações de compra</p>
        </div>
        ${canNew ? `
          <button class="btn-nova-req" id="btn-nova-req">
            <span style="font-size:16px;line-height:1;">＋</span>
            Nova Requisição
          </button>` : ''}
      </div>

      <!-- Pills de status -->
      <div id="pills-container"></div>

      <!-- Barra de filtros -->
      <div class="req-filters-card">
        <div class="req-search-wrap">
          <span class="req-search-icon">🔍</span>
          <input
            type="text"
            class="req-search-input"
            id="search-req"
            placeholder="Buscar por número, solicitante ou setor..."
            autocomplete="off"
          />
        </div>
        <div id="cs-filter-setor" style="min-width:160px;"></div>
        <button class="req-export-btn" id="btn-export-pdf">📄 PDF</button>
        <button class="req-export-btn" id="btn-export-excel">📊 Excel</button>
        <span class="req-results-count" id="results-count">—</span>
      </div>

      <!-- Tabela -->
      <div id="tabela-requisicoes"></div>`;

    this._filtroStatusAtivo = 'Aguardando Avaliacao de Compras';

    document.getElementById('search-req')
      ?.addEventListener('input', () => this._aplicarFiltros());

    this._csFilterSetor = CustomSelect.criar(
      document.getElementById('cs-filter-setor'),
      [{ value: '', label: 'Todos os setores' }],
      { placeholder: 'Todos os setores', busca: false, limpar: false, rodape: false, value: '',
        onChange: () => this._aplicarFiltros() }
    );
    document.getElementById('btn-nova-req')
      ?.addEventListener('click',  () => App.navigate('requisicoes/nova'));
    document.getElementById('btn-export-pdf')
      ?.addEventListener('click',  () => this._exportarPDF(this._filtrados));
    document.getElementById('btn-export-excel')
      ?.addEventListener('click',  () => this._exportarExcel(this._filtrados));

    await this._loadDados();
  },

  async _loadDados() {
    const container = document.getElementById('tabela-requisicoes');
    if (!container) return;

    // Skeleton enquanto carrega
    const skeletonCols = 8;
    container.innerHTML = `
      <div class="req-table-wrap" style="animation:none;opacity:1;transform:none;">
        <table class="req-table">
          <thead>
            <tr>
              <th>Número</th><th>Solicitante</th><th>Setor</th>
              <th>Data</th><th>Valor Total</th><th>Urgente</th>
              <th>Status</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${[...Array(5)].map(() => `
              <tr class="req-skeleton-row" style="opacity:1;animation:none;">
                ${[...Array(skeletonCols)].map((_, i) => `
                  <td>
                    <div class="skeleton req-skeleton-cell"
                      style="width:${[80,120,90,70,80,50,100,60][i]}px;"></div>
                  </td>`).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    try {
      const user = App.currentUser;
      const todos = await Storage.list(TABLES.requisicoes, {
        order: { column: 'created_at', ascending: false },
      }) || [];

      const soOwnRoles = ['solicitante', 'supervisor'];
      this._dados = soOwnRoles.includes(user.role)
        ? todos.filter(r => r.solicitante_email === user.email)
        : todos;

      // Renderizar pills com contagem real
      const pillsContainer = document.getElementById('pills-container');
      if (pillsContainer) {
        pillsContainer.innerHTML = this._renderPillsFiltro();
      }

      // Bind nos pills
      document.getElementById('req-status-filters')
        ?.addEventListener('click', e => {
          const pill = e.target.closest('.req-status-pill');
          if (!pill) return;
          this._filtroStatusAtivo = pill.dataset.status;
          document.querySelectorAll('.req-status-pill').forEach(p => {
            p.classList.toggle('ativo', p.dataset.status === this._filtroStatusAtivo);
          });
          this._aplicarFiltros();
        });

      // Popular setores no CustomSelect
      const setores = [...new Set(this._dados.map(r => r.setor).filter(Boolean))].sort();
      if (this._csFilterSetor) {
        this._csFilterSetor.setOpcoes(
          [{ value: '', label: 'Todos os setores' }].concat(
            setores.map(s => ({ value: s, label: s }))
          )
        );
      }

      this._aplicarFiltros();
    } catch (e) {
      console.error('[Requisicoes]', e);
      Components.Toast.error('Erro ao carregar requisições.');
      container.innerHTML = `
        <div class="req-table-wrap" style="animation:none;opacity:1;transform:none;">
          <div class="req-empty">
            <div class="req-empty-icon">⚠️</div>
            <span class="req-empty-title">Erro ao carregar</span>
            <span class="req-empty-sub">Não foi possível buscar os dados. Tente novamente.</span>
          </div>
        </div>`;
    }
  },

  _aplicarFiltros() {
    const busca = (document.getElementById('search-req')?.value || '').toLowerCase().trim();
    const setor = this._csFilterSetor?.getValue() || '';

    this._filtrados = this._dados.filter(r => {
      const matchBusca  = !busca || [r.numero, r.solicitante_nome, r.setor]
        .some(v => v && String(v).toLowerCase().includes(busca));
      const matchStatus = !this._filtroStatusAtivo || r.status === this._filtroStatusAtivo;
      const matchSetor  = !setor || r.setor === setor;
      return matchBusca && matchStatus && matchSetor;
    });

    const count = document.getElementById('results-count');
    if (count) {
      const n = this._filtrados.length, t = this._dados.length;
      count.textContent = n === t
        ? `${t} requisição${t !== 1 ? 'ões' : ''}`
        : `${n} de ${t}`;
    }

    this._renderTabela(this._filtrados);
  },

  _renderPillsFiltro() {
    const contagem = {};
    this._dados.forEach(r => {
      contagem[r.status] = (contagem[r.status] || 0) + 1;
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

    return `<div class="req-status-filters" id="req-status-filters">${pills}</div>`;
  },

  _renderTabela(dados) {
    const container = document.getElementById('tabela-requisicoes');
    if (!container) return;

    if (!dados || dados.length === 0) {
      container.innerHTML = `
        <div class="req-table-wrap" style="animation:none;opacity:1;transform:none;">
          <div class="req-empty">
            <div class="req-empty-icon">📋</div>
            <span class="req-empty-title">Nenhuma requisição encontrada</span>
            <span class="req-empty-sub">Tente ajustar os filtros ou crie uma nova requisição.</span>
          </div>
        </div>`;
      return;
    }

    const rows = dados.map((r, i) => `
      <tr style="animation-delay:${i * 40}ms;">
        <td>
          <span class="req-numero-badge" data-id="${Utils.escapeHtml(String(r.id))}">
            ${Utils.escapeHtml(r.numero || '—')}
          </span>
        </td>
        <td>
          <span class="req-solicitante-nome">${Utils.escapeHtml(r.solicitante_nome || '—')}</span>
          <span class="req-solicitante-email">${Utils.escapeHtml(r.solicitante_email || '')}</span>
        </td>
        <td style="color:#718096;">${Utils.escapeHtml(r.setor || '—')}</td>
        <td style="white-space:nowrap;color:#718096;">
          ${Utils.formatDate(r.data_requisicao || r.created_at)}
        </td>
        <td style="white-space:nowrap;font-weight:600;color:#1a202c;">
          ${Utils.formatCurrency(r.valor_total)}
        </td>
        <td>
          ${r.urgente ? `
            <span class="req-urgente-badge">
              <span class="req-urgente-dot"></span>Urgente
            </span>` : ''}
        </td>
        <td>${Components.badge(r.status)}</td>
        <td>
          <button class="req-btn-ver" data-id="${Utils.escapeHtml(String(r.id))}">
            👁️ Ver
          </button>
        </td>
      </tr>`).join('');

    container.innerHTML = `
      <div class="req-table-wrap">
        <table class="req-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Solicitante</th>
              <th>Setor</th>
              <th>Data</th>
              <th>Valor Total</th>
              <th>Urgente</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

    // Delegação: número RC e botão Ver
    container.querySelectorAll('.req-numero-badge, .req-btn-ver').forEach(el => {
      el.addEventListener('click', () => App.navigate('requisicoes/' + el.dataset.id));
    });
  },

  async _exportarPDF(requisicoes) {
    Components.Toast.info('Gerando PDF...');
    const logoB64 = await PdfPrint.fetchLogoBase64();
    const lista   = requisicoes || [];

    const html = `
      <div class="pdf-pagina">

        ${PdfPrint.header(logoB64,
          'Relatorio de Requisicoes',
          'Gerado em: ' + new Date().toLocaleString('pt-BR')
        )}

        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6pt;">
          <div class="pdf-secao-titulo">Requisicoes</div>
          <div style="font-size:8pt;color:#555;">
            <span>Total: </span><strong style="color:#1a2e1a;">${lista.length} requisicao(oes)</strong>
            &nbsp;&nbsp;
            <span>Emissao: </span><strong style="color:#1a2e1a;">${new Date().toLocaleDateString('pt-BR')}</strong>
          </div>
        </div>

        ${PdfPrint.tabela(
          [
            { label: 'Numero'                  },
            { label: 'Solicitante'             },
            { label: 'Setor'                   },
            { label: 'Data',   classe: 'center' },
            { label: 'Valor',  classe: 'right'  },
            { label: 'Status'                  },
          ],
          lista.map(r => [
            { valor: r.numero           || '—', classe: 'bold'   },
            { valor: r.solicitante_nome || '—'                    },
            { valor: r.setor            || '—'                    },
            { valor: Utils.formatDate(r.data_requisicao || r.created_at), classe: 'center' },
            { valor: Utils.formatCurrency(r.valor_total),  classe: 'right' },
            { valor: Utils.getStatusLabel(r.status) || r.status || '—' },
          ]),
          null
        )}

        ${PdfPrint.rodape(
          'Fluxo Compras — Concrem Portas Premium',
          lista.length + ' requisicoes exportadas'
        )}

      </div>`;

    PdfPrint.abrir(html);
  },

  _exportarExcel(requisicoes) {
    if (!window.XLSX) {
      Components.Toast.warning('Biblioteca Excel não disponível.');
      return;
    }
    try {
      const dados = requisicoes.map(r => ({
        'Número':       r.numero || '',
        'Solicitante':  r.solicitante_nome || '',
        'Email':        r.solicitante_email || '',
        'Setor':        r.setor || '',
        'Data':         Utils.formatDate(r.data_requisicao || r.created_at),
        'Necessidade':  Utils.formatDate(r.data_necessidade),
        'Valor Total':  r.valor_total || 0,
        'Urgente':      r.urgente ? 'Sim' : 'Não',
        'Status':       Utils.getStatusLabel(r.status),
        'Alçada':       r.alcada_aprovacao || '',
      }));
      const ws = XLSX.utils.json_to_sheet(dados);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Requisições');
      XLSX.writeFile(wb, 'requisicoes.xlsx');
      Components.Toast.success('Excel exportado com sucesso!');
    } catch (e) {
      console.error('[Requisicoes] Erro ao exportar Excel:', e);
      Components.Toast.error('Erro ao gerar Excel.');
    }
  },
};

/* ============================================================
   B — NOVA REQUISIÇÃO · Premium v2
   ============================================================ */
Pages.NovaRequisicao = {
  _itens:          [],
  _itemIndex:      0,
  _catalogo:       [],
  _setores:        [],
  _categoriaFiltro: '',

  _PILL_CORES: [
    '#16a34a','#0284c7','#7c3aed','#db2777','#d97706',
    '#0891b2','#dc2626','#65a30d','#9333ea','#ea580c',
  ],

  _renderPillsCategoria() {
    const wrap = document.getElementById('nr-pills-cat');
    if (!wrap) return;
    const cats = [...new Set(this._catalogo.map(i => i.categoria).filter(Boolean))].sort();
    if (!cats.length) { wrap.style.display = 'none'; return; }
    wrap.style.display = '';
    wrap.innerHTML =
      `<button class="nr-cat-pill ${!this._categoriaFiltro ? 'ativa' : ''}" data-cat="">Todos</button>` +
      cats.map((c, i) => {
        const cor = this._PILL_CORES[i % this._PILL_CORES.length];
        return `<button class="nr-cat-pill ${this._categoriaFiltro === c ? 'ativa' : ''}"
                        data-cat="${Utils.escapeHtml(c)}" style="--pill-cor:${cor}">
                  ${Utils.escapeHtml(c)}
                </button>`;
      }).join('');

    wrap.querySelectorAll('.nr-cat-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this._categoriaFiltro = btn.dataset.cat;
        this._renderPillsCategoria();
      });
    });
  },

  async render() {
    document.title = 'Fluxo Compras — Nova Requisição';
    App.setPageTitle('Nova Requisição');

    const user    = App.currentUser;
    const content = document.getElementById('main-content');
    const today   = new Date().toISOString().split('T')[0];

    content.innerHTML = `
      ${Components.pageHeader({
        title:   'Nova Requisição',
        subtitle: 'Preencha os dados abaixo para criar uma nova solicitação de compra',
        actions: [{ label: 'Cancelar', id: 'btn-nr-cancelar' }],
      })}

      <div class="nova-req-layout">

        <!-- ── COLUNA PRINCIPAL ── -->
        <div>

          <!-- Seção 1 · Identificação -->
          <div class="nova-req-section">
            <div class="nova-req-section-header">
              <span class="nova-req-section-icon">👤</span>
              Identificação do Solicitante
            </div>
            <div class="nova-req-section-body">
              <div class="nova-req-form-row">
                <div class="nova-req-form-group">
                  <label class="nova-req-label" for="req-nome">Nome completo<span class="req-required">*</span></label>
                  <input class="nova-req-input" type="text" id="req-nome"
                    value="${Utils.escapeHtml(user.nome)}" autocomplete="name" />
                </div>
                <div class="nova-req-form-group">
                  <label class="nova-req-label" for="req-email">E-mail<span class="req-required">*</span></label>
                  <input class="nova-req-input" type="email" id="req-email"
                    value="${Utils.escapeHtml(user.email)}" autocomplete="email" />
                </div>
              </div>
              <div class="nova-req-form-row">
                <div class="nova-req-form-group">
                  <label class="nova-req-label">Setor / Centro de Custo<span class="req-required">*</span></label>
                  <div id="cs-req-setor"></div>
                </div>
                <div class="nova-req-form-group">
                  <label class="nova-req-label" for="req-data-necessidade">Data de Necessidade<span class="req-required">*</span></label>
                  <input class="nova-req-input" type="date" id="req-data-necessidade" min="${today}" />
                </div>
              </div>
              <div class="nova-req-form-group">
                <label class="nova-req-urgente-wrap" for="req-urgente">
                  <input type="checkbox" id="req-urgente" />
                  <span class="nova-req-urgente-label">Requisição Urgente</span>
                  <span class="nova-req-urgente-hint">— prioridade máxima de processamento</span>
                </label>
              </div>
              <div class="nova-req-justificativa-wrap" id="nr-justificativa-wrap">
                <label class="nova-req-label" for="req-justificativa">Justificativa da Urgência<span class="req-required">*</span></label>
                <textarea class="nova-req-textarea" id="req-justificativa" rows="2"
                  placeholder="Descreva o motivo da urgência..."></textarea>
              </div>
            </div>
          </div>

          <!-- Seção 2 · Itens -->
          <div class="nova-req-section">
            <div class="nova-req-section-header">
              <span class="nova-req-section-icon">📦</span>
              Itens da Requisição
            </div>

            <!-- Pills de categoria para filtrar o autocomplete -->
            <div class="nr-cat-pills-wrap" id="nr-pills-cat" style="display:none;"></div>

            <div class="nova-req-itens-wrap">
              <div id="nr-empty-itens" class="nova-req-empty-itens" style="display:none;">
                Nenhum item adicionado ainda.
              </div>
              <table class="nova-req-itens-table" id="nr-tabela-itens">
                <thead>
                  <tr>
                    <th style="width:32px;text-align:center">#</th>
                    <th>Descrição</th>
                    <th style="width:72px;text-align:center">Qtd</th>
                    <th style="width:80px">Unidade</th>
                    <th style="width:120px">Valor Unit.</th>
                    <th style="width:100px;text-align:right">Total</th>
                    <th style="width:48px"></th>
                  </tr>
                </thead>
                <tbody id="nr-tbody-itens"></tbody>
                <tfoot>
                  <tr class="nova-req-itens-tfoot">
                    <td colspan="5" style="text-align:right;color:var(--color-text-muted);font-size:12px;
                        font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Total Geral</td>
                    <td style="text-align:right" id="nr-total-geral">R$ 0,00</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
              <button class="nova-req-btn-add-item" id="nr-btn-add-item" type="button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Adicionar Item
              </button>
            </div>
          </div>

          <!-- Seção 3 · Informações Adicionais -->
          <div class="nova-req-section">
            <div class="nova-req-section-header">
              <span class="nova-req-section-icon">ℹ️</span>
              Informações Adicionais
            </div>
            <div class="nova-req-section-body">
              <div class="nova-req-form-row">
                <div class="nova-req-form-group">
                  <label class="nova-req-label" for="req-fornecedor">Fornecedor Sugerido</label>
                  <input class="nova-req-input" type="text" id="req-fornecedor"
                    placeholder="Nome do fornecedor (opcional)" />
                </div>
                <div class="nova-req-form-group">
                  <label class="nova-req-label">Forma de Pagamento</label>
                  <div id="cs-req-pagamento"></div>
                </div>
              </div>
              <div class="nova-req-form-group">
                <label class="nova-req-label" for="req-observacoes">Observações</label>
                <textarea class="nova-req-textarea" id="req-observacoes" rows="3"
                  placeholder="Informações adicionais relevantes..."></textarea>
              </div>
            </div>
          </div>

        </div>

        <!-- ── SIDEBAR ── -->
        <div class="nova-req-sidebar">
          <div class="nova-req-resumo-card">
            <div class="nova-req-resumo-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              Resumo da Requisição
            </div>
            <div class="nova-req-resumo-body">
              <div class="nova-req-resumo-row">
                <span class="nova-req-resumo-lbl">Itens</span>
                <span class="nova-req-resumo-val" id="nr-resumo-itens">0</span>
              </div>
              <div class="nova-req-resumo-row">
                <span class="nova-req-resumo-lbl">Valor Total</span>
                <span class="nova-req-resumo-val nr-total" id="nr-resumo-total">R$ 0,00</span>
              </div>
              <div class="nova-req-resumo-row">
                <span class="nova-req-resumo-lbl">Status</span>
                <span>${Components.badge('Aguardando Avaliacao de Compras')}</span>
              </div>
            </div>
            <div class="nova-req-alcada-wrap">
              <div class="nova-req-alcada-lbl">Alçada de Aprovação</div>
              <span id="nr-resumo-alcada" class="badge badge-cancelled">—</span>
            </div>
          </div>

          <button class="nova-req-btn-enviar" id="nr-btn-enviar" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            Enviar Requisição
          </button>
        </div>

      </div>`;

    // Reiniciar estado
    this._itens     = [];
    this._itemIndex = 0;
    this._setores   = [];

    // Eventos
    document.getElementById('btn-nr-cancelar')?.addEventListener('click', () => App.navigate('requisicoes'));
    document.getElementById('nr-btn-add-item')?.addEventListener('click', () => this._adicionarItem());
    document.getElementById('nr-btn-enviar')?.addEventListener('click',   () => this._submeter());

    document.getElementById('req-urgente')?.addEventListener('change', e => {
      const wrap = document.getElementById('nr-justificativa-wrap');
      if (!wrap) return;
      wrap.classList.toggle('visible', e.target.checked);
      if (!e.target.checked) {
        const jus = document.getElementById('req-justificativa');
        if (jus) jus.value = '';
      }
    });

    document.getElementById('nr-tbody-itens')?.addEventListener('input', e => {
      if (e.target.closest('tr[data-item-index]')) this._calcularTotais();
    });
    document.getElementById('nr-tbody-itens')?.addEventListener('click', e => {
      const btn = e.target.closest('.nova-req-btn-remove');
      if (btn) this._removerItem(parseInt(btn.dataset.index, 10));
    });

    this._adicionarItem();
    await this._carregarSetores();

    // Carregar catálogo para autocomplete (sem bloquear a UI)
    try {
      const todos = await Storage.list(TABLES.catalogoItens) || [];
      this._catalogo = todos.filter(i => i.ativo !== false);
      this._renderPillsCategoria();
    } catch (_) {
      this._catalogo = [];
    }

    requestAnimationFrame(() => {
      Utils.initDatePicker('req-data-necessidade');
    });
  },

  async _carregarSetores() {
    try {
      const centros = await Storage.getCentrosCusto();
      this._setores = centros || [];
    } catch (_) {
      this._setores = ['TI', 'RH', 'Financeiro', 'Operações', 'Administrativo', 'Comercial'].map(n => ({ nome: n }));
    }

    this._csReqSetor = CustomSelect.criar(
      document.getElementById('cs-req-setor'),
      this._setores.map(c => ({ value: c.nome, label: c.nome })),
      { placeholder: '— Selecione o setor —', limpar: false, rodape: false, value: '' }
    );
    this._csReqPagamento = CustomSelect.criar(
      document.getElementById('cs-req-pagamento'),
      [
        { value: 'Boleto', label: 'Boleto' },
        { value: 'Transferência', label: 'Transferência' },
        { value: 'Cartão Corporativo', label: 'Cartão Corporativo' },
        { value: 'Cheque', label: 'Cheque' },
        { value: 'Dinheiro', label: 'Dinheiro' },
      ],
      { placeholder: 'Selecione...', busca: false, limpar: false, rodape: false, value: '' }
    );
  },

  _adicionarItem() {
    const idx   = this._itemIndex++;
    const tbody = document.getElementById('nr-tbody-itens');
    if (!tbody) return;

    const UNIDADES = ['UN', 'CX', 'KG', 'L', 'M', 'M²', 'PC', 'RL', 'SC', 'VB'];

    const tr = document.createElement('tr');
    tr.dataset.itemIndex = idx;
    tr.innerHTML = `
      <td style="text-align:center;color:var(--color-text-muted);font-size:11px;font-weight:600;"></td>
      <td><input type="text" class="nova-req-item-input item-descricao" placeholder="Descrição do item" /></td>
      <td><input type="number" class="nova-req-item-input item-qtd" value="1" min="1" step="1"
            style="text-align:center;width:64px;" /></td>
      <td>
        <select class="nova-req-item-input item-unidade" style="padding:5px 6px;">
          ${UNIDADES.map(u => `<option value="${u}">${u}</option>`).join('')}
        </select>
      </td>
      <td><input type="number" class="nova-req-item-input item-valor-unit" value="0" min="0" step="0.01" /></td>
      <td style="text-align:right;padding-right:10px;">
        <span class="nova-req-item-total item-total">R$ 0,00</span>
      </td>
      <td style="text-align:center;">
        <button class="nova-req-btn-remove" data-index="${idx}" title="Remover item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>
        </button>
      </td>`;

    tbody.appendChild(tr);
    this._itens.push(idx);
    this._atualizarNumerosItens();
    this._calcularTotais();
    this._bindAutocomplete(tr);

    // Detectar aumento de custo ao digitar valor ou mudar descrição
    const inputValor = tr.querySelector('.item-valor-unit');
    const inputDescr = tr.querySelector('.item-descricao');
    if (inputValor && inputDescr) {
      inputValor.addEventListener('input', () =>
        this._verificarAlertaCusto(tr, inputDescr.value, parseFloat(inputValor.value) || 0)
      );
      inputDescr.addEventListener('change', () =>
        this._verificarAlertaCusto(tr, inputDescr.value, parseFloat(inputValor.value) || 0)
      );
    }

    tr.querySelector('.item-descricao')?.focus();
  },

  _bindAutocomplete(tr) {
    const inputDescr = tr.querySelector('.item-descricao');
    if (!inputDescr) return;

    // Dropdown renderizado no body para evitar clipping por stacking context da tabela
    const dropdown = document.createElement('div');
    dropdown.className = 'catalogo-dropdown';
    dropdown.style.position = 'fixed';
    dropdown.style.display  = 'none';
    document.body.appendChild(dropdown);

    const _posicionar = () => {
      const r = inputDescr.getBoundingClientRect();
      dropdown.style.top   = (r.bottom + 4) + 'px';
      dropdown.style.left  = r.left + 'px';
      dropdown.style.width = r.width + 'px';
    };

    const _fechar = () => { dropdown.style.display = 'none'; };

    const self = this;

    inputDescr.addEventListener('input', () => {
      const q = inputDescr.value.toLowerCase().trim();
      if (q.length < 2 || !self._catalogo?.length) { _fechar(); return; }

      const catFiltro = self._categoriaFiltro || '';
      const matches = self._catalogo.filter(i => {
        if (catFiltro && i.categoria !== catFiltro) return false;
        return (i.descricao || '').toLowerCase().includes(q) ||
               (i.codigo    || '').toLowerCase().includes(q) ||
               (i.categoria || '').toLowerCase().includes(q);
      }).slice(0, 8);

      if (!matches.length) { _fechar(); return; }

      dropdown.innerHTML = matches.map(item => `
        <div class="catalogo-sugestao" data-id="${Utils.escapeHtml(String(item.id))}">
          <div class="catalogo-sugestao-main">
            ${item.codigo ? `<span class="catalogo-sugestao-codigo">${Utils.escapeHtml(item.codigo)}</span>` : ''}
            <span class="catalogo-sugestao-desc">${Utils.escapeHtml(item.descricao)}</span>
          </div>
          <div class="catalogo-sugestao-meta">
            ${item.categoria ? `<span>${Utils.escapeHtml(item.categoria)}</span>` : ''}
            <span>Unid: <strong>${Utils.escapeHtml(item.unidade || 'UN')}</strong></span>
            ${item.preco_ref > 0 ? `<span style="color:hsl(142,70%,28%);font-weight:600;">Ref: ${Utils.formatCurrency(item.preco_ref)}</span>` : ''}
          </div>
        </div>`).join('');

      _posicionar();
      dropdown.style.display = 'block';

      dropdown.querySelectorAll('.catalogo-sugestao').forEach(el => {
        el.addEventListener('mousedown', e => {
          e.preventDefault();
          const itemSel = matches.find(i => String(i.id) === el.dataset.id);
          if (!itemSel) return;

          inputDescr.value = itemSel.descricao;

          const selUnidade = tr.querySelector('.item-unidade');
          if (selUnidade) {
            const opt = [...selUnidade.options].find(o => o.value === itemSel.unidade);
            if (opt) selUnidade.value = itemSel.unidade;
          }

          const inputValor = tr.querySelector('.item-valor-unit');
          if (inputValor && itemSel.preco_ref > 0 &&
              (!inputValor.value || parseFloat(inputValor.value) === 0)) {
            inputValor.value = itemSel.preco_ref;
          }

          _fechar();
          self._calcularTotais();
          Components.Toast.info(`📦 "${itemSel.descricao}" selecionado do catálogo`);
        });
      });
    });

    inputDescr.addEventListener('blur',   () => { setTimeout(_fechar, 160); });
    inputDescr.addEventListener('keydown', e => { if (e.key === 'Escape') _fechar(); });
    window.addEventListener('scroll',      _posicionar, { passive: true });
    window.addEventListener('resize',      _posicionar, { passive: true });
  },

  _removerItem(idx) {
    const tr = document.querySelector(`tr[data-item-index="${idx}"]`);
    if (tr) tr.remove();
    this._itens = this._itens.filter(i => i !== idx);
    this._atualizarNumerosItens();
    this._calcularTotais();
  },

  _atualizarNumerosItens() {
    const tbody = document.getElementById('nr-tbody-itens');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr[data-item-index]');
    rows.forEach((tr, n) => {
      const num = tr.querySelector('td:first-child');
      if (num) num.textContent = n + 1;
    });

    const empty = document.getElementById('nr-empty-itens');
    const table = document.getElementById('nr-tabela-itens');
    const hasItems = rows.length > 0;
    if (empty) empty.style.display = hasItems ? 'none' : 'block';
    if (table) table.style.display = hasItems ? '' : 'none';
  },

  _calcularTotais() {
    const tbody = document.getElementById('nr-tbody-itens');
    if (!tbody) return;

    let total = 0;
    tbody.querySelectorAll('tr[data-item-index]').forEach(tr => {
      const qtd  = parseFloat(tr.querySelector('.item-qtd')?.value) || 0;
      const unit = parseFloat(tr.querySelector('.item-valor-unit')?.value) || 0;
      const sub  = qtd * unit;
      total += sub;
      const span = tr.querySelector('.item-total');
      if (span) span.textContent = Utils.formatCurrency(sub);
    });

    const elTotal = document.getElementById('nr-total-geral');
    if (elTotal) elTotal.textContent = Utils.formatCurrency(total);

    this._atualizarSidebar(total);
  },

  _atualizarSidebar(total) {
    const tbody    = document.getElementById('nr-tbody-itens');
    const qtdItens = tbody ? tbody.querySelectorAll('tr[data-item-index]').length : 0;

    const elItens  = document.getElementById('nr-resumo-itens');
    const elTotal  = document.getElementById('nr-resumo-total');
    const elAlcada = document.getElementById('nr-resumo-alcada');

    if (elItens)  elItens.textContent = qtdItens;
    if (elTotal)  elTotal.textContent = Utils.formatCurrency(total);

    if (elAlcada) {
      const alcada = total > 0 ? Utils.calcAlcada(total) : '—';
      const CLASSES = {
        'Supervisor': 'badge-approved',
        'Gerente':    'badge-waiting',
        'Diretor':    'badge-rejected',
      };
      elAlcada.className = `badge ${CLASSES[alcada] || 'badge-cancelled'}`;
      elAlcada.textContent = alcada;
    }
  },

  /* ----------------------------------------------------------
     VERIFICAR ALERTA DE AUMENTO DE CUSTO
  ---------------------------------------------------------- */
  _verificarAlertaCusto(tr, descricao, valorInformado) {
    const vizinho = tr.nextElementSibling;
    if (vizinho?.classList.contains('alerta-custo-wrap')) vizinho.remove();
    delete tr.dataset.alertaCusto;

    if (!descricao || valorInformado <= 0) return;

    const desc    = descricao.toLowerCase().trim();
    const itemCat = (this._catalogo || []).find(i =>
      (i.descricao || '').toLowerCase().trim() === desc ||
      (i.codigo    || '').toLowerCase().trim() === desc
    );

    if (!itemCat?.preco_ref || itemCat.preco_ref <= 0) return;
    if (valorInformado <= itemCat.preco_ref) return;

    const variacao    = ((valorInformado - itemCat.preco_ref) / itemCat.preco_ref) * 100;
    const variacaoFmt = variacao.toFixed(1);

    tr.dataset.alertaCusto    = 'true';
    tr.dataset.alertaItemId   = itemCat.id || '';
    tr.dataset.alertaCodigo   = itemCat.codigo || '';
    tr.dataset.alertaPrecoRef = String(itemCat.preco_ref);
    tr.dataset.alertaVariacao = variacaoFmt;

    const alertaWrap = document.createElement('tr');
    alertaWrap.className = 'alerta-custo-wrap';
    alertaWrap.innerHTML =
      '<td colspan="7" style="padding:0 0 6px 32px;background:transparent;">' +
        '<div class="alerta-custo-box">' +
          '<div class="alerta-custo-header">' +
            '⚠️ Alerta de Aumento de Custo' +
            '<span class="alerta-variacao-badge">+' + variacaoFmt + '%</span>' +
          '</div>' +
          '<div class="alerta-custo-info">' +
            '<span>Ref: ' + Utils.formatCurrency(itemCat.preco_ref) + '</span>' +
            '<span style="color:#d97706;">→</span>' +
            '<span>Informado: ' + Utils.formatCurrency(valorInformado) + '</span>' +
            '<span style="color:#92400e;">Diferença: +' + Utils.formatCurrency(valorInformado - itemCat.preco_ref) + '</span>' +
          '</div>' +
          '<label class="alerta-custo-label">Justificativa do aumento *</label>' +
          '<textarea class="alerta-custo-justif" rows="2"' +
            ' placeholder="Ex: Aumento de matéria-prima, inflação do setor, novo fornecedor..."></textarea>' +
          '<p class="alerta-custo-hint">📌 Obrigatório para enviar. Será analisado pelo gerenciador do catálogo.</p>' +
        '</div>' +
      '</td>';

    tr.parentNode?.insertBefore(alertaWrap, tr.nextSibling);
  },

  _coletarItens() {
    const tbody = document.getElementById('nr-tbody-itens');
    if (!tbody) return [];
    return [...tbody.querySelectorAll('tr[data-item-index]')].map(tr => ({
      descricao:      tr.querySelector('.item-descricao')?.value.trim()   || '',
      quantidade:     parseFloat(tr.querySelector('.item-qtd')?.value)    || 0,
      unidade:        tr.querySelector('.item-unidade')?.value            || 'UN',
      valor_unitario: parseFloat(tr.querySelector('.item-valor-unit')?.value) || 0,
      valor_total:    (parseFloat(tr.querySelector('.item-qtd')?.value) || 0) *
                      (parseFloat(tr.querySelector('.item-valor-unit')?.value) || 0),
    }));
  },

  _validar() {
    const g = id => document.getElementById(id);
    const erros = [];
    let primeiro = null;

    const mark = (id, ok) => {
      const el = g(id);
      if (!el) return;
      el.classList.toggle('error', !ok);
      if (!ok && !primeiro) primeiro = el;
    };

    const nome   = (g('req-nome')?.value  || '').trim();
    const email  = (g('req-email')?.value || '').trim();
    const setor  = (this._csReqSetor?.getValue() || '').trim();
    const data   = (g('req-data-necessidade')?.value || '').trim();
    const urgente = g('req-urgente')?.checked;
    const justif  = (g('req-justificativa')?.value || '').trim();

    mark('req-nome',             !!nome);
    mark('req-email',            !!email && Utils.validateEmail(email));
    if (!setor) this._csReqSetor?.setInvalid(true); else this._csReqSetor?.setInvalid(false);
    mark('req-data-necessidade', !!data);

    if (!nome)                              erros.push('Nome do solicitante é obrigatório.');
    if (!email)                             erros.push('E-mail é obrigatório.');
    else if (!Utils.validateEmail(email))   erros.push('E-mail inválido.');
    if (!setor)                             erros.push('Setor é obrigatório.');
    if (!data)                              erros.push('Data de necessidade é obrigatória.');
    if (urgente && !justif)                 erros.push('Justificativa de urgência é obrigatória.');

    const itens = this._coletarItens();
    if (itens.length === 0) {
      erros.push('Adicione pelo menos 1 item à requisição.');
    } else if (itens.some(i => !i.descricao || i.quantidade <= 0)) {
      erros.push('Todos os itens precisam ter descrição e quantidade maiores que zero.');
    }

    erros.forEach(m => Components.Toast.error(m));
    if (primeiro) primeiro.focus();
    return erros.length === 0;
  },

  async _submeter() {
    if (!this._validar()) return;

    const btn = document.getElementById('nr-btn-enviar');
    if (btn) { btn.disabled = true; btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0"/></svg> Enviando...'; }

    const _resetBtn = () => {
      if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Enviar Requisição'; }
    };

    const timeoutId = setTimeout(() => {
      Components.Toast.warning('A conexão está demorando. Verifique sua internet e tente novamente.');
      _resetBtn();
    }, 15000);

    try {
      // Coletar e validar alertas de custo antes de submeter
      const tbodyAlert = document.getElementById('nr-tbody-itens');
      const linhasComAlerta = tbodyAlert
        ? [...tbodyAlert.querySelectorAll('tr[data-alerta-custo="true"]')]
        : [];
      const alertas = [];
      let justifFaltando = false;

      for (const trAlerta of linhasComAlerta) {
        const wrapNext = trAlerta.nextElementSibling;
        const inputJustif = wrapNext?.classList.contains('alerta-custo-wrap')
          ? wrapNext.querySelector('.alerta-custo-justif')
          : null;
        const justif = inputJustif?.value.trim() || '';
        if (!justif) {
          justifFaltando = true;
          if (inputJustif) { inputJustif.style.borderColor = '#ef4444'; inputJustif.focus(); }
        } else {
          alertas.push({
            descricao:        trAlerta.querySelector('.item-descricao')?.value.trim() || '—',
            catalogo_item_id: trAlerta.dataset.alertaItemId || null,
            item_codigo:      trAlerta.dataset.alertaCodigo || null,
            preco_ref:        parseFloat(trAlerta.dataset.alertaPrecoRef) || 0,
            preco_informado:  parseFloat(trAlerta.querySelector('.item-valor-unit')?.value) || 0,
            variacao_pct:     parseFloat(trAlerta.dataset.alertaVariacao) || 0,
            justificativa:    justif,
          });
        }
      }

      if (justifFaltando) {
        Components.Toast.warning('Preencha a justificativa para todos os itens com aumento de custo.');
        _resetBtn();
        return;
      }

      const temAlerta = alertas.length > 0;

      const itens   = this._coletarItens();
      const total   = itens.reduce((s, i) => s + i.valor_total, 0);
      const urgente = document.getElementById('req-urgente')?.checked || false;

      const req = {
        numero:                 Utils.generateRC(),
        solicitante_nome:       document.getElementById('req-nome').value.trim(),
        solicitante_email:      document.getElementById('req-email').value.trim(),
        setor:                  this._csReqSetor?.getValue() || '',
        data_necessidade:       Utils.getDataISO('req-data-necessidade'),
        data_requisicao:        new Date().toISOString().split('T')[0],
        urgente,
        justificativa_urgencia: urgente ? (document.getElementById('req-justificativa')?.value.trim() || null) : null,
        itens,
        valor_total:            total,
        fornecedor_sugerido:    document.getElementById('req-fornecedor')?.value.trim() || null,
        forma_pagamento:        this._csReqPagamento?.getValue() || null,
        alcada_aprovacao:       Utils.calcAlcada(total),
        observacoes:            document.getElementById('req-observacoes')?.value.trim() || null,
        status:                 FluxoAprovacao.statusInicial(Utils.calcAlcada(total)),
      };

      const nova = await Storage.criarRequisicao(req);

      // Salvar alertas de custo vinculados à requisição
      if (temAlerta && nova?.id) {
        for (const al of alertas) {
          await Storage.create(TABLES.alertasCusto, {
            requisicao_id:     nova.id,
            requisicao_numero: nova.numero,
            item_descricao:    al.descricao,
            item_codigo:       al.item_codigo,
            catalogo_item_id:  al.catalogo_item_id,
            preco_ref:         al.preco_ref,
            preco_informado:   al.preco_informado,
            variacao_pct:      al.variacao_pct,
            justificativa:     al.justificativa,
            solicitante_nome:  App.currentUser?.nome,
            solicitante_email: App.currentUser?.email,
            status:            'Pendente',
          }).catch(e => console.warn('[AlertaCusto]', e));
        }
        if (typeof Notificacoes !== 'undefined') {
          Notificacoes.notificarNovo('urgente',
            alertas.length + ' alerta' + (alertas.length > 1 ? 's' : '') + ' de custo registrado' + (alertas.length > 1 ? 's' : ''),
            'Aumento de preço detectado em itens do catálogo', 'catalogo');
        }
      }

      clearTimeout(timeoutId);

      Components.Toast.success(`Requisição ${nova.numero} criada com sucesso!`);
      App.navigate('requisicoes/' + nova.id);
    } catch (e) {
      clearTimeout(timeoutId);
      console.error('[NovaRequisicao] erro:', e);
      Components.Toast.error('Erro ao criar a requisição. Tente novamente.');
    } finally {
      clearTimeout(timeoutId);
      _resetBtn();
    }
  },
};

/* ============================================================
   C — DETALHE DA REQUISIÇÃO · Premium v2
   ============================================================ */
Pages.RequisicaoDetalhe = {
  _req:      null,
  _historico: [],

  async render(id) {
    document.title = 'Fluxo Compras — Detalhes da Requisição';
    App.setPageTitle('Carregando...');

    const content = document.getElementById('main-content');
    content.innerHTML = `
      <div class="loading-table">
        ${[...Array(5)].map(() => '<div class="skeleton skeleton-row"></div>').join('')}
      </div>`;

    try {
      const [req, historico] = await Promise.all([
        Storage.get(TABLES.requisicoes, id),
        Storage.filter(TABLES.historico, 'requisicao_id', id)
          .then(h => (h || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
          .catch(() => []),
      ]);

      if (!req) {
        Components.Toast.error('Requisição não encontrada.');
        App.navigate('requisicoes');
        return;
      }

      this._req      = req;
      this._historico = historico;
      App.setPageTitle(req.numero || 'Requisição');
      this._renderDetalhe(req, historico);

    } catch (e) {
      console.error('[RequisicaoDetalhe]', e);
      Components.Toast.error('Erro ao carregar a requisição.');
      App.navigate('requisicoes');
    }
  },

  _renderDetalhe(req, historico) {
    const itens = Array.isArray(req.itens)
      ? req.itens
      : (typeof req.itens === 'string' ? JSON.parse(req.itens) : []);
    const user    = App.currentUser;
    const content = document.getElementById('main-content');

    const podeReenviar = req.status === 'Devolvida ao Solicitante' &&
      (user.email === req.solicitante_email || ['supervisor', 'admin'].includes(user.role));

    content.innerHTML = `
      <!-- ── HEADER ── -->
      <div class="req-detalhe-header">
        <div>
          <div class="req-detalhe-numero">
            ${Utils.escapeHtml(req.numero || '—')}
            ${Components.badge(req.status)}
            ${req.urgente ? `<span class="badge" style="background:#fff7ed;color:#c2410c;border:1.5px solid #fed7aa;">🔴 Urgente</span>` : ''}
          </div>
          <span class="req-detalhe-data">Criada em ${Utils.formatDate(req.created_at)}</span>
        </div>
        <div class="req-detalhe-acoes">
          <button class="req-btn-voltar" id="btn-voltar-req">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Voltar
          </button>
          ${podeReenviar ? `
            <button class="btn btn-primary btn-sm" id="btn-reenviar-req">
              ✏️ Editar e Reenviar
            </button>` : ''}
        </div>
      </div>

      <!-- ── INFO CARDS ── -->
      <div class="req-info-grid">
        <div class="req-info-card">
          <span class="req-info-label">👤 Solicitante</span>
          <span class="req-info-value">${Utils.escapeHtml(req.solicitante_nome || '—')}</span>
          <span class="req-info-sub">${Utils.escapeHtml(req.solicitante_email || '')}</span>
        </div>
        <div class="req-info-card">
          <span class="req-info-label">🏢 Setor</span>
          <span class="req-info-value">${Utils.escapeHtml(req.setor || '—')}</span>
          ${req.alcada_aprovacao ? `<span class="req-info-sub">Alçada: ${Utils.escapeHtml(req.alcada_aprovacao)}</span>` : ''}
        </div>
        <div class="req-info-card">
          <span class="req-info-label">📅 Data de Necessidade</span>
          <span class="req-info-value">${Utils.formatDate(req.data_necessidade)}</span>
          <span class="req-info-sub">Solicitada em ${Utils.formatDate(req.data_requisicao || req.created_at)}</span>
        </div>
        <div class="req-info-card">
          <span class="req-info-label">💰 Valor Total</span>
          <span class="req-info-value" style="color:hsl(142,72%,26%);">${Utils.formatCurrency(req.valor_total)}</span>
          ${req.forma_pagamento ? `<span class="req-info-sub">${Utils.escapeHtml(req.forma_pagamento)}</span>` : ''}
        </div>
      </div>

      <!-- ── ALERTA URGÊNCIA ── -->
      ${req.urgente ? `
        <div class="req-urgencia-alert">
          <div class="req-urgencia-pulse"></div>
          <div>
            <strong>🔴 Requisição Urgente</strong>
            <p>${Utils.escapeHtml(req.justificativa_urgencia || 'Sem justificativa informada.')}</p>
          </div>
        </div>` : ''}

      <!-- ── ITENS ── -->
      <div class="req-section-card">
        <div class="req-section-card-header">
          <span class="req-section-icon">📦</span>
          <span class="req-section-title">Itens da Requisição</span>
          <span class="req-section-badge">${itens.length} item${itens.length !== 1 ? 's' : ''}</span>
        </div>
        ${itens.length > 0 ? `
          <table class="req-itens-table">
            <thead>
              <tr>
                <th style="width:36px;text-align:center">#</th>
                <th>Descrição</th>
                <th style="width:72px;text-align:center">Qtd</th>
                <th style="width:72px">Unidade</th>
                <th style="width:130px;text-align:right">Valor Unit.</th>
                <th style="width:130px;text-align:right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itens.map((item, i) => `
                <tr>
                  <td style="text-align:center;color:#A0AEC0;font-size:11px;font-weight:700;">${i + 1}</td>
                  <td>${Utils.escapeHtml(item.descricao || '—')}</td>
                  <td style="text-align:center">${item.quantidade}</td>
                  <td>${Utils.escapeHtml(item.unidade || 'UN')}</td>
                  <td style="text-align:right">${Utils.formatCurrency(item.valor_unitario)}</td>
                  <td style="text-align:right;font-weight:600">${Utils.formatCurrency(item.valor_total)}</td>
                </tr>`).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5" style="text-align:right;color:#718096;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">
                  Total Geral
                </td>
                <td style="text-align:right">
                  <span class="req-total-valor">${Utils.formatCurrency(req.valor_total)}</span>
                </td>
              </tr>
            </tfoot>
          </table>` : `
          <div style="padding:28px 20px;text-align:center;color:#A0AEC0;font-size:13px;">
            Nenhum item registrado.
          </div>`}
      </div>

      <!-- ── INFORMAÇÕES ADICIONAIS ── -->
      ${(req.fornecedor_sugerido || req.observacoes) ? `
        <div class="req-section-card">
          <div class="req-section-card-header">
            <span class="req-section-icon">ℹ️</span>
            <span class="req-section-title">Informações Adicionais</span>
          </div>
          ${(req.fornecedor_sugerido || req.forma_pagamento) ? `
            <div class="req-info-add-grid">
              ${req.fornecedor_sugerido ? `
                <div>
                  <div class="req-info-add-label">Fornecedor Sugerido</div>
                  <div class="req-info-add-value">${Utils.escapeHtml(req.fornecedor_sugerido)}</div>
                </div>` : ''}
              ${req.forma_pagamento ? `
                <div>
                  <div class="req-info-add-label">Forma de Pagamento</div>
                  <div class="req-info-add-value">${Utils.escapeHtml(req.forma_pagamento)}</div>
                </div>` : ''}
            </div>` : ''}
          ${req.observacoes ? `
            <div class="req-obs-wrap" style="${(req.fornecedor_sugerido || req.forma_pagamento) ? 'border-top:1px solid #E2E8F0;padding-top:14px;' : 'padding-top:16px;'}">
              <div class="req-info-add-label" style="margin-bottom:6px">Observações</div>
              <p class="req-obs-text">${Utils.escapeHtml(req.observacoes)}</p>
            </div>` : ''}
        </div>` : ''}

      <!-- ── PARECERES ── -->
      ${this._renderPareceres(req)}

      <!-- ── HISTÓRICO ── -->
      <div class="req-section-card">
        <div class="req-section-card-header">
          <span class="req-section-icon">📜</span>
          <span class="req-section-title">Histórico de Ações</span>
          <span class="req-section-badge">${historico.length} registro${historico.length !== 1 ? 's' : ''}</span>
        </div>
        ${this._renderHistorico()}
      </div>`;

    // Animar elementos com delay escalonado
    requestAnimationFrame(() => {
      document.querySelectorAll('.req-info-card').forEach((el, i) => {
        el.style.transitionDelay = `${i * 60}ms`;
        el.classList.add('loaded');
      });
      document.querySelectorAll('.req-section-card').forEach((el, i) => {
        el.style.transitionDelay = `${120 + i * 80}ms`;
        el.classList.add('loaded');
      });
      document.querySelectorAll('.req-timeline-item').forEach((el, i) => {
        el.style.animationDelay = `${200 + i * 80}ms`;
      });
    });

    document.getElementById('btn-voltar-req')?.addEventListener('click', () => App.navigate('requisicoes'));
    document.getElementById('btn-reenviar-req')?.addEventListener('click', () => this._reabrirEdicao());
  },

  _renderPareceres(req) {
    const parecer_dir = req.consideracoes_diretoria || req.parecer_diretoria;
    const temParecer  = req.parecer_compras || parecer_dir || req.justificativa_rejeicao;
    if (!temParecer) return '';

    return `
      <div class="req-section-card">
        <div class="req-section-card-header">
          <span class="req-section-icon">💬</span>
          <span class="req-section-title">Pareceres</span>
        </div>
        <div style="padding:16px 20px;display:flex;flex-direction:column;gap:10px;">
          ${req.parecer_compras ? `
            <div class="req-parecer-item compras">
              <div class="req-parecer-header">
                <span class="req-parecer-tipo">📋 Parecer de Compras</span>
                <span class="req-parecer-meta">
                  ${Utils.escapeHtml(req.avaliador_compras || req.avaliado_compras || '—')} —
                  ${Utils.formatDate(req.data_avaliacao_compras)}
                </span>
              </div>
              <p class="req-parecer-texto">${Utils.escapeHtml(req.parecer_compras)}</p>
            </div>` : ''}
          ${parecer_dir ? `
            <div class="req-parecer-item diretoria">
              <div class="req-parecer-header">
                <span class="req-parecer-tipo">🏛️ Parecer da Diretoria</span>
                <span class="req-parecer-meta">
                  ${Utils.escapeHtml(req.aprovador_diretoria || req.avaliado_diretoria || '—')} —
                  ${Utils.formatDate(req.data_aprovacao_diretoria || req.data_avaliacao_diretoria)}
                </span>
              </div>
              <p class="req-parecer-texto">${Utils.escapeHtml(parecer_dir)}</p>
            </div>` : ''}
          ${req.justificativa_rejeicao ? `
            <div class="req-parecer-item rejeicao">
              <div class="req-parecer-header">
                <span class="req-parecer-tipo">❌ Justificativa de Rejeição</span>
              </div>
              <p class="req-parecer-texto">${Utils.escapeHtml(req.justificativa_rejeicao)}</p>
            </div>` : ''}
        </div>
      </div>`;
  },

  _renderHistorico() {
    const hist = this._historico;

    if (!hist || hist.length === 0) {
      return `
        <div style="padding:28px 20px;text-align:center;color:#A0AEC0;font-size:13px;">
          Nenhuma ação registrada.
        </div>`;
    }

    return `
      <ul class="req-timeline">
        ${hist.map((h, i) => `
          <li class="req-timeline-item">
            <div class="req-timeline-dot"></div>
            <div class="req-timeline-header">
              <span class="req-timeline-acao">${Utils.escapeHtml(h.acao || '—')}</span>
              <span class="req-timeline-time">${Utils.formatDateTime(h.created_at)}</span>
            </div>
            ${h.usuario ? `
              <div class="req-timeline-usuario">
                ${Utils.escapeHtml(h.usuario)}${h.usuario_email ? ` &lt;${Utils.escapeHtml(h.usuario_email)}&gt;` : ''}
              </div>` : ''}
            ${(h.status_anterior || h.status_novo) ? `
              <div class="req-timeline-status-row">
                ${h.status_anterior ? Components.badge(h.status_anterior) : ''}
                ${h.status_anterior && h.status_novo ? '<span class="req-timeline-arrow">→</span>' : ''}
                ${h.status_novo ? Components.badge(h.status_novo) : ''}
              </div>` : ''}
          </li>`).join('')}
      </ul>`;
  },

  async _reabrirEdicao() {
    if (!this._req) return;
    App.navigate('requisicoes/' + this._req.id + '/editar');
  },
};

/* ============================================================
   D — EDITAR REQUISIÇÃO (devolvida ao solicitante)
   ============================================================ */
Pages.EditarRequisicao = {
  _req:        null,
  _itens:      [],
  _itemIndex:  0,
  _setores:    [],

  async render(id) {
    document.title = 'Fluxo Compras — Editar Requisição';
    App.setPageTitle('Editando...');

    const content = document.getElementById('main-content');
    content.innerHTML = `
      <div class="loading-table">
        ${[...Array(4)].map(() => '<div class="skeleton skeleton-row"></div>').join('')}
      </div>`;

    try {
      const req = await Storage.get(TABLES.requisicoes, id);

      if (!req) {
        Components.Toast.error('Requisição não encontrada.');
        App.navigate('requisicoes');
        return;
      }

      if (req.status !== 'Devolvida ao Solicitante') {
        Components.Toast.warning('Apenas requisições devolvidas podem ser editadas.');
        App.navigate('requisicoes/' + id);
        return;
      }

      this._req = req;
      App.setPageTitle('Editar ' + req.numero);
      this._renderForm(req);

    } catch (e) {
      console.error('[EditarRequisicao]', e);
      Components.Toast.error('Erro ao carregar a requisição.');
      App.navigate('requisicoes');
    }
  },

  _renderForm(req) {
    const content = document.getElementById('main-content');
    const today   = new Date().toISOString().split('T')[0];
    const itens   = Array.isArray(req.itens) ? req.itens
      : (typeof req.itens === 'string' ? JSON.parse(req.itens) : []);

    content.innerHTML = `
      ${Components.pageHeader({
        titleHtml: `Editar ${Utils.escapeHtml(req.numero)} ${Components.badge(req.status)}`,
        subtitle:  'Corrija os dados e reenvie a requisição para avaliação',
        actions:   [{ label: 'Cancelar', id: 'btn-editar-cancelar' }],
      })}

      <div class="nova-req-layout">

        <!-- ── COLUNA PRINCIPAL ── -->
        <div>

          <!-- Seção 1 · Identificação -->
          <div class="nova-req-section">
            <div class="nova-req-section-header">
              <span class="nova-req-section-icon">👤</span>
              Identificação do Solicitante
            </div>
            <div class="nova-req-section-body">
              <div class="nova-req-form-row">
                <div class="nova-req-form-group">
                  <label class="nova-req-label" for="req-nome">Nome completo<span class="req-required">*</span></label>
                  <input class="nova-req-input" type="text" id="req-nome"
                    value="${Utils.escapeHtml(req.solicitante_nome || '')}" />
                </div>
                <div class="nova-req-form-group">
                  <label class="nova-req-label" for="req-email">E-mail<span class="req-required">*</span></label>
                  <input class="nova-req-input" type="email" id="req-email"
                    value="${Utils.escapeHtml(req.solicitante_email || '')}" />
                </div>
              </div>
              <div class="nova-req-form-row">
                <div class="nova-req-form-group">
                  <label class="nova-req-label">Setor / Centro de Custo<span class="req-required">*</span></label>
                  <div id="cs-req-setor"></div>
                </div>
                <div class="nova-req-form-group">
                  <label class="nova-req-label" for="req-data-necessidade">Data de Necessidade<span class="req-required">*</span></label>
                  <input class="nova-req-input" type="date" id="req-data-necessidade"
                    value="${Utils.escapeHtml(req.data_necessidade || '')}" min="${today}" />
                </div>
              </div>
              <div class="nova-req-form-group">
                <label class="nova-req-urgente-wrap" for="req-urgente">
                  <input type="checkbox" id="req-urgente" ${req.urgente ? 'checked' : ''} />
                  <span class="nova-req-urgente-label">Requisição Urgente</span>
                  <span class="nova-req-urgente-hint">— prioridade máxima de processamento</span>
                </label>
              </div>
              <div class="nova-req-justificativa-wrap ${req.urgente ? 'visible' : ''}" id="nr-justificativa-wrap">
                <label class="nova-req-label" for="req-justificativa">Justificativa da Urgência<span class="req-required">*</span></label>
                <textarea class="nova-req-textarea" id="req-justificativa" rows="2"
                  placeholder="Descreva o motivo da urgência...">${Utils.escapeHtml(req.justificativa_urgencia || '')}</textarea>
              </div>
            </div>
          </div>

          <!-- Seção 2 · Itens -->
          <div class="nova-req-section">
            <div class="nova-req-section-header">
              <span class="nova-req-section-icon">📦</span>
              Itens da Requisição
            </div>
            <div class="nova-req-itens-wrap">
              <div id="nr-empty-itens" class="nova-req-empty-itens" style="display:none;">
                Nenhum item adicionado ainda.
              </div>
              <table class="nova-req-itens-table" id="nr-tabela-itens">
                <thead>
                  <tr>
                    <th style="width:32px;text-align:center">#</th>
                    <th>Descrição</th>
                    <th style="width:72px;text-align:center">Qtd</th>
                    <th style="width:80px">Unidade</th>
                    <th style="width:120px">Valor Unit.</th>
                    <th style="width:100px;text-align:right">Total</th>
                    <th style="width:48px"></th>
                  </tr>
                </thead>
                <tbody id="nr-tbody-itens"></tbody>
                <tfoot>
                  <tr class="nova-req-itens-tfoot">
                    <td colspan="5" style="text-align:right;color:var(--color-text-muted);font-size:12px;
                        font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Total Geral</td>
                    <td style="text-align:right" id="nr-total-geral">R$ 0,00</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
              <button class="nova-req-btn-add-item" id="nr-btn-add-item" type="button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Adicionar Item
              </button>
            </div>
          </div>

          <!-- Seção 3 · Informações Adicionais -->
          <div class="nova-req-section">
            <div class="nova-req-section-header">
              <span class="nova-req-section-icon">ℹ️</span>
              Informações Adicionais
            </div>
            <div class="nova-req-section-body">
              <div class="nova-req-form-row">
                <div class="nova-req-form-group">
                  <label class="nova-req-label" for="req-fornecedor">Fornecedor Sugerido</label>
                  <input class="nova-req-input" type="text" id="req-fornecedor"
                    value="${Utils.escapeHtml(req.fornecedor_sugerido || '')}"
                    placeholder="Nome do fornecedor (opcional)" />
                </div>
                <div class="nova-req-form-group">
                  <label class="nova-req-label">Forma de Pagamento</label>
                  <div id="cs-req-pagamento"></div>
                </div>
              </div>
              <div class="nova-req-form-group">
                <label class="nova-req-label" for="req-observacoes">Observações</label>
                <textarea class="nova-req-textarea" id="req-observacoes" rows="3"
                  placeholder="Informações adicionais relevantes...">${Utils.escapeHtml(req.observacoes || '')}</textarea>
              </div>
            </div>
          </div>

        </div>

        <!-- ── SIDEBAR ── -->
        <div class="nova-req-sidebar">
          <div class="nova-req-resumo-card">
            <div class="nova-req-resumo-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              Resumo
            </div>
            <div class="nova-req-resumo-body">
              <div class="nova-req-resumo-row">
                <span class="nova-req-resumo-lbl">Itens</span>
                <span class="nova-req-resumo-val" id="nr-resumo-itens">0</span>
              </div>
              <div class="nova-req-resumo-row">
                <span class="nova-req-resumo-lbl">Valor Total</span>
                <span class="nova-req-resumo-val nr-total" id="nr-resumo-total">R$ 0,00</span>
              </div>
              <div class="nova-req-resumo-row">
                <span class="nova-req-resumo-lbl">Status</span>
                <span>${Components.badge('Aguardando Avaliacao de Compras')}</span>
              </div>
            </div>
            <div class="nova-req-alcada-wrap">
              <div class="nova-req-alcada-lbl">Alçada de Aprovação</div>
              <span id="nr-resumo-alcada" class="badge badge-cancelled">—</span>
            </div>
          </div>

          <button class="nova-req-btn-enviar" id="nr-btn-enviar" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            Reenviar Requisição
          </button>
        </div>

      </div>`;

    // Reiniciar estado
    this._itens     = [];
    this._itemIndex = 0;
    this._setores   = [];

    // Eventos
    document.getElementById('btn-editar-cancelar')?.addEventListener('click', () =>
      App.navigate('requisicoes/' + req.id));
    document.getElementById('nr-btn-add-item')?.addEventListener('click', () => this._adicionarItem());
    document.getElementById('nr-btn-enviar')?.addEventListener('click',   () => this._submeter());

    document.getElementById('req-urgente')?.addEventListener('change', e => {
      const wrap = document.getElementById('nr-justificativa-wrap');
      if (!wrap) return;
      wrap.classList.toggle('visible', e.target.checked);
      if (!e.target.checked) {
        const jus = document.getElementById('req-justificativa');
        if (jus) jus.value = '';
      }
    });

    document.getElementById('nr-tbody-itens')?.addEventListener('input', e => {
      if (e.target.closest('tr[data-item-index]')) this._calcularTotais();
    });
    document.getElementById('nr-tbody-itens')?.addEventListener('click', e => {
      const btn = e.target.closest('.nova-req-btn-remove');
      if (btn) this._removerItem(parseInt(btn.dataset.index, 10));
    });

    // Carregar setores e pre-popular
    this._carregarSetores(req.setor);
    itens.forEach(item => this._adicionarItem(item));
    if (itens.length === 0) this._adicionarItem();

    requestAnimationFrame(() => {
      Utils.initDatePicker('req-data-necessidade');
    });
  },

  async _carregarSetores(setorAtual) {
    try {
      const centros = await Storage.getCentrosCusto();
      this._setores = centros || [];
    } catch (_) {
      this._setores = ['TI', 'RH', 'Financeiro', 'Operações', 'Administrativo', 'Comercial', 'Manutenção'].map(n => ({ nome: n }));
    }

    const todosSetores = [...this._setores];
    if (setorAtual && !todosSetores.find(c => c.nome === setorAtual)) {
      todosSetores.unshift({ nome: setorAtual });
    }
    this._csReqSetor = CustomSelect.criar(
      document.getElementById('cs-req-setor'),
      todosSetores.map(c => ({ value: c.nome, label: c.nome })),
      { placeholder: '— Selecione o setor —', limpar: false, rodape: false, value: setorAtual || '' }
    );
    this._csReqPagamento = CustomSelect.criar(
      document.getElementById('cs-req-pagamento'),
      [
        { value: '', label: 'Selecione...' },
        { value: 'Boleto', label: 'Boleto' },
        { value: 'Transferência', label: 'Transferência' },
        { value: 'Cartão Corporativo', label: 'Cartão Corporativo' },
        { value: 'Cheque', label: 'Cheque' },
        { value: 'Dinheiro', label: 'Dinheiro' },
      ],
      { placeholder: 'Selecione a forma de pagamento...', busca: false, limpar: false, rodape: false, value: this._req?.forma_pagamento || '' }
    );
  },

  _adicionarItem(dadosIniciais) {
    const idx   = this._itemIndex++;
    const tbody = document.getElementById('nr-tbody-itens');
    if (!tbody) return;

    const UNIDADES = ['UN', 'CX', 'KG', 'L', 'M', 'M²', 'PC', 'RL', 'SC', 'VB'];
    const d = dadosIniciais || {};

    const tr = document.createElement('tr');
    tr.dataset.itemIndex = idx;
    tr.innerHTML = `
      <td style="text-align:center;color:var(--color-text-muted);font-size:11px;font-weight:600;"></td>
      <td><input type="text" class="nova-req-item-input item-descricao"
            placeholder="Descrição do item"
            value="${Utils.escapeHtml(d.descricao || '')}" /></td>
      <td><input type="number" class="nova-req-item-input item-qtd"
            value="${d.quantidade || 1}" min="0.01" step="0.01"
            style="text-align:center;width:64px;" /></td>
      <td>
        <select class="nova-req-item-input item-unidade" style="padding:5px 6px;">
          ${UNIDADES.map(u =>
            `<option value="${u}" ${(d.unidade || 'UN') === u ? 'selected' : ''}>${u}</option>`
          ).join('')}
        </select>
      </td>
      <td><input type="number" class="nova-req-item-input item-valor-unit"
            value="${d.valor_unitario || 0}" min="0" step="0.01" /></td>
      <td style="text-align:right;padding-right:10px;">
        <span class="nova-req-item-total item-total">
          ${Utils.formatCurrency((d.quantidade || 0) * (d.valor_unitario || 0))}
        </span>
      </td>
      <td style="text-align:center;">
        <button class="nova-req-btn-remove" data-index="${idx}" title="Remover item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>
        </button>
      </td>`;

    tbody.appendChild(tr);
    this._itens.push(idx);
    this._atualizarNumerosItens();
    this._calcularTotais();
    if (!dadosIniciais) tr.querySelector('.item-descricao')?.focus();
  },

  _removerItem(idx) {
    const tr = document.querySelector(`tr[data-item-index="${idx}"]`);
    if (tr) tr.remove();
    this._itens = this._itens.filter(i => i !== idx);
    this._atualizarNumerosItens();
    this._calcularTotais();
  },

  _atualizarNumerosItens() {
    const tbody = document.getElementById('nr-tbody-itens');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr[data-item-index]');
    rows.forEach((tr, n) => {
      const num = tr.querySelector('td:first-child');
      if (num) num.textContent = n + 1;
    });
    const empty = document.getElementById('nr-empty-itens');
    const table = document.getElementById('nr-tabela-itens');
    const hasItems = rows.length > 0;
    if (empty) empty.style.display = hasItems ? 'none' : 'block';
    if (table) table.style.display = hasItems ? '' : 'none';
  },

  _calcularTotais() {
    const tbody = document.getElementById('nr-tbody-itens');
    if (!tbody) return;
    let total = 0;
    tbody.querySelectorAll('tr[data-item-index]').forEach(tr => {
      const qtd  = parseFloat(tr.querySelector('.item-qtd')?.value) || 0;
      const unit = parseFloat(tr.querySelector('.item-valor-unit')?.value) || 0;
      const sub  = qtd * unit;
      total += sub;
      const span = tr.querySelector('.item-total');
      if (span) span.textContent = Utils.formatCurrency(sub);
    });
    const elTotal = document.getElementById('nr-total-geral');
    if (elTotal) elTotal.textContent = Utils.formatCurrency(total);
    this._atualizarSidebar(total);
  },

  _atualizarSidebar(total) {
    const tbody    = document.getElementById('nr-tbody-itens');
    const qtdItens = tbody ? tbody.querySelectorAll('tr[data-item-index]').length : 0;
    const elItens  = document.getElementById('nr-resumo-itens');
    const elTotal  = document.getElementById('nr-resumo-total');
    const elAlcada = document.getElementById('nr-resumo-alcada');
    if (elItens)  elItens.textContent = qtdItens;
    if (elTotal)  elTotal.textContent = Utils.formatCurrency(total);
    if (elAlcada) {
      const alcada = total > 0 ? Utils.calcAlcada(total) : '—';
      const CLASSES = { 'Supervisor':'badge-approved', 'Gerente':'badge-waiting', 'Diretor':'badge-rejected' };
      elAlcada.className  = `badge ${CLASSES[alcada] || 'badge-cancelled'}`;
      elAlcada.textContent = alcada;
    }
  },

  _coletarItens() {
    const tbody = document.getElementById('nr-tbody-itens');
    if (!tbody) return [];
    return [...tbody.querySelectorAll('tr[data-item-index]')].map(tr => ({
      descricao:      tr.querySelector('.item-descricao')?.value.trim()   || '',
      quantidade:     parseFloat(tr.querySelector('.item-qtd')?.value)    || 0,
      unidade:        tr.querySelector('.item-unidade')?.value            || 'UN',
      valor_unitario: parseFloat(tr.querySelector('.item-valor-unit')?.value) || 0,
      valor_total:    (parseFloat(tr.querySelector('.item-qtd')?.value) || 0) *
                      (parseFloat(tr.querySelector('.item-valor-unit')?.value) || 0),
    }));
  },

  _validar() {
    const g = id => document.getElementById(id);
    const erros = [];
    let primeiro = null;
    const mark = (id, ok) => {
      const el = g(id);
      if (!el) return;
      el.classList.toggle('error', !ok);
      if (!ok && !primeiro) primeiro = el;
    };
    const nome    = (g('req-nome')?.value  || '').trim();
    const email   = (g('req-email')?.value || '').trim();
    const setor   = (g('req-setor')?.value || '').trim();
    const data    = (g('req-data-necessidade')?.value || '').trim();
    const urgente = g('req-urgente')?.checked;
    const justif  = (g('req-justificativa')?.value || '').trim();
    mark('req-nome',             !!nome);
    mark('req-email',            !!email && Utils.validateEmail(email));
    if (!setor) this._csReqSetor?.setInvalid(true); else this._csReqSetor?.setInvalid(false);
    mark('req-data-necessidade', !!data);
    if (!nome)                            erros.push('Nome do solicitante é obrigatório.');
    if (!email)                           erros.push('E-mail é obrigatório.');
    else if (!Utils.validateEmail(email)) erros.push('E-mail inválido.');
    if (!setor)                           erros.push('Setor é obrigatório.');
    if (!data)                            erros.push('Data de necessidade é obrigatória.');
    if (urgente && !justif)               erros.push('Justificativa de urgência é obrigatória.');
    const itens = this._coletarItens();
    if (itens.length === 0) {
      erros.push('Adicione pelo menos 1 item à requisição.');
    } else if (itens.some(i => !i.descricao || i.quantidade <= 0)) {
      erros.push('Todos os itens precisam ter descrição e quantidade maiores que zero.');
    }
    erros.forEach(m => Components.Toast.error(m));
    if (primeiro) primeiro.focus();
    return erros.length === 0;
  },

  async _submeter() {
    if (!this._validar()) return;

    const btn = document.getElementById('nr-btn-enviar');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Reenviando...'; }

    const timeoutId = setTimeout(() => {
      Components.Toast.warning('A conexão está demorando. Verifique sua internet e tente novamente.');
      if (btn) { btn.disabled = false; btn.textContent = '⬆ Reenviar Requisição'; }
    }, 15000);

    try {
      const req     = this._req;
      const user    = App.currentUser;
      const itens   = this._coletarItens();
      const total   = itens.reduce((s, i) => s + i.valor_total, 0);
      const urgente = document.getElementById('req-urgente')?.checked || false;

      const dados = {
        solicitante_nome:       document.getElementById('req-nome').value.trim(),
        solicitante_email:      document.getElementById('req-email').value.trim(),
        setor:                  this._csReqSetor?.getValue() || '',
        data_necessidade:       Utils.getDataISO('req-data-necessidade'),
        urgente,
        justificativa_urgencia: urgente ? (document.getElementById('req-justificativa')?.value.trim() || null) : null,
        itens,
        valor_total:            total,
        fornecedor_sugerido:    document.getElementById('req-fornecedor')?.value.trim() || null,
        forma_pagamento:        this._csReqPagamento?.getValue() || null,
        alcada_aprovacao:       Utils.calcAlcada(total),
        observacoes:            document.getElementById('req-observacoes')?.value.trim() || null,
        status:                 FluxoAprovacao.statusInicial(Utils.calcAlcada(total)),
        // limpar campos de avaliação anterior
        aprovador_etapa1: null, data_aprovacao_etapa1: null, parecer_etapa1: null,
        aprovador_etapa2: null, data_aprovacao_etapa2: null, parecer_etapa2: null,
        parecer_compras:            null,
        avaliador_compras:          null,
        data_avaliacao_compras:     null,
        consideracoes_diretoria:    null,
        aprovador_diretoria:        null,
        data_aprovacao_diretoria:   null,
        justificativa_rejeicao:     null,
      };

      await Storage.update(TABLES.requisicoes, req.id, dados);
      clearTimeout(timeoutId);

      await Storage.create(TABLES.historico, {
        requisicao_id:   req.id,
        acao:            'Requisição Reenviada pelo Solicitante',
        usuario:         user.nome,
        usuario_email:   user.email,
        status_anterior: 'Devolvida ao Solicitante',
        status_novo:     'Aguardando Avaliacao de Compras',
      });

      Components.Toast.success('Requisição reenviada para avaliação!');
      App.navigate('requisicoes/' + req.id);

    } catch (e) {
      clearTimeout(timeoutId);
      console.error('[EditarRequisicao]', e);
      Components.Toast.error('Erro ao reenviar a requisição. Tente novamente.');
    } finally {
      clearTimeout(timeoutId);
      if (btn) { btn.disabled = false; btn.textContent = '⬆ Reenviar Requisição'; }
    }
  },
};

window.Pages = Pages;
