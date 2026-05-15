/* ============================================================
   FLUXOCOMPRAS — Fornecedores Premium v2
   Identidade: verde escuro hsl(142,93%,8%) + esmeralda #6ee7b7
   ============================================================ */

var Pages = window.Pages || {};

Pages.Fornecedores = {
  fornecedores:          [],
  fornecedoresFiltrados: [],
  cotacoes:              [],
  ordens:                [],

  MEDALHAS: ['🥇', '🥈', '🥉', '4º', '5º'],

  async render() {
    document.title = 'Fluxo Compras — Fornecedores';
    App.setPageTitle('Fornecedores');

    document.getElementById('main-content').innerHTML = `
      ${Components.pageHeader({
        title:    'Fornecedores',
        subtitle: 'Performance e métricas dos fornecedores homologados',
      })}

      <!-- KPI cards skeleton -->
      <div class="forn-kpi-grid" id="forn-kpis">
        ${[0,1,2,3].map(i => `
          <div class="forn-kpi-card" style="animation-delay:${i*60}ms">
            <div class="skeleton" style="width:44px;height:44px;border-radius:12px;flex-shrink:0;"></div>
            <div style="flex:1;">
              <div class="skeleton skeleton-text" style="width:80px;margin-bottom:6px;"></div>
              <div class="skeleton skeleton-text" style="width:120px;"></div>
            </div>
          </div>`).join('')}
      </div>

      <!-- Busca -->
      <div class="forn-search-bar">
        <div class="forn-search-wrap">
          <span style="color:#A0AEC0;font-size:14px;flex-shrink:0;">🔍</span>
          <input class="forn-search-input" type="text" id="search-fornecedor"
            placeholder="Buscar por nome ou CNPJ..." />
        </div>
        <span class="forn-search-count" id="contador-fornecedores">Carregando...</span>
      </div>

      <!-- Grid ranking + tabela -->
      <div class="forn-grid">

        <!-- Ranking -->
        <div class="forn-ranking-card">
          <div class="forn-ranking-header">
            <div class="forn-ranking-title">🏆 Top 5 Fornecedores</div>
            <span class="forn-ranking-sub">por nota de qualidade</span>
          </div>
          <div id="forn-ranking">
            ${[...Array(3)].map(() => `
              <div class="forn-ranking-item">
                <div class="skeleton" style="width:28px;height:28px;border-radius:50%;flex-shrink:0;"></div>
                <div style="flex:1;">
                  <div class="skeleton skeleton-text" style="width:80%;margin-bottom:5px;"></div>
                  <div class="skeleton skeleton-text" style="width:50%;"></div>
                </div>
                <div class="skeleton skeleton-text" style="width:30px;"></div>
              </div>`).join('')}
          </div>
        </div>

        <!-- Tabela -->
        <div class="forn-tabela-card">
          <div class="forn-tabela-header">
            <span class="forn-tabela-title">Todos os Fornecedores</span>
          </div>
          <div style="overflow-x:auto;">
            <table class="forn-table">
              <thead>
                <tr>
                  <th>Fornecedor</th>
                  <th>CNPJ</th>
                  <th>Nota</th>
                  <th>Aval.</th>
                  <th>Partic.</th>
                  <th>Vitórias</th>
                  <th>Taxa</th>
                  <th>Volume</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody id="tbody-fornecedores">
                ${[...Array(3)].map(() => `
                  <tr style="opacity:1;">
                    ${[180,100,80,40,40,50,60,90,60,40].map(w =>
                      `<td><div class="skeleton skeleton-text" style="width:${w}px"></div></td>`
                    ).join('')}
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>`;

    document.getElementById('search-fornecedor')
      ?.addEventListener('input', e => this.filtrar(e.target.value));

    await this.loadDados();
  },

  async loadDados() {
    try {
      const [fornecedores, cotacoes, ordens] = await Promise.all([
        Storage.list(TABLES.fornecedores, { order: { column: 'nome' } }),
        Storage.list(TABLES.cotacoes,     { order: { column: 'created_at', ascending: false } }),
        Storage.list(TABLES.ordens,       { order: { column: 'created_at', ascending: false } }),
      ]);

      this.fornecedores = fornecedores || [];
      this.cotacoes     = cotacoes     || [];
      this.ordens       = ordens       || [];

      this.fornecedores = this.fornecedores.map(f => ({
        ...f,
        _metricas:        this._calcularMetricas(f),
        total_compras:    this._calcularVolume(f),
        _total_avaliacoes: this._calcularAvaliacoes(f),
      }));

      this.fornecedoresFiltrados = this.fornecedores;

      this.renderKPIs();
      this.renderRanking();
      this.renderTabela(this.fornecedoresFiltrados);
      this.atualizarContador(this.fornecedoresFiltrados.length);

    } catch (e) {
      Components.Toast.error('Erro ao carregar fornecedores: ' + e.message);
    }
  },

  // ── LÓGICA DE NEGÓCIO — mantida intacta ──

  _calcularMetricas(forn) {
    const participacoes = this.cotacoes.filter(c =>
      (c.fornecedores || []).some(f =>
        f.id === forn.id || Utils.norm(f.nome || '') === Utils.norm(forn.nome)
      )
    ).length;

    const vitorias = this.cotacoes.filter(c => {
      const v = c.fornecedor_vencedor;
      if (!v) return false;
      if (typeof v === 'object') return v.id === forn.id || Utils.norm(v.nome || '') === Utils.norm(forn.nome);
      return Utils.norm(String(v)) === Utils.norm(forn.nome);
    }).length;

    const taxaVitoria = participacoes > 0 ? Math.round((vitorias / participacoes) * 100) : 0;
    return { participacoes, vitorias, taxaVitoria };
  },

  _calcularVolume(forn) {
    return this.ordens
      .filter(o =>
        o.fornecedor_id === forn.id ||
        Utils.norm(o.fornecedor_nome || '') === Utils.norm(forn.nome)
      )
      .reduce((acc, o) => acc + (parseFloat(o.valor_total) || 0), 0);
  },

  _calcularAvaliacoes(forn) {
    return this.ordens.filter(o =>
      (o.fornecedor_id === forn.id ||
       Utils.norm(o.fornecedor_nome || '') === Utils.norm(forn.nome)) &&
      o.avaliacao_estrelas > 0
    ).length;
  },

  filtrar(texto) {
    const q = Utils.norm(texto);
    this.fornecedoresFiltrados = q
      ? this.fornecedores.filter(f =>
          Utils.norm(f.nome).includes(q) || Utils.norm(f.cnpj || '').includes(q)
        )
      : this.fornecedores;
    this.renderTabela(this.fornecedoresFiltrados);
    this.atualizarContador(this.fornecedoresFiltrados.length);
  },

  // ── RENDER ──

  atualizarContador(total) {
    const el = document.getElementById('contador-fornecedores');
    if (el) el.textContent = `${total} fornecedor${total !== 1 ? 'es' : ''} encontrado${total !== 1 ? 's' : ''}`;
  },

  renderKPIs() {
    const ativos  = this.fornecedores.filter(f => f.ativo !== false).length;
    const total   = this.fornecedores.length;
    const comNota = this.fornecedores.filter(f => (f.nota_media_qualidade || 0) > 0);
    const notaMedia = comNota.length > 0
      ? (comNota.reduce((s, f) => s + parseFloat(f.nota_media_qualidade), 0) / comNota.length).toFixed(1)
      : '—';
    const volume = this.fornecedores.reduce((s, f) => s + (f.total_compras || 0), 0);

    const kpis = [
      { icon: '🏢', label: 'Total de Fornecedores', value: total,      sub: 'cadastrados no sistema',   bg: 'rgba(22,56,100,0.08)' },
      { icon: '✅', label: 'Fornecedores Ativos',   value: ativos,     sub: 'disponíveis para cotação', bg: 'rgba(52,211,153,0.10)' },
      { icon: '⭐', label: 'Nota Média Geral',       value: notaMedia !== '—' ? `${notaMedia} / 5` : '—', sub: 'média de qualidade', bg: 'rgba(245,158,11,0.10)' },
      { icon: '💰', label: 'Volume Total',           value: Utils.formatCurrency(volume), sub: 'em ordens concluídas', bg: 'rgba(249,115,22,0.10)' },
    ];

    const grid = document.getElementById('forn-kpis');
    if (!grid) return;

    grid.innerHTML = kpis.map((k, i) => `
      <div class="forn-kpi-card" style="animation-delay:${i * 60}ms">
        <div class="forn-kpi-icon" style="background:${k.bg}">${k.icon}</div>
        <div>
          <span class="forn-kpi-label">${k.label}</span>
          <span class="forn-kpi-value">${k.value}</span>
          <span class="forn-kpi-sub">${k.sub}</span>
        </div>
      </div>`).join('');
  },

  renderRanking() {
    const container = document.getElementById('forn-ranking');
    if (!container) return;

    const top5 = this.fornecedores
      .filter(f => (f.nota_media_qualidade || 0) > 0 && f.total_avaliacoes > 0)
      .sort((a, b) => (b.nota_media_qualidade || 0) - (a.nota_media_qualidade || 0))
      .slice(0, 5);

    if (!top5.length) {
      container.innerHTML = `
        <div class="receb-empty">
          <div class="receb-empty-icon">🏆</div>
          <div class="receb-empty-text">Nenhum fornecedor avaliado ainda</div>
        </div>`;
      return;
    }

    container.innerHTML = top5.map((f, i) => {
      const nota    = parseFloat(f.nota_media_qualidade).toFixed(1);
      const estrelas = [1,2,3,4,5].map(n =>
        n <= Math.round(f.nota_media_qualidade) ? '★' : '☆'
      ).join('');
      const medalha = this.MEDALHAS[i] || `${i+1}º`;
      const volume  = f.total_compras > 0 ? Utils.formatCurrency(f.total_compras) : '';

      return `
        <div class="forn-ranking-item">
          <span class="forn-ranking-medalha">${medalha}</span>
          <div class="forn-ranking-info">
            <span class="forn-ranking-nome">${Utils.escapeHtml(f.nome)}</span>
            <span class="forn-ranking-meta">
              ${f.total_avaliacoes} aval.${volume ? ` · ${volume}` : ''}
            </span>
          </div>
          <div class="forn-ranking-nota">
            <span class="forn-ranking-nota-val">${nota}</span>
            <span class="forn-ranking-stars">${estrelas}</span>
          </div>
        </div>`;
    }).join('');
  },

  renderTabela(lista) {
    const tbody = document.getElementById('tbody-fornecedores');
    if (!tbody) return;

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10">
            <div class="receb-empty">
              <div class="receb-empty-icon">🏢</div>
              <div class="receb-empty-text">Nenhum fornecedor encontrado</div>
            </div>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = lista.map((f, i) => this._linhaFornecedor(f, i)).join('');

    tbody.querySelectorAll('.btn-ver-forn').forEach(btn =>
      btn.addEventListener('click', () => this.verDetalhes(btn.dataset.id))
    );
  },

  _linhaFornecedor(f, index = 0) {
    const m    = f._metricas || { participacoes: 0, vitorias: 0, taxaVitoria: 0 };
    const nota = parseFloat(f.nota_media_qualidade) || 0;

    let taxaHtml;
    if (m.participacoes === 0) {
      taxaHtml = `<span style="color:#A0AEC0;">—</span>`;
    } else if (m.taxaVitoria >= 50) {
      taxaHtml = `<span class="forn-taxa-alta">${m.taxaVitoria}%</span>`;
    } else if (m.taxaVitoria >= 25) {
      taxaHtml = `<span class="forn-taxa-media">${m.taxaVitoria}%</span>`;
    } else {
      taxaHtml = `<span class="forn-taxa-baixa">${m.taxaVitoria}%</span>`;
    }

    return `
      <tr style="animation-delay:${index * 40}ms">
        <td>
          <div class="forn-nome-wrap">
            <span class="forn-nome">${Utils.escapeHtml(f.nome)}</span>
            <span class="forn-email">${Utils.escapeHtml(f.contato_email || '—')}</span>
          </div>
        </td>
        <td style="color:#718096;">${Utils.escapeHtml(f.cnpj || '—')}</td>
        <td>
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:13px;">${this._estrelasInline(nota)}</span>
            <span style="font-size:13px;font-weight:700;color:#1a202c;">
              ${nota > 0 ? nota.toFixed(1) : '—'}
            </span>
          </div>
        </td>
        <td style="text-align:center;color:#718096;">${f._total_avaliacoes || 0}</td>
        <td style="text-align:center;color:#718096;">${m.participacoes}</td>
        <td style="text-align:center;color:#718096;">${m.vitorias}</td>
        <td>${taxaHtml}</td>
        <td style="font-weight:700;color:hsl(142,72%,26%);">${Utils.formatCurrency(f.total_compras || 0)}</td>
        <td>${Components.badge(f.ativo !== false ? 'Ativo' : 'Inativo')}</td>
        <td>
          <button class="forn-btn-ver btn-ver-forn"
            data-id="${Utils.escapeHtml(String(f.id))}" title="Ver detalhes">
            👁️
          </button>
        </td>
      </tr>`;
  },

  _estrelasInline(nota) {
    return [1,2,3,4,5].map(n =>
      `<span style="color:${n <= nota ? '#f59e0b' : '#E2E8F0'};font-size:13px;">★</span>`
    ).join('');
  },

  async verDetalhes(id) {
    const forn = this.fornecedores.find(f => String(f.id) === String(id));
    if (!forn) return;

    const metricas = forn._metricas || { participacoes: 0, vitorias: 0, taxaVitoria: 0 };
    const ocs = this.ordens
      .filter(o =>
        o.fornecedor_id === forn.id ||
        Utils.norm(o.fornecedor_nome || '') === Utils.norm(forn.nome)
      )
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    Components.Modal.show({
      title:   Utils.escapeHtml(forn.nome),
      content: this._htmlDetalhes(forn, metricas, ocs),
      size:    'lg',
      footer: `<button class="btn btn-ghost" onclick="Components.Modal.hide()">Fechar</button>`,
    });
  },

  _htmlDetalhes(forn, m, ocs) {
    const nota     = parseFloat(forn.nota_media_qualidade) || 0;
    const avals    = forn._total_avaliacoes || 0;
    const endereco = [forn.endereco, forn.cidade, forn.estado].filter(Boolean).join(', ') || '—';

    const campos = [
      ['CNPJ',     forn.cnpj          || '—'],
      ['Contato',  forn.contato       || '—'],
      ['E-mail',   forn.contato_email || '—'],
      ['Telefone', forn.telefone      || '—'],
    ];
    if (endereco !== '—') campos.push(['Endereço', endereco]);

    return `
      <!-- Dados cadastrais -->
      <div class="receb-dialog-section">
        <div class="receb-dialog-section-title">📋 Dados Cadastrais</div>
        <div style="background:#F8FAFC;border-radius:10px;padding:14px;margin-bottom:10px;">
          <span class="oc-field-label">Razão Social</span>
          <span class="oc-field-value" style="font-size:15px;">${Utils.escapeHtml(forn.nome)}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">
          ${campos.map(([l, v]) => `
            <div style="background:#F8FAFC;border-radius:10px;padding:12px;">
              <span class="oc-field-label">${l}</span>
              <span class="oc-field-value">${Utils.escapeHtml(v)}</span>
            </div>`).join('')}
        </div>
      </div>

      <!-- Performance -->
      <div class="receb-dialog-section">
        <div class="receb-dialog-section-title">📈 Performance</div>
        <div class="forn-perf-grid">
          <div class="forn-perf-card">
            <span class="forn-perf-valor" style="color:hsl(142,72%,26%);">
              ${nota > 0 ? nota.toFixed(1) : '—'}
            </span>
            <div style="font-size:14px;color:#f59e0b;margin-bottom:2px;">${this._estrelasInline(nota)}</div>
            <span class="forn-perf-label">Nota Média</span>
          </div>
          <div class="forn-perf-card">
            <span class="forn-perf-valor">${avals}</span>
            <span class="forn-perf-label">Avaliações</span>
          </div>
          <div class="forn-perf-card">
            <span class="forn-perf-valor" style="font-size:16px;color:hsl(142,72%,26%);">
              ${Utils.formatCurrency(forn.total_compras || 0)}
            </span>
            <span class="forn-perf-label">Volume Total</span>
          </div>
          <div class="forn-perf-card">
            <span class="forn-perf-valor">${m.taxaVitoria}%</span>
            <span class="forn-perf-label">Taxa de Vitória</span>
            <div style="font-size:11px;color:#A0AEC0;margin-top:3px;font-family:'Manrope',sans-serif;">
              ${m.vitorias} de ${m.participacoes} cotações
            </div>
          </div>
        </div>
      </div>

      <!-- Últimas OCs -->
      <div class="receb-dialog-section">
        <div class="receb-dialog-section-title">📦 Últimas Ordens de Compra</div>
        ${ocs.length ? ocs.map(o => `
          <div class="forn-oc-linha">
            <div>
              <span class="forn-oc-numero">${Utils.escapeHtml(o.numero || '—')}</span>
              <span class="forn-oc-data">${Utils.formatDate(o.created_at)}</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <span class="forn-oc-valor">${Utils.formatCurrency(o.valor_total || 0)}</span>
              ${Components.badge(o.status)}
            </div>
          </div>`).join('') : `
          <div class="receb-empty" style="padding:20px;">
            <div class="receb-empty-text">Nenhuma ordem de compra encontrada.</div>
          </div>`}
      </div>`;
  },
};

window.Pages = Pages;
