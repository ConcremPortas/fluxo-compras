/* ============================================================
   FLUXOCOMPRAS — Página: Relatórios
   ============================================================ */

var Pages = window.Pages || {};

Pages.Relatorios = {
  charts:        {},
  dadosPeriodo:  {},
  _todasReqs:    [],
  _todasOCs:     [],

  MESES_LONGOS:  ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  MESES_CURTOS:  ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],

  STATUS_AVANCADOS: [
    'Em Cotacao','Aguardando Aprovacao do Demandante','Analise de Faturamento',
    'Ordem de Compra Gerada','Aguardando Confirmacao','Aguardando Recebimento',
    'Aguardando Analise de Qualidade','Aguardando Avaliacao Fornecedor','Concluida',
  ],

  /* ----------------------------------------------------------
     RENDER PRINCIPAL
  ---------------------------------------------------------- */
  async render() {
    document.title = 'Relatórios';
    App.setPageTitle('Relatórios');

    document.getElementById('main-content').innerHTML = `
      ${Components.pageHeader({
        title:    'Relatórios',
        subtitle: 'Dashboard analítico com métricas do período selecionado',
        actions: [
          { label: '📄 PDF',   id: 'btn-exportar-pdf-rel',   primary: false },
          { label: '📊 Excel', id: 'btn-exportar-excel-rel', primary: true  },
        ],
      })}

      <!-- Filtro de período -->
      <div class="rel-filtro-card">
        <div class="rel-filtro-grupos">
          <div class="rel-filtro-grupo">
            <span class="rel-filtro-label">De</span>
            <select id="filtro-mes-inicio" class="rel-filtro-select"></select>
            <select id="filtro-ano-inicio" class="rel-filtro-select"></select>
          </div>
          <span class="rel-filtro-sep">→</span>
          <div class="rel-filtro-grupo">
            <span class="rel-filtro-label">Até</span>
            <select id="filtro-mes-fim" class="rel-filtro-select"></select>
            <select id="filtro-ano-fim" class="rel-filtro-select"></select>
          </div>
          <button class="btn btn-primary" id="btn-gerar-relatorio" style="flex-shrink:0;">
            📊 Gerar Relatório
          </button>
        </div>

        <!-- Filtros adicionais -->
        <div class="rel-filtro-extras" id="rel-filtros-extras" style="display:none;">
          <div class="rel-filtro-grupo">
            <span class="rel-filtro-label">Fornecedor</span>
            <select id="filter-rel-fornecedor" class="rel-filtro-select" style="min-width:200px;">
              <option value="">Todos os fornecedores</option>
            </select>
          </div>
          <div class="rel-filtro-grupo">
            <span class="rel-filtro-label">Setor</span>
            <select id="filter-rel-setor" class="rel-filtro-select" style="min-width:160px;">
              <option value="">Todos os setores</option>
            </select>
          </div>
          <div class="rel-filtro-grupo" style="position:relative;">
            <span class="rel-filtro-label">Produto</span>
            <div class="rel-prod-wrap">
              <span class="rel-prod-icone">🔍</span>
              <input type="text" id="filter-rel-produto" class="rel-prod-input"
                     placeholder="Buscar produto ou descrição..." autocomplete="off" />
            </div>
          </div>
          <button class="btn btn-secondary" id="btn-limpar-filtros-rel" style="flex-shrink:0;">
            ✕ Limpar
          </button>
        </div>
      </div>

      <!-- Conteúdo dinâmico -->
      <div id="relatorio-content">

        <!-- KPIs — skeleton inicial -->
        <div class="kpi-grid" id="rel-kpis" style="margin-bottom:16px;">
          ${[0,1,2,3].map(() => `
            <div class="kpi-card" style="pointer-events:none;">
              <div class="kpi-icon" style="background:#F1F5F9;width:48px;height:48px;border-radius:12px;"></div>
              <div class="kpi-body">
                <div style="height:10px;background:#E2E8F0;border-radius:4px;width:64px;margin-bottom:10px;"></div>
                <div style="height:22px;background:#EDF2F7;border-radius:4px;width:96px;"></div>
              </div>
            </div>`).join('')}
        </div>

        <!-- Gráficos: 3 colunas -->
        <div class="rel-charts-row">
          <div class="chart-card">
            <div class="rel-chart-title">Gastos por Setor</div>
            <span class="rel-chart-sub">Volume financeiro por departamento</span>
            <div class="chart-canvas-wrap" style="height:250px;">
              <canvas id="chart-rel-setores"></canvas>
            </div>
          </div>
          <div class="chart-card">
            <div class="rel-chart-title">Status das Requisições</div>
            <span class="rel-chart-sub">Distribuição por etapa do processo</span>
            <div class="chart-canvas-wrap" style="height:250px;">
              <canvas id="chart-rel-status"></canvas>
            </div>
          </div>
          <div class="chart-card">
            <div class="rel-chart-title">Resultado de Qualidade</div>
            <span class="rel-chart-sub">Parecer final das análises</span>
            <div class="chart-canvas-wrap" style="height:250px;">
              <canvas id="chart-rel-qualidade"></canvas>
            </div>
          </div>
        </div>

        <!-- Gráfico evolução: largura total -->
        <div class="chart-card" style="margin-bottom:16px;">
          <div class="rel-chart-title">Evolução Mensal de Requisições</div>
          <span class="rel-chart-sub">Abertas vs Concluídas no período</span>
          <div class="chart-canvas-wrap" style="height:220px;">
            <canvas id="chart-rel-evolucao"></canvas>
          </div>
        </div>

        <!-- Tabela fornecedores -->
        <div class="rel-content-card" id="rel-forn-card">
          <div class="rel-content-card-header">
            <span style="font-size:18px;line-height:1;">🏢</span>
            <span style="font-size:13px;font-weight:700;color:#1a202c;font-family:'Manrope',sans-serif;">
              Top Fornecedores do Período
            </span>
          </div>
          <div style="overflow-x:auto;">
            <table class="rel-forn-table">
              <thead>
                <tr>
                  <th style="width:50px;">#</th>
                  <th>Fornecedor</th>
                  <th style="text-align:center;">OCs</th>
                  <th style="text-align:right;">Volume</th>
                  <th style="text-align:center;">Nota Média</th>
                </tr>
              </thead>
              <tbody id="tbody-rel-fornecedores">
                <tr>
                  <td colspan="5" style="text-align:center;padding:32px;color:#A0AEC0;
                                         font-size:13px;font-family:'Manrope',sans-serif;">
                    Aguardando geração do relatório…
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>`;

    this.inicializarFiltros();

    document.getElementById('btn-gerar-relatorio')
      ?.addEventListener('click', () => this.gerarRelatorio());
    document.getElementById('btn-exportar-pdf-rel')
      ?.addEventListener('click', () => this.exportarPDF());
    document.getElementById('btn-exportar-excel-rel')
      ?.addEventListener('click', () => this.exportarExcel());
    document.getElementById('btn-limpar-filtros-rel')
      ?.addEventListener('click', () => {
        const sf = document.getElementById('filter-rel-fornecedor');
        const ss = document.getElementById('filter-rel-setor');
        const sp = document.getElementById('filter-rel-produto');
        if (sf) sf.value = '';
        if (ss) ss.value = '';
        if (sp) sp.value = '';
        this._aplicarFiltros();
      });
    document.getElementById('filter-rel-fornecedor')
      ?.addEventListener('change', () => this._aplicarFiltros());
    document.getElementById('filter-rel-setor')
      ?.addEventListener('change', () => this._aplicarFiltros());

    await this.gerarRelatorio();
  },

  /* ----------------------------------------------------------
     FILTROS
  ---------------------------------------------------------- */
  inicializarFiltros() {
    const hoje   = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);

    ['mes-inicio','mes-fim'].forEach(id => {
      const sel = document.getElementById('filtro-' + id);
      if (!sel) return;
      sel.innerHTML = this.MESES_LONGOS.map((m, i) =>
        `<option value="${i + 1}">${m}</option>`
      ).join('');
    });

    const anoAtual = hoje.getFullYear();
    ['ano-inicio','ano-fim'].forEach(id => {
      const sel = document.getElementById('filtro-' + id);
      if (!sel) return;
      sel.innerHTML = [anoAtual - 2, anoAtual - 1, anoAtual].map(a =>
        `<option value="${a}">${a}</option>`
      ).join('');
    });

    document.getElementById('filtro-mes-inicio').value = inicio.getMonth() + 1;
    document.getElementById('filtro-ano-inicio').value = inicio.getFullYear();
    document.getElementById('filtro-mes-fim').value    = hoje.getMonth() + 1;
    document.getElementById('filtro-ano-fim').value    = hoje.getFullYear();
  },

  getPeriodo() {
    return {
      mesInicio: parseInt(document.getElementById('filtro-mes-inicio')?.value || 1),
      anoInicio: parseInt(document.getElementById('filtro-ano-inicio')?.value || new Date().getFullYear()),
      mesFim:    parseInt(document.getElementById('filtro-mes-fim')?.value    || 12),
      anoFim:    parseInt(document.getElementById('filtro-ano-fim')?.value    || new Date().getFullYear()),
    };
  },

  filtrarPorPeriodo(registros) {
    const { mesInicio, anoInicio, mesFim, anoFim } = this.getPeriodo();
    const inicio = new Date(anoInicio, mesInicio - 1, 1);
    const fim    = new Date(anoFim, mesFim, 0, 23, 59, 59);
    return registros.filter(r => {
      const d = new Date(r.created_at);
      return d >= inicio && d <= fim;
    });
  },

  _popularFiltrosExtras() {
    const wrap = document.getElementById('rel-filtros-extras');
    if (wrap) wrap.style.display = '';

    // Fornecedores únicos das OCs do período
    const fornecedores = [...new Set(
      this._todasOCs.map(o => o.fornecedor_nome || o.fornecedor).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));

    const selForn = document.getElementById('filter-rel-fornecedor');
    if (selForn) {
      const valorAtual = selForn.value;
      selForn.innerHTML = `<option value="">Todos os fornecedores</option>` +
        fornecedores.map(f => `<option value="${Utils.escapeHtml(f)}">${Utils.escapeHtml(f)}</option>`).join('');
      selForn.value = valorAtual;
    }

    // Setores únicos das requisições
    const setores = [...new Set(
      this._todasReqs.map(r => r.setor).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));

    const selSetor = document.getElementById('filter-rel-setor');
    if (selSetor) {
      const valorAtual = selSetor.value;
      selSetor.innerHTML = `<option value="">Todos os setores</option>` +
        setores.map(s => `<option value="${Utils.escapeHtml(s)}">${Utils.escapeHtml(s)}</option>`).join('');
      selSetor.value = valorAtual;
    }
  },

  _inicializarAutocompleteProduto() {
    const inp = document.getElementById('filter-rel-produto');
    if (!inp) return;

    // Remover dropdown anterior se existir (evita duplicatas ao re-gerar)
    document.getElementById('rel-produto-dropdown-global')?.remove();

    // Criar dropdown diretamente no body — escapa qualquer contexto de empilhamento
    const dropdown = document.createElement('div');
    dropdown.id = 'rel-produto-dropdown-global';
    dropdown.className = 'rel-prod-dropdown';
    dropdown.style.display = 'none';
    document.body.appendChild(dropdown);

    const posicionar = () => {
      const r = inp.getBoundingClientRect();
      dropdown.style.top   = (r.bottom + window.scrollY + 4) + 'px';
      dropdown.style.left  = (r.left  + window.scrollX) + 'px';
      dropdown.style.width = Math.max(r.width, 300) + 'px';
    };

    const fechar = () => { dropdown.style.display = 'none'; };

    inp.addEventListener('input', () => {
      const q = inp.value.toLowerCase().trim();
      if (q.length < 2) { fechar(); return; }

      const matches = (this._catalogoItens || [])
        .filter(i =>
          (i.descricao || '').toLowerCase().includes(q) ||
          (i.codigo    || '').toLowerCase().includes(q) ||
          (i.categoria || '').toLowerCase().includes(q)
        )
        .slice(0, 8);

      if (!matches.length) {
        dropdown.innerHTML = `
          <div class="rel-prod-livre">
            Busca livre: "<strong>${Utils.escapeHtml(q)}</strong>"
            <span style="color:#94a3b8;margin-left:6px;">— Enter para aplicar</span>
          </div>`;
      } else {
        dropdown.innerHTML = matches.map(item => `
          <div class="rel-prod-sugestao" data-desc="${Utils.escapeHtml(item.descricao)}">
            <div class="rel-prod-sugestao-main">
              ${item.codigo ? `<span class="rel-prod-codigo">${Utils.escapeHtml(item.codigo)}</span>` : ''}
              <span class="rel-prod-desc">${Utils.escapeHtml(item.descricao)}</span>
            </div>
            <div class="rel-prod-sugestao-meta">
              ${item.categoria ? `<span>${Utils.escapeHtml(item.categoria)}</span>` : ''}
              ${item.unidade   ? `<span>${Utils.escapeHtml(item.unidade)}</span>`   : ''}
            </div>
          </div>`).join('');

        dropdown.querySelectorAll('.rel-prod-sugestao').forEach(el => {
          el.addEventListener('mousedown', e => {
            e.preventDefault();
            inp.value = el.dataset.desc;
            fechar();
            this._aplicarFiltros();
          });
        });
      }

      posicionar();
      dropdown.style.display = 'block';
    });

    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { fechar(); this._aplicarFiltros(); }
      if (e.key === 'Escape') { fechar(); }
    });

    inp.addEventListener('blur',  () => setTimeout(fechar, 150));
    window.addEventListener('scroll', () => { if (dropdown.style.display !== 'none') posicionar(); }, { passive: true });
  },

  _mostrarBannerFiltros({ fornecedor, setor, produto }) {
    document.getElementById('rel-banner-filtros')?.remove();

    const ativos = [
      fornecedor ? `🏭 Fornecedor: ${fornecedor}` : '',
      setor      ? `🏢 Setor: ${setor}`           : '',
      produto    ? `📦 Produto: ${produto}`        : '',
    ].filter(Boolean);

    if (!ativos.length) return;

    const banner = document.createElement('div');
    banner.id = 'rel-banner-filtros';
    banner.className = 'rel-banner-filtros';
    banner.innerHTML = `
      <span style="font-weight:700;color:#1e40af;">🔍 Filtros ativos:</span>
      ${ativos.map(f => `<span class="rel-banner-tag">${Utils.escapeHtml(f)}</span>`).join('')}
      <button class="rel-banner-limpar" id="btn-banner-limpar-filtros">✕ Limpar tudo</button>`;

    const kpiArea = document.getElementById('rel-kpis');
    if (kpiArea) kpiArea.parentNode.insertBefore(banner, kpiArea);

    document.getElementById('btn-banner-limpar-filtros')?.addEventListener('click', () => {
      const sf = document.getElementById('filter-rel-fornecedor');
      const ss = document.getElementById('filter-rel-setor');
      const sp = document.getElementById('filter-rel-produto');
      if (sf) sf.value = '';
      if (ss) ss.value = '';
      if (sp) sp.value = '';
      this._aplicarFiltros();
    });
  },

  _aplicarFiltros() {
    const fornecedor = document.getElementById('filter-rel-fornecedor')?.value || '';
    const setor      = document.getElementById('filter-rel-setor')?.value      || '';
    const produto    = (document.getElementById('filter-rel-produto')?.value   || '').toLowerCase().trim();

    let reqsFiltradas = this.filtrarPorPeriodo(this._todasReqs);
    let ordensFiltradas = this.filtrarPorPeriodo(this._todasOCs);
    const analisesFiltradas = this.filtrarPorPeriodo(this._todasAnalises || []);

    if (fornecedor) {
      const idsReqComFornecedor = new Set(
        ordensFiltradas
          .filter(o => (o.fornecedor_nome || o.fornecedor || '') === fornecedor)
          .map(o => o.requisicao_id)
          .filter(Boolean)
      );
      reqsFiltradas   = reqsFiltradas.filter(r => idsReqComFornecedor.has(r.id));
      ordensFiltradas = ordensFiltradas.filter(o => (o.fornecedor_nome || o.fornecedor || '') === fornecedor);
    }

    if (setor) {
      reqsFiltradas = reqsFiltradas.filter(r => r.setor === setor);
    }

    if (produto) {
      reqsFiltradas = reqsFiltradas.filter(r =>
        Array.isArray(r.itens) && r.itens.some(item =>
          (item.descricao || '').toLowerCase().includes(produto)
        )
      );
    }

    const topFornecedores = this.calcTopFornecedores(ordensFiltradas);

    this.dadosPeriodo = {
      requisicoes:        reqsFiltradas,
      todasRequisicoes:   this._todasReqs,
      ordens:             ordensFiltradas,
      totalRequisicoes:   reqsFiltradas.length,
      volumeTotal:        reqsFiltradas.reduce((s, r) => s + (parseFloat(r.valor_total) || 0), 0),
      taxaAprovacao:      this.calcTaxaAprovacao(reqsFiltradas),
      tempoMedio:         this.calcTempoMedio(reqsFiltradas),
      totalQualidade:     analisesFiltradas.length,
      qualidadeLiberadas: analisesFiltradas.filter(a => a.parecer_final === 'Liberado').length,
      topFornecedores,
      _filtroFornecedor:  fornecedor,
      _filtroSetor:       setor,
      _filtroProduto:     produto,
    };

    this._mostrarBannerFiltros({ fornecedor, setor, produto });

    this.renderKPIs();
    this.renderChartSetores(reqsFiltradas);
    this.renderChartStatus(reqsFiltradas);
    this.renderChartQualidade(analisesFiltradas);
    this.renderChartEvolucao(this._todasReqs);
    this.renderTabelaFornecedores(topFornecedores);
    this.renderAlertas();
  },

  /* ----------------------------------------------------------
     GERAR RELATÓRIO
  ---------------------------------------------------------- */
  async gerarRelatorio() {
    const btnGerar = document.getElementById('btn-gerar-relatorio');
    if (btnGerar) { btnGerar.disabled = true; btnGerar.textContent = '⏳ Gerando…'; }

    try {
      const [requisicoes, ordens, analises, cotacoes, catalogoItens, alertasCusto] = await Promise.all([
        Storage.list(TABLES.requisicoes,  { order: { column: 'created_at', ascending: false } }),
        Storage.list(TABLES.ordens,       { order: { column: 'created_at', ascending: false } }),
        Storage.list(TABLES.qualidade,    { order: { column: 'created_at', ascending: false } }),
        Storage.list(TABLES.cotacoes,     { order: { column: 'created_at', ascending: false } }),
        Storage.list(TABLES.catalogoItens).catch(() => []),
        Storage.list(TABLES.alertasCusto, { order: { column: 'created_at', ascending: false } }).catch(() => []),
      ]);

      this._todasReqs     = requisicoes  || [];
      this._todasOCs      = ordens       || [];
      this._alertasCusto  = alertasCusto || [];
      this._todasAnalises = analises    || [];
      this._catalogoItens = (catalogoItens || [])
        .filter(i => i.ativo !== false)
        .sort((a, b) => (a.descricao || '').localeCompare(b.descricao || ''));

      // Popular selects de fornecedor, setor e inicializar autocomplete de produto
      this._popularFiltrosExtras();
      this._inicializarAutocompleteProduto();

      this._aplicarFiltros();

    } catch (e) {
      console.error(e);
      Components.Toast.error('Erro ao gerar relatório: ' + e.message);
    } finally {
      if (btnGerar) { btnGerar.disabled = false; btnGerar.textContent = '📊 Gerar Relatório'; }
    }
  },

  /* ----------------------------------------------------------
     CÁLCULOS
  ---------------------------------------------------------- */
  calcTaxaAprovacao(requisicoes) {
    if (!requisicoes.length) return 0;
    const aprovadas = requisicoes.filter(r => this.STATUS_AVANCADOS.includes(r.status)).length;
    return Math.round((aprovadas / requisicoes.length) * 100);
  },

  calcTempoMedio(requisicoes) {
    const comAvaliacao = requisicoes.filter(r => r.data_avaliacao_compras);
    if (!comAvaliacao.length) return '—';
    const totalDias = comAvaliacao.reduce((s, r) => {
      const criacao   = new Date(r.created_at);
      const avaliacao = new Date(r.data_avaliacao_compras);
      return s + Math.max(0, Math.ceil((avaliacao - criacao) / 86400000));
    }, 0);
    return Math.round(totalDias / comAvaliacao.length);
  },

  calcTopFornecedores(ordens) {
    const mapa = {};
    ordens.forEach(o => {
      const nome = o.fornecedor_nome || '—';
      if (!mapa[nome]) mapa[nome] = { nome, ocs: 0, volume: 0, notas: [] };
      mapa[nome].ocs++;
      mapa[nome].volume += parseFloat(o.valor_total) || 0;
      const nota = o.avaliacao_nota || o.avaliacao_estrelas;
      if (nota) mapa[nome].notas.push(parseFloat(nota));
    });

    return Object.values(mapa)
      .map(f => ({
        ...f,
        notaMedia: f.notas.length
          ? (f.notas.reduce((s, n) => s + n, 0) / f.notas.length).toFixed(1)
          : '—',
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);
  },

  /* ----------------------------------------------------------
     KPIs
  ---------------------------------------------------------- */
  renderKPIs() {
    const d = this.dadosPeriodo;
    const tempoMedio = d.tempoMedio === '—' ? '—' : `${d.tempoMedio} dias`;

    const kpis = [
      {
        icon: '⏱️', bg: 'rgba(126,87,194,0.10)',
        valor: tempoMedio,
        label: 'Tempo Médio de Aprovação',
        sub:   'da abertura à aprovação de compras',
      },
      {
        icon: '💰', bg: 'rgba(0,203,169,0.12)',
        valor: Utils.formatCurrency(d.volumeTotal || 0),
        label: 'Volume de Compras',
        sub:   'em requisições no período',
      },
      {
        icon: '✅', bg: 'rgba(52,211,153,0.12)',
        valor: `${d.taxaAprovacao || 0}%`,
        label: 'Taxa de Aprovação',
        sub:   'requisições aprovadas pelo time',
      },
      {
        icon: '🔬', bg: 'rgba(249,115,22,0.10)',
        valor: d.totalQualidade || 0,
        label: 'Análises de Qualidade',
        sub:   `${d.qualidadeLiberadas || 0} liberadas / ${d.totalQualidade || 0} total`,
      },
    ];

    const container = document.getElementById('rel-kpis');
    if (!container) return;
    container.innerHTML = kpis.map(k => `
      <div class="kpi-card">
        <div class="kpi-icon" style="background:${k.bg};">${k.icon}</div>
        <div class="kpi-body">
          <div class="kpi-value">${Utils.escapeHtml(String(k.valor))}</div>
          <div class="kpi-label">${k.label}</div>
          <div class="kpi-sub" style="font-size:11px;color:#A0AEC0;margin-top:2px;">${k.sub}</div>
        </div>
      </div>`).join('');

    requestAnimationFrame(() => requestAnimationFrame(() => {
      container.querySelectorAll('.kpi-card').forEach(el => el.classList.add('loaded'));
    }));
  },

  /* ----------------------------------------------------------
     GRÁFICO 1 — GASTOS POR SETOR
  ---------------------------------------------------------- */
  renderChartSetores(requisicoes) {
    const canvas = document.getElementById('chart-rel-setores');
    if (!canvas) return;
    if (this.charts.setores) { this.charts.setores.destroy(); this.charts.setores = null; }

    const porSetor = {};
    requisicoes.forEach(r => {
      const setor = r.setor || 'Não informado';
      porSetor[setor] = (porSetor[setor] || 0) + (parseFloat(r.valor_total) || 0);
    });

    const labels  = Object.keys(porSetor).sort((a, b) => porSetor[b] - porSetor[a]);
    const valores = labels.map(s => porSetor[s]);
    const CORES   = ['#163864','#1e4d8c','#f97316','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4'];

    if (!labels.length) {
      const card = canvas.closest('.chart-card');
      canvas.parentElement.innerHTML = '<p style="text-align:center;color:var(--color-text-muted);padding:60px 0;font-size:13px;">Sem dados no período</p>';
      requestAnimationFrame(() => card?.classList.add('loaded'));
      return;
    }

    this.charts.setores = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Volume (R$)',
          data: valores,
          backgroundColor: labels.map((_, i) => CORES[i % CORES.length]),
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ' ' + Utils.formatCurrency(ctx.raw),
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: v => v >= 1000 ? 'R$ ' + (v / 1000).toFixed(0) + 'k' : 'R$ ' + v,
            },
          },
        },
      },
    });
    requestAnimationFrame(() => canvas.closest('.chart-card')?.classList.add('loaded'));
  },

  /* ----------------------------------------------------------
     GRÁFICO 2 — STATUS DAS REQUISIÇÕES
  ---------------------------------------------------------- */
  renderChartStatus(requisicoes) {
    const canvas = document.getElementById('chart-rel-status');
    if (!canvas) return;
    if (this.charts.status) { this.charts.status.destroy(); this.charts.status = null; }

    const porStatus = {};
    requisicoes.forEach(r => { porStatus[r.status] = (porStatus[r.status] || 0) + 1; });

    const agrupado = {
      'Concluídas':   (porStatus['Concluida'] || 0),
      'Em Andamento': (porStatus['Em Cotacao'] || 0)
                    + (porStatus['Aguardando Aprovacao do Demandante'] || 0)
                    + (porStatus['Analise de Faturamento'] || 0)
                    + (porStatus['Aguardando Confirmacao'] || 0)
                    + (porStatus['Aguardando Recebimento'] || 0)
                    + (porStatus['Aguardando Analise de Qualidade'] || 0)
                    + (porStatus['Aguardando Avaliacao Fornecedor'] || 0)
                    + (porStatus['Ordem de Compra Gerada'] || 0),
      'Pendentes':    (porStatus['Aguardando Avaliacao de Compras'] || 0)
                    + (porStatus['Aguardando Aprovacao da Diretoria'] || 0),
      'Devolvidas':   (porStatus['Devolvida ao Solicitante'] || 0),
      'Reprovadas':   (porStatus['Nao Aprovada'] || 0) + (porStatus['Cancelada'] || 0),
    };

    const CORES_MAP = {
      'Concluídas':   '#10b981',
      'Em Andamento': '#3b82f6',
      'Pendentes':    '#f59e0b',
      'Devolvidas':   '#f97316',
      'Reprovadas':   '#ef4444',
    };

    const labels  = Object.keys(agrupado).filter(k => agrupado[k] > 0);
    const valores = labels.map(k => agrupado[k]);

    if (!labels.length) {
      const card = canvas.closest('.chart-card');
      canvas.parentElement.innerHTML = '<p style="text-align:center;color:var(--color-text-muted);padding:60px 0;font-size:13px;">Sem dados no período</p>';
      requestAnimationFrame(() => card?.classList.add('loaded'));
      return;
    }

    this.charts.status = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: valores,
          backgroundColor: labels.map(l => CORES_MAP[l]),
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { padding: 14, font: { size: 11 } } },
        },
        cutout: '60%',
      },
    });
    requestAnimationFrame(() => canvas.closest('.chart-card')?.classList.add('loaded'));
  },

  /* ----------------------------------------------------------
     GRÁFICO 3 — RESULTADO DE QUALIDADE
  ---------------------------------------------------------- */
  renderChartQualidade(analises) {
    const canvas = document.getElementById('chart-rel-qualidade');
    if (!canvas) return;
    if (this.charts.qualidade) { this.charts.qualidade.destroy(); this.charts.qualidade = null; }

    const contagem = { 'Liberado': 0, 'Retido': 0, 'Devolvido ao Fornecedor': 0 };
    analises.forEach(a => {
      if (contagem[a.parecer_final] !== undefined) contagem[a.parecer_final]++;
    });

    const total = Object.values(contagem).reduce((s, v) => s + v, 0);

    if (!total) {
      const card = canvas.closest('.chart-card');
      canvas.parentElement.innerHTML = '<p style="text-align:center;color:var(--color-text-muted);padding:60px 0;font-size:13px;">Sem análises no período</p>';
      requestAnimationFrame(() => card?.classList.add('loaded'));
      return;
    }

    this.charts.qualidade = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Liberado', 'Retido', 'Devolvido'],
        datasets: [{
          data: [
            contagem['Liberado'],
            contagem['Retido'],
            contagem['Devolvido ao Fornecedor'],
          ],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { padding: 14, font: { size: 11 } } },
        },
        cutout: '60%',
      },
    });
    requestAnimationFrame(() => canvas.closest('.chart-card')?.classList.add('loaded'));
  },

  /* ----------------------------------------------------------
     GRÁFICO 4 — EVOLUÇÃO MENSAL
  ---------------------------------------------------------- */
  renderChartEvolucao(todasRequisicoes) {
    const canvas = document.getElementById('chart-rel-evolucao');
    if (!canvas) return;
    if (this.charts.evolucao) { this.charts.evolucao.destroy(); this.charts.evolucao = null; }

    const { mesInicio, anoInicio, mesFim, anoFim } = this.getPeriodo();

    const meses = [];
    let cur = new Date(anoInicio, mesInicio - 1, 1);
    const fim = new Date(anoFim, mesFim - 1, 1);
    while (cur <= fim) {
      meses.push({ mes: cur.getMonth() + 1, ano: cur.getFullYear() });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }

    const labels = meses.map(m => `${this.MESES_CURTOS[m.mes - 1]}/${String(m.ano).slice(2)}`);

    const abertas = meses.map(m =>
      todasRequisicoes.filter(r => {
        const d = new Date(r.created_at);
        return d.getMonth() + 1 === m.mes && d.getFullYear() === m.ano;
      }).length
    );

    const concluidas = meses.map(m =>
      todasRequisicoes.filter(r => {
        if (r.status !== 'Concluida' || !r.data_conclusao) return false;
        const d = new Date(r.data_conclusao);
        return d.getMonth() + 1 === m.mes && d.getFullYear() === m.ano;
      }).length
    );

    this.charts.evolucao = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Abertas',
            data: abertas,
            borderColor: '#163864',
            backgroundColor: 'rgba(22,56,100,0.08)',
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
          {
            label: 'Concluídas',
            data: concluidas,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.08)',
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } },
        },
      },
    });
    requestAnimationFrame(() => canvas.closest('.chart-card')?.classList.add('loaded'));
  },

  /* ----------------------------------------------------------
     TABELA FORNECEDORES
  ---------------------------------------------------------- */
  renderTabelaFornecedores(topFornecedores) {
    const tbody = document.getElementById('tbody-rel-fornecedores');
    if (!tbody) return;

    if (!topFornecedores || !topFornecedores.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;padding:32px;color:#A0AEC0;
                                  font-size:13px;font-family:'Manrope',sans-serif;">
            Nenhum fornecedor com ordens no período.
          </td>
        </tr>`;
      document.getElementById('rel-forn-card')?.classList.add('loaded');
      return;
    }

    const POSICAO_CLS = ['rel-pos-1', 'rel-pos-2', 'rel-pos-3'];

    tbody.innerHTML = topFornecedores.map((f, i) => {
      const posCls  = POSICAO_CLS[i] || 'rel-pos-n';
      const estrelas = f.notaMedia !== '—'
        ? [1,2,3,4,5].map(n =>
            `<span style="font-size:14px;color:${n <= Math.round(parseFloat(f.notaMedia)) ? '#f59e0b' : '#E2E8F0'};">★</span>`
          ).join('') + ` <span style="font-size:12px;font-weight:700;color:#2D3748;margin-left:4px;">${f.notaMedia}</span>`
        : `<span style="color:#CBD5E0;">—</span>`;

      return `
        <tr>
          <td style="text-align:center;">
            <span class="rel-posicao ${posCls}">${i + 1}</span>
          </td>
          <td style="font-weight:600;">${Utils.escapeHtml(f.nome || '—')}</td>
          <td style="text-align:center;">${f.ocs}</td>
          <td style="text-align:right;font-weight:700;color:hsl(142,93%,18%);">
            ${Utils.formatCurrency(f.volume)}
          </td>
          <td style="text-align:center;">${estrelas}</td>
        </tr>`;
    }).join('');

    // Animar entrada das linhas escalonada
    tbody.querySelectorAll('tr').forEach((tr, i) => {
      tr.style.opacity = '0';
      tr.style.transform = 'translateX(-6px)';
      setTimeout(() => {
        tr.style.transition = 'all 0.25s ease';
        tr.style.opacity    = '1';
        tr.style.transform  = 'translateX(0)';
      }, i * 60);
    });

    // Revelar o card da tabela
    requestAnimationFrame(() => document.getElementById('rel-forn-card')?.classList.add('loaded'));
  },

  /* ----------------------------------------------------------
     ALERTAS DE CUSTO NO RELATÓRIO
  ---------------------------------------------------------- */
  renderAlertas() {
    const alertasPeriodo = this.filtrarPorPeriodo(this._alertasCusto || []);

    // Remover seção anterior se existir
    document.getElementById('rel-secao-alertas')?.remove();
    if (!alertasPeriodo.length) return;

    const pend    = alertasPeriodo.filter(a => a.status === 'Pendente').length;
    const aceitos = alertasPeriodo.filter(a => a.status === 'Aceito').length;
    const recus   = alertasPeriodo.filter(a => a.status === 'Recusado').length;

    const STATUS_STYLE = {
      Pendente:  { cls: 'rel-alerta-status', bg: '#fef3c7', cor: '#92400e'          },
      Aceito:    { cls: 'rel-alerta-status', bg: '#dcfce7', cor: 'hsl(142,70%,28%)' },
      Recusado:  { cls: 'rel-alerta-status', bg: '#fee2e2', cor: '#dc2626'           },
    };

    const rows = alertasPeriodo.map(a => {
      const st  = STATUS_STYLE[a.status] || STATUS_STYLE['Pendente'];
      return (
        '<tr>' +
          '<td>' +
            '<span style="font-weight:600;">' + Utils.escapeHtml(a.item_descricao || '—') + '</span>' +
            (a.item_codigo ? '<br><span style="font-size:10px;background:#F1F5F9;padding:1px 5px;border-radius:4px;color:#64748b;">' + Utils.escapeHtml(a.item_codigo) + '</span>' : '') +
          '</td>' +
          '<td>' +
            '<span style="font-weight:600;">' + Utils.escapeHtml(a.requisicao_numero || '—') + '</span>' +
            '<br><span style="font-size:11px;color:#94a3b8;">' + Utils.escapeHtml(a.solicitante_nome || '') + '</span>' +
          '</td>' +
          '<td style="text-align:right;">' + Utils.formatCurrency(a.preco_ref) + '</td>' +
          '<td style="text-align:right;font-weight:700;color:#dc2626;">' + Utils.formatCurrency(a.preco_informado) + '</td>' +
          '<td style="text-align:center;"><span class="rel-alerta-variacao">+' + parseFloat(a.variacao_pct).toFixed(1) + '%</span></td>' +
          '<td style="text-align:center;"><span class="rel-alerta-status" style="background:' + st.bg + ';color:' + st.cor + ';">' + a.status + '</span></td>' +
        '</tr>'
      );
    }).join('');

    const secao = document.createElement('div');
    secao.id = 'rel-secao-alertas';
    secao.className = 'rel-alertas-section';
    secao.innerHTML =
      '<div class="rel-alertas-header">' +
        '<span style="font-size:22px;">⚠️</span>' +
        '<span class="rel-alertas-title">Alertas de Aumento de Custo no Período</span>' +
        '<span class="rel-alertas-stat total">' + alertasPeriodo.length + ' alertas</span>' +
        '<span class="rel-alertas-stat pend">⏳ Pendentes: ' + pend + '</span>' +
        '<span class="rel-alertas-stat aceito">✅ Aceitos: ' + aceitos + '</span>' +
        '<span class="rel-alertas-stat recusado">❌ Recusados: ' + recus + '</span>' +
      '</div>' +
      '<div style="overflow-x:auto;">' +
        '<table class="rel-alertas-table">' +
          '<thead><tr>' +
            '<th>Item</th><th>Requisição</th>' +
            '<th style="text-align:right;">Preço Ref.</th>' +
            '<th style="text-align:right;">Informado</th>' +
            '<th style="text-align:center;">Variação</th>' +
            '<th style="text-align:center;">Status</th>' +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>';

    // Inserir após a tabela de fornecedores (ou no final da área de conteúdo)
    const areaRef = document.getElementById('rel-forn-card') ||
                    document.getElementById('rel-kpis')?.parentElement;
    if (areaRef?.parentElement) {
      areaRef.parentElement.appendChild(secao);
    }
  },

  /* ----------------------------------------------------------
     EXPORTAR PDF
  ---------------------------------------------------------- */
  async exportarPDF() {
    const periodo    = this.getPeriodo();
    const d          = this.dadosPeriodo;
    const mesIni     = this.MESES_LONGOS[periodo.mesInicio - 1];
    const mesFim     = this.MESES_LONGOS[periodo.mesFim   - 1];
    const perStr     = `${mesIni}/${periodo.anoInicio} a ${mesFim}/${periodo.anoFim}`;
    const reqs       = d.requisicoes || [];
    const subItens   = [
      `Periodo: ${perStr}`,
      d._filtroFornecedor ? `Fornecedor: ${d._filtroFornecedor}` : '',
      d._filtroSetor      ? `Setor: ${d._filtroSetor}`           : '',
      d._filtroProduto    ? `Produto: ${d._filtroProduto}`        : '',
    ].filter(Boolean);
    const subtituloPdf = subItens.join(' · ');

    Components.Toast.info('Gerando PDF...');
    const logoB64 = await PdfPrint.fetchLogoBase64();

    const html = `
      <div class="pdf-pagina">

        ${PdfPrint.header(logoB64,
          'Relatorio de Compras',
          `${reqs.length} requisicao(oes) &mdash; ${subtituloPdf}`
        )}

        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6pt;">
          <div class="pdf-secao-titulo">Requisicoes</div>
          <div style="font-size:8pt;color:#555;display:flex;gap:14pt;">
            <div><span>Emissao: </span><strong style="color:#1a2e1a;">${new Date().toLocaleString('pt-BR')}</strong></div>
            <div><span>Total Valor: </span><strong style="color:#1a2e1a;">${Utils.formatCurrency(d.volumeTotal || 0)}</strong></div>
            <div><span>Taxa de Aprovacao: </span><strong style="color:#1a2e1a;">${d.taxaAprovacao || 0}%</strong></div>
            <div><span>Tempo Medio: </span><strong style="color:#1a2e1a;">${d.tempoMedio !== '—' ? d.tempoMedio + ' dias' : 'N/A'}</strong></div>
          </div>
        </div>

        ${PdfPrint.tabela(
          [
            { label: 'Numero'                  },
            { label: 'Solicitante'             },
            { label: 'Setor'                   },
            { label: 'Data',   classe: 'center' },
            { label: 'Status'                  },
            { label: 'Valor',  classe: 'right'  },
          ],
          reqs.slice(0, 30).map(r => [
            { valor: r.numero           || '—', classe: 'bold'   },
            { valor: r.solicitante_nome || '—'                    },
            { valor: r.setor            || '—'                    },
            { valor: Utils.formatDate(r.created_at), classe: 'center' },
            { valor: r.status           || '—'                    },
            { valor: Utils.formatCurrency(r.valor_total || 0), classe: 'right' },
          ]),
          [
            { valor: '' },
            { valor: '' },
            { valor: '' },
            { valor: '' },
            { valor: 'TOTAL GERAL',                              classe: 'right' },
            { valor: Utils.formatCurrency(d.volumeTotal || 0),  classe: 'right' },
          ]
        )}

        ${(d.topFornecedores || []).length > 0 ? `
          ${PdfPrint.secao('Top Fornecedores do Periodo')}
          ${PdfPrint.tabela(
            [
              { label: '#',          classe: 'center' },
              { label: 'Fornecedor'                   },
              { label: 'OCs',        classe: 'center' },
              { label: 'Volume',     classe: 'right'  },
              { label: 'Nota Media', classe: 'center' },
            ],
            (d.topFornecedores || []).map((f, i) => [
              { valor: i + 1,                          classe: 'center' },
              { valor: f.nome || '—',                  classe: 'bold'   },
              { valor: f.ocs,                          classe: 'center' },
              { valor: Utils.formatCurrency(f.volume), classe: 'right'  },
              { valor: f.notaMedia || '—',             classe: 'center' },
            ]),
            null
          )}` : ''}

        ${PdfPrint.rodape(
          'Fluxo Compras — Concrem Portas Premium',
          `Periodo: ${perStr}`
        )}

      </div>`;

    PdfPrint.abrir(html);
  },

  /* ----------------------------------------------------------
     EXPORTAR EXCEL
  ---------------------------------------------------------- */
  exportarExcel() {
    if (!window.XLSX) {
      Components.Toast.error('SheetJS não carregado.');
      return;
    }

    const d       = this.dadosPeriodo;
    const periodo = this.getPeriodo();
    const wb      = XLSX.utils.book_new();

    // Aba 1: Requisições
    const dadosReqs = (d.requisicoes || []).map(r => ({
      'Número':          r.numero          || '—',
      'Solicitante':     r.solicitante_nome || '—',
      'Email':           r.solicitante_email || '—',
      'Setor':           r.setor            || '—',
      'Data Requisição': r.data_requisicao  ? Utils.formatDate(r.data_requisicao)  : '—',
      'Data Necessidade':r.data_necessidade ? Utils.formatDate(r.data_necessidade) : '—',
      'Valor Total':     parseFloat(r.valor_total) || 0,
      'Urgente':         r.urgente ? 'Sim' : 'Não',
      'Alçada':          r.alcada_aprovacao || '—',
      'Status':          r.status           || '—',
      'Avaliador':       r.avaliador_compras || '—',
      'Data Avaliação':  r.data_avaliacao_compras ? Utils.formatDate(r.data_avaliacao_compras) : '—',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dadosReqs), 'Requisições');

    // Aba 2: Ordens de Compra
    const dadosOCs = (d.ordens || []).map(o => ({
      'Número OC':        o.numero              || '—',
      'Requisição':       o.numero_requisicao || '—',
      'Fornecedor':       o.fornecedor_nome || '—',
      'Valor Total':      parseFloat(o.valor_total) || 0,
      'Status':           o.status              || '—',
      'Entrega Prevista': o.data_entrega_prevista ? Utils.formatDate(o.data_entrega_prevista) : '—',
      'Nota Fornecedor':  o.avaliacao_nota || o.avaliacao_estrelas || '—',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dadosOCs), 'Ordens de Compra');

    // Aba 3: Fornecedores
    const dadosForn = (d.topFornecedores || []).map((f, i) => ({
      'Posição':     i + 1,
      'Fornecedor':  f.nome       || '—',
      'OCs':         f.ocs,
      'Volume':      f.volume,
      'Nota Média':  f.notaMedia,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dadosForn), 'Fornecedores');

    const nomeArq = `relatorio-${periodo.anoInicio}${String(periodo.mesInicio).padStart(2, '0')}.xlsx`;
    XLSX.writeFile(wb, nomeArq);
    Components.Toast.success('Excel exportado com sucesso!');
  },
};

window.Pages = Pages;
