/* ============================================================
   FLUXOCOMPRAS — Cadastro de Categorias do Catálogo
============================================================ */

var Pages = window.Pages || {};

Pages.CatalogoCategorias = {

  _dados: [],

  /* ----------------------------------------------------------
     RENDER
  ---------------------------------------------------------- */
  async render() {
    document.title = 'Categorias do Catálogo';
    App.setPageTitle('Categorias do Catálogo');

    const canEdit = ['admin', 'gerente'].includes(App.currentUser?.role);

    document.getElementById('main-content').innerHTML = `
      <div class="page-header" style="margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <button class="btn btn-secondary" id="btn-voltar-catalogo"
              style="font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:6px;">
            ← Catálogo de Itens
          </button>
          <div class="page-header-info">
            <h1 style="font-size:24px;font-weight:800;color:#1a202c;letter-spacing:-0.5px;margin-bottom:2px;">
              🏷️ Categorias
            </h1>
            <p style="font-size:13px;color:#718096;">Organize os itens do catálogo por categoria</p>
          </div>
        </div>
        ${canEdit ? `
          <button class="btn-nova-req" id="btn-nova-categoria">
            <span style="font-size:16px;line-height:1;">＋</span>
            Nova Categoria
          </button>` : ''}
      </div>

      <div id="tabela-categorias"></div>`;

    document.getElementById('btn-voltar-catalogo')
      ?.addEventListener('click', () => App.navigate('catalogo'));
    document.getElementById('btn-nova-categoria')
      ?.addEventListener('click', () => this._abrirDialog(null));

    await this._carregar();
  },

  /* ----------------------------------------------------------
     CARREGAR
  ---------------------------------------------------------- */
  async _carregar() {
    const container = document.getElementById('tabela-categorias');
    if (!container) return;

    container.innerHTML = `
      <div class="req-table-wrap" style="animation:none;opacity:1;transform:none;">
        <table class="req-table"><thead><tr>
          ${['Categoria','Descrição','Itens','Status','Ações'].map(h => `<th>${h}</th>`).join('')}
        </tr></thead>
        <tbody>${[...Array(3)].map(() => `
          <tr class="req-skeleton-row" style="opacity:1;animation:none;">
            ${[140,180,60,80,80].map(w =>
              `<td><div class="skeleton req-skeleton-cell" style="width:${w}px;"></div></td>`
            ).join('')}
          </tr>`).join('')}
        </tbody></table>
      </div>`;

    try {
      const [cats, itens] = await Promise.all([
        Storage.list(TABLES.catalogoCategorias, { order: { column: 'created_at', ascending: true } }),
        Storage.list(TABLES.catalogoItens),
      ]);

      this._dados = cats || [];

      // Contagem de itens por categoria
      const contagem = {};
      (itens || []).forEach(i => {
        if (i.categoria) contagem[i.categoria] = (contagem[i.categoria] || 0) + 1;
      });

      // Categorias detectadas nos itens mas ainda não cadastradas formalmente
      const nomesCadastrados = new Set(this._dados.map(c => c.nome));
      Object.keys(contagem).forEach(nome => {
        if (!nomesCadastrados.has(nome)) {
          this._dados.push({ id: null, nome, descricao: null, ativo: true, _auto: true });
        }
      });

      this._renderTabela(contagem);
    } catch (e) {
      console.error('[CatalogoCategorias]', e);
      Components.Toast.error('Erro ao carregar categorias.');
      container.innerHTML = `
        <div class="req-table-wrap" style="animation:none;opacity:1;transform:none;">
          <div class="req-empty">
            <div class="req-empty-icon">⚠️</div>
            <span class="req-empty-title">Erro ao carregar</span>
            <span class="req-empty-sub">Tente novamente em instantes.</span>
          </div>
        </div>`;
    }
  },

  /* ----------------------------------------------------------
     RENDERIZAR TABELA
  ---------------------------------------------------------- */
  _renderTabela(contagem) {
    const container = document.getElementById('tabela-categorias');
    if (!container) return;
    const canEdit = ['admin', 'gerente'].includes(App.currentUser?.role);

    if (!this._dados.length) {
      container.innerHTML = `
        <div class="req-table-wrap" style="animation:none;opacity:1;transform:none;">
          <div class="req-empty">
            <div class="req-empty-icon">🏷️</div>
            <span class="req-empty-title">Nenhuma categoria cadastrada</span>
            <span class="req-empty-sub">Clique em "Nova Categoria" para começar.</span>
          </div>
        </div>`;
      return;
    }

    const linhas = this._dados.map((cat, i) => {
      const qtd   = contagem[cat.nome] || 0;
      const ativo = cat.ativo !== false;

      return `
        <tr style="opacity:0;transform:translateY(6px);transition:all .22s ease ${i * 35}ms;">
          <td style="font-weight:700;font-size:14px;color:#1a202c;">
            ${Utils.escapeHtml(cat.nome)}
            ${cat._auto ? `<span style="font-size:11px;font-weight:400;color:#94a3b8;margin-left:6px;">
              — detectada nos itens</span>` : ''}
          </td>
          <td style="color:#718096;font-size:13px;">
            ${Utils.escapeHtml(cat.descricao || '—')}
          </td>
          <td>
            <span class="cat-contagem-badge">${qtd} item${qtd !== 1 ? 's' : ''}</span>
          </td>
          <td>${Components.badge(ativo ? 'Ativo' : 'Inativo')}</td>
          <td>
            ${canEdit ? `
              <div style="display:flex;gap:6px;">
                <button class="req-btn-icon btn-editar-cat" data-idx="${i}" title="Editar">✏️</button>
                ${!cat._auto ? `
                  <button class="req-btn-icon btn-toggle-cat"
                          data-idx="${i}" data-ativo="${ativo}"
                          title="${ativo ? 'Inativar' : 'Ativar'}">
                    ${ativo ? '🔴' : '🟢'}
                  </button>` : ''}
              </div>` : '—'}
          </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="req-table-wrap" style="animation:none;opacity:1;transform:none;">
        <table class="req-table">
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Descrição</th>
              <th style="width:110px;">Itens</th>
              <th style="width:100px;">Status</th>
              <th style="width:100px;">Ações</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>`;

    requestAnimationFrame(() => {
      container.querySelectorAll('tbody tr').forEach(tr => {
        tr.style.opacity   = '1';
        tr.style.transform = 'translateY(0)';
      });
    });

    container.querySelectorAll('.btn-editar-cat').forEach(btn => {
      btn.addEventListener('click', () => this._abrirDialog(this._dados[parseInt(btn.dataset.idx)]));
    });

    container.querySelectorAll('.btn-toggle-cat').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat   = this._dados[parseInt(btn.dataset.idx)];
        const ativo = btn.dataset.ativo === 'true';
        this._toggleAtivo(cat, ativo);
      });
    });
  },

  /* ----------------------------------------------------------
     DIALOG CRIAR / EDITAR
  ---------------------------------------------------------- */
  _abrirDialog(cat) {
    Components.Modal.show({
      title:   cat?.id ? `Editar — ${cat.nome}` : 'Nova Categoria',
      size:    'sm',
      content: `
        <div style="display:flex;flex-direction:column;gap:16px;">
          <div class="drawer-field">
            <label class="drawer-label">Nome <span class="required">*</span></label>
            <input class="drawer-input" type="text" id="cat-nome" maxlength="60"
              placeholder="Ex: Material de Escritório"
              value="${Utils.escapeHtml(cat?.nome || '')}" />
          </div>
          <div class="drawer-field">
            <label class="drawer-label">Descrição</label>
            <input class="drawer-input" type="text" id="cat-desc"
              placeholder="Descrição opcional"
              value="${Utils.escapeHtml(cat?.descricao || '')}" />
          </div>
        </div>`,
      footer: `
        <button class="drawer-btn-cancelar" id="btn-cancelar-cat">Cancelar</button>
        <button class="drawer-btn-salvar"   id="btn-salvar-cat">💾 Salvar</button>`,
    });

    document.getElementById('cat-nome')?.focus();

    document.getElementById('btn-cancelar-cat')
      ?.addEventListener('click', () => Components.Modal.hide());
    document.getElementById('btn-salvar-cat')
      ?.addEventListener('click', () => this._salvar(cat));
  },

  /* ----------------------------------------------------------
     SALVAR
  ---------------------------------------------------------- */
  async _salvar(catAtual) {
    const nome = document.getElementById('cat-nome')?.value.trim();
    if (!nome) { Components.Toast.warning('Informe o nome da categoria.'); return; }

    if (!catAtual?.id) {
      const dup = this._dados.some(c => c.id && c.nome.toLowerCase() === nome.toLowerCase());
      if (dup) { Components.Toast.warning('Já existe uma categoria com este nome.'); return; }
    }

    const payload = {
      nome,
      descricao: document.getElementById('cat-desc')?.value.trim() || null,
    };

    const btn = document.getElementById('btn-salvar-cat');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Salvando…'; }

    try {
      if (catAtual?.id) {
        await Storage.update(TABLES.catalogoCategorias, catAtual.id, payload);
        Components.Toast.success('Categoria atualizada!');
      } else {
        await Storage.create(TABLES.catalogoCategorias, { ...payload, ativo: true });
        Components.Toast.success('Categoria criada!');
      }
      Components.Modal.hide();
      await this._carregar();
    } catch (e) {
      console.error('[CatalogoCategorias]', e);
      Components.Toast.error('Erro ao salvar categoria.');
      if (btn) { btn.disabled = false; btn.textContent = '💾 Salvar'; }
    }
  },

  /* ----------------------------------------------------------
     ATIVAR / INATIVAR
  ---------------------------------------------------------- */
  _toggleAtivo(cat, ativoAtual) {
    Components.Modal.confirm({
      title:   `${!ativoAtual ? 'Ativar' : 'Inativar'} categoria`,
      message: `Deseja ${!ativoAtual ? 'ativar' : 'inativar'} a categoria "${cat.nome}"?`,
      type:    !ativoAtual ? 'success' : 'warning',
      onOk:    async () => {
        try {
          await Storage.update(TABLES.catalogoCategorias, cat.id, { ativo: !ativoAtual });
          Components.Toast.success(`Categoria ${!ativoAtual ? 'ativada' : 'inativada'}!`);
          await this._carregar();
        } catch (e) {
          Components.Toast.error('Erro ao atualizar status.');
        }
      },
    });
  },

};

window.Pages = Pages;
