/* ============================================================
   FLUXOCOMPRAS — Dashboard Premium v2
   Verde escuro hsl(142,93%,8%) + esmeralda #6ee7b7
   ============================================================ */

var Pages = window.Pages || {};

Pages.Dashboard = {
  _charts: {},
  _filtroMes: null,
  _filtroAno: null,

  render() {
    document.title = 'Dashboard';
    App.setPageTitle('Dashboard');

    const now = new Date();
    this._filtroMes = now.getMonth() + 1;
    this._filtroAno = now.getFullYear();

    const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const anos = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()];

    const saudacao    = this._getSaudacao();
    const primeiroNome = Utils.escapeHtml(App.currentUser.nome.split(' ')[0]);

    document.getElementById('main-content').innerHTML = `

      <!-- Saudação -->
      <div class="dash-greeting">
        <h1>${saudacao}, ${primeiroNome} 👋</h1>
        <p>${Utils.formatDate(now)} — Visão geral do sistema</p>
      </div>

      <!-- Filtro de período -->
      <div class="period-filter">
        <div>
          <span class="period-filter-label">Mês</span>
          <select id="filtro-mes">
            ${MESES.map((m, i) =>
              `<option value="${i + 1}" ${i + 1 === this._filtroMes ? 'selected' : ''}>${m}</option>`
            ).join('')}
          </select>
        </div>
        <div>
          <span class="period-filter-label">Ano</span>
          <select id="filtro-ano">
            ${anos.map(y =>
              `<option value="${y}" ${y === this._filtroAno ? 'selected' : ''}>${y}</option>`
            ).join('')}
          </select>
        </div>
        <button class="btn-aplicar" id="btn-aplicar-filtro">↻ Aplicar</button>
      </div>

      <!-- KPI Grid -->
      <div id="kpi-grid" class="kpi-grid" style="margin-bottom:16px;">
        ${this._kpiSkeleton()}
      </div>

      <!-- Gráficos: barras + doughnut -->
      <div class="charts-grid">
        <div class="chart-card" id="card-setores">
          <div class="chart-title">Gastos por Setor</div>
          <span class="chart-subtitle">Volume financeiro por departamento</span>
          <div class="chart-canvas-wrap" style="height:220px;">
            <canvas id="chart-setores"></canvas>
          </div>
        </div>
        <div class="chart-card" id="card-status">
          <div class="chart-title">Por Status</div>
          <span class="chart-subtitle">Distribuição das requisições</span>
          <div class="chart-canvas-wrap" style="height:220px;">
            <canvas id="chart-status"></canvas>
          </div>
        </div>
      </div>

      <!-- Evolução Mensal -->
      <div class="chart-card" style="margin-bottom:16px;" id="card-evolucao">
        <div class="chart-title">Evolução Mensal</div>
        <span class="chart-subtitle">Requisições abertas vs concluídas nos últimos 6 meses</span>
        <div class="chart-canvas-wrap" style="height:180px;">
          <canvas id="chart-evolucao"></canvas>
        </div>
      </div>

      <!-- Feed de atividades -->
      <div class="chart-card" id="card-feed">
        <div class="chart-title" style="margin-bottom:16px;">
          Atividades Recentes
          <span style="margin-left:auto;font-size:11px;color:#A0AEC0;font-weight:500;font-family:var(--font-family);">
            Últimas 10 ações
          </span>
        </div>
        <ul class="activity-feed" id="activity-feed">
          ${this._activitySkeleton()}
        </ul>
      </div>`;

    document.getElementById('btn-aplicar-filtro').addEventListener('click', () => {
      this._filtroMes = parseInt(document.getElementById('filtro-mes').value, 10);
      this._filtroAno = parseInt(document.getElementById('filtro-ano').value, 10);
      this._loadData();
    });

    this._loadData();
  },

  _getSaudacao() {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  },

  /* ----------------------------------------------------------
     Carregamento de dados
  ---------------------------------------------------------- */
  async _loadData() {
    try {
      const [requisicoes, historico] = await Promise.all([
        Storage.list(TABLES.requisicoes),
        Storage.list(TABLES.historico, {
          order: { column: 'created_at', ascending: false },
          limit: 10,
        }),
      ]);

      const todas    = requisicoes || [];
      const filtradas = this._filtrarPorPeriodo(todas);

      this._renderKPIs(filtradas);
      this._renderFeed(historico || []);
      this._animateCards();
      // Wrap chart initializations in rAF to ensure canvas elements are in DOM
      requestAnimationFrame(() => {
        this._renderChartSetores(filtradas);
        this._renderChartStatus(filtradas);
        this._renderChartEvolucao(todas);
      });

    } catch (e) {
      console.error('[Dashboard]', e);
      Components.Toast.error('Erro ao carregar dados do dashboard.');
      this._renderKPIs([]);
      this._renderFeed([]);
    }
  },

  _filtrarPorPeriodo(requisicoes) {
    return requisicoes.filter(r => {
      const d = new Date(r.created_at);
      return d.getMonth() + 1 === this._filtroMes &&
             d.getFullYear()   === this._filtroAno;
    });
  },

  /* ----------------------------------------------------------
     Animações de entrada
  ---------------------------------------------------------- */
  _animateCards() {
    document.querySelectorAll('.kpi-card').forEach((el, i) => {
      el.style.transitionDelay = `${i * 80}ms`;
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('loaded')));
    });

    ['card-setores', 'card-status', 'card-evolucao', 'card-feed'].forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) {
        el.style.transitionDelay = `${(i * 80) + 240}ms`;
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('loaded')));
      }
    });
  },

  /* ----------------------------------------------------------
     KPI Cards
  ---------------------------------------------------------- */
  _renderKPIs(requisicoes) {
    const total = requisicoes.length;

    const valorAberto = requisicoes
      .filter(r => !['Concluida', 'Cancelada'].includes(r.status))
      .reduce((s, r) => s + (r.valor_total || 0), 0);

    const APROVADOS = [
      'Em Cotacao', 'Aguardando Aprovacao do Demandante',
      'Analise de Faturamento', 'Ordem de Compra Gerada',
      'Aguardando Recebimento', 'Aguardando Analise de Qualidade', 'Concluida',
    ];
    const aprovados     = requisicoes.filter(r => APROVADOS.includes(r.status)).length;
    const taxaAprovacao = total > 0 ? Math.round((aprovados / total) * 100) : 0;

    const concluidas = requisicoes.filter(r => r.status === 'Concluida' && r.data_conclusao);
    let tempoMedio = '—';
    if (concluidas.length > 0) {
      const soma = concluidas.reduce((s, r) =>
        s + Math.max(0, Math.floor(
          (new Date(r.data_conclusao) - new Date(r.created_at)) / 86400000
        )), 0);
      tempoMedio = `${Math.round(soma / concluidas.length)}d`;
    }

    const grid = document.getElementById('kpi-grid');
    if (!grid) return;

    const kpis = [
      {
        icon: '📋', label: 'Requisições',
        value: String(total), rawNum: total,
        sub: 'no período selecionado',
        trend: total > 0 ? '↑ ativo' : null, trendClass: 'kpi-trend-up',
      },
      {
        icon: '💰', label: 'Valor em Aberto',
        value: Utils.formatCurrency(valorAberto), rawNum: null,
        sub: 'em requisições ativas',
        trend: null,
      },
      {
        icon: '✅', label: 'Taxa de Aprovação',
        value: `${taxaAprovacao}%`, rawNum: taxaAprovacao,
        sub: 'requisições aprovadas',
        trend: taxaAprovacao >= 70 ? '↑ boa' : null, trendClass: 'kpi-trend-up',
      },
      {
        icon: '⏱️', label: 'Tempo Médio',
        value: Utils.escapeHtml(String(tempoMedio)), rawNum: null,
        sub: 'da abertura à conclusão',
        trend: null,
      },
    ];

    grid.innerHTML = kpis.map((k, i) => `
      <div class="kpi-card" style="transition-delay:${i * 80}ms">
        <div class="kpi-icon-wrap">${k.icon}</div>
        <span class="kpi-label">${k.label}</span>
        <span class="kpi-value"
          ${k.rawNum != null ? `data-target="${k.rawNum}"` : ''}
        >${k.value}</span>
        <span class="kpi-sub">${k.sub}</span>
        ${k.trend ? `<span class="kpi-trend ${k.trendClass || ''}">${k.trend}</span>` : ''}
      </div>`).join('');

    this._animateKPIValues();
  },

  _animateKPIValues() {
    document.querySelectorAll('.kpi-value[data-target]').forEach(el => {
      const target   = parseFloat(el.dataset.target);
      if (isNaN(target)) return;
      const final    = el.textContent;
      const duration = 900;
      const start    = performance.now();

      const tick = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
        el.textContent = Math.round(e * target);
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = final; // restaura formato original (ex: "42%")
      };
      requestAnimationFrame(tick);
    });
  },

  /* ----------------------------------------------------------
     Gráfico — Barras por Setor
  ---------------------------------------------------------- */
  _renderChartSetores(requisicoes) {
    this._destroyChart('setores');
    const ctx = document.getElementById('chart-setores');
    if (!ctx) return;

    const map = {};
    requisicoes.forEach(r => {
      const s = r.setor || 'Sem setor';
      map[s] = (map[s] || 0) + (r.valor_total || 0);
    });

    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);

    if (entries.length === 0) {
      ctx.closest('.chart-card').querySelector('.chart-canvas-wrap').innerHTML =
        this._emptyChart('📊', 'Sem dados no período');
      return;
    }

    // Gradiente monocromático de verde escuro → esmeralda
    const cores = entries.map((_, i) => {
      const pct = entries.length > 1 ? i / (entries.length - 1) : 0;
      const l   = Math.round(20 + pct * 35);
      const sat  = Math.round(93 - pct * 23);
      return `hsl(142, ${sat}%, ${l}%)`;
    });

    this._charts.setores = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: entries.map(([s]) => s),
        datasets: [{
          label: 'Valor (R$)',
          data: entries.map(([, v]) => v),
          backgroundColor: cores,
          borderRadius: 8,
          borderSkipped: false,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'hsl(142,93%,8%)',
            titleColor: '#6ee7b7',
            bodyColor: '#ffffff',
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              label: c => ' ' + Utils.formatCurrency(c.raw),
            },
          },
        },
        scales: {
          x: {
            ticks: {
              font: { family: 'Manrope', size: 11 },
              color: '#A0AEC0',
              callback: v => 'R$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v),
            },
            grid: { color: '#F0F4F8' },
          },
          y: {
            ticks: { font: { family: 'Manrope', size: 12 }, color: '#718096' },
            grid: { display: false },
          },
        },
      },
    });
  },

  /* ----------------------------------------------------------
     Gráfico — Doughnut por Status
  ---------------------------------------------------------- */
  _renderChartStatus(requisicoes) {
    this._destroyChart('status');
    const ctx = document.getElementById('chart-status');
    if (!ctx) return;

    const map = {};
    requisicoes.forEach(r => { map[r.status] = (map[r.status] || 0) + 1; });

    let entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    if (entries.length > 5) {
      const top    = entries.slice(0, 4);
      const outros = entries.slice(4).reduce((s, [, v]) => s + v, 0);
      entries = [...top, ['Outros', outros]];
    }

    if (entries.length === 0) {
      ctx.closest('.chart-card').querySelector('.chart-canvas-wrap').innerHTML =
        this._emptyChart('🍩', 'Sem requisições no período');
      return;
    }

    const CORES = [
      'hsl(142,93%,20%)',
      'hsl(142,80%,30%)',
      'hsl(142,65%,42%)',
      'hsl(142,55%,55%)',
      'hsl(142,40%,70%)',
    ];

    this._charts.status = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: entries.map(([s]) =>
          typeof Utils.getStatusLabel === 'function' ? Utils.getStatusLabel(s) : s),
        datasets: [{
          data: entries.map(([, v]) => v),
          backgroundColor: entries.map((_, i) => CORES[i % CORES.length]),
          borderWidth: 3,
          borderColor: '#ffffff',
          hoverBorderColor: '#ffffff',
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 14,
              font: { family: 'Manrope', size: 11 },
              color: '#718096',
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              pointStyle: 'circle',
            },
          },
          tooltip: {
            backgroundColor: 'hsl(142,93%,8%)',
            titleColor: '#6ee7b7',
            bodyColor: '#ffffff',
            padding: 12,
            cornerRadius: 10,
          },
        },
      },
    });
  },

  /* ----------------------------------------------------------
     Gráfico — Linha de Evolução Mensal
  ---------------------------------------------------------- */
  _renderChartEvolucao(todas) {
    this._destroyChart('evolucao');
    const ctx = document.getElementById('chart-evolucao');
    if (!ctx) return;

    const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const now   = new Date();
    const meses = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      meses.push({
        label: `${MESES_PT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
        mes:   d.getMonth() + 1,
        ano:   d.getFullYear(),
      });
    }

    const abertas = meses.map(m =>
      todas.filter(r => {
        const d = new Date(r.created_at);
        return d.getMonth() + 1 === m.mes && d.getFullYear() === m.ano;
      }).length
    );

    const concluidas = meses.map(m =>
      todas.filter(r => {
        const d = new Date(r.created_at);
        return r.status === 'Concluida' &&
               d.getMonth() + 1 === m.mes && d.getFullYear() === m.ano;
      }).length
    );

    this._charts.evolucao = new Chart(ctx, {
      type: 'line',
      data: {
        labels: meses.map(m => m.label),
        datasets: [
          {
            label: 'Abertas',
            data: abertas,
            borderColor: 'hsl(142,93%,20%)',
            backgroundColor: 'hsla(142,93%,20%,0.10)',
            fill: true,
            tension: 0.45,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointBackgroundColor: 'hsl(142,93%,20%)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            borderWidth: 2.5,
          },
          {
            label: 'Concluídas',
            data: concluidas,
            borderColor: '#6ee7b7',
            backgroundColor: 'rgba(110,231,183,0.10)',
            fill: true,
            tension: 0.45,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointBackgroundColor: '#6ee7b7',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            borderWidth: 2.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              padding: 16,
              font: { family: 'Manrope', size: 12 },
              color: '#718096',
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 8,
            },
          },
          tooltip: {
            backgroundColor: 'hsl(142,93%,8%)',
            titleColor: '#6ee7b7',
            bodyColor: '#ffffff',
            padding: 12,
            cornerRadius: 10,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              precision: 0,
              font: { family: 'Manrope', size: 11 },
              color: '#A0AEC0',
            },
            grid: { color: '#F0F4F8' },
          },
          x: {
            ticks: { font: { family: 'Manrope', size: 11 }, color: '#A0AEC0' },
            grid: { display: false },
          },
        },
      },
    });
  },

  /* ----------------------------------------------------------
     Feed de atividades
  ---------------------------------------------------------- */
  _renderFeed(historico) {
    const ICONS = {
      'criada': '📋', 'aprovada': '✅', 'devolvida': '↩️',
      'diretoria': '🏛️', 'reprovada': '❌', 'cotação': '💰',
      'cotacao': '💰', 'ordem': '📦', 'recebimento': '🏭',
      'qualidade': '🔬', 'concluída': '🎉', 'concluida': '🎉', 'cancelada': '🚫',
    };

    const feed = document.getElementById('activity-feed');
    if (!feed) return;

    if (!historico || historico.length === 0) {
      feed.innerHTML = `
        <li style="display:flex;flex-direction:column;align-items:center;padding:32px 0;gap:10px;">
          <div class="chart-empty-icon">📭</div>
          <span class="chart-empty-text">Nenhuma atividade recente</span>
        </li>`;
      return;
    }

    feed.innerHTML = historico.map(h => {
      const acaoLower = (h.acao || '').toLowerCase();
      const icon = Object.entries(ICONS).find(([k]) => acaoLower.includes(k))?.[1] || '📝';
      const user = h.usuario ? ` — ${Utils.escapeHtml(h.usuario)}` : '';

      return `
        <li class="activity-item">
          <div class="activity-icon">${icon}</div>
          <div class="activity-body">
            <span class="activity-text">${Utils.escapeHtml(h.acao || '')}${user}</span>
            <span class="activity-time">${Utils.formatRelativeTime(h.created_at)}</span>
          </div>
          <div class="activity-dot"></div>
        </li>`;
    }).join('');
  },

  /* ----------------------------------------------------------
     Utilitários internos
  ---------------------------------------------------------- */
  _destroyChart(key) {
    if (this._charts[key]) {
      this._charts[key].destroy();
      this._charts[key] = null;
    }
  },

  _emptyChart(icon, msg) {
    return `
      <div class="chart-empty">
        <div class="chart-empty-icon">${icon}</div>
        <span class="chart-empty-text">${Utils.escapeHtml(msg)}</span>
      </div>`;
  },

  _kpiSkeleton() {
    return [0, 1, 2, 3].map(() => `
      <div class="kpi-card" style="opacity:1;transform:none;pointer-events:none;">
        <div class="skeleton" style="width:44px;height:44px;border-radius:12px;margin-bottom:12px;"></div>
        <div class="skeleton" style="width:55%;height:10px;margin-bottom:8px;"></div>
        <div class="skeleton" style="width:40%;height:26px;margin-bottom:6px;"></div>
        <div class="skeleton" style="width:65%;height:10px;"></div>
      </div>`).join('');
  },

  _activitySkeleton() {
    return [...Array(5)].map(() => `
      <li class="activity-item" style="pointer-events:none;">
        <div class="skeleton" style="width:36px;height:36px;border-radius:10px;flex-shrink:0;"></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
          <div class="skeleton" style="width:75%;height:12px;"></div>
          <div class="skeleton" style="width:35%;height:10px;"></div>
        </div>
      </li>`).join('');
  },
};

window.Pages = Pages;
