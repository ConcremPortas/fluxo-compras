/* ============================================================
   FLUXOCOMPRAS — Catálogo de Itens
   Identidade: verde escuro hsl(142,93%,8%) + esmeralda #6ee7b7
============================================================ */

var Pages = window.Pages || {};

Pages.Catalogo = {
  _dados:          [],
  _filtrados:      [],
  _categorias:     [],
  _categoriaAtiva: '',

  _PILL_CORES: [
    '#16a34a','#0284c7','#7c3aed','#db2777','#d97706',
    '#0891b2','#dc2626','#65a30d','#9333ea','#ea580c',
  ],

  /* ----------------------------------------------------------
     RENDER PRINCIPAL
  ---------------------------------------------------------- */
  async render() {
    document.title = 'FluxoCompras — Catálogo de Itens';
    App.setPageTitle('Catálogo de Itens');

    const user   = App.currentUser;
    const canEdit = ['admin','gerente'].includes(user.role);

    document.getElementById('main-content').innerHTML = `

      <!-- Header -->
      <div class="page-header" style="margin-bottom:20px;">
        <div class="page-header-info">
          <h1 style="font-size:24px;font-weight:800;color:#1a202c;letter-spacing:-0.5px;margin-bottom:3px;">
            Catálogo de Itens
          </h1>
          <p style="font-size:13px;color:#718096;">Materiais e produtos disponíveis para requisição</p>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          ${canEdit ? `
            <button class="btn btn-secondary" id="btn-template-itens"
                style="font-size:13px;font-weight:600;gap:6px;display:inline-flex;align-items:center;">
              📋 Baixar Modelo CSV
            </button>
            <button class="btn btn-secondary" id="btn-importar-itens"
                style="font-size:13px;font-weight:600;gap:6px;display:inline-flex;align-items:center;">
              📥 Importar CSV
            </button>
            <input type="file" id="input-csv-itens" accept=".csv" style="display:none;">
            <button class="btn btn-secondary" id="btn-ir-categorias"
                style="font-size:13px;font-weight:600;gap:6px;display:inline-flex;align-items:center;">
              🏷️ Categorias
            </button>
            <button class="btn-nova-req" id="btn-novo-item">
              <span style="font-size:16px;line-height:1;">＋</span>
              Novo Item
            </button>` : ''}
        </div>
      </div>

      ${canEdit ? `
      <!-- Abas de navegação -->
      <div id="cat-abas-nav" style="display:flex;border-bottom:2px solid #E2E8F0;margin-bottom:16px;gap:0;">
        <button class="cat-aba-nav-btn active" data-aba="itens">📦 Itens</button>
        <button class="cat-aba-nav-btn" data-aba="sugestoes">
          💡 Sugestões
          <span id="cat-sugestoes-count" class="cat-alertas-count-badge" style="display:none;">0</span>
        </button>
        <button class="cat-aba-nav-btn" data-aba="alertas">
          ⚠️ Alertas de Custo
          <span id="cat-alertas-count" class="cat-alertas-count-badge" style="display:none;">0</span>
        </button>
      </div>` : ''}

      <!-- Aba Itens -->
      <div id="cat-aba-itens">

      <!-- Filtros -->
      <div class="req-filters-card">
        <div class="req-search-wrap">
          <span class="req-search-icon">🔍</span>
          <input
            type="text"
            class="req-search-input"
            id="search-catalogo"
            placeholder="Buscar por código, descrição ou categoria..."
            autocomplete="off"
          />
        </div>
        <select class="req-filter-select" id="filter-ativo">
          <option value="">Todos</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
        <span class="req-results-count" id="catalogo-count">—</span>
      </div>

      <!-- Pills de categoria -->
      <div class="catalogo-pills-wrap" id="catalogo-pills"></div>

      <!-- Tabela -->
      <div id="tabela-catalogo"></div>
      </div>
      ${canEdit ? `
        <div id="cat-aba-sugestoes" style="display:none;padding-top:4px;"></div>
        <div id="cat-aba-alertas"   style="display:none;padding-top:4px;"></div>
      ` : ''}`;

    document.getElementById('search-catalogo')
      ?.addEventListener('input',  () => this._filtrar());
    document.getElementById('filter-ativo')
      ?.addEventListener('change', () => this._filtrar());
    document.getElementById('btn-novo-item')
      ?.addEventListener('click',  () => this._abrirDialog());
    document.getElementById('btn-ir-categorias')
      ?.addEventListener('click',  () => App.navigate('catalogo-categorias'));

    document.getElementById('btn-importar-itens')
      ?.addEventListener('click', () => document.getElementById('input-csv-itens')?.click());

    document.getElementById('input-csv-itens')
      ?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (file) await Pages.Catalogo._importarCSV(file);
        e.target.value = '';
      });

    document.getElementById('btn-template-itens')?.addEventListener('click', () => {
      const template =
        'codigo,descricao,categoria,unidade,preco_ref,observacoes\n' +
        'MAT-0001,Papel A4 Resma 500 folhas,Escritório,RS,22.90,500 folhas 75g\n' +
        'MAT-0002,Caneta Esferográfica Azul,Escritório,CX,8.50,Caixa com 12 unidades\n' +
        ',Novo Item Sem Código,Construção,UN,0,Código gerado automaticamente';
      const blob = new Blob(['﻿' + template], { type: 'text/csv;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'modelo_catalogo_itens.csv'; a.click();
      URL.revokeObjectURL(url);
    });

    // Bind abas itens ↔ sugestões ↔ alertas
    document.querySelectorAll('.cat-aba-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cat-aba-nav-btn').forEach(b => b.classList.toggle('active', b === btn));
        const aba = btn.dataset.aba;
        document.getElementById('cat-aba-itens')?.style.setProperty('display', aba === 'itens' ? '' : 'none');
        document.getElementById('cat-aba-sugestoes')?.style.setProperty('display', aba === 'sugestoes' ? '' : 'none');
        document.getElementById('cat-aba-alertas')?.style.setProperty('display', aba === 'alertas' ? '' : 'none');
        if (aba === 'sugestoes') this._renderAbaSugestoes();
        if (aba === 'alertas')   this._renderAbaAlertas();
      });
    });

    await this._carregar();
    if (canEdit) { this._renderAbaAlertas(); this._renderAbaSugestoes(); }
  },

  /* ----------------------------------------------------------
     CARREGAR DADOS
  ---------------------------------------------------------- */
  async _carregar() {
    const container = document.getElementById('tabela-catalogo');
    if (!container) return;

    // Skeleton
    container.innerHTML = `
      <div class="req-table-wrap" style="animation:none;opacity:1;transform:none;">
        <table class="req-table">
          <thead>
            <tr>
              <th>Código</th><th>Descrição</th><th>Categoria</th>
              <th>Unidade</th><th>Preço Ref.</th><th>Status</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${[...Array(4)].map(() => `
              <tr class="req-skeleton-row" style="opacity:1;animation:none;">
                ${[60,200,100,60,80,70,70].map(w =>
                  `<td><div class="skeleton req-skeleton-cell" style="width:${w}px;"></div></td>`
                ).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    try {
      const todos = await Storage.list(TABLES.catalogoItens, {
        order: { column: 'descricao', ascending: true },
      }) || [];

      // Separar sugestões dos itens normais (null ou 'ativo' = item normal)
      this._dados      = todos.filter(i => !i.status || i.status === 'ativo');
      this._sugestoes  = todos.filter(i => i.status === 'sugestao');

      // Atualizar badge de sugestões
      const badgeSug = document.getElementById('cat-sugestoes-count');
      if (badgeSug) {
        badgeSug.textContent   = this._sugestoes.length;
        badgeSug.style.display = this._sugestoes.length > 0 ? '' : 'none';
      }

      // Extrair categorias únicas dos itens
      this._categorias = [...new Set(
        this._dados.map(i => i.categoria).filter(Boolean)
      )].sort();

      this._renderPills();
      this._filtrar();
    } catch (e) {
      console.error('[Catalogo]', e);
      Components.Toast.error('Erro ao carregar catálogo.');
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

  /* ----------------------------------------------------------
     PILLS DE CATEGORIA
  ---------------------------------------------------------- */
  _renderPills() {
    const wrap = document.getElementById('catalogo-pills');
    if (!wrap) return;

    const cats   = this._categorias;
    const counts = {};
    this._dados.forEach(i => { if (i.categoria) counts[i.categoria] = (counts[i.categoria] || 0) + 1; });

    if (!cats.length) { wrap.innerHTML = ''; return; }

    const total = this._dados.length;
    wrap.innerHTML = `
      <button class="cat-pill ${!this._categoriaAtiva ? 'ativa' : ''}" data-cat="">
        Todos <span class="cat-pill-count">${total}</span>
      </button>
      ${cats.map((c, idx) => {
        const cor = this._PILL_CORES[idx % this._PILL_CORES.length];
        return `<button class="cat-pill ${this._categoriaAtiva === c ? 'ativa' : ''}"
                        data-cat="${Utils.escapeHtml(c)}"
                        style="--pill-cor:${cor}">
                  ${Utils.escapeHtml(c)}
                  <span class="cat-pill-count">${counts[c] || 0}</span>
                </button>`;
      }).join('')}`;

    wrap.querySelectorAll('.cat-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this._categoriaAtiva = btn.dataset.cat;
        this._renderPills();
        this._filtrar();
      });
    });
  },

  /* ----------------------------------------------------------
     FILTRAR
  ---------------------------------------------------------- */
  _filtrar() {
    const busca  = (document.getElementById('search-catalogo')?.value || '').toLowerCase().trim();
    const categ  = this._categoriaAtiva;
    const atvStr = document.getElementById('filter-ativo')?.value     || '';

    this._filtrados = this._dados.filter(i => {
      const matchBusca = !busca || [i.codigo, i.descricao, i.categoria]
        .some(v => v && String(v).toLowerCase().includes(busca));
      const matchCateg = !categ  || i.categoria === categ;
      const matchAtivo = !atvStr || String(i.ativo !== false) === atvStr;
      return matchBusca && matchCateg && matchAtivo;
    });

    const count = document.getElementById('catalogo-count');
    if (count) {
      const n = this._filtrados.length, t = this._dados.length;
      count.textContent = n === t
        ? `${t} item${t !== 1 ? 'ns' : ''}`
        : `${n} de ${t}`;
    }

    this._renderTabela();
  },

  /* ----------------------------------------------------------
     RENDERIZAR TABELA
  ---------------------------------------------------------- */
  _renderTabela() {
    const container = document.getElementById('tabela-catalogo');
    if (!container) return;

    const user    = App.currentUser;
    const canEdit = ['admin','gerente'].includes(user.role);

    if (!this._filtrados.length) {
      container.innerHTML = `
        <div class="req-table-wrap" style="animation:none;opacity:1;transform:none;">
          <div class="req-empty">
            <div class="req-empty-icon">📦</div>
            <span class="req-empty-title">Nenhum item encontrado</span>
            <span class="req-empty-sub">
              ${canEdit ? 'Clique em "Novo Item" para cadastrar o primeiro.' : 'Nenhum item cadastrado ainda.'}
            </span>
          </div>
        </div>`;
      return;
    }

    const rows = this._filtrados.map((item, i) => `
      <tr style="animation-delay:${i * 30}ms;">
        <td>
          <span style="font-family:monospace;font-size:12px;font-weight:700;
            color:hsl(142,70%,28%);background:hsla(142,70%,40%,0.08);
            padding:3px 8px;border-radius:5px;white-space:nowrap;">
            ${Utils.escapeHtml(item.codigo || '—')}
          </span>
        </td>
        <td>
          <span style="font-weight:600;color:#1a202c;">
            ${Utils.escapeHtml(item.descricao || '—')}
          </span>
          ${item.observacoes ? `
            <span style="display:block;font-size:11px;color:#94a3b8;margin-top:2px;
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px;">
              ${Utils.escapeHtml(item.observacoes)}
            </span>` : ''}
        </td>
        <td>
          <span style="font-size:12px;color:#64748b;background:#F1F5F9;
            padding:3px 8px;border-radius:5px;">
            ${Utils.escapeHtml(item.categoria || '—')}
          </span>
        </td>
        <td style="font-weight:600;color:#475569;text-align:center;">
          ${Utils.escapeHtml(item.unidade || 'UN')}
        </td>
        <td style="font-weight:600;color:#1a202c;white-space:nowrap;">
          ${item.preco_ref > 0 ? Utils.formatCurrency(item.preco_ref) : '<span style="color:#CBD5E0;">—</span>'}
        </td>
        <td>${Components.badge(item.ativo !== false ? 'Ativo' : 'Inativo')}</td>
        <td>
          ${canEdit ? `
            <button class="req-btn-ver btn-editar-item" data-id="${Utils.escapeHtml(String(item.id))}"
              style="margin-right:4px;">
              ✏️ Editar
            </button>
            <button class="req-btn-ver btn-toggle-item"
              data-id="${Utils.escapeHtml(String(item.id))}"
              data-ativo="${item.ativo !== false}"
              style="background:${item.ativo !== false ? '#fff7ed' : '#f0fdf4'};
                color:${item.ativo !== false ? '#c2410c' : 'hsl(142,70%,28%)'};
                border-color:${item.ativo !== false ? '#fed7aa' : 'hsla(142,70%,40%,0.3)'};">
              ${item.ativo !== false ? '🔒 Inativar' : '🔓 Ativar'}
            </button>` : ''}
        </td>
      </tr>`).join('');

    container.innerHTML = `
      <div class="req-table-wrap">
        <table class="req-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th style="text-align:center;">Unidade</th>
              <th>Preço Ref.</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

    container.querySelectorAll('.btn-editar-item').forEach(btn =>
      btn.addEventListener('click', () => this._abrirDialog(btn.dataset.id))
    );
    container.querySelectorAll('.btn-toggle-item').forEach(btn =>
      btn.addEventListener('click', () =>
        this._toggleAtivo(btn.dataset.id, btn.dataset.ativo === 'true'))
    );
  },

  /* ----------------------------------------------------------
     ABRIR DIALOG DE CRIAÇÃO / EDIÇÃO
  ---------------------------------------------------------- */
  _abrirDialog(id) {
    const item   = id ? this._dados.find(i => String(i.id) === String(id)) : null;
    const titulo = item ? 'Editar Item' : 'Novo Item';
    const isNovo = !item;

    const UNIDADES = ['UN','CX','RS','PC','KG','L','M','M²','M³','GL','SC','PR','HR','SV','KIT'];

    // Categorias: existentes no catálogo + sugeridas
    const SUGERIDAS = ['Escritório','Informática','Construção','Segurança','Copa','Limpeza',
                       'Elétrico','Hidráulico','Ferramentas','Manutenção','Almoxarifado','Outros'];
    const todasCategorias = [
      ...this._categorias,
      ...SUGERIDAS.filter(c => !this._categorias.includes(c)),
    ];

    Components.Modal.show({
      title:   titulo,
      size:    'lg',
      content: `
        <div class="drawer-form-row">
          <div class="drawer-field">
            <label class="drawer-label" for="item-codigo">
              Código
              ${isNovo ? '<span style="font-size:11px;color:hsl(142,70%,38%);font-weight:500;margin-left:6px;">⚡ gerado automaticamente</span>' : ''}
            </label>
            <input class="drawer-input" type="text" id="item-codigo"
              value="${Utils.escapeHtml(item?.codigo || '')}"
              placeholder="${isNovo ? 'Gerando...' : 'Ex: MAT-001'}"
              autocomplete="off"
              ${isNovo ? 'readonly style="background:#f8fffe;border-color:hsl(142,70%,75%);color:#64748b;"' : ''} />
          </div>
          <div class="drawer-field">
            <label class="drawer-label" for="item-unidade">Unidade <span class="required">*</span></label>
            <select class="drawer-select" id="item-unidade">
              ${UNIDADES.map(u =>
                `<option value="${u}" ${(item?.unidade || 'UN') === u ? 'selected' : ''}>${u}</option>`
              ).join('')}
            </select>
          </div>
        </div>

        <div class="drawer-field">
          <label class="drawer-label" for="item-descricao">Descrição <span class="required">*</span></label>
          <input class="drawer-input" type="text" id="item-descricao"
            value="${Utils.escapeHtml(item?.descricao || '')}"
            placeholder="Descrição completa do item" autocomplete="off" />
        </div>

        <div class="drawer-form-row">
          <div class="drawer-field">
            <label class="drawer-label" for="item-categoria">Categoria</label>
            <input class="drawer-input" type="text" id="item-categoria"
              value="${Utils.escapeHtml(item?.categoria || '')}"
              placeholder="Ex: Escritório"
              list="lista-categorias" autocomplete="off" />
            <datalist id="lista-categorias">
              ${todasCategorias.map(c =>
                `<option value="${Utils.escapeHtml(c)}">`
              ).join('')}
            </datalist>
          </div>
          <div class="drawer-field">
            <label class="drawer-label" for="item-preco">Preço de Referência (R$)</label>
            <input class="drawer-input" type="number" id="item-preco"
              value="${item?.preco_ref || ''}"
              min="0" step="0.01" placeholder="0,00" />
          </div>
        </div>

        <div class="drawer-field">
          <label class="drawer-label" for="item-obs">Observações</label>
          <textarea class="drawer-textarea" id="item-obs" rows="2"
            placeholder="Especificações técnicas, marca, modelo...">${Utils.escapeHtml(item?.observacoes || '')}</textarea>
        </div>

        <div class="drawer-field">
          <label class="drawer-check-row">
            <input type="checkbox" id="item-ativo" ${item ? (item.ativo !== false ? 'checked' : '') : 'checked'} />
            <span class="drawer-check-label">Item ativo</span>
            <span class="drawer-check-hint">— disponível para novas requisições</span>
          </label>
        </div>`,
      footer: `
        <button class="drawer-btn-cancelar" id="btn-cancelar-item">Cancelar</button>
        <button class="drawer-btn-salvar"   id="btn-salvar-item">💾 Salvar Item</button>`,
    });

    document.getElementById('btn-cancelar-item')
      ?.addEventListener('click', () => Components.Modal.hide());
    document.getElementById('btn-salvar-item')
      ?.addEventListener('click', () => this._salvar(id));

    // Para novo item, preencher código automaticamente
    if (isNovo) {
      Utils.generateCodigoItem().then(codigoGerado => {
        const inputCodigo = document.getElementById('item-codigo');
        if (inputCodigo) {
          inputCodigo.value = codigoGerado;
          inputCodigo.style.borderColor = 'hsl(142,70%,38%)';
          inputCodigo.style.color = 'hsl(142,70%,28%)';
        }
      });
    }

    // Foco no campo de descrição
    setTimeout(() => document.getElementById('item-descricao')?.focus(), 50);
  },

  /* ----------------------------------------------------------
     SALVAR (criar ou editar)
  ---------------------------------------------------------- */
  async _salvar(id) {
    const descricao = document.getElementById('item-descricao')?.value.trim();
    const unidade   = document.getElementById('item-unidade')?.value;

    if (!descricao) { Components.Toast.warning('Informe a descrição do item.'); return; }
    if (!unidade)   { Components.Toast.warning('Selecione a unidade.'); return; }

    const btn = document.getElementById('btn-salvar-item');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Salvando...'; }

    try {
      const payload = {
        codigo:      document.getElementById('item-codigo')?.value.trim()    || null,
        descricao,
        unidade,
        categoria:   document.getElementById('item-categoria')?.value.trim() || null,
        preco_ref:   parseFloat(document.getElementById('item-preco')?.value)  || 0,
        observacoes: document.getElementById('item-obs')?.value.trim()        || null,
        ativo:       document.getElementById('item-ativo')?.checked ?? true,
        updated_at:  new Date().toISOString(),
      };

      if (id) {
        await Storage.update(TABLES.catalogoItens, id, payload);
        Components.Toast.success('Item atualizado com sucesso!');
      } else {
        await Storage.create(TABLES.catalogoItens, {
          ...payload,
          created_at: new Date().toISOString(),
        });
        Components.Toast.success('Item cadastrado com sucesso!');
      }

      Components.Modal.hide();
      await this._carregar();
    } catch (e) {
      console.error('[Catalogo._salvar]', e);
      Components.Toast.error('Erro ao salvar item.');
      if (btn) { btn.disabled = false; btn.textContent = '💾 Salvar Item'; }
    }
  },

  /* ----------------------------------------------------------
     IMPORTAÇÃO CSV — CATÁLOGO DE ITENS
  ---------------------------------------------------------- */
  async _importarCSV(file) {
    const texto = await new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload  = e => res(e.target.result);
      reader.onerror = rej;
      reader.readAsText(file, 'UTF-8');
    });

    const linhas = this._parseCSV(texto);
    if (linhas.length < 2) {
      Components.Toast.error('CSV inválido ou vazio.');
      return;
    }

    const header = linhas[0].map(h =>
      h.toLowerCase().trim()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/\s+/g, '_')
    );

    const idx = {
      codigo:      header.indexOf('codigo'),
      descricao:   header.indexOf('descricao'),
      categoria:   header.indexOf('categoria'),
      unidade:     header.indexOf('unidade'),
      preco_ref:   header.findIndex(h => h.includes('preco') || h.includes('valor') || h.includes('price')),
      observacoes: header.findIndex(h => h.includes('obs') || h.includes('observ')),
    };

    if (idx.descricao === -1) {
      Components.Toast.error('Coluna "descricao" não encontrada no CSV.');
      return;
    }

    const existentes = await Storage.list(TABLES.catalogoItens).catch(() => []);
    const mapCodigo  = {};
    (existentes || []).forEach(i => { if (i.codigo) mapCodigo[i.codigo] = i; });

    const numerosExistentes = Object.keys(mapCodigo)
      .map(c => { const m = c.match(/^MAT-(\d+)$/i); return m ? parseInt(m[1]) : 0; })
      .filter(n => n > 0);
    let proximoNum = numerosExistentes.length > 0 ? Math.max(...numerosExistentes) + 1 : 1;

    const linhasDados = linhas.slice(1).filter(l => l.some(c => c.trim()));

    this._mostrarPreviewImportacao(linhasDados, idx, mapCodigo, async (confirmar) => {
      if (!confirmar) return;

      Components.Toast.info(`Importando ${linhasDados.length} itens...`);
      const resultados = { criados: 0, atualizados: 0, erros: 0 };

      for (const linha of linhasDados) {
        try {
          const descricao = linha[idx.descricao]?.trim();
          if (!descricao) continue;

          let codigo = idx.codigo >= 0 ? linha[idx.codigo]?.trim() : '';
          if (!codigo) {
            codigo = 'MAT-' + String(proximoNum).padStart(4, '0');
            proximoNum++;
          }

          const payload = {
            codigo,
            descricao,
            categoria:   idx.categoria   >= 0 ? linha[idx.categoria]?.trim()   || null : null,
            unidade:     idx.unidade     >= 0 ? linha[idx.unidade]?.trim()     || 'UN' : 'UN',
            preco_ref:   idx.preco_ref   >= 0 ? parseFloat((linha[idx.preco_ref] || '').replace(',', '.')) || 0 : 0,
            observacoes: idx.observacoes >= 0 ? linha[idx.observacoes]?.trim() || null : null,
            ativo:       true,
            updated_at:  new Date().toISOString(),
          };

          if (codigo && mapCodigo[codigo]) {
            await Storage.update(TABLES.catalogoItens, mapCodigo[codigo].id, payload);
            resultados.atualizados++;
          } else {
            await Storage.create(TABLES.catalogoItens, payload);
            resultados.criados++;
            mapCodigo[codigo] = { id: 'novo', ...payload };
          }
        } catch(e) {
          resultados.erros++;
        }
      }

      Components.Toast.success(
        `✅ Importação concluída! ${resultados.criados} criados, ` +
        `${resultados.atualizados} atualizados` +
        (resultados.erros > 0 ? `, ${resultados.erros} erros` : '')
      );
      await this._carregar();
    });
  },

  _mostrarPreviewImportacao(linhas, idx, mapExistentes, onConfirm) {
    const total = linhas.filter(l => l.some(c => c.trim())).length;
    const novos = linhas.filter(l => {
      const cod = idx.codigo >= 0 ? l[idx.codigo]?.trim() : '';
      return !cod || !mapExistentes[cod];
    }).length;
    const atualizados = total - novos;

    Components.Modal.show({
      title:   '📥 Importar Itens do Catálogo',
      size:    'sm',
      content: `
        <div style="text-align:center;padding:8px 0 16px;">
          <div style="display:flex;gap:16px;justify-content:center;margin-bottom:16px;">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 20px;min-width:80px;">
              <div style="font-size:28px;font-weight:800;color:hsl(142,70%,28%);">${total}</div>
              <div style="font-size:11px;color:#64748b;font-weight:600;">Total de linhas</div>
            </div>
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 20px;min-width:80px;">
              <div style="font-size:28px;font-weight:800;color:#1d4ed8;">${novos}</div>
              <div style="font-size:11px;color:#64748b;font-weight:600;">Novos itens</div>
            </div>
            <div style="background:#fefce8;border:1px solid #fef08a;border-radius:10px;padding:14px 20px;min-width:80px;">
              <div style="font-size:28px;font-weight:800;color:#a16207;">${atualizados}</div>
              <div style="font-size:11px;color:#64748b;font-weight:600;">Serão atualizados</div>
            </div>
          </div>
          <p style="font-size:12px;color:#64748b;margin:4px 0;">⚡ Itens sem código no CSV receberão código MAT-XXXX automaticamente.</p>
          <p style="font-size:12px;color:#64748b;margin:4px 0;">🔄 Itens com código já existente serão atualizados.</p>
        </div>`,
      footer: `
        <button class="drawer-btn-cancelar" id="btn-cancelar-import">Cancelar</button>
        <button class="drawer-btn-salvar"   id="btn-confirmar-import">✅ Confirmar Importação</button>`,
    });

    document.getElementById('btn-cancelar-import')
      ?.addEventListener('click', () => { Components.Modal.hide(); onConfirm(false); });
    document.getElementById('btn-confirmar-import')
      ?.addEventListener('click', () => { Components.Modal.hide(); onConfirm(true); });
  },

  _parseCSV(texto) {
    const primLinha = texto.split('\n')[0];
    const sep = primLinha.includes(';') ? ';' : ',';

    return texto.split('\n')
      .filter(l => l.trim())
      .map(linha => {
        const cells = [];
        let atual = '';
        let dentroAspas = false;

        for (let i = 0; i < linha.length; i++) {
          const c = linha[i];
          if (c === '"') {
            dentroAspas = !dentroAspas;
          } else if (c === sep && !dentroAspas) {
            cells.push(atual.trim().replace(/^"|"$/g, ''));
            atual = '';
          } else {
            atual += c;
          }
        }
        cells.push(atual.trim().replace(/^"|"$/g, ''));
        return cells;
      });
  },

  /* ----------------------------------------------------------
     TOGGLE ATIVO / INATIVO
  ---------------------------------------------------------- */
  async _toggleAtivo(id, estaAtivo) {
    Components.Modal.confirm({
      title:        estaAtivo ? 'Inativar Item' : 'Ativar Item',
      message:      estaAtivo
        ? 'Este item ficará indisponível para novas requisições.'
        : 'Este item voltará a estar disponível para requisições.',
      danger:       estaAtivo,
      type:         estaAtivo ? 'danger' : 'success',
      icon:         estaAtivo ? '🔒' : '🔓',
      confirmLabel: estaAtivo ? 'Inativar' : 'Ativar',
      onConfirm: async () => {
        try {
          await Storage.update(TABLES.catalogoItens, id, {
            ativo:      !estaAtivo,
            updated_at: new Date().toISOString(),
          });
          Components.Toast.success(estaAtivo ? 'Item inativado.' : 'Item ativado!');
          await this._carregar();
        } catch (e) {
          console.error('[Catalogo._toggleAtivo]', e);
          Components.Toast.error('Erro ao alterar status do item.');
        }
      },
    });
  },

  /* ----------------------------------------------------------
     PAINEL DE SUGESTÕES DE NOVOS ITENS
  ---------------------------------------------------------- */
  async _renderAbaSugestoes() {
    const painel = document.getElementById('cat-aba-sugestoes');
    if (!painel) return;

    const sugestoes = this._sugestoes || [];

    if (!sugestoes.length) {
      painel.innerHTML = `
        <div style="text-align:center;padding:48px 20px;">
          <div style="font-size:36px;margin-bottom:12px;">💡</div>
          <div style="font-size:15px;font-weight:700;color:#2D3748;margin-bottom:6px;">Nenhuma sugestão pendente</div>
          <div style="font-size:13px;color:#94a3b8;">Quando um usuário solicitar um item não cadastrado, ele aparecerá aqui.</div>
        </div>`;
      return;
    }

    painel.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:12px;">
        ${sugestoes.map(s => `
          <div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:16px 20px;display:flex;align-items:flex-start;gap:16px;box-shadow:0 1px 4px rgba(0,0,0,.04);">
            <div style="width:40px;height:40px;background:hsla(142,93%,8%,.08);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">💡</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:15px;font-weight:700;color:#1a202c;margin-bottom:4px;">${Utils.escapeHtml(s.descricao)}</div>
              <div style="display:flex;flex-wrap:wrap;gap:8px;font-size:12px;color:#718096;margin-bottom:8px;">
                <span>👤 <strong>${Utils.escapeHtml(s.solicitante_nome || '—')}</strong></span>
                ${s.requisicao_numero ? `<span>📋 Req. ${Utils.escapeHtml(s.requisicao_numero)}</span>` : ''}
                ${s.unidade ? `<span>📦 ${Utils.escapeHtml(s.unidade)}</span>` : ''}
                ${s.preco_ref ? `<span>💰 ${Utils.formatCurrency(s.preco_ref)}</span>` : ''}
                <span>📅 ${s.created_at ? new Date(s.created_at).toLocaleDateString('pt-BR') : '—'}</span>
              </div>
              ${s.observacoes ? `<div style="font-size:12px;color:#94a3b8;font-style:italic;">${Utils.escapeHtml(s.observacoes)}</div>` : ''}
            </div>
            <div style="display:flex;gap:8px;flex-shrink:0;">
              <button class="btn btn-primary" style="font-size:12px;padding:6px 14px;"
                data-sug-id="${s.id}" data-sug-acao="aprovar">✅ Aprovar</button>
              <button class="btn btn-secondary" style="font-size:12px;padding:6px 14px;color:#ef4444;border-color:#ef4444;"
                data-sug-id="${s.id}" data-sug-acao="rejeitar">❌ Rejeitar</button>
            </div>
          </div>`).join('')}
      </div>`;

    painel.querySelectorAll('[data-sug-acao]').forEach(btn => {
      btn.addEventListener('click', () => this._processarSugestao(btn.dataset.sugId, btn.dataset.sugAcao));
    });
  },

  async _processarSugestao(id, acao) {
    try {
      if (acao === 'aprovar') {
        await Storage.update(TABLES.catalogoItens, id, {
          status: 'ativo',
          ativo:  true,
          updated_at: new Date().toISOString(),
        });
        Components.Toast.success('Item aprovado e adicionado ao catálogo!');
      } else {
        await Storage.update(TABLES.catalogoItens, id, {
          status: 'rejeitado',
          ativo:  false,
          updated_at: new Date().toISOString(),
        });
        Components.Toast.info('Sugestão rejeitada.');
      }
      await this._carregar();
      this._renderAbaSugestoes();
    } catch (e) {
      Components.Toast.error('Erro ao processar sugestão: ' + e.message);
    }
  },

  /* ----------------------------------------------------------
     PAINEL DE ALERTAS DE CUSTO
  ---------------------------------------------------------- */
  async _renderAbaAlertas() {
    const painel = document.getElementById('cat-aba-alertas');
    if (!painel) return;

    const alertas = await Storage.list(TABLES.alertasCusto, {
      order: { column: 'created_at', ascending: false },
    }).catch(() => []) || [];

    // Atualizar badge na aba
    const pendentes = alertas.filter(a => a.status === 'Pendente').length;
    const countEl = document.getElementById('cat-alertas-count');
    if (countEl) {
      countEl.textContent = pendentes;
      countEl.style.display = pendentes > 0 ? '' : 'none';
    }

    if (!alertas.length) {
      painel.innerHTML =
        '<div style="text-align:center;padding:48px 20px;">' +
          '<div style="font-size:36px;margin-bottom:12px;">✅</div>' +
          '<div style="font-size:15px;font-weight:700;color:#2D3748;font-family:\'Manrope\',sans-serif;margin-bottom:6px;">Nenhum alerta de custo</div>' +
          '<div style="font-size:13px;color:#94a3b8;font-family:\'Manrope\',sans-serif;">Todos os preços estão dentro do valor de referência do catálogo.</div>' +
        '</div>';
      return;
    }

    const stats = [
      { label: 'Todos', valor: '', count: alertas.length, extra: '' },
      { label: '⏳ Pendentes', valor: 'Pendente', count: alertas.filter(a => a.status === 'Pendente').length, extra: '' },
      { label: '✅ Aceitos',   valor: 'Aceito',   count: alertas.filter(a => a.status === 'Aceito').length,   extra: '' },
      { label: '❌ Recusados', valor: 'Recusado', count: alertas.filter(a => a.status === 'Recusado').length, extra: '' },
    ];

    painel.innerHTML =
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">' +
        stats.map((s, i) =>
          '<button class="cat-alerta-pill' + (i === 0 ? ' ativo' : '') + '"' +
                  ' data-alerta-status="' + s.valor + '" style="gap:6px;">' +
            s.label +
            '<span style="font-weight:800;">' + s.count + '</span>' +
          '</button>'
        ).join('') +
      '</div>' +
      '<div id="lista-alertas-custo"></div>';

    this._renderListaAlertas(alertas, alertas);

    painel.querySelectorAll('.cat-alerta-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        painel.querySelectorAll('.cat-alerta-pill').forEach(b => b.classList.toggle('ativo', b === btn));
        const status = btn.dataset.alertaStatus;
        const filtrados = status ? alertas.filter(a => a.status === status) : alertas;
        this._renderListaAlertas(alertas, filtrados);
      });
    });
  },

  _renderListaAlertas(todos, filtrados) {
    const lista = document.getElementById('lista-alertas-custo');
    if (!lista) return;

    if (!filtrados.length) {
      lista.innerHTML = '<div style="text-align:center;padding:32px;color:#94a3b8;font-family:\'Manrope\',sans-serif;font-size:13px;">Nenhum alerta neste filtro.</div>';
      return;
    }

    const isAdmin = ['admin','gerente'].includes(App.currentUser?.role);

    const STATUS_STYLE = {
      'Pendente': { bg: '#fef3c7', cor: '#92400e', icone: '⚠️', bgIcon: '#fffbeb' },
      'Aceito':   { bg: '#dcfce7', cor: 'hsl(142,70%,28%)', icone: '✅', bgIcon: '#f0fdf4' },
      'Recusado': { bg: '#fee2e2', cor: '#dc2626', icone: '❌', bgIcon: '#fef2f2' },
    };

    lista.innerHTML = filtrados.map(alerta => {
      const st  = STATUS_STYLE[alerta.status] || STATUS_STYLE['Pendente'];
      const isPendente = alerta.status === 'Pendente';
      const dif = (parseFloat(alerta.preco_informado) || 0) - (parseFloat(alerta.preco_ref) || 0);

      return (
        '<div class="cat-alerta-card ' + alerta.status.toLowerCase() + '">' +
          '<div class="cat-alerta-header">' +
            '<div class="cat-alerta-icone" style="background:' + st.bgIcon + ';">' + st.icone + '</div>' +
            '<div class="cat-alerta-info">' +
              '<div class="cat-alerta-titulo">' + Utils.escapeHtml(alerta.item_descricao || '—') +
                (alerta.item_codigo ? ' <span style="font-size:11px;background:#F1F5F9;padding:1px 6px;border-radius:4px;color:#64748b;font-weight:600;">' + Utils.escapeHtml(alerta.item_codigo) + '</span>' : '') +
              '</div>' +
              '<div class="cat-alerta-meta">' +
                Utils.escapeHtml(alerta.requisicao_numero || '—') + ' · ' +
                Utils.escapeHtml(alerta.solicitante_nome || '—') + ' · ' +
                Utils.formatDate(alerta.created_at) +
              '</div>' +
            '</div>' +
            '<span class="cat-alerta-status-badge" style="background:' + st.bg + ';color:' + st.cor + ';">' +
              alerta.status +
            '</span>' +
          '</div>' +

          '<div class="cat-alerta-precos">' +
            '<div class="cat-alerta-preco-item">' +
              '<div class="cat-alerta-preco-label">Preço Referência</div>' +
              '<div class="cat-alerta-preco-valor" style="color:#64748b;">' + Utils.formatCurrency(alerta.preco_ref) + '</div>' +
            '</div>' +
            '<span style="font-size:16px;color:#d97706;font-weight:700;">→</span>' +
            '<div class="cat-alerta-preco-item">' +
              '<div class="cat-alerta-preco-label">Valor Informado</div>' +
              '<div class="cat-alerta-preco-valor" style="color:#dc2626;">' + Utils.formatCurrency(alerta.preco_informado) + '</div>' +
            '</div>' +
            '<div class="cat-alerta-preco-item">' +
              '<div class="cat-alerta-preco-label">Variação</div>' +
              '<div class="cat-alerta-variacao-badge">+' + parseFloat(alerta.variacao_pct).toFixed(1) + '%</div>' +
            '</div>' +
            '<div class="cat-alerta-preco-item">' +
              '<div class="cat-alerta-preco-label">Diferença</div>' +
              '<div class="cat-alerta-preco-valor" style="font-size:12px;color:#dc2626;">+' + Utils.formatCurrency(dif) + '</div>' +
            '</div>' +
          '</div>' +

          '<div class="cat-alerta-justif-box">' +
            '<div class="cat-alerta-justif-label">Justificativa do solicitante:</div>' +
            '<div class="cat-alerta-justif-text">"' + Utils.escapeHtml(alerta.justificativa || '') + '"</div>' +
          '</div>' +

          (alerta.status !== 'Pendente' ?
            '<div class="cat-alerta-decisao-registro">' +
              '<span>' + (alerta.status === 'Aceito' ? '✅ Aceito' : '❌ Recusado') + '</span>' +
              '<span>por ' + Utils.escapeHtml(alerta.decidido_por || '—') + '</span>' +
              '<span>em ' + Utils.formatDate(alerta.data_decisao) + '</span>' +
              (alerta.observacao_decisao ? '<span>· "' + Utils.escapeHtml(alerta.observacao_decisao) + '"</span>' : '') +
            '</div>'
          : '') +

          (isPendente && isAdmin ?
            '<div class="cat-alerta-decisao-area">' +
              '<textarea class="cat-alerta-obs" id="obs-decisao-' + alerta.id + '"' +
                ' rows="2" placeholder="Observação opcional sobre a decisão..."></textarea>' +
              '<div class="cat-alerta-btns">' +
                '<button class="cat-btn-recusar btn-recusar-alerta"' +
                        ' data-id="' + alerta.id + '"' +
                        ' data-item-id="' + (alerta.catalogo_item_id || '') + '"' +
                        ' data-novo-preco="' + alerta.preco_informado + '">' +
                  '❌ Recusar' +
                '</button>' +
                '<button class="cat-btn-aceitar btn-aceitar-alerta"' +
                        ' data-id="' + alerta.id + '"' +
                        ' data-item-id="' + (alerta.catalogo_item_id || '') + '"' +
                        ' data-novo-preco="' + alerta.preco_informado + '">' +
                  '✅ Aceitar e Atualizar Preço' +
                '</button>' +
              '</div>' +
            '</div>'
          : '') +

        '</div>'
      );
    }).join('');

    lista.querySelectorAll('.btn-aceitar-alerta').forEach(btn => {
      btn.addEventListener('click', () =>
        this._decidirAlerta(btn.dataset.id, btn.dataset.itemId, parseFloat(btn.dataset.novoPreco), 'Aceito')
      );
    });
    lista.querySelectorAll('.btn-recusar-alerta').forEach(btn => {
      btn.addEventListener('click', () =>
        this._decidirAlerta(btn.dataset.id, btn.dataset.itemId, null, 'Recusado')
      );
    });
  },

  async _decidirAlerta(alertaId, catalogoItemId, novoPreco, decisao) {
    const obs = document.getElementById('obs-decisao-' + alertaId)?.value.trim() || '';

    const payload = {
      status:             decisao,
      decidido_por:       App.currentUser?.nome,
      data_decisao:       new Date().toISOString(),
      observacao_decisao: obs || null,
    };

    try {
      await Storage.update(TABLES.alertasCusto, alertaId, payload);

      if (decisao === 'Aceito' && catalogoItemId && novoPreco > 0) {
        await Storage.update(TABLES.catalogoItens, catalogoItemId, {
          preco_ref:  novoPreco,
          updated_at: new Date().toISOString(),
        });
        Components.Toast.success('✅ Alerta aceito! Preço de referência atualizado para ' + Utils.formatCurrency(novoPreco) + '.');
      } else {
        Components.Toast.info('❌ Alerta recusado. Preço de referência mantido.');
      }

      await this._renderAbaAlertas();
    } catch(e) {
      console.error('[Catalogo._decidirAlerta]', e);
      Components.Toast.error('Erro ao registrar decisão.');
    }
  },
};

window.Pages = Pages;
