/* ============================================================
   FLUXOCOMPRAS — Página: Fornecedores — Cadastro
   ============================================================ */

var Pages = window.Pages || {};

Pages.FornecedoresCadastro = {

  async render() {
    document.title = 'Fluxo Compras · Concrem';
    App.setPageTitle('Fornecedores');

    const role = App.currentUser?.role;
    if (!['admin', 'gerente'].includes(role)) {
      Components.Toast.error('Acesso não autorizado.');
      App.navigate('dashboard');
      return;
    }

    document.getElementById('main-content').innerHTML = `
      ${Components.pageHeader({
        title:    'Fornecedores',
        subtitle: 'Cadastre e gerencie os fornecedores homologados',
      })}
      <div id="fornecedores-cad-container">
        <div style="padding:32px;text-align:center;color:#718096;font-family:'Manrope',sans-serif;">Carregando...</div>
      </div>`;

    await this._carregar();
  },

  async _carregar() {
    const container = document.getElementById('fornecedores-cad-container');
    if (!container) return;

    const canEdit = ['admin', 'gerente'].includes(App.currentUser?.role);

    try {
      const fornecedores = await Storage.list(TABLES.fornecedores, { order: { column: 'nome' } });
      container.innerHTML = `
        <div class="cfg-aba-header">
          <div>
            <div class="cfg-aba-title">Fornecedores Homologados</div>
            <div class="cfg-aba-sub">Total: ${fornecedores.length} fornecedor${fornecedores.length !== 1 ? 'es' : ''}</div>
          </div>
          ${canEdit ? `<button class="btn btn-primary" id="btn-novo-fornecedor">＋ Novo Fornecedor</button>` : ''}
        </div>
        <div style="overflow-x:auto;">
          <table class="cfg-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CNPJ</th>
                <th>Contato</th>
                <th>Email</th>
                <th style="text-align:center;">Nota</th>
                <th style="text-align:center;">Status</th>
                ${canEdit ? `<th style="text-align:center;">Ações</th>` : ''}
              </tr>
            </thead>
            <tbody>
              ${fornecedores.length
                ? fornecedores.map(f => this._linhaFornecedor(f, canEdit)).join('')
                : `<tr><td colspan="${canEdit ? 7 : 6}" style="text-align:center;padding:32px;color:#A0AEC0;font-size:13px;font-family:'Manrope',sans-serif;">Nenhum fornecedor cadastrado.</td></tr>`}
            </tbody>
          </table>
        </div>`;

      if (canEdit) {
        document.getElementById('btn-novo-fornecedor')
          ?.addEventListener('click', () => this.abrirDialogFornecedor());
        container.querySelectorAll('.btn-editar-forn').forEach(btn =>
          btn.addEventListener('click', () => this.abrirDialogFornecedor(btn.dataset.id))
        );
        container.querySelectorAll('.btn-toggle-forn').forEach(btn =>
          btn.addEventListener('click', () =>
            this.toggleAtivacaoFornecedor(btn.dataset.id, btn.dataset.ativo === 'true')
          )
        );
      }
    } catch (e) {
      container.innerHTML = `<p style="padding:24px;color:#718096;font-family:'Manrope',sans-serif;">Erro: ${Utils.escapeHtml(e.message)}</p>`;
    }
  },

  _linhaFornecedor(f, canEdit = true) {
    const ativo = f.ativo !== false;
    const nota  = f.nota_media_qualidade
      ? `<span style="color:#f59e0b;font-size:13px;">★</span> <span style="font-weight:600;">${parseFloat(f.nota_media_qualidade).toFixed(1)}</span>`
      : '<span style="color:#CBD5E0;">—</span>';
    return `
      <tr>
        <td style="font-weight:600;">${Utils.escapeHtml(f.nome || '—')}</td>
        <td style="font-size:12px;color:#718096;">${Utils.escapeHtml(f.cnpj || '—')}</td>
        <td style="font-size:13px;">${Utils.escapeHtml(f.contato || f.contato_nome || '—')}</td>
        <td style="font-size:13px;">${Utils.escapeHtml(f.contato_email || '—')}</td>
        <td style="text-align:center;">${nota}</td>
        <td style="text-align:center;">${Components.badge(ativo ? 'Ativo' : 'Inativo')}</td>
        ${canEdit ? `
        <td style="text-align:center;">
          <div style="display:flex;justify-content:center;gap:4px;">
            <button class="cfg-btn-acao btn-editar-forn" data-id="${f.id}" title="Editar">✏️</button>
            <button class="cfg-btn-acao danger btn-toggle-forn"
              data-id="${f.id}" data-ativo="${ativo}"
              title="${ativo ? 'Inativar' : 'Ativar'}">
              ${ativo ? '🔒' : '🔓'}
            </button>
          </div>
        </td>` : ''}
      </tr>`;
  },

  abrirDialogFornecedor(id = null) {
    Components.Modal.show({
      title:   id ? 'Editar Fornecedor' : 'Novo Fornecedor',
      content: this._formFornecedor(),
      size:    'lg',
      footer: `
        <button class="drawer-btn-cancelar" id="btn-cancelar-forn">Cancelar</button>
        <button class="drawer-btn-salvar"   id="btn-salvar-forn">Salvar</button>`,
    });

    const cnpjInput = document.getElementById('forn-cnpj');
    cnpjInput?.addEventListener('input', e => {
      e.target.value = this._mascaraCNPJ(e.target.value);
    });

    if (id) {
      Storage.get(TABLES.fornecedores, id).then(f => {
        if (!f) return;
        document.getElementById('forn-nome').value     = f.nome          || '';
        document.getElementById('forn-cnpj').value     = f.cnpj          || '';
        document.getElementById('forn-contato').value  = f.contato       || '';
        document.getElementById('forn-telefone').value = f.telefone      || '';
        document.getElementById('forn-email').value    = f.contato_email || '';
        document.getElementById('forn-endereco').value = f.endereco      || '';
        document.getElementById('forn-ativo').checked  = !!f.ativo;
      }).catch(() => {});
    }

    document.getElementById('btn-cancelar-forn')
      ?.addEventListener('click', () => Components.Modal.hide());
    document.getElementById('btn-salvar-forn')
      ?.addEventListener('click', () => this.salvarFornecedor(id));
  },

  _formFornecedor() {
    return `
      <div class="drawer-form-row">
        <div class="drawer-field">
          <label class="drawer-label">Razão Social <span class="required">*</span></label>
          <input type="text" id="forn-nome" class="drawer-input" placeholder="Nome do fornecedor">
        </div>
        <div class="drawer-field">
          <label class="drawer-label">CNPJ</label>
          <input type="text" id="forn-cnpj" class="drawer-input" placeholder="00.000.000/0000-00" maxlength="18">
        </div>
      </div>
      <div class="drawer-form-row">
        <div class="drawer-field">
          <label class="drawer-label">Nome do Contato</label>
          <input type="text" id="forn-contato" class="drawer-input">
        </div>
        <div class="drawer-field">
          <label class="drawer-label">Telefone</label>
          <input type="text" id="forn-telefone" class="drawer-input">
        </div>
      </div>
      <div class="drawer-form-row">
        <div class="drawer-field">
          <label class="drawer-label">Email do Contato</label>
          <input type="email" id="forn-email" class="drawer-input">
        </div>
        <div class="drawer-field">
          <label class="drawer-label">Endereço</label>
          <input type="text" id="forn-endereco" class="drawer-input">
        </div>
      </div>
      <div class="drawer-field">
        <label class="drawer-check-row">
          <input type="checkbox" id="forn-ativo" checked>
          <span class="drawer-check-label">Fornecedor ativo</span>
          <span class="drawer-check-hint">— disponível para cotações</span>
        </label>
      </div>`;
  },

  async salvarFornecedor(id = null) {
    const nome  = document.getElementById('forn-nome')?.value.trim();
    const ativo = document.getElementById('forn-ativo')?.checked ?? true;

    if (!nome) { Components.Toast.warning('Informe a razão social.'); return; }

    const dados = {
      nome,
      cnpj:          document.getElementById('forn-cnpj')?.value.trim()    || null,
      contato:       document.getElementById('forn-contato')?.value.trim()  || null,
      telefone:      document.getElementById('forn-telefone')?.value.trim() || null,
      contato_email: document.getElementById('forn-email')?.value.trim()    || null,
      endereco:      document.getElementById('forn-endereco')?.value.trim() || null,
      ativo,
    };

    try {
      if (id) {
        await Storage.update(TABLES.fornecedores, id, dados);
        Components.Toast.success('Fornecedor atualizado!');
      } else {
        await Storage.create(TABLES.fornecedores, { ...dados, total_avaliacoes: 0 });
        Components.Toast.success('Fornecedor criado!');
      }
      Components.Modal.hide();
      await this._carregar();
    } catch (e) {
      Components.Toast.error('Erro ao salvar: ' + e.message);
    }
  },

  toggleAtivacaoFornecedor(id, ativoAtual) {
    Components.Modal.confirm({
      title:        ativoAtual ? 'Inativar fornecedor' : 'Ativar fornecedor',
      message:      `Deseja realmente ${ativoAtual ? 'inativar' : 'ativar'} este fornecedor?`,
      danger:       ativoAtual,
      type:         ativoAtual ? 'danger' : 'success',
      icon:         ativoAtual ? '🔒' : '🔓',
      confirmLabel: ativoAtual ? 'Inativar' : 'Ativar',
      onConfirm: async () => {
        try {
          await Storage.update(TABLES.fornecedores, id, { ativo: !ativoAtual });
          Components.Toast.success(`Fornecedor ${ativoAtual ? 'inativado' : 'ativado'}!`);
          await this._carregar();
        } catch (e) {
          Components.Toast.error('Erro: ' + e.message);
        }
      },
    });
  },

  _mascaraCNPJ(v) {
    return v.replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  },
};

window.Pages = Pages;
