/* ============================================================
   FLUXOCOMPRAS — Página: Usuários (Admin)
   ============================================================ */

var Pages = window.Pages || {};

Pages.Usuarios = {

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

  async render() {
    document.title = 'Fluxo Compras — Usuários';
    App.setPageTitle('Usuários');

    // Permite: admin, quem tem permissão de usuários, ou líder de grupo
    const user = App.currentUser;
    const isAdmin  = user.role === 'admin';
    const temPerm  = Permissoes.pode('usuarios', 'ver');
    const lideres  = await this._carregarLideres();
    const isLider  = !isAdmin && !temPerm && Object.values(lideres).some(lista => {
      const arr = Array.isArray(lista) ? lista : (lista ? [lista] : []);
      return arr.some(uid => String(uid) === String(user.id));
    });

    if (!isAdmin && !temPerm && !isLider) {
      Components.Toast.error('Você não tem permissão para acessar Usuários.');
      App.navigate('dashboard');
      return;
    }

    // Guardar grupos que este usuário lidera (para filtrar o que pode ver/editar)
    this._gruposLiderados = isAdmin ? null : Object.keys(lideres).filter(role => {
      const arr = Array.isArray(lideres[role]) ? lideres[role] : (lideres[role] ? [lideres[role]] : []);
      return arr.some(uid => String(uid) === String(user.id));
    });

    document.getElementById('main-content').innerHTML = `
      ${Components.pageHeader({
        title:    'Usuários',
        subtitle: 'Gerencie os usuários e seus perfis de acesso',
      })}
      <div id="usuarios-container">
        <div style="padding:32px;text-align:center;color:#718096;font-family:'Manrope',sans-serif;">Carregando...</div>
      </div>`;

    await this._carregar();
  },

  async _carregar() {
    const container = document.getElementById('usuarios-container');
    if (!container) return;

    const isAdmin = App.currentUser?.role === 'admin';
    const canEdit = isAdmin || Permissoes.pode('usuarios', 'editar');

    try {
      const [todosUsuarios, lideres, userMeta] = await Promise.all([
        Storage.list(TABLES.usuarios, { order: { column: 'nome' } }),
        this._carregarLideres(),
        this._carregarUserMeta(),
      ]);

      // Líder só vê usuários dos grupos que lidera
      const gruposLiderados = this._gruposLiderados;
      const usuarios = (gruposLiderados && gruposLiderados.length > 0)
        ? todosUsuarios.filter(u => gruposLiderados.includes(u.role) || String(u.id) === String(App.currentUser?.id))
        : todosUsuarios;

      container.innerHTML = `
        <div class="cfg-aba-header">
          <div>
            <div class="cfg-aba-title">Usuários do Sistema</div>
            <div class="cfg-aba-sub">Total: ${usuarios.length} usuário${usuarios.length !== 1 ? 's' : ''}
              ${gruposLiderados?.length ? ' <span style="font-size:11px;color:#94a3b8;">(do seu grupo)</span>' : ''}
            </div>
          </div>
          ${canEdit ? '<button class="btn btn-primary" id="btn-novo-usuario">＋ Novo Usuário</button>' : ''}
        </div>
        <div style="overflow-x:auto;">
          <table class="cfg-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Perfil</th>
                <th>Nível de Alçada</th>
                <th>Líder do Grupo</th>
                <th>Senha</th>
                <th style="text-align:center;">Status</th>
                <th style="text-align:center;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${usuarios.length
                ? usuarios.map(u => this._linhaUsuario(u, lideres, userMeta)).join('')
                : `<tr><td colspan="7" style="text-align:center;padding:32px;color:#A0AEC0;font-size:13px;font-family:'Manrope',sans-serif;">Nenhum usuário cadastrado.</td></tr>`}
            </tbody>
          </table>
        </div>`;

      document.getElementById('btn-novo-usuario')
        ?.addEventListener('click', () => this.abrirDialogUsuario());
      container.querySelectorAll('.btn-editar-usr').forEach(btn =>
        btn.addEventListener('click', () => this.abrirDialogUsuario(btn.dataset.id))
      );
      container.querySelectorAll('.btn-toggle-usr').forEach(btn =>
        btn.addEventListener('click', () =>
          this.toggleAtivacaoUsuario(btn.dataset.id, btn.dataset.ativo === 'true')
        )
      );
      container.querySelectorAll('.btn-excluir-usr').forEach(btn =>
        btn.addEventListener('click', () =>
          this.excluirUsuario(btn.dataset.id, btn.dataset.nome)
        )
      );
    } catch (e) {
      container.innerHTML = `<p style="padding:24px;color:#718096;font-family:'Manrope',sans-serif;">Erro ao carregar usuários: ${Utils.escapeHtml(e.message)}</p>`;
    }
  },

  _linhaUsuario(u, lideres = {}, userMeta = {}) {
    const cor        = this.ROLE_COLORS[u.role] || '#64748b';
    const label      = this.ROLE_LABELS[u.role]  || u.role;
    const inicial    = (u.nome || '?').charAt(0).toUpperCase();
    const ativo      = u.ativo !== false;
    const senha      = u.senha || '—';
    const nivelAlcada = userMeta[u.id]?.nivel_alcada || null;

    // Grupos onde este usuário consta no array de líderes
    const gruposLiderados = Object.keys(lideres).filter(r => {
      const lista = Array.isArray(lideres[r]) ? lideres[r] : (lideres[r] ? [lideres[r]] : []);
      return lista.some(uid => String(uid) === String(u.id));
    });

    const totalGrupos  = Object.keys(this.ROLE_LABELS).length;
    const liderDeTodos = gruposLiderados.length >= totalGrupos;

    const liderBadge = gruposLiderados.length === 0
      ? `<span style="font-size:12px;color:#cbd5e1;">—</span>`
      : liderDeTodos
        ? `<span class="role-pill" style="--role-color:hsl(142,70%,35%);">👑 Todos os Grupos</span>`
        : gruposLiderados.map(r => {
            const c = this.ROLE_COLORS[r] || '#64748b';
            const l = this.ROLE_LABELS[r] || r;
            return `<span class="role-pill" style="--role-color:${c};margin-right:3px;">👑 ${Utils.escapeHtml(l)}</span>`;
          }).join('');

    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="usr-avatar" style="background:${cor};">${inicial}</div>
            <div>
              <div style="font-weight:600;color:#1a202c;font-size:13px;">${Utils.escapeHtml(u.nome)}</div>
              <div style="font-size:12px;color:#718096;">${Utils.escapeHtml(u.email)}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="role-pill" style="--role-color:${cor};">${label}</span>
        </td>
        <td>
          ${nivelAlcada
            ? `<span class="role-pill" style="--role-color:#64748b;">${Utils.escapeHtml(nivelAlcada)}</span>`
            : `<span style="font-size:12px;color:#cbd5e1;">—</span>`}
        </td>
        <td>${liderBadge}</td>
        <td>
          <div style="display:flex;align-items:center;gap:6px;">
            <code style="font-size:12px;background:#f1f5f9;padding:2px 7px;border-radius:5px;
                         color:#334155;font-family:monospace;letter-spacing:.04em;">
              ${Utils.escapeHtml(senha)}
            </code>
            <button class="cfg-btn-acao" title="Copiar senha"
              onclick="navigator.clipboard?.writeText('${Utils.escapeHtml(senha)}');
                       Components.Toast.success('Senha copiada!');">📋</button>
          </div>
        </td>
        <td style="text-align:center;">
          ${Components.badge(ativo ? 'Ativo' : 'Inativo')}
        </td>
        <td style="text-align:center;">
          <div style="display:flex;justify-content:center;gap:4px;">
            <button class="cfg-btn-acao btn-editar-usr" data-id="${u.id}" title="Editar">✏️</button>
            <button class="cfg-btn-acao danger btn-toggle-usr"
              data-id="${u.id}" data-ativo="${ativo}"
              title="${ativo ? 'Inativar' : 'Ativar'}">
              ${ativo ? '🔒' : '🔓'}
            </button>
            <button class="cfg-btn-acao danger btn-excluir-usr"
              data-id="${u.id}" data-nome="${Utils.escapeHtml(u.nome)}"
              title="Excluir usuário">🗑️</button>
          </div>
        </td>
      </tr>`;
  },

  async abrirDialogUsuario(id = null) {
    const [configRow, lideres, userMeta] = await Promise.all([
      Storage.getConfigAlcadas().catch(() => null),
      this._carregarLideres(),
      this._carregarUserMeta(),
    ]);
    const alcadas = configRow?.alcadas?.length
      ? [...configRow.alcadas].sort((a, b) => a.valor_minimo - b.valor_minimo)
      : [{ nome: 'Supervisor' }, { nome: 'Gerente' }, { nome: 'Diretor' }];

    Components.Modal.show({
      title:   id ? 'Editar Usuário' : 'Novo Usuário',
      content: this._formUsuario(id, alcadas),
      size:    'md',
      footer: `
        <button class="drawer-btn-cancelar" id="btn-cancelar-usr">Cancelar</button>
        <button class="drawer-btn-salvar"   id="btn-salvar-usr">Salvar</button>`,
    });

    // Instanciar CustomSelect de Role
    this._csUsrRole = CustomSelect.criar(
      document.getElementById('cs-usr-role'),
      Object.entries(this.ROLE_LABELS).map(([v, l]) => ({
        value: v, label: l, dotColor: this.ROLE_COLORS[v],
      })),
      { placeholder: 'Selecione o perfil...', busca: false, limpar: false, rodape: false, value: 'solicitante' }
    );

    // Instanciar CustomSelect de Nível de Alçada
    this._csUsrNivel = CustomSelect.criar(
      document.getElementById('cs-usr-nivel-alcada'),
      [{ value: '', label: 'Sem permissão de aprovação' }].concat(
        alcadas.map(a => ({ value: a.nome, label: a.nome }))
      ),
      { placeholder: 'Sem permissão de aprovação', busca: false, limpar: false, rodape: false, value: '' }
    );

    if (id) {
      Storage.get(TABLES.usuarios, id).then(u => {
        if (!u) return;
        document.getElementById('usr-nome').value    = u.nome  || '';
        document.getElementById('usr-email').value   = u.email || '';
        document.getElementById('usr-ativo').checked       = !!u.ativo;
        document.getElementById('usr-trocar-senha').checked = !!u.trocar_senha;

        this._csUsrRole?.setValue(u.role || 'solicitante');

        // nivel_alcada vem do userMeta, não do registro do usuário
        this._csUsrNivel?.setValue(userMeta[id]?.nivel_alcada || '');

        // Marca checkboxes dos grupos que este usuário lidera
        document.querySelectorAll('.usr-lider-cb').forEach(cb => {
          const lista = Array.isArray(lideres[cb.value]) ? lideres[cb.value] : (lideres[cb.value] ? [lideres[cb.value]] : []);
          cb.checked = lista.some(uid => String(uid) === String(id));
        });

        // senha não é armazenada na tabela — gerenciada pelo Supabase Auth
      }).catch(() => {});
    }

    document.getElementById('btn-cancelar-usr')
      ?.addEventListener('click', () => Components.Modal.hide());
    document.getElementById('btn-salvar-usr')
      ?.addEventListener('click', () => this.salvarUsuario(id));

    // Bind: "Líder de Todos" — marcar/desmarcar todos os grupos
    const cbTodos = document.getElementById('usr-lider-todos');
    const cbsIndiv = () => document.querySelectorAll('.usr-lider-cb');

    cbTodos?.addEventListener('change', () => {
      cbsIndiv().forEach(cb => { cb.checked = cbTodos.checked; });
    });

    // Se qualquer individual for desmarcado, desmarcar o "Todos"
    document.getElementById('usr-lider-individuais')
      ?.addEventListener('change', () => {
        const todos = [...cbsIndiv()];
        if (cbTodos) cbTodos.checked = todos.length > 0 && todos.every(cb => cb.checked);
      });

    // Ao carregar usuário existente: marcar "Todos" se todos estiverem marcados
    if (id) {
      setTimeout(() => {
        const todos = [...cbsIndiv()];
        if (cbTodos && todos.length > 0 && todos.every(cb => cb.checked)) {
          cbTodos.checked = true;
        }
      }, 100);
    }
  },

  _formUsuario(id = null, alcadas = []) {
    const roles  = Object.entries(this.ROLE_LABELS);
    const isNovo = !id;
    const opcoesAlcada = alcadas.map(a =>
      `<option value="${Utils.escapeHtml(a.nome)}">${Utils.escapeHtml(a.nome)}</option>`
    ).join('');
    const todosRoles = Object.entries(this.ROLE_LABELS);

    return `
      <div class="drawer-form-row">
        <div class="drawer-field">
          <label class="drawer-label">Nome Completo <span class="required">*</span></label>
          <input type="text" id="usr-nome" class="drawer-input" placeholder="Nome do usuário">
        </div>
        <div class="drawer-field">
          <label class="drawer-label">E-mail <span class="required">*</span></label>
          <input type="email" id="usr-email" class="drawer-input" placeholder="nome@concrem.com.br" autocomplete="off">
        </div>
      </div>
      <div class="drawer-form-row">
        <div class="drawer-field">
          <label class="drawer-label">Perfil de Acesso <span class="required">*</span></label>
          <div id="cs-usr-role"></div>
        </div>
        <div class="drawer-field">
          <label class="drawer-label">Nível de Alçada</label>
          <div id="cs-usr-nivel-alcada"></div>
        </div>
      </div>
      <div class="drawer-field" id="usr-lider-grupo-wrap">
        <label class="drawer-label">Líder do Grupo</label>

        <!-- Opção "Todos os grupos" -->
        <label style="display:flex;align-items:center;gap:8px;margin-top:8px;margin-bottom:10px;
                      padding:10px 12px;background:#f0fdf4;border:1.5px solid #bbf7d0;
                      border-radius:8px;cursor:pointer;font-family:'Manrope',sans-serif;">
          <input type="checkbox" id="usr-lider-todos"
            style="width:16px;height:16px;accent-color:hsl(142,70%,35%);cursor:pointer;flex-shrink:0;">
          <div>
            <span style="font-size:13px;font-weight:700;color:hsl(142,70%,25%);">👑 Líder de Todos os Grupos</span>
            <span style="display:block;font-size:11px;color:#64748b;margin-top:1px;">Marca automaticamente todos os grupos abaixo</span>
          </div>
        </label>

        <div style="display:flex;flex-wrap:wrap;gap:8px 16px;padding-left:4px;" id="usr-lider-individuais">
          ${todosRoles.map(([v, l]) => `
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:#374151;
                          font-family:'Manrope',sans-serif;cursor:pointer;">
              <input type="checkbox" class="usr-lider-cb" value="${v}"
                style="width:15px;height:15px;accent-color:${this.ROLE_COLORS[v] || '#3b82f6'};cursor:pointer;">
              ${Utils.escapeHtml(l)}
            </label>`).join('')}
        </div>
        <span style="font-size:11px;color:#9ca3af;display:block;margin-top:6px;">
          Um usuário pode liderar mais de um grupo. O líder pode gerenciar permissões dos membros em Configurações.
        </span>
      </div>

      ${isNovo ? `
      <div class="drawer-field">
        <label class="drawer-label">Senha <span class="required">*</span></label>
        <div style="position:relative;display:flex;align-items:center;">
          <input type="password" id="usr-senha" class="drawer-input"
            placeholder="Mínimo 6 caracteres" style="padding-right:38px;" autocomplete="new-password">
          <button type="button" tabindex="-1"
            style="position:absolute;right:10px;background:none;border:none;cursor:pointer;
                   font-size:15px;opacity:0.5;padding:0;"
            onclick="(function(){var i=document.getElementById('usr-senha');
              i.type=i.type==='password'?'text':'password';})()">👁️</button>
        </div>
      </div>` : `
      <div class="drawer-field">
        <label class="drawer-label">Nova Senha <span style="color:#718096;font-weight:400;">(deixe em branco para manter)</span></label>
        <div style="position:relative;display:flex;align-items:center;">
          <input type="password" id="usr-senha" class="drawer-input"
            placeholder="Nova senha..." style="padding-right:38px;" autocomplete="new-password">
          <button type="button" tabindex="-1"
            style="position:absolute;right:10px;background:none;border:none;cursor:pointer;
                   font-size:15px;opacity:0.5;padding:0;"
            onclick="(function(){var i=document.getElementById('usr-senha');
              i.type=i.type==='password'?'text':'password';})()">👁️</button>
        </div>
      </div>`}

      <div class="drawer-field">
        <label class="drawer-check-row">
          <input type="checkbox" id="usr-ativo" checked>
          <span class="drawer-check-label">Usuário ativo</span>
        </label>
      </div>
      <div class="drawer-field">
        <label class="drawer-check-row">
          <input type="checkbox" id="usr-trocar-senha">
          <span class="drawer-check-label">Exigir troca de senha no próximo login</span>
        </label>
      </div>`;
  },

  async salvarUsuario(id = null) {
    const nome           = document.getElementById('usr-nome')?.value.trim();
    const email          = (document.getElementById('usr-email')?.value || '').trim().toLowerCase();
    const role           = this._csUsrRole?.getValue() || '';
    const nivel_alcada   = this._csUsrNivel?.getValue() || null;
    const lider_do_grupo = Array.from(document.querySelectorAll('.usr-lider-cb:checked')).map(cb => cb.value);
    const ativo          = document.getElementById('usr-ativo')?.checked ?? true;
    const trocar_senha   = document.getElementById('usr-trocar-senha')?.checked ?? false;
    const senha          = (document.getElementById('usr-senha')?.value || '').trim();

    if (!nome)  { Components.Toast.warning('Informe o nome.'); return; }
    if (!email) { Components.Toast.warning('Informe o e-mail.'); return; }
    if (!email.endsWith('@concrem.com.br')) {
      Components.Toast.warning('E-mail deve ser do domínio @concrem.com.br'); return;
    }
    if (!id && !senha) {
      Components.Toast.warning('Informe uma senha para o novo usuário.'); return;
    }
    if (senha && senha.length < 8) {
      Components.Toast.warning('A senha deve ter pelo menos 8 caracteres.'); return;
    }

    try {
      let savedId = id;

      if (id) {
        // Atualizar usuário existente (sem senha na tabela)
        await Storage.update(TABLES.usuarios, id, { nome, email, role, ativo, trocar_senha });

        // Alterar senha via Edge Function (somente se informada)
        if (senha) {
          const { data: result, error } = await _sb.functions.invoke('alterar-senha-admin', {
            body: { usuario_id: id, nova_senha: senha }
          });
          const msgErro = error?.message || result?.error;
          if (msgErro) {
            Components.Toast.error('Usuário salvo, mas erro ao alterar senha: ' + msgErro);
            await this._salvarUserData(savedId, role, nivel_alcada, lider_do_grupo);
            Components.Modal.hide();
            await this._carregar();
            return;
          }
        }

        Components.Toast.success('Usuário atualizado!');
      } else {
        // Criar novo usuário via Edge Function (cria no Auth + tabela)
        const { data: result, error } = await _sb.functions.invoke('criar-usuario', {
          body: { nome, email, role, senha, trocar_senha }
        });
        const msgErro = error?.message || result?.error;
        if (msgErro) throw new Error(msgErro);
        savedId = result.id;
        Components.Toast.success('Usuário criado!');
      }

      await this._salvarUserData(savedId, role, nivel_alcada, lider_do_grupo);
      Components.Modal.hide();
      await this._carregar();
    } catch (e) {
      Components.Toast.error('Erro ao salvar: ' + (e.message || e));
    }
  },

  async _carregarLideres() {
    try {
      const configs = await Storage.list(TABLES.configPermissoes).catch(() => []);
      const cfg     = configs?.[0] || {};
      const perm    = cfg.permissoes
        ? (typeof cfg.permissoes === 'string' ? JSON.parse(cfg.permissoes) : cfg.permissoes)
        : {};
      return perm._lideres || {};
    } catch { return {}; }
  },

  async _carregarUserMeta() {
    try {
      const configs = await Storage.list(TABLES.configPermissoes).catch(() => []);
      const cfg     = configs?.[0] || {};
      const perm    = cfg.permissoes
        ? (typeof cfg.permissoes === 'string' ? JSON.parse(cfg.permissoes) : cfg.permissoes)
        : {};
      return perm._user_meta || {};
    } catch { return {}; }
  },

  async _salvarUserData(userId, role, nivelAlcada, gruposLiderados) {
    const configs = await Storage.list(TABLES.configPermissoes).catch(() => []);
    const existente = configs?.[0] || {};
    const permExistente = existente.permissoes
      ? (typeof existente.permissoes === 'string' ? JSON.parse(existente.permissoes) : existente.permissoes)
      : {};

    // Atualiza _user_meta
    const userMeta = { ...(permExistente._user_meta || {}) };
    if (nivelAlcada) {
      userMeta[userId] = { ...(userMeta[userId] || {}), nivel_alcada: nivelAlcada };
    } else {
      if (userMeta[userId]) {
        delete userMeta[userId].nivel_alcada;
        if (Object.keys(userMeta[userId]).length === 0) delete userMeta[userId];
      }
    }

    // Atualiza _lideres — estrutura: { role: [userId, ...] }
    // Normaliza entradas antigas (string → array) e remove este userId de todos os grupos
    const lideres = {};
    Object.keys(permExistente._lideres || {}).forEach(r => {
      const lista = Array.isArray(permExistente._lideres[r])
        ? permExistente._lideres[r]
        : (permExistente._lideres[r] ? [permExistente._lideres[r]] : []);
      const filtrada = lista.filter(uid => String(uid) !== String(userId));
      if (filtrada.length > 0) lideres[r] = filtrada;
    });

    // Adiciona nos grupos selecionados
    const grupos = Array.isArray(gruposLiderados) ? gruposLiderados : (gruposLiderados ? [gruposLiderados] : []);
    grupos.forEach(r => {
      if (!r) return;
      if (!lideres[r]) lideres[r] = [];
      if (!lideres[r].includes(userId)) lideres[r].push(userId);
    });

    const payload = {
      permissoes: { ...permExistente, _user_meta: userMeta, _lideres: lideres },
      updated_at: new Date().toISOString(),
      updated_by: App.currentUser?.nome || 'admin',
    };

    if (existente.id) {
      await Storage.update(TABLES.configPermissoes, existente.id, payload);
    } else {
      await Storage.create(TABLES.configPermissoes, payload);
    }
  },

  async _salvarLider(userId, grupoRole) {
    await this._salvarUserData(userId, null, null, grupoRole ? [grupoRole] : []);
  },

  toggleAtivacaoUsuario(id, ativoAtual) {
    Components.Modal.confirm({
      title:        ativoAtual ? 'Inativar usuário' : 'Ativar usuário',
      message:      `Deseja realmente ${ativoAtual ? 'inativar' : 'ativar'} este usuário?`,
      danger:       ativoAtual,
      type:         ativoAtual ? 'danger' : 'success',
      icon:         ativoAtual ? '🔒' : '🔓',
      confirmLabel: ativoAtual ? 'Inativar' : 'Ativar',
      onConfirm: async () => {
        try {
          await Storage.update(TABLES.usuarios, id, { ativo: !ativoAtual });
          Components.Toast.success(`Usuário ${ativoAtual ? 'inativado' : 'ativado'}!`);
          await this._carregar();
        } catch (e) {
          Components.Toast.error('Erro: ' + e.message);
        }
      },
    });
  },

  excluirUsuario(id, nome) {
    if (String(id) === String(App.currentUser?.id)) {
      Components.Toast.error('Você não pode excluir sua própria conta.');
      return;
    }
    Components.Modal.confirm({
      title:        'Excluir usuário',
      message:      `Deseja realmente excluir o usuário "${nome}"? Esta ação não pode ser desfeita.`,
      danger:       true,
      icon:         '🗑️',
      confirmLabel: 'Excluir',
      onConfirm: async () => {
        try {
          const { data: result, error } = await _sb.functions.invoke('excluir-usuario', {
            body: { usuario_id: id }
          });
          const msgErro = error?.message || result?.error;
          if (msgErro) throw new Error(msgErro);
          Components.Toast.success(`Usuário "${nome}" excluído com sucesso.`);
          await this._carregar();
        } catch (e) {
          Components.Toast.error('Erro ao excluir: ' + e.message);
        }
      },
    });
  },
};

window.Pages = Pages;
