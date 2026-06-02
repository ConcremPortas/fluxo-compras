/* ============================================================
   FLUXOCOMPRAS — Página: Configurações (Admin)
   ============================================================ */

var Pages = window.Pages || {};

Pages.Configuracoes = {
  abaAtiva:          'centros',
  alcadasConfig:     [],
  permissoesConfig:  {},
  _permRoleAtivo:    'solicitante',

  ROLE_LABELS: {
    admin: 'Administrador', solicitante: 'Solicitante', supervisor: 'Supervisor',
    gerente: 'Gerente', diretor: 'Diretor',
    almoxarife: 'Almoxarife', qualidade: 'Qualidade',
  },

  ROLE_COLORS: {
    admin: '#163864', solicitante: '#3b82f6', supervisor: '#8b5cf6',
    gerente: '#10b981', diretor: '#ef4444',
    almoxarife: '#f59e0b', qualidade: '#06b6d4',
  },

  TODAS_ROTAS: [
    { id: 'dashboard',     label: 'Dashboard' },
    { id: 'requisicoes',   label: 'Requisições' },
    { id: 'aprovacoes',    label: 'Aprovações' },
    { id: 'cotacoes',      label: 'Cotações' },
    { id: 'ordens',        label: 'Ordens de Compra' },
    { id: 'recebimento',   label: 'Recebimento' },
    { id: 'qualidade',     label: 'Qualidade' },
    { id: 'fornecedores',  label: 'Fornecedores' },
    { id: 'relatorios',    label: 'Relatórios' },
    { id: 'configuracoes', label: 'Configurações' },
  ],

  ROLES_EDITAVEIS: ['solicitante','supervisor','gerente','diretor','almoxarife','qualidade'],

  ALCADAS_PADRAO: [
    { nome: 'Supervisor',  valor_minimo: 0,      valor_maximo: 5000,   sem_limite_maximo: false },
    { nome: 'Gerente',     valor_minimo: 5001,   valor_maximo: 100000, sem_limite_maximo: false },
    { nome: 'Diretor',     valor_minimo: 100001, valor_maximo: 0,      sem_limite_maximo: true  },
  ],

  PERMISSIONS_PADRAO: {
    admin:       ['dashboard','requisicoes','aprovacoes','cotacoes','ordens','recebimento','qualidade','fornecedores','relatorios','configuracoes'],
    solicitante: ['dashboard','requisicoes'],
    supervisor:  ['dashboard','requisicoes','relatorios'],
    gerente:     ['dashboard','requisicoes','aprovacoes','cotacoes','ordens','fornecedores','relatorios'],
    diretor:     ['dashboard','aprovacoes','relatorios'],
    almoxarife:  ['recebimento'],
    qualidade:   ['qualidade'],
  },

  /* ----------------------------------------------------------
     RENDER PRINCIPAL
  ---------------------------------------------------------- */
  async render() {
    document.title = 'Fluxo Compras — Configurações';
    App.setPageTitle('Configurações');

    const user    = App.currentUser;
    const isAdmin = user?.role === 'admin';
    const isLider = !isAdmin && Permissoes._isLiderDeGrupo();

    if (!isAdmin && !isLider && !Permissoes.pode('configuracoes', 'configurar')) {
      Components.Toast.error('Você não tem permissão para acessar Configurações.');
      App.navigate('dashboard');
      return;
    }

    document.getElementById('main-content').innerHTML = `
      ${Components.pageHeader({
        title:    'Configurações',
        subtitle: isLider
          ? 'Configure permissões individuais para os usuários do seu grupo'
          : 'Permissões de acesso por perfil',
      })}
      <div id="tab-permissoes"></div>`;

    await this.carregarAbaPermissoes(isLider);
  },

  /* ============================================================
     ABA 1 — CENTROS DE CUSTO
     ============================================================ */
  async carregarAbaCentros() {
    const painel = document.getElementById('tab-centros');
    if (!painel) return;

    try {
      const centros = await Storage.list(TABLES.centrosCusto, { order: { column: 'nome' } });
      this._centrosTodos = centros || [];

      const grupos = [...new Set((centros || []).map(c => c.grupo).filter(Boolean))].sort();

      painel.innerHTML = `
        <div class="cfg-aba-header">
          <div>
            <div class="cfg-aba-title">Centros de Custo</div>
            <div class="cfg-aba-sub">Gerencie os centros de custo disponíveis para requisições</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <button class="btn btn-secondary" id="btn-template-cc" style="font-size:13px;font-weight:600;">📋 Modelo CSV</button>
            <button class="btn btn-secondary" id="btn-importar-cc" style="font-size:13px;font-weight:600;">📥 Importar CSV</button>
            <input type="file" id="input-csv-cc" accept=".csv" style="display:none;">
            <button class="btn btn-primary" id="btn-novo-cc">＋ Novo Centro de Custo</button>
          </div>
        </div>

        <!-- Filtros -->
        <div class="req-filters-card" style="margin-bottom:16px;position:relative;z-index:100;overflow:visible;">
          <div class="req-search-wrap" style="flex:1;min-width:200px;">
            <span class="req-search-icon">🔍</span>
            <input type="text" class="req-search-input" id="cc-busca"
              placeholder="Buscar por código ou nome..." autocomplete="off" />
          </div>
          <div id="cs-cc-grupo" style="min-width:180px;"></div>
          <div id="cs-cc-status" style="min-width:140px;"></div>
          <span style="font-size:13px;color:#718096;white-space:nowrap;" id="cc-count">— registros</span>
        </div>

        <div style="overflow-x:auto;" id="cc-tabela-wrap">
          <table class="cfg-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nome</th>
                <th>Grupo</th>
                <th style="text-align:center;">Status</th>
                <th style="text-align:center;">Ações</th>
              </tr>
            </thead>
            <tbody id="cc-tbody"></tbody>
          </table>
        </div>`;

      // CustomSelect — Grupo
      this._csCCGrupo = CustomSelect.criar(
        document.getElementById('cs-cc-grupo'),
        [{ value: '', label: 'Todos os grupos' }].concat(grupos.map(g => ({ value: g, label: g }))),
        { placeholder: 'Todos os grupos', busca: true, limpar: false, rodape: false, value: '',
          onChange: () => this._filtrarCC() }
      );

      // CustomSelect — Status
      this._csCCStatus = CustomSelect.criar(
        document.getElementById('cs-cc-status'),
        [
          { value: '',     label: 'Todos' },
          { value: 'true', label: 'Ativos',   dotColor: '#10b981' },
          { value: 'false',label: 'Inativos', dotColor: '#ef4444' },
        ],
        { placeholder: 'Todos', busca: false, limpar: false, rodape: false, value: '',
          onChange: () => this._filtrarCC() }
      );

      document.getElementById('cc-busca')
        ?.addEventListener('input', () => this._filtrarCC());

      this._filtrarCC();

      document.getElementById('btn-novo-cc')
        ?.addEventListener('click', () => this.abrirDialogCC());

      document.getElementById('btn-importar-cc')
        ?.addEventListener('click', () => document.getElementById('input-csv-cc')?.click());

      document.getElementById('input-csv-cc')
        ?.addEventListener('change', async (e) => {
          const file = e.target.files?.[0];
          if (file) await Pages.Configuracoes._importarCSVCentros(file);
          e.target.value = '';
        });

      document.getElementById('btn-template-cc')?.addEventListener('click', () => {
        const template =
          'codigo,nome,grupo\n' +
          'ADM,Administrativo,Gestão\n' +
          'COM,Comercial,Vendas\n' +
          'FIN,Financeiro,Gestão\n' +
          'TI,Tecnologia,Operacional\n' +
          'OPR,Operacional,Operacional';
        const blob = new Blob(['﻿' + template], { type: 'text/csv;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = 'modelo_centros_custo.csv'; a.click();
        URL.revokeObjectURL(url);
      });

      this._bindBotoesCC();
    } catch (e) {
      painel.innerHTML = `<p style="padding:24px;color:#718096;font-family:'Manrope',sans-serif;">Erro: ${Utils.escapeHtml(e.message)}</p>`;
    }
  },

  _filtrarCC() {
    const busca  = (document.getElementById('cc-busca')?.value || '').toLowerCase().trim();
    const grupo  = this._csCCGrupo?.getValue()  || '';
    const status = this._csCCStatus?.getValue() || '';

    const filtrados = (this._centrosTodos || []).filter(cc => {
      const matchBusca  = !busca  || (cc.nome  || '').toLowerCase().includes(busca)
                                  || (cc.codigo || '').toLowerCase().includes(busca);
      const matchGrupo  = !grupo  || cc.grupo === grupo;
      const matchStatus = !status || String(cc.ativo !== false) === status;
      return matchBusca && matchGrupo && matchStatus;
    });

    const tbody = document.getElementById('cc-tbody');
    const count = document.getElementById('cc-count');
    if (count) count.textContent = `${filtrados.length} registro${filtrados.length !== 1 ? 's' : ''}`;

    if (!tbody) return;

    if (!filtrados.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:#A0AEC0;font-size:13px;">Nenhum resultado encontrado.</td></tr>`;
      return;
    }

    tbody.innerHTML = this._renderLinhasCC(filtrados);
    this._bindBotoesCC();
  },

  _bindBotoesCC() {
    const painel = document.getElementById('tab-centros');
    if (!painel) return;
    painel.querySelectorAll('.btn-editar-cc').forEach(btn =>
      btn.addEventListener('click', () => this.abrirDialogCC(btn.dataset.id))
    );
    painel.querySelectorAll('.btn-toggle-cc').forEach(btn =>
      btn.addEventListener('click', () =>
        this.toggleAtivacaoCC(btn.dataset.id, btn.dataset.ativo === 'true')
      )
    );
  },

  _renderLinhasCC(centros) {
    // Agrupar por grupo, ordenando grupos sem nome por último
    const grupos = {};
    centros.forEach(cc => {
      const g = cc.grupo || '— Sem grupo —';
      if (!grupos[g]) grupos[g] = [];
      grupos[g].push(cc);
    });

    const keys = Object.keys(grupos).sort((a, b) => {
      if (a === '— Sem grupo —') return 1;
      if (b === '— Sem grupo —') return -1;
      return a.localeCompare(b, 'pt-BR');
    });

    return keys.map(grupo => {
      const linhas = grupos[grupo].map(cc => this._linhaCC(cc)).join('');
      return `
        <tr>
          <td colspan="5" style="background:#f8fafc;padding:6px 12px;font-size:11px;
              font-weight:700;color:hsl(142,55%,25%);text-transform:uppercase;
              letter-spacing:.06em;border-top:2px solid #e2e8f0;">
            📁 ${Utils.escapeHtml(grupo)}
          </td>
        </tr>
        ${linhas}`;
    }).join('');
  },

  _linhaCC(cc) {
    const ativo = cc.ativo !== false;
    return `
      <tr>
        <td>
          <span class="cfg-codigo-badge">${Utils.escapeHtml(cc.codigo || cc.numero || '—')}</span>
        </td>
        <td style="font-weight:600;">${Utils.escapeHtml(cc.nome || '—')}</td>
        <td style="color:#64748b;font-size:13px;">${Utils.escapeHtml(cc.grupo || '—')}</td>
        <td style="text-align:center;">${Components.badge(ativo ? 'Ativo' : 'Inativo')}</td>
        <td style="text-align:center;">
          <div style="display:flex;justify-content:center;gap:4px;">
            <button class="cfg-btn-acao btn-editar-cc" data-id="${cc.id}" title="Editar">✏️</button>
            <button class="cfg-btn-acao danger btn-toggle-cc"
              data-id="${cc.id}" data-ativo="${ativo}"
              title="${ativo ? 'Inativar' : 'Ativar'}">
              ${ativo ? '🔒' : '🔓'}
            </button>
          </div>
        </td>
      </tr>`;
  },

  async abrirDialogCC(id = null) {
    const todos = await Storage.list(TABLES.centrosCusto).catch(() => []);
    const grupos = [...new Set((todos || []).map(c => c.grupo).filter(Boolean))];

    // Gerar código automático para novo CC
    let codigoAuto = '';
    if (!id) {
      const codigos = (todos || [])
        .map(c => parseInt((c.codigo || '').replace(/\D/g, ''), 10))
        .filter(n => !isNaN(n));
      const maximo = codigos.length > 0 ? Math.max(...codigos) : 0;
      codigoAuto = String(maximo + 1).padStart(6, '0');
    }

    Components.Modal.show({
      title:   id ? 'Editar Centro de Custo' : 'Novo Centro de Custo',
      content: this._formCC(grupos, codigoAuto),
      size:    'sm',
      footer: `
        <button class="drawer-btn-cancelar" id="btn-cancelar-cc">Cancelar</button>
        <button class="drawer-btn-salvar"   id="btn-salvar-cc">Salvar</button>`,
    });

    if (id) {
      Storage.get(TABLES.centrosCusto, id).then(cc => {
        if (!cc) return;
        document.getElementById('cc-codigo').value  = cc.codigo || '';
        document.getElementById('cc-nome').value    = cc.nome   || '';
        document.getElementById('cc-grupo').value   = cc.grupo  || '';
        document.getElementById('cc-ativo').checked = !!cc.ativo;
      }).catch(() => {});
    }

    document.getElementById('btn-cancelar-cc')
      ?.addEventListener('click', () => Components.Modal.hide());
    document.getElementById('btn-salvar-cc')
      ?.addEventListener('click', () => this.salvarCC(id));
  },

  _formCC(grupos = [], codigoInicial = '') {
    const optsGrupo = [...new Set(grupos.filter(Boolean))].sort().map(g =>
      `<option value="${Utils.escapeHtml(g)}">${Utils.escapeHtml(g)}</option>`
    ).join('');
    return `
      <div class="drawer-form-row">
        <div class="drawer-field">
          <label class="drawer-label">Código</label>
          <input type="text" id="cc-codigo" class="drawer-input" placeholder="Auto-gerado"
            maxlength="20" value="${Utils.escapeHtml(codigoInicial)}">
        </div>
        <div class="drawer-field">
          <label class="drawer-label">Nome <span class="required">*</span></label>
          <input type="text" id="cc-nome" class="drawer-input" placeholder="Nome do centro de custo">
        </div>
      </div>
      <div class="drawer-field">
        <label class="drawer-label">Grupo</label>
        <input type="text" id="cc-grupo" class="drawer-input" placeholder="Ex: Administrativo, Produção..."
          list="cc-grupos-list" autocomplete="off">
        <datalist id="cc-grupos-list">
          ${optsGrupo}
        </datalist>
      </div>
      <div class="drawer-field">
        <label class="drawer-check-row">
          <input type="checkbox" id="cc-ativo" checked>
          <span class="drawer-check-label">Centro de custo ativo</span>
        </label>
      </div>`;
  },

  async salvarCC(id = null) {
    const codigo = document.getElementById('cc-codigo')?.value.trim();
    const nome   = document.getElementById('cc-nome')?.value.trim();
    const grupo  = document.getElementById('cc-grupo')?.value.trim() || null;
    const ativo  = document.getElementById('cc-ativo')?.checked ?? true;

    if (!nome) { Components.Toast.warning('Informe o nome.'); return; }

    const btn = document.getElementById('btn-salvar-cc');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Salvando...'; }

    try {
      if (id) {
        const { error } = await _sb.from(TABLES.centrosCusto).update({ codigo, nome, grupo, ativo }).eq('id', id);
        if (error) throw new Error(error.message);
        Components.Toast.success('Centro de custo atualizado!');
      } else {
        const { error } = await _sb.from(TABLES.centrosCusto).insert({ codigo, nome, grupo, ativo: true });
        if (error) throw new Error(error.message);
        Components.Toast.success('Centro de custo criado!');
      }
      Components.Modal.hide();
      await this.carregarAbaCentros();
    } catch (e) {
      console.error('[CC salvar]', e);
      Components.Toast.error('Erro ao salvar: ' + (e.message || e));
      if (btn) { btn.disabled = false; btn.textContent = 'Salvar'; }
    }
  },

  toggleAtivacaoCC(id, ativoAtual) {
    Components.Modal.confirm({
      title:        ativoAtual ? 'Inativar centro de custo' : 'Ativar centro de custo',
      message:      `Deseja realmente ${ativoAtual ? 'inativar' : 'ativar'} este centro de custo?`,
      danger:       ativoAtual,
      type:         ativoAtual ? 'danger' : 'success',
      icon:         ativoAtual ? '🔒' : '🔓',
      confirmLabel: ativoAtual ? 'Inativar' : 'Ativar',
      onConfirm: async () => {
        try {
          await Storage.update(TABLES.centrosCusto, id, { ativo: !ativoAtual });
          Components.Toast.success(`Centro de custo ${ativoAtual ? 'inativado' : 'ativado'}!`);
          await this.carregarAbaCentros();
        } catch (e) {
          Components.Toast.error('Erro: ' + e.message);
        }
      },
    });
  },

  /* ============================================================
     IMPORTAÇÃO CSV — CENTROS DE CUSTO
     ============================================================ */
  async _importarCSVCentros(file) {
    // Tentar UTF-8 primeiro; se parecer mal-codificado, tenta latin1
    const lerArquivo = (enc) => new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload  = e => res(e.target.result);
      reader.onerror = rej;
      reader.readAsText(file, enc);
    });

    let texto = await lerArquivo('UTF-8');
    // Detectar double-encoding (UTF-8 lido como Latin-1 e re-codificado)
    if (texto.includes('Ã§') || texto.includes('Ã£') || texto.includes('Ã©')) {
      texto = await lerArquivo('windows-1252');
    }

    // Parser CSV que respeita campos entre aspas (com vírgulas internas)
    const parseCsvLinha = (linha, sep) => {
      const fields = [];
      let cur = '', inQuote = false;
      for (let i = 0; i < linha.length; i++) {
        const c = linha[i];
        if (c === '"') { inQuote = !inQuote; }
        else if (c === sep && !inQuote) { fields.push(cur.trim()); cur = ''; }
        else { cur += c; }
      }
      fields.push(cur.trim());
      return fields;
    };

    const linhasRaw = texto.split('\n').filter(l => l.trim());
    const sep       = linhasRaw[0].includes(';') ? ';' : ',';
    const linhas    = linhasRaw.map(l => parseCsvLinha(l, sep));

    if (linhas.length < 2) { Components.Toast.error('CSV inválido ou vazio.'); return; }

    const normalizar = h => h.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    const header = linhas[0].map(normalizar);

    const idxCodigo = header.indexOf('codigo');
    const idxNome   = header.indexOf('nome');
    const idxGrupo  = header.indexOf('grupo');

    if (idxNome === -1) {
      Components.Toast.error('Coluna "nome" não encontrada no CSV.');
      return;
    }

    const existentes = await Storage.list(TABLES.centrosCusto).catch(() => []);
    const mapCodigo  = {};
    (existentes || []).forEach(cc => {
      const chave = (cc.codigo || cc.numero || '');
      if (chave) mapCodigo[chave.toUpperCase()] = cc;
    });

    // Montar registros
    const registros = linhas.slice(1)
      .filter(l => l.some(c => c))
      .map(l => ({
        codigo: idxCodigo >= 0 ? (l[idxCodigo] || '').trim().toUpperCase() : '',
        nome:   (l[idxNome] || '').trim(),
        grupo:  idxGrupo >= 0 ? (l[idxGrupo] || '').trim() || null : null,
      }))
      .filter(r => r.nome);

    const novosReg     = registros.filter(r => !r.codigo || !mapCodigo[r.codigo]);
    const atualizReg   = registros.filter(r =>  r.codigo &&  mapCodigo[r.codigo]);

    Components.Modal.show({
      title:   '📥 Importar Centros de Custo',
      size:    'sm',
      content: `
        <div style="text-align:center;padding:8px 0 16px;">
          <div style="display:flex;gap:16px;justify-content:center;margin-bottom:16px;">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 20px;min-width:70px;">
              <div style="font-size:28px;font-weight:800;color:hsl(142,70%,28%);">${registros.length}</div>
              <div style="font-size:11px;color:#64748b;font-weight:600;">Total</div>
            </div>
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 20px;min-width:70px;">
              <div style="font-size:28px;font-weight:800;color:#1d4ed8;">${novosReg.length}</div>
              <div style="font-size:11px;color:#64748b;font-weight:600;">Novos</div>
            </div>
            <div style="background:#fefce8;border:1px solid #fef08a;border-radius:10px;padding:14px 20px;min-width:70px;">
              <div style="font-size:28px;font-weight:800;color:#a16207;">${atualizReg.length}</div>
              <div style="font-size:11px;color:#64748b;font-weight:600;">Atualizados</div>
            </div>
          </div>
          <p style="font-size:12px;color:#64748b;margin:4px 0;">🔄 Centros com mesmo código serão atualizados.</p>
          <p style="font-size:12px;color:#64748b;margin:4px 0;">✅ Novos centros serão criados como ativos em lote.</p>
        </div>`,
      footer: `
        <button class="drawer-btn-cancelar" id="btn-cancelar-import-cc">Cancelar</button>
        <button class="drawer-btn-salvar"   id="btn-confirmar-import-cc">✅ Confirmar Importação</button>`,
    });

    const BATCH = 100;
    const executar = async () => {
      let criados = 0, atualizadosCount = 0, erros = 0;

      // Inserir novos em lotes de 100
      for (let i = 0; i < novosReg.length; i += BATCH) {
        const lote = novosReg.slice(i, i + BATCH).map(r => ({
          codigo: r.codigo, nome: r.nome, grupo: r.grupo, ativo: true,
        }));
        try {
          const { error } = await _sb.from(TABLES.centrosCusto).insert(lote);
          if (error) { erros += lote.length; console.warn('[CC import]', error.message); }
          else { criados += lote.length; }
        } catch(e) { erros += lote.length; }
      }

      // Atualizar existentes individualmente
      for (const r of atualizReg) {
        try {
          const cc = mapCodigo[r.codigo];
          await Storage.update(TABLES.centrosCusto, cc.id, { nome: r.nome, grupo: r.grupo, codigo: r.codigo, ativo: true });
          atualizadosCount++;
        } catch(e) { erros++; }
      }

      Components.Toast.success(
        `✅ Concluído! ${criados} criados, ${atualizadosCount} atualizados` +
        (erros > 0 ? `, ${erros} erros` : '')
      );
      await this.carregarAbaCentros();
    };

    document.getElementById('btn-cancelar-import-cc')
      ?.addEventListener('click', () => Components.Modal.hide());
    document.getElementById('btn-confirmar-import-cc')
      ?.addEventListener('click', () => { Components.Modal.hide(); executar(); });
  },

  /* ============================================================
     ABA — FLUXO DE APROVAÇÕES
     ============================================================ */
  async carregarAbaFluxo() {
    document.title = 'Fluxo Compras — Fluxo de Aprovação';
    App.setPageTitle('Fluxo de Aprovação');

    const container = document.getElementById('main-content');
    if (!container) return;

    if (!Permissoes.pode('configuracoes', 'configurar')) {
      Components.Toast.error('Você não tem permissão para acessar Fluxo de Aprovação.');
      App.navigate('dashboard');
      return;
    }

    container.innerHTML = `
      <div class="page-header" style="margin-bottom:20px;">
        <div class="page-header-info">
          <h1 style="font-size:24px;font-weight:800;color:#1a202c;letter-spacing:-0.5px;margin-bottom:3px;">
            Fluxo de Aprovações
          </h1>
          <p style="font-size:13px;color:#718096;">Configure as etapas de aprovação por alçada de valor</p>
        </div>
      </div>
      <div id="fluxo-cards"></div>`;

    const rows = await Storage.list(TABLES.configFluxoAprovacao).catch(() => []) || [];
    const configMap = {};
    (rows || []).forEach(r => { configMap[r.alcada] = r; });

    const ALCADAS = ['Supervisor', 'Gerente', 'Diretor'];
    const ROLES = [
      { value: 'supervisor', label: 'Supervisor' },
      { value: 'gerente',    label: 'Gerente' },
      { value: 'diretor',    label: 'Diretor' },
    ];

    const cards = document.getElementById('fluxo-cards');
    if (!cards) return;

    cards.innerHTML = ALCADAS.map(alcada => {
      const cfg = configMap[alcada] || {
        alcada,
        etapa1_role: 'gerente', etapa1_label: 'Aprovação do Gerente',
        etapa2_role: 'diretor', etapa2_label: 'Aprovação da Diretoria',
        usa_dupla_aprovacao: alcada !== 'Diretor',
      };
      const isDiretor = alcada === 'Diretor';
      const dupla = cfg.usa_dupla_aprovacao;

      return `
        <div class="cfg-card" id="fluxo-card-${alcada.toLowerCase()}"
             style="background:white;border:1.5px solid #E2E8F0;border-radius:12px;padding:20px 24px;margin-bottom:16px;">

          <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;border-bottom:1px solid #F0F4F0;padding-bottom:14px;">
            <span style="font-size:20px;">${alcada === 'Supervisor' ? '👤' : alcada === 'Gerente' ? '⭐' : alcada === 'Diretor' ? '🏛️' : '🎯'}</span>
            <div>
              <div style="font-size:15px;font-weight:800;color:#1a202c;font-family:'Manrope',sans-serif;">Alçada ${Utils.escapeHtml(alcada)}</div>
              <div style="font-size:12px;color:#94a3b8;font-family:'Manrope',sans-serif;">Requisições desta alçada seguirão este fluxo</div>
            </div>
            ${isDiretor ? '<span style="font-size:11px;font-weight:700;background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:10px;margin-left:auto;">Etapa única — fixo</span>' : ''}
          </div>

          ${!isDiretor ? `
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
            <label class="drawer-check-row" style="cursor:pointer;">
              <input type="checkbox" id="fluxo-dupla-${alcada.toLowerCase()}"
                ${dupla ? 'checked' : ''}
                onchange="Pages.Configuracoes._toggleDuplaAprovacao('${alcada}')">
              <span class="drawer-check-label">Usar 2 etapas de aprovação</span>
            </label>
          </div>` : ''}

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;" id="fluxo-etapas-${alcada.toLowerCase()}">
            <!-- Etapa 1 -->
            <div style="background:#F8FAFC;border-radius:8px;padding:14px;">
              <div style="font-size:12px;font-weight:700;color:#3b82f6;font-family:'Manrope',sans-serif;
                          margin-bottom:10px;display:flex;align-items:center;gap:6px;">
                <span style="background:#3b82f6;color:white;border-radius:50%;width:18px;height:18px;
                              display:inline-flex;align-items:center;justify-content:center;font-size:10px;">1</span>
                ${isDiretor ? 'Aprovação' : 'Primeira Etapa'}
              </div>
              <div class="drawer-field" style="margin-bottom:8px;">
                <label class="drawer-label">Role do aprovador</label>
                <select class="drawer-select" id="fluxo-e1role-${alcada.toLowerCase()}">
                  ${ROLES.map(r => `<option value="${r.value}" ${cfg.etapa1_role === r.value ? 'selected' : ''}>${r.label}</option>`).join('')}
                </select>
              </div>
              <div class="drawer-field">
                <label class="drawer-label">Label da etapa</label>
                <input type="text" class="drawer-input" id="fluxo-e1label-${alcada.toLowerCase()}"
                  value="${Utils.escapeHtml(cfg.etapa1_label || '')}"
                  placeholder="Ex: Aprovação do Coordenador">
              </div>
            </div>

            <!-- Etapa 2 (oculta para Diretor ou quando dupla desabilitada) -->
            <div style="background:#F8FAFC;border-radius:8px;padding:14px;${isDiretor || !dupla ? 'opacity:0.4;pointer-events:none;' : ''}"
                 id="fluxo-etapa2-${alcada.toLowerCase()}">
              <div style="font-size:12px;font-weight:700;color:#8b5cf6;font-family:'Manrope',sans-serif;
                          margin-bottom:10px;display:flex;align-items:center;gap:6px;">
                <span style="background:#8b5cf6;color:white;border-radius:50%;width:18px;height:18px;
                              display:inline-flex;align-items:center;justify-content:center;font-size:10px;">2</span>
                Segunda Etapa
              </div>
              <div class="drawer-field" style="margin-bottom:8px;">
                <label class="drawer-label">Role do aprovador</label>
                <select class="drawer-select" id="fluxo-e2role-${alcada.toLowerCase()}">
                  ${ROLES.map(r => `<option value="${r.value}" ${cfg.etapa2_role === r.value ? 'selected' : ''}>${r.label}</option>`).join('')}
                </select>
              </div>
              <div class="drawer-field">
                <label class="drawer-label">Label da etapa</label>
                <input type="text" class="drawer-input" id="fluxo-e2label-${alcada.toLowerCase()}"
                  value="${Utils.escapeHtml(cfg.etapa2_label || '')}"
                  placeholder="Ex: Aprovação do Gerente">
              </div>
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end;margin-top:14px;padding-top:14px;border-top:1px solid #F0F4F0;">
            <button class="drawer-btn-salvar" style="padding:8px 18px;font-size:13px;"
                    onclick="Pages.Configuracoes._salvarFluxo('${alcada}', ${isDiretor})">
              💾 Salvar
            </button>
          </div>
        </div>`;
    }).join('');
  },

  _toggleDuplaAprovacao(alcada) {
    const chk   = document.getElementById('fluxo-dupla-' + alcada.toLowerCase());
    const el    = document.getElementById('fluxo-etapa2-' + alcada.toLowerCase());
    if (!el) return;
    const dupla = chk?.checked;
    el.style.opacity       = dupla ? '1'    : '0.4';
    el.style.pointerEvents = dupla ? ''     : 'none';
  },

  async _salvarFluxo(alcada, isDiretor) {
    const al = alcada.toLowerCase();
    const payload = {
      alcada,
      etapa1_role:           document.getElementById('fluxo-e1role-'  + al)?.value  || null,
      etapa1_label:          document.getElementById('fluxo-e1label-' + al)?.value.trim() || null,
      etapa2_role:           isDiretor ? null : (document.getElementById('fluxo-e2role-'  + al)?.value  || null),
      etapa2_label:          isDiretor ? null : (document.getElementById('fluxo-e2label-' + al)?.value.trim() || null),
      usa_dupla_aprovacao:   isDiretor ? false : (document.getElementById('fluxo-dupla-'  + al)?.checked ?? true),
      updated_at:            new Date().toISOString(),
    };

    try {
      // Verificar se já existe registro para esta alçada
      const rows = await Storage.list(TABLES.configFluxoAprovacao).catch(() => []);
      const existente = (rows || []).find(r => r.alcada === alcada);

      if (existente) {
        await Storage.update(TABLES.configFluxoAprovacao, existente.id, payload);
      } else {
        await Storage.create(TABLES.configFluxoAprovacao, payload);
      }

      await FluxoAprovacao.carregar();
      Components.Toast.success('Fluxo de aprovação salvo para alçada ' + alcada + '!');
    } catch(e) {
      console.error('[FluxoConfig]', e);
      Components.Toast.error('Erro ao salvar: ' + e.message);
    }
  },

  /* ============================================================
     ABA 2 — ALÇADAS
     ============================================================ */
  async carregarAbaAlcadas() {
    const painel = document.getElementById('tab-alcadas');
    if (!painel) return;

    try {
      const configs = await Storage.list(TABLES.configAlcadas);
      this.alcadasConfig = Array.isArray(configs[0]?.alcadas)
        ? configs[0].alcadas
        : [...this.ALCADAS_PADRAO];
    } catch {
      this.alcadasConfig = [...this.ALCADAS_PADRAO];
    }

    this._renderTabelaAlcadas(painel);
  },

  _renderTabelaAlcadas(painel) {
    if (!painel) painel = document.getElementById('tab-alcadas');
    if (!painel) return;

    const total = this.alcadasConfig.length;
    painel.innerHTML = `
      <div class="cfg-aba-header">
        <div>
          <div class="cfg-aba-title">Alçadas de Aprovação</div>
          <div class="cfg-aba-sub">Total: ${total} alçada${total !== 1 ? 's' : ''} cadastrada${total !== 1 ? 's' : ''}</div>
        </div>
        <button class="btn btn-primary" id="btn-nova-alcada">＋ Nova Alçada</button>
      </div>
      <div style="overflow-x:auto;">
        <table class="cfg-table">
          <thead>
            <tr>
              <th>Nível</th>
              <th>Valor Mínimo</th>
              <th>Valor Máximo</th>
              <th style="text-align:center;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${total
              ? this.alcadasConfig.map((a, i) => this._linhaAlcada(a, i)).join('')
              : `<tr><td colspan="4" style="text-align:center;padding:32px;color:#A0AEC0;font-size:13px;font-family:'Manrope',sans-serif;">Nenhuma alçada cadastrada.</td></tr>`}
          </tbody>
        </table>
      </div>`;

    document.getElementById('btn-nova-alcada')
      ?.addEventListener('click', () => this._abrirDrawerAlcada());
    painel.querySelectorAll('.btn-editar-alcada').forEach(btn =>
      btn.addEventListener('click', () => this._abrirDrawerAlcada(Number(btn.dataset.index)))
    );
    painel.querySelectorAll('.btn-excluir-alcada').forEach(btn =>
      btn.addEventListener('click', () => this._excluirAlcada(Number(btn.dataset.index)))
    );
  },

  _linhaAlcada(a, i) {
    const cor    = this.ROLE_COLORS[a.nome.toLowerCase()] || '#64748b';
    const minFmt = Utils.formatCurrency(a.valor_minimo || 0);
    const maxFmt = a.sem_limite_maximo ? 'Sem limite' : Utils.formatCurrency(a.valor_maximo || 0);
    return `
      <tr>
        <td>
          <span class="role-pill" style="--role-color:${cor};">${Utils.escapeHtml(a.nome)}</span>
        </td>
        <td style="font-size:13px;color:#374151;">${minFmt}</td>
        <td style="font-size:13px;color:${a.sem_limite_maximo ? '#9ca3af' : '#374151'};">${maxFmt}</td>
        <td style="text-align:center;">
          <div style="display:flex;gap:6px;justify-content:center;">
            <button class="cfg-btn-acao btn-editar-alcada" data-index="${i}" title="Editar">✏️</button>
            <button class="cfg-btn-acao btn-excluir-alcada" data-index="${i}" title="Excluir"
              style="color:#ef4444;">🗑️</button>
          </div>
        </td>
      </tr>`;
  },

  _abrirDrawerAlcada(index) {
    const editando = index !== undefined;
    const a        = editando ? { ...this.alcadasConfig[index] } : { nome: '', valor_minimo: 0, valor_maximo: 0, sem_limite_maximo: false };

    Components.Modal.show({
      title:   editando ? `Editar Alçada — ${a.nome}` : 'Nova Alçada',
      content: `
        <div class="drawer-form-row">
          <div class="drawer-field">
            <label class="drawer-label">Nome da Alçada *</label>
            <input class="drawer-input" id="alc-nome" type="text"
              placeholder="Ex: Supervisor, Gerente..." value="${Utils.escapeHtml(a.nome)}" />
          </div>
        </div>
        <div class="drawer-form-row">
          <div class="drawer-field">
            <label class="drawer-label">Valor Mínimo (R$) *</label>
            <input class="drawer-input" id="alc-min" type="number" min="0" step="100"
              value="${a.valor_minimo || 0}" />
          </div>
          <div class="drawer-field">
            <label class="drawer-label">Valor Máximo (R$)</label>
            <input class="drawer-input" id="alc-max" type="number" min="0" step="100"
              value="${a.valor_maximo || 0}" ${a.sem_limite_maximo ? 'disabled style="opacity:0.4"' : ''} />
          </div>
        </div>
        <div class="drawer-check-row">
          <input type="checkbox" id="alc-sem-limite" ${a.sem_limite_maximo ? 'checked' : ''}
            style="width:15px;height:15px;cursor:pointer;accent-color:hsl(142,93%,20%);flex-shrink:0;" />
          <label for="alc-sem-limite" style="font-size:13px;color:#374151;cursor:pointer;">
            Sem limite máximo (cobre todos os valores acima do mínimo)
          </label>
        </div>`,
      footer: `
        <button class="drawer-btn-cancelar" id="btn-alc-cancelar">Cancelar</button>
        <button class="drawer-btn-salvar"   id="btn-alc-salvar">${editando ? '💾 Salvar' : '＋ Cadastrar'}</button>`,
    });

    const cbSemLimite = document.getElementById('alc-sem-limite');
    const inputMax    = document.getElementById('alc-max');
    cbSemLimite?.addEventListener('change', () => {
      inputMax.disabled     = cbSemLimite.checked;
      inputMax.style.opacity = cbSemLimite.checked ? '0.4' : '1';
    });

    document.getElementById('btn-alc-cancelar')?.addEventListener('click', () => Components.Modal.hide());
    document.getElementById('btn-alc-salvar')?.addEventListener('click',   () => this._salvarDrawerAlcada(index));
  },

  async _salvarDrawerAlcada(index) {
    const nome      = document.getElementById('alc-nome')?.value.trim();
    const min       = parseFloat(document.getElementById('alc-min')?.value) || 0;
    const max       = parseFloat(document.getElementById('alc-max')?.value) || 0;
    const semLimite = document.getElementById('alc-sem-limite')?.checked || false;

    if (!nome) { Components.Toast.warning('Informe o nome da alçada.'); return; }

    const editando  = index !== undefined;
    const nomeDuplo = this.alcadasConfig.some((a, i) =>
      a.nome.toLowerCase() === nome.toLowerCase() && i !== index
    );
    if (nomeDuplo) { Components.Toast.warning('Já existe uma alçada com esse nome.'); return; }

    const novaAlcada = { nome, valor_minimo: min, valor_maximo: semLimite ? 0 : max, sem_limite_maximo: semLimite };

    if (editando) {
      this.alcadasConfig[index] = novaAlcada;
    } else {
      this.alcadasConfig.push(novaAlcada);
    }

    const btn = document.getElementById('btn-alc-salvar');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Salvando...'; }

    try {
      await this._persistirAlcadas();
      Components.Modal.hide();
      Components.Toast.success(editando ? 'Alçada atualizada!' : 'Alçada cadastrada!');
      this._renderTabelaAlcadas();
    } catch (e) {
      if (editando) {
        this.alcadasConfig[index] = { nome, valor_minimo: min, valor_maximo: max, sem_limite_maximo: semLimite };
      } else {
        this.alcadasConfig.pop();
      }
      Components.Toast.error('Erro ao salvar: ' + e.message);
      if (btn) { btn.disabled = false; btn.textContent = editando ? '💾 Salvar' : '＋ Cadastrar'; }
    }
  },

  _excluirAlcada(index) {
    const a = this.alcadasConfig[index];
    if (!a) return;

    Components.Modal.confirm({
      title:        'Excluir Alçada',
      message:      `Deseja excluir a alçada "${a.nome}"? Esta ação não pode ser desfeita.`,
      danger:       true,
      icon:         '🗑️',
      confirmLabel: 'Excluir',
      onConfirm: async () => {
        const removida = this.alcadasConfig.splice(index, 1);
        try {
          await this._persistirAlcadas();
          Components.Toast.success(`Alçada "${a.nome}" excluída.`);
          this._renderTabelaAlcadas();
        } catch (e) {
          this.alcadasConfig.splice(index, 0, ...removida);
          Components.Toast.error('Erro ao excluir: ' + e.message);
        }
      },
    });
  },

  async _persistirAlcadas() {
    const configs = await Storage.list(TABLES.configAlcadas);
    const payload = {
      alcadas:    this.alcadasConfig,
      updated_at: new Date().toISOString(),
      updated_by: App.currentUser?.nome || 'admin',
    };
    if (configs.length > 0) {
      await Storage.update(TABLES.configAlcadas, configs[0].id, payload);
    } else {
      await Storage.create(TABLES.configAlcadas, payload);
    }
    this.atualizarCalcAlcada(this.alcadasConfig);

    // Recalcular alçada de todas as requisições pendentes de aprovação
    try {
      const STATUS_PENDENTES = [
        'Aguardando Aprovacao Etapa 1',
        'Aguardando Avaliacao de Compras',
        'Aguardando Aprovacao Etapa 2',
        'Aguardando Aprovacao da Diretoria',
        'Devolvida ao Solicitante',
        'Rascunho',
      ];
      const reqs = await Storage.list(TABLES.requisicoes).catch(() => []);
      const pendentes = (reqs || []).filter(r => STATUS_PENDENTES.includes(r.status));
      let atualizadas = 0;
      for (const req of pendentes) {
        const novaAlcada = Utils.calcAlcada(req.valor_total || 0);
        if (novaAlcada !== req.alcada_aprovacao) {
          await Storage.update(TABLES.requisicoes, req.id, { alcada_aprovacao: novaAlcada });
          atualizadas++;
        }
      }
      if (atualizadas > 0) {
        Components.Toast.info(`${atualizadas} requisição(ões) com alçada recalculada.`);
      }
    } catch (e) {
      console.warn('[Alçadas] Erro ao recalcular requisições:', e.message);
    }
  },

  atualizarCalcAlcada(alcadas) {
    Utils.calcAlcada = function(valor) {
      for (const a of alcadas) {
        if (a.sem_limite_maximo && valor >= a.valor_minimo) return a.nome;
        if (valor >= a.valor_minimo && valor <= a.valor_maximo) return a.nome;
      }
      return 'Supervisor';
    };
  },

  /* ============================================================
     ABA 3 — PERMISSÕES GRANULARES
     ============================================================ */
  async carregarAbaPermissoes(modoLider = false) {
    const painel = document.getElementById('tab-permissoes');
    if (!painel) return;

    await Permissoes.carregar();

    // Líder de grupo: exibe apenas painel de overrides individuais filtrado pelo seu grupo
    if (modoLider) {
      painel.innerHTML = `
        <div class="cfg-aba-header">
          <div>
            <div class="cfg-aba-title">Permissões dos Usuários</div>
            <div class="cfg-aba-sub">Configure permissões individuais para os usuários do seu grupo</div>
          </div>
        </div>
        <div id="perm-painel-usuarios" style="margin-top:4px;"></div>`;
      this._renderPainelUsuarios(true);
      return;
    }

    // Admin / configurar: exibe subtabs completas
    painel.innerHTML = `
      <div class="cfg-aba-header">
        <div>
          <div class="cfg-aba-title">Controle de Permissões</div>
          <div class="cfg-aba-sub">Defina o que cada grupo e usuário pode fazer em cada tela do sistema</div>
        </div>
      </div>
      <div class="perm-subtabs">
        <button class="perm-subtab perm-subtab-active" data-subtab="grupos">Grupos (por perfil)</button>
        <button class="perm-subtab" data-subtab="usuarios">Usuários (override individual)</button>
      </div>
      <div id="perm-painel-grupos"></div>
      <div id="perm-painel-usuarios" style="display:none;margin-top:4px;"></div>`;

    painel.querySelectorAll('.perm-subtab').forEach(btn => {
      btn.addEventListener('click', () => {
        painel.querySelectorAll('.perm-subtab').forEach(b => b.classList.remove('perm-subtab-active'));
        btn.classList.add('perm-subtab-active');
        const isGrupos = btn.dataset.subtab === 'grupos';
        document.getElementById('perm-painel-grupos').style.display   = isGrupos ? '' : 'none';
        document.getElementById('perm-painel-usuarios').style.display = isGrupos ? 'none' : '';
        if (!isGrupos) this._renderPainelUsuarios(false);
      });
    });

    this._renderPainelGrupos();
  },

  _renderPainelGrupos() {
    const painel = document.getElementById('perm-painel-grupos');
    if (!painel) return;

    const roleAtual = this._permRoleAtivo || 'solicitante';

    painel.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin:16px 0 20px;flex-wrap:wrap;">
        <label style="font-size:13px;font-weight:600;color:#374151;white-space:nowrap;">Perfil:</label>
        <div id="cs-perm-role" style="width:220px;"></div>
        <div id="perm-role-badge-wrap" style="display:flex;align-items:center;gap:6px;"></div>
      </div>
      <div id="perm-grupo-matrix">${this._renderMatrizGrupo(roleAtual)}</div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px;">
        <button class="btn btn-secondary" id="btn-restaurar-grupo">🔄 Restaurar Padrão</button>
        <button class="btn btn-primary" id="btn-salvar-grupo">💾 Salvar Permissões do Grupo</button>
      </div>`;

    this._atualizarBadgeRole(roleAtual);

    this._csPermRole = CustomSelect.criar(
      document.getElementById('cs-perm-role'),
      this.ROLES_EDITAVEIS.map(r => ({
        value: r,
        label: this.ROLE_LABELS[r] || r,
        dotColor: this.ROLE_COLORS[r],
      })),
      {
        placeholder: 'Selecione o perfil...',
        busca: false,
        limpar: false,
        rodape: false,
        value: roleAtual,
        onChange: (val) => {
          this._permRoleAtivo = val;
          this._atualizarBadgeRole(val);
          document.getElementById('perm-grupo-matrix').innerHTML = this._renderMatrizGrupo(val);
        },
      }
    );

    document.getElementById('btn-salvar-grupo')?.addEventListener('click', () => this._salvarGrupo());
    document.getElementById('btn-restaurar-grupo')?.addEventListener('click', () => this._restaurarGrupoPadrao());
  },

  _atualizarBadgeRole(role) {
    const wrap = document.getElementById('perm-role-badge-wrap');
    if (!wrap) return;
    const cor   = this.ROLE_COLORS[role] || '#64748b';
    const label = this.ROLE_LABELS[role] || role;
    wrap.innerHTML = `
      <span class="role-pill" style="--role-color:${cor};">${Utils.escapeHtml(label)}</span>
      <span style="font-size:11px;color:#9ca3af;">${Utils.escapeHtml(role)}</span>`;
  },

  _renderMatrizGrupo(role, permsOverride) {
    const perms    = permsOverride || Permissoes.getGrupo(role);
    const TELAS    = Permissoes.TELAS_CONFIG;
    const ACOESALL = Permissoes.ACOES;
    const ALBL     = { ver: 'Ver', criar: 'Criar', editar: 'Editar', excluir: 'Excluir', aprovar: 'Aprovar', exportar: 'Exportar', configurar: 'Config.' };
    const cor      = this.ROLE_COLORS[role] || '#64748b';
    const label    = this.ROLE_LABELS[role] || role;

    return `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:var(--radius-md);margin-bottom:14px;">
        <div style="width:28px;height:28px;border-radius:50%;background:${cor};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">${Utils.escapeHtml(label.charAt(0).toUpperCase())}</div>
        <div>
          <span style="font-size:12px;color:#6b7280;">Editando permissões do grupo:</span>
          <span style="font-size:13px;font-weight:700;color:#374151;margin-left:4px;">${Utils.escapeHtml(label)}</span>
          <span style="font-size:11px;color:#9ca3af;margin-left:4px;">${Utils.escapeHtml(role)}</span>
        </div>
      </div>
      <div style="overflow-x:auto;">
        <table class="cfg-table perm-matrix-tbl">
          <thead>
            <tr>
              <th style="min-width:150px;text-align:left;">Tela</th>
              ${ACOESALL.map(a => `<th style="text-align:center;width:68px;">${ALBL[a]}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${TELAS.map(tela => {
              const tp = perms[tela.id] || {};
              return `
                <tr>
                  <td style="font-size:13px;font-weight:500;color:#374151;">${Utils.escapeHtml(tela.label)}</td>
                  ${ACOESALL.map(acao => {
                    if (!tela.acoes.includes(acao)) {
                      return `<td style="text-align:center;"><span style="color:#e2e8f0;font-size:11px;">—</span></td>`;
                    }
                    return `<td style="text-align:center;"><input type="checkbox" class="perm-matrix-cb" data-tela="${tela.id}" data-acao="${acao}" ${tp[acao] ? 'checked' : ''} style="width:15px;height:15px;cursor:pointer;accent-color:hsl(142,93%,20%);"></td>`;
                  }).join('')}
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  },

  async _salvarGrupo() {
    const role = this._permRoleAtivo || this._csPermRole?.getValue();
    if (!role) return;

    const perms = {};
    document.querySelectorAll('#perm-grupo-matrix .perm-matrix-cb').forEach(cb => {
      const { tela, acao } = cb.dataset;
      if (!perms[tela]) perms[tela] = {};
      if (cb.checked) perms[tela][acao] = true;
    });

    // Remove telas sem nenhuma permissão marcada
    Object.keys(perms).forEach(t => {
      if (!Object.values(perms[t]).some(Boolean)) delete perms[t];
    });

    const btn = document.getElementById('btn-salvar-grupo');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Salvando...'; }

    try {
      const grupos = { ...Permissoes._grupos, [role]: perms };
      await Permissoes.salvarGrupos(grupos);
      Components.Toast.success(`Permissões do grupo "${this.ROLE_LABELS[role] || role}" salvas com sucesso!`);
      // Força re-render da sidebar para refletir mudanças
      App._renderSidebar();
    } catch (e) {
      Components.Toast.error('Erro ao salvar: ' + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '💾 Salvar Permissões do Grupo'; }
    }
  },

  _restaurarGrupoPadrao() {
    const role = this._permRoleAtivo || this._csPermRole?.getValue();
    if (!role) return;

    Components.Modal.confirm({
      title:        'Restaurar Padrão',
      message:      `Restaurar as permissões padrão do grupo "${this.ROLE_LABELS[role] || role}"? As personalizações serão removidas.`,
      icon:         '🔄',
      confirmLabel: 'Restaurar',
      onConfirm: async () => {
        try {
          const grupos = { ...Permissoes._grupos };
          delete grupos[role];
          await Permissoes.salvarGrupos(grupos);
          document.getElementById('perm-grupo-matrix').innerHTML = this._renderMatrizGrupo(role);
          Components.Toast.success('Permissões restauradas para o padrão!');
          App._renderSidebar();
        } catch (e) {
          Components.Toast.error('Erro: ' + e.message);
        }
      },
    });
  },

  async _renderPainelUsuarios(modoLider = false) {
    const painel = document.getElementById('perm-painel-usuarios');
    if (!painel) return;

    painel.innerHTML = '<div style="padding:32px;color:#9ca3af;text-align:center;">Carregando...</div>';

    try {
      let usuarios = await Storage.getUsuarios().catch(() => []);

      if (modoLider) {
        const currentId = String(App.currentUser?.id);
        // Grupos que este usuário lidera
        const gruposLiderados = Object.keys(Permissoes._lideres).filter(role => {
          const lista = Permissoes._lideres[role];
          const arr = Array.isArray(lista) ? lista : (lista ? [lista] : []);
          return arr.some(uid => String(uid) === currentId);
        });
        // Apenas usuários dos grupos liderados, excluindo o próprio líder
        usuarios = usuarios.filter(u =>
          gruposLiderados.includes(u.role) && String(u.id) !== currentId
        );
      }

      this._todosUsuarios = usuarios;
      this._modoLider = modoLider;
      const overrides    = Permissoes._usuarios || {};
      const comOverride  = usuarios.filter(u => overrides[u.id] && Object.keys(overrides[u.id]).length > 0);

      painel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="font-size:13px;color:#6b7280;">${comOverride.length} usuário(s) com permissões individualizadas</div>
          <button class="btn btn-primary" id="btn-add-override">＋ Adicionar Override</button>
        </div>
        ${comOverride.length === 0
          ? `<div style="text-align:center;padding:48px 20px;">
              <div style="font-size:36px;margin-bottom:8px;">🔒</div>
              <div style="font-weight:600;color:#374151;margin-bottom:4px;">Nenhum override configurado</div>
              <div style="font-size:13px;color:#9ca3af;">Todos os usuários usam as permissões padrão do perfil.</div>
            </div>`
          : `<div style="overflow-x:auto;">
              <table class="cfg-table">
                <thead>
                  <tr>
                    <th>Usuário</th><th>Perfil</th><th>Telas com override</th>
                    <th style="text-align:center;">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${comOverride.map(u => `
                    <tr>
                      <td style="font-weight:500;">${Utils.escapeHtml(u.nome)}</td>
                      <td><span class="role-pill" style="--role-color:${this.ROLE_COLORS[u.role] || '#64748b'};">${this.ROLE_LABELS[u.role] || u.role}</span></td>
                      <td style="font-size:12px;color:#6b7280;">
                        ${Object.keys(overrides[u.id] || {}).map(t => {
                          const cfg = Permissoes.TELAS_CONFIG.find(x => x.id === t);
                          return cfg ? cfg.label : t;
                        }).join(', ')}
                      </td>
                      <td style="text-align:center;">
                        <div style="display:flex;gap:6px;justify-content:center;">
                          <button class="cfg-btn-acao btn-edit-override" data-uid="${u.id}" title="Editar">✏️</button>
                          <button class="cfg-btn-acao btn-remove-override" data-uid="${u.id}" title="Remover" style="color:#ef4444;">🗑️</button>
                        </div>
                      </td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>`}`;

      document.getElementById('btn-add-override')?.addEventListener('click', () =>
        this._abrirModalOverride(null, usuarios, modoLider)
      );
      painel.querySelectorAll('.btn-edit-override').forEach(btn =>
        btn.addEventListener('click', () => this._abrirModalOverride(btn.dataset.uid, usuarios, modoLider))
      );
      painel.querySelectorAll('.btn-remove-override').forEach(btn =>
        btn.addEventListener('click', () => this._removerOverride(btn.dataset.uid, usuarios, modoLider))
      );
    } catch (e) {
      painel.innerHTML = `<div style="padding:20px;color:#ef4444;">Erro ao carregar: ${Utils.escapeHtml(e.message)}</div>`;
    }
  },

  _abrirModalOverride(userId, usuarios, modoLider = false) {
    this._todosUsuarios = usuarios;

    const editando        = !!userId;
    const currentId       = String(App.currentUser?.id);
    const usuario         = editando ? usuarios.find(u => String(u.id) === String(userId)) : null;
    const overrideAtual   = editando ? (Permissoes._usuarios[userId] || {}) : {};
    // Modo líder: oculta Configurações e Usuários para não poder conceder esses acessos
    const TELAS           = modoLider
      ? Permissoes.TELAS_CONFIG.filter(t => t.id !== 'configuracoes' && t.id !== 'usuarios')
      : Permissoes.TELAS_CONFIG;
    const ACOESALL        = Permissoes.ACOES;
    const ALBL            = { ver: 'Ver', criar: 'Criar', editar: 'Editar', excluir: 'Excluir', aprovar: 'Aprovar', exportar: 'Exportar', configurar: 'Config.' };
    // Exclui admin e o próprio usuário logado da lista de seleção
    const usuariosFiltrados = usuarios.filter(u => u.role !== 'admin' && String(u.id) !== currentId);
    const primeiroUsr     = !editando ? usuariosFiltrados[0] : null;

    const userHtml = editando
      ? `<div style="font-size:13px;font-weight:600;color:#374151;margin-bottom:12px;">
           Usuário: <span style="color:${this.ROLE_COLORS[usuario?.role] || '#374151'};">${Utils.escapeHtml(usuario?.nome || '')}</span>
           <span style="font-size:11px;color:#9ca3af;margin-left:6px;">(${this.ROLE_LABELS[usuario?.role] || usuario?.role})</span>
         </div>`
      : `<div style="margin-bottom:8px;">
           <label class="drawer-label">Usuário</label>
           <div id="cs-override-usuario"></div>
           <div id="perm-override-role-badge" style="margin-top:8px;"></div>
         </div>`;

    // Banner âmbar: só para novo override
    const bannerHtml = !editando
      ? `<div style="display:flex;align-items:flex-start;gap:8px;padding:10px 12px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:var(--radius-md);margin-bottom:12px;">
           <span style="font-size:14px;flex-shrink:0;">⚡</span>
           <span style="font-size:12px;color:#92400e;">Os checkboxes foram pré-carregados com as permissões do grupo do usuário. Modifique apenas o que for diferente do padrão do grupo.</span>
         </div>`
      : '';

    // Para novo override, pré-preenche com o grupo do primeiro usuário da lista
    const permInicial = (!editando && primeiroUsr)
      ? Permissoes.getGrupo(primeiroUsr.role)
      : overrideAtual;

    const matrizHtml = `
      ${bannerHtml}
      <div style="overflow-x:auto;max-height:380px;overflow-y:auto;border:1px solid var(--color-border);border-radius:var(--radius-md);">
        <table class="cfg-table perm-matrix-tbl" style="margin:0;">
          <thead>
            <tr>
              <th style="position:sticky;top:0;z-index:1;background:var(--color-surface);min-width:130px;text-align:left;">Tela</th>
              ${ACOESALL.map(a => `<th style="position:sticky;top:0;z-index:1;background:var(--color-surface);text-align:center;width:60px;">${ALBL[a]}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${TELAS.map(tela => {
              const tp = permInicial[tela.id] || {};
              return `
                <tr>
                  <td style="font-size:12px;font-weight:500;color:#374151;">${Utils.escapeHtml(tela.label)}</td>
                  ${ACOESALL.map(acao => {
                    if (!tela.acoes.includes(acao)) {
                      return `<td style="text-align:center;"><span style="color:#e2e8f0;font-size:11px;">—</span></td>`;
                    }
                    return `<td style="text-align:center;"><input type="checkbox" class="perm-override-cb" data-tela="${tela.id}" data-acao="${acao}" ${tp[acao] ? 'checked' : ''} style="width:14px;height:14px;cursor:pointer;accent-color:hsl(142,93%,20%);"></td>`;
                  }).join('')}
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;

    Components.Modal.show({
      title:   editando ? `Override — ${Utils.escapeHtml(usuario?.nome || '')}` : 'Novo Override de Usuário',
      content: userHtml + matrizHtml,
      footer: `
        <button class="drawer-btn-cancelar" id="btn-override-cancelar">Cancelar</button>
        <button class="drawer-btn-salvar"   id="btn-override-salvar">
          ${editando ? '💾 Salvar Override' : '＋ Criar Override'}
        </button>`,
    });

    document.getElementById('btn-override-cancelar')?.addEventListener('click', () => Components.Modal.hide());
    document.getElementById('btn-override-salvar')?.addEventListener('click', () =>
      this._salvarOverride(editando ? userId : null, usuarios, modoLider)
    );

    // Para novo override: instanciar CustomSelect de usuário
    if (!editando) {
      this._csOverrideUsuario = CustomSelect.criar(
        document.getElementById('cs-override-usuario'),
        usuariosFiltrados.map(u => ({
          value:    String(u.id),
          label:    u.nome,
          sublabel: this.ROLE_LABELS[u.role] || u.role,
          dotColor: this.ROLE_COLORS[u.role],
        })),
        {
          placeholder: 'Selecione um usuário...',
          value: primeiroUsr ? String(primeiroUsr.id) : '',
          onChange: (val) => {
            this._atualizarBadgeOverride(val);
            this._carregarPermGrupoNoOverride(val);
          },
        }
      );
      if (primeiroUsr) this._atualizarBadgeOverride(String(primeiroUsr.id));
    }
  },

  _atualizarBadgeOverride(usuarioId) {
    const wrap = document.getElementById('perm-override-role-badge');
    if (!wrap) return;
    const usr = (this._todosUsuarios || []).find(u => String(u.id) === String(usuarioId));
    if (!usr) { wrap.innerHTML = ''; return; }
    const cor   = this.ROLE_COLORS[usr.role] || '#64748b';
    const label = this.ROLE_LABELS[usr.role] || usr.role;
    wrap.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:rgba(100,116,139,0.06);border-radius:var(--radius-md);">
        <span style="font-size:11px;color:#6b7280;white-space:nowrap;">Grupo base:</span>
        <span class="role-pill" style="--role-color:${cor};font-size:11px;">${Utils.escapeHtml(label)}</span>
        <span style="font-size:11px;color:#9ca3af;">(pré-carregado como base — modifique o necessário)</span>
      </div>`;
  },

  _carregarPermGrupoNoOverride(usuarioId) {
    const usr = (this._todosUsuarios || []).find(u => String(u.id) === String(usuarioId));
    if (!usr) return;
    const permGrupo = Permissoes.getGrupo(usr.role);
    document.querySelectorAll('.perm-override-cb').forEach(cb => {
      const { tela, acao } = cb.dataset;
      cb.checked = permGrupo[tela]?.[acao] === true;
    });
  },

  async _salvarOverride(userId, usuarios, modoLider = false) {
    let uid = userId;
    if (!uid) {
      uid = this._csOverrideUsuario?.getValue();
      if (!uid) { Components.Toast.warning('Selecione um usuário.'); return; }
    }
    // Impede que o líder dê permissões a si mesmo
    if (String(uid) === String(App.currentUser?.id)) {
      Components.Toast.error('Você não pode alterar suas próprias permissões.');
      return;
    }

    const perms = {};
    document.querySelectorAll('.perm-override-cb').forEach(cb => {
      const { tela, acao } = cb.dataset;
      if (!perms[tela]) perms[tela] = {};
      if (cb.checked) perms[tela][acao] = true;
    });

    // Remove telas sem nenhuma permissão
    Object.keys(perms).forEach(t => {
      if (!Object.values(perms[t]).some(Boolean)) delete perms[t];
    });

    const btn = document.getElementById('btn-override-salvar');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Salvando...'; }

    try {
      await Permissoes.salvarUsuarioOverride(uid, perms);
      Components.Modal.hide();
      Components.Toast.success('Override salvo com sucesso!');
      this._renderPainelUsuarios(modoLider);
    } catch (e) {
      Components.Toast.error('Erro ao salvar: ' + e.message);
      if (btn) { btn.disabled = false; btn.textContent = userId ? '💾 Salvar Override' : '＋ Criar Override'; }
    }
  },

  _removerOverride(userId, usuarios, modoLider = false) {
    const u = usuarios.find(x => String(x.id) === String(userId));
    Components.Modal.confirm({
      title:        'Remover Override',
      message:      `Remover o override de "${u?.nome || userId}"? O usuário voltará a usar as permissões do grupo.`,
      danger:       true,
      icon:         '🗑️',
      confirmLabel: 'Remover',
      onConfirm: async () => {
        try {
          await Permissoes.removerUsuarioOverride(userId);
          Components.Toast.success('Override removido.');
          this._renderPainelUsuarios(modoLider);
        } catch (e) {
          Components.Toast.error('Erro: ' + e.message);
        }
      },
    });
  },
};

/* ============================================================
   PÁGINA AUTÔNOMA: Centros de Custo
   ============================================================ */
Pages.CentrosCusto = {
  async render() {
    document.title = 'Fluxo Compras — Centros de Custo';
    App.setPageTitle('Centros de Custo');

    if (!Permissoes.pode('centros-custo', 'ver')) {
      Components.Toast.error('Você não tem permissão para acessar Centros de Custo.');
      App.navigate('dashboard');
      return;
    }

    document.getElementById('main-content').innerHTML =
      `<div id="tab-centros"></div>`;

    await Pages.Configuracoes.carregarAbaCentros();
  },
};

/* ============================================================
   PÁGINA AUTÔNOMA: Alçadas
   ============================================================ */
Pages.Alcadas = {
  async render() {
    document.title = 'Fluxo Compras — Alçadas';
    App.setPageTitle('Alçadas');

    if (!Permissoes.pode('alcadas', 'ver')) {
      Components.Toast.error('Você não tem permissão para acessar Alçadas.');
      App.navigate('dashboard');
      return;
    }

    document.getElementById('main-content').innerHTML =
      `<div id="tab-alcadas"></div>`;

    await Pages.Configuracoes.carregarAbaAlcadas();
  },
};

window.Pages = Pages;
