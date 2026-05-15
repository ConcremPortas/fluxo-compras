/* ============================================================
   FLUXOCOMPRAS — App: Inicialização e Roteador SPA
   ============================================================ */

const App = {

  /* ----------------------------------------------------------
     USUÁRIOS DE DEMONSTRAÇÃO
  ---------------------------------------------------------- */
  DEMO_USERS: [
    { id: 1, nome: 'Admin Sistema',      email: 'admin@empresa.com',    role: 'admin'        },
    { id: 2, nome: 'Carlos Solicitante', email: 'carlos@empresa.com',   role: 'solicitante'  },
    { id: 3, nome: 'Ana Supervisora',    email: 'ana@empresa.com',      role: 'supervisor'   },
    { id: 5, nome: 'Fernanda Gerente',   email: 'fernanda@empresa.com', role: 'gerente'      },
    { id: 6, nome: 'Roberto Diretor',    email: 'roberto@empresa.com',  role: 'diretor'      },
    { id: 7, nome: 'Paulo Almoxarife',   email: 'paulo@empresa.com',    role: 'almoxarife'   },
    { id: 8, nome: 'Lucia Qualidade',    email: 'lucia@empresa.com',    role: 'qualidade'    },
  ],

  /* ----------------------------------------------------------
     PERMISSÕES POR ROLE
  ---------------------------------------------------------- */
  PERMISSIONS: {
    admin:       ['dashboard','requisicoes','aprovacoes','cotacoes','ordens','recebimento','qualidade','fornecedores','relatorios','catalogo','fornecedores-cadastro','usuarios','centros-custo','alcadas','configuracoes'],
    solicitante: ['dashboard','requisicoes','catalogo'],
    supervisor:  ['dashboard','requisicoes','relatorios','catalogo'],
    gerente:     ['dashboard','requisicoes','aprovacoes','cotacoes','ordens','fornecedores','relatorios','catalogo','fornecedores-cadastro'],
    diretor:     ['dashboard','aprovacoes','relatorios'],
    almoxarife:  ['recebimento'],
    qualidade:   ['qualidade'],
  },

  /* ----------------------------------------------------------
     NAV ITEMS (label + rota + ícone SVG)
  ---------------------------------------------------------- */
  NAV_ITEMS: [
    { route: 'dashboard',     label: 'Dashboard',        icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>' },
    { route: 'requisicoes',   label: 'Requisições',      icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>' },
    { route: 'aprovacoes',    label: 'Aprovações',       icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' },
    { route: 'cotacoes',      label: 'Cotações',         icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' },
    { route: 'ordens',        label: 'Ordens de Compra', icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>' },
    { route: 'recebimento',   label: 'Recebimento',      icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>' },
    { route: 'qualidade',     label: 'Qualidade',        icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11m0 0h10m-10 0H3m16-11v11m0 0H3m16 0v4a2 2 0 0 1-2 2h-4M3 9v8a2 2 0 0 0 2 2h4"/></svg>' },
    { route: 'fornecedores',  label: 'Fornecedores',     icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
    { route: 'relatorios',    label: 'Relatórios',       icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>' },
    { route: 'catalogo',               label: 'Catálogo de Itens', icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 8h2"/><path d="M7 12h10"/><path d="M13 8h4"/></svg>' },
    { route: 'fornecedores-cadastro',  label: 'Fornecedores',      icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
    { route: 'usuarios',               label: 'Usuários',          icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
    { route: 'centros-custo',          label: 'Centros de Custo',  icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>' },
    { route: 'alcadas',                label: 'Alçadas',           icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' },
    { route: 'fluxo-aprovacao',        label: 'Fluxo de Aprovação', icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>' },
    { route: 'configuracoes',          label: 'Configurações',     icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' },
  ],

  /* ----------------------------------------------------------
     GRUPOS DE NAVEGAÇÃO (ordem e agrupamento visual)
  ---------------------------------------------------------- */
  NAV_GROUPS: [
    { label: 'Operação',  routes: ['dashboard', 'requisicoes', 'aprovacoes'] },
    { label: 'Gestão',    routes: ['cotacoes', 'ordens', 'recebimento'] },
    { label: 'Análises',  routes: ['qualidade', 'fornecedores', 'relatorios'] },
    { label: 'Cadastros', routes: ['catalogo', 'fornecedores-cadastro', 'usuarios', 'centros-custo', 'alcadas'] },
    { label: 'Sistema',   routes: ['fluxo-aprovacao', 'configuracoes'] },
  ],

  /* ----------------------------------------------------------
     ESTADO
  ---------------------------------------------------------- */
  currentUser:      null,
  currentRoute:     null,
  _badgesPendentes: {},
  _badgeInterval:   null,

  /* ----------------------------------------------------------
     INICIALIZAÇÃO
  ---------------------------------------------------------- */
  async init() {
    // Recuperar sessão do sessionStorage
    const saved = sessionStorage.getItem('fc_usuario_logado');
    if (saved) {
      try { this.currentUser = JSON.parse(saved); } catch { this.currentUser = null; }
    }

    // Verificar e inicializar dados mínimos no primeiro acesso
    await this._inicializarDados();

    // Carregar permissões granulares (necessário ao refrescar a página)
    if (this.currentUser) {
      await Permissoes.carregar();
      // Enrich session with nivel_alcada from _user_meta (in case session was saved without it)
      const nivel = Permissoes._userMeta[this.currentUser.id]?.nivel_alcada;
      if (nivel && !this.currentUser.nivel_alcada) {
        this.currentUser.nivel_alcada = nivel;
        sessionStorage.setItem('fc_usuario_logado', JSON.stringify(this.currentUser));
      }
    }

    // Escutar mudanças de hash
    window.addEventListener('hashchange', () => this._handleRoute());
    this._handleRoute();
  },

  /* ----------------------------------------------------------
     SEED — Verifica banco e inicializa dados mínimos
  ---------------------------------------------------------- */
  async _inicializarDados() {
    try {
      // Verificar alçadas (dado de configuração essencial)
      const alcadas = await Storage.list(TABLES.configAlcadas);
      if (!alcadas || alcadas.length === 0) {
        await Storage.create(TABLES.configAlcadas, {
          alcadas: [
            { nome: 'Supervisor',  valor_minimo: 0,      valor_maximo: 5000,   sem_limite_maximo: false },
            { nome: 'Gerente',     valor_minimo: 5001,   valor_maximo: 100000, sem_limite_maximo: false },
            { nome: 'Diretor',     valor_minimo: 100001, valor_maximo: 0,      sem_limite_maximo: true  },
          ],
        });
        console.info('[Fluxo Compras] Configuração de alçadas criada automaticamente.');
      }

      // Verificar permissões salvas e aplicar ao objeto em memória
      const perms = await Storage.list(TABLES.configPermissoes);
      if (perms && perms.length > 0) {
        const ultima = perms[perms.length - 1];
        if (ultima.permissoes) {
          try {
            const p = typeof ultima.permissoes === 'string'
              ? JSON.parse(ultima.permissoes)
              : ultima.permissoes;
            if (p.menu_access) Object.assign(this.PERMISSIONS, p.menu_access);
          } catch { /* ignora JSON inválido */ }
        }
      }

      // Verificar se há requisições — se não houver, avisar no console
      const reqs = await Storage.list(TABLES.requisicoes, { limit: 1 });
      if (!reqs || reqs.length === 0) {
        console.info('[Fluxo Compras] Banco vazio. Execute database/demo-data.sql no Supabase para carregar dados de demonstração.');
      }
    } catch (e) {
      console.warn('[Fluxo Compras] Aviso ao inicializar dados:', e.message || e);
    }
  },

  /* ----------------------------------------------------------
     NAVEGAÇÃO
  ---------------------------------------------------------- */
  navigate(path) {
    window.location.hash = path;
  },

  /* ----------------------------------------------------------
     ROTEADOR
  ---------------------------------------------------------- */
  _handleRoute() {
    const hash  = window.location.hash.replace(/^#\/?/, '').trim() || '';
    const route = hash || 'login';

    // Guard: sem usuário → login
    if (!this.currentUser && route !== 'login') {
      this.navigate('login');
      return;
    }

    // Guard: rota login com usuário logado → redirecionar
    if (this.currentUser && route === 'login') {
      const primeira = this.PERMISSIONS[this.currentUser.role]?.[0] || 'dashboard';
      this.navigate(primeira);
      return;
    }

    // Guard: permissão
    if (this.currentUser && route !== 'login') {
      const baseRoute = route.split('/')[0];
      if (!Permissoes.podeVerTela(baseRoute)) {
        Components.Toast.error('Você não tem permissão para acessar esta página.');
        const primeira = (this.PERMISSIONS[this.currentUser.role] || [])[0] || 'dashboard';
        this.navigate(primeira);
        return;
      }
    }

    this.currentRoute = route;
    this._render(route);
  },

  /* ----------------------------------------------------------
     RENDERIZAÇÃO
  ---------------------------------------------------------- */
  _render(route) {
    const app = document.getElementById('app');

    if (route === 'login') {
      app.innerHTML = '';
      app.className = 'login-mode';
      Pages.Login.render();
      return;
    }

    // Detectar primeiro render após login (sidebar ainda não existe)
    const isFirstRender = !document.getElementById('sidebar');

    // Montar shell (sidebar + topbar + main) se ainda não existir
    if (isFirstRender) {
      app.className = '';
      app.innerHTML = this._shellHTML();
      this._bindSidebarToggle();
      this._bindLogout();
      Notificacoes.inicializar();
    }

    // Garantir que o main-content existe no DOM
    if (!document.getElementById('main-content')) {
      console.warn('[Fluxo Compras] main-content ausente após criar shell — recriando');
      app.innerHTML = this._shellHTML();
      this._bindSidebarToggle();
      this._bindLogout();
    }

    // Atualizar sidebar (itens ativos, usuário)
    this._renderSidebar();
    this._renderTopbar();

    // Roteamento de páginas
    this._routePage(route);

    // Ao fazer login: toast de boas-vindas + iniciar polling de badges + notificações
    if (isFirstRender) {
      FluxoAprovacao.carregar();
      this._loadAllBadges().then(() => this._toastBoasVindas());
      Notificacoes.carregar();
      if (this._badgeInterval) clearInterval(this._badgeInterval);
      this._badgeInterval = setInterval(() => {
        if (App.currentUser) {
          App._loadAllBadges();
          Notificacoes.carregar();
        }
      }, 60000);
    }
  },

  /* ----------------------------------------------------------
     SHELL HTML
  ---------------------------------------------------------- */
  _shellHTML() {
    return `
      <aside id="sidebar"></aside>
      <div id="sidebar-overlay"></div>
      <header id="topbar">
        <div id="topbar-left">
          <button id="sidebar-toggle" aria-label="Menu">☰</button>
          <span id="page-title"></span>
        </div>
        <div id="topbar-right">
          <span class="topbar-role-badge" id="topbar-role-badge"></span>
        </div>
      </header>
      <main id="main-content"></main>`;
  },

  /* ----------------------------------------------------------
     SIDEBAR
  ---------------------------------------------------------- */
  _renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const user    = this.currentUser;
    const allowed = this.PERMISSIONS[user.role] || [];
    const current = (this.currentRoute || '').split('/')[0];

    sidebar.innerHTML = `
      <!-- Logo / branding -->
      <div class="sidebar-logo" id="sidebar-collapse-btn" title="Recolher/expandir menu" role="button" tabindex="0">
        <img src="Logos/concrem-logo.png"      alt="Concrem" class="sidebar-logo-img sidebar-logo-full" draggable="false" />
        <img src="Logos/concrem-logo-mini.png" alt="Concrem" class="sidebar-logo-img sidebar-logo-mini" draggable="false" />
      </div>

      <!-- Navegação agrupada -->
      <nav class="sidebar-nav" aria-label="Navegação principal">
        ${this._renderNavGroups(allowed, current)}
      </nav>

      <!-- Rodapé: usuário + logout -->
      <div class="sidebar-footer">
        <div class="user-avatar">${Utils.getInitials(user.nome)}</div>
        <div class="user-info">
          <span class="user-name">${Utils.escapeHtml(user.nome)}</span>
          <span class="user-role-badge">${Utils.escapeHtml(user.role)}</span>
        </div>
        <button class="sidebar-logout-btn" title="Sair do sistema" aria-label="Sair">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>`;

    // Bind: navegação
    sidebar.querySelectorAll('[data-route]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.navigate(btn.dataset.route);
        this._closeSidebar();
      });
    });

    // Bind: logout no rodapé da sidebar
    sidebar.querySelector('.sidebar-logout-btn')?.addEventListener('click', () => {
      Components.Modal.confirm({
        title:        'Sair do sistema',
        message:      'Tem certeza que deseja encerrar sua sessão?',
        danger:       true,
        icon:         '🚪',
        confirmLabel: 'Sair',
        onConfirm: () => {
          Notificacoes.fechar();
          sessionStorage.removeItem('fc_usuario_logado');
          this.currentUser  = null;
          this.currentRoute = null;
          if (this._badgeInterval) { clearInterval(this._badgeInterval); this._badgeInterval = null; }
          document.getElementById('sidebar')?.remove();
          document.getElementById('sidebar-overlay')?.remove();
          document.getElementById('topbar')?.remove();
          document.getElementById('main-content')?.remove();
          document.getElementById('notif-overlay')?.remove();
          document.getElementById('notif-painel')?.remove();
          Components.Toast.info('Sessão encerrada.');
          this.navigate('login');
        },
      });
    });

    // Atualizar todos os badges de pendências
    this._loadAllBadges();
  },

  /* ----------------------------------------------------------
     NAV GROUPS — gera HTML agrupado por categoria
  ---------------------------------------------------------- */
  _renderNavGroups(allowed, current) {
    const itemMap = {};
    this.NAV_ITEMS.forEach(item => { itemMap[item.route] = item; });

    return this.NAV_GROUPS.map(group => {
      const items = group.routes
        .filter(r => Permissoes.podeVerTela(r) && itemMap[r])
        .map(r => itemMap[r]);

      if (items.length === 0) return '';

      return `
        <div class="nav-group">
          <div class="nav-section-label">${group.label}</div>
          ${items.map(item => {
            const isActive = current === item.route;
            return `
              <button
                class="nav-item${isActive ? ' active' : ''}"
                data-route="${item.route}"
                aria-current="${isActive ? 'page' : 'false'}"
                title="${Utils.escapeHtml(item.label)}"
              >
                <span class="nav-icon">${item.icon}</span>
                <span class="nav-label">${Utils.escapeHtml(item.label)}</span>
                ${item.route === 'aprovacoes'
                  ? '<span class="nav-badge" id="badge-aprovacoes" style="display:none;"></span>'
                  : ''}
              </button>`;
          }).join('')}
        </div>`;
    }).join('');
  },

  async _loadAllBadges() {
    const user = this.currentUser;
    if (!user) return;

    try {
      const [requisicoes, ordens, recebimentos, alertasCusto] = await Promise.all([
        Storage.list(TABLES.requisicoes).catch(() => []),
        Storage.list(TABLES.ordens).catch(() => []),
        Storage.list(TABLES.recebimentos).catch(() => []),
        ['admin','gerente'].includes(user.role)
          ? Storage.list(TABLES.alertasCusto).catch(() => [])
          : Promise.resolve([]),
      ]);

      const badges = {};

      // APROVAÇÕES — requisições aguardando decisão (todos os status de aprovação)
      const STATUS_APROVACAO = [
        'Aguardando Avaliacao de Compras',
        'Aguardando Aprovacao Etapa 1',
        'Aguardando Aprovacao Etapa 2',
        'Aguardando Aprovacao da Diretoria',
      ];
      const HIERARQUIA_ALC = ['Supervisor', 'Gerente', 'Diretor'];
      const nivelUser   = user.nivel_alcada || null;
      const idxNivelUser = nivelUser ? HIERARQUIA_ALC.findIndex(n => n.toLowerCase() === nivelUser.toLowerCase()) : -1;

      const totalAprovacoes = (requisicoes || []).filter(r => {
        if (!STATUS_APROVACAO.includes(r.status)) return false;
        // Filtrar por nivel_alcada se definido
        if (idxNivelUser >= 0) {
          const idxReq = HIERARQUIA_ALC.findIndex(n => n.toLowerCase() === (r.alcada_aprovacao || '').toLowerCase());
          if (idxReq >= 0 && idxReq > idxNivelUser) return false;
          if (user.role === 'admin') return true;
        }
        return FluxoAprovacao.podeAprovar(r.alcada_aprovacao, r.status, user.role, nivelUser);
      }).length;
      if (totalAprovacoes > 0) badges['aprovacoes'] = totalAprovacoes;

      // ORDENS — OCs recebidas aguardando avaliação do fornecedor
      if (['admin','gerente'].includes(user.role)) {
        const pendOrdens = (ordens || []).filter(o => o.status === 'Recebida').length;
        if (pendOrdens > 0) badges['ordens'] = pendOrdens;
      }

      // RECEBIMENTO — OCs aguardando recebimento físico
      if (['admin','almoxarife'].includes(user.role)) {
        const pendReceb = (ordens || []).filter(o => o.status === 'Aguardando Recebimento').length;
        if (pendReceb > 0) badges['recebimento'] = pendReceb;
      }

      // QUALIDADE — recebimentos aguardando análise
      if (['admin','qualidade'].includes(user.role)) {
        const pendQual = (recebimentos || []).filter(r => r.status === 'Aguardando Qualidade').length;
        if (pendQual > 0) badges['qualidade'] = pendQual;
      }

      // COTAÇÕES — cotações aguardando aprovação do demandante
      if (['admin','gerente'].includes(user.role)) {
        const pendCot = (requisicoes || []).filter(r =>
          r.status === 'Aguardando Aprovacao do Demandante'
        ).length;
        if (pendCot > 0) badges['cotacoes'] = pendCot;
      }

      // ALERTAS DE CUSTO — pendentes para admin/gerente
      if (['admin','gerente'].includes(user.role)) {
        const pendAlertas = (alertasCusto || []).filter(a => a.status === 'Pendente').length;
        if (pendAlertas > 0) badges['catalogo'] = (badges['catalogo'] || 0) + pendAlertas;
      }

      this._badgesPendentes = badges;
      this._aplicarBadgesSidebar(badges);

    } catch (e) {
      console.warn('[Badges]', e.message || e);
    }
  },

  _aplicarBadgesSidebar(badges) {
    // Atualizar o badge estático de aprovações (id="badge-aprovacoes")
    const badgeAprov = document.getElementById('badge-aprovacoes');
    if (badgeAprov) {
      const count = badges['aprovacoes'] || 0;
      badgeAprov.textContent   = count > 99 ? '99+' : String(count);
      badgeAprov.style.display = count > 0 ? '' : 'none';
    }

    // Limpar badges dinâmicos anteriores (outras rotas)
    document.querySelectorAll('.nav-badge-dynamic').forEach(el => el.remove());

    // Inserir badges dinâmicos para as demais rotas com pendências
    Object.entries(badges).forEach(([rota, count]) => {
      if (rota === 'aprovacoes' || !count || count <= 0) return;
      const navItem = document.querySelector(`.nav-item[data-route="${rota}"]`);
      if (!navItem) return;
      const badge = document.createElement('span');
      badge.className  = 'nav-badge nav-badge-dynamic';
      badge.dataset.for = rota;
      badge.textContent = count > 99 ? '99+' : String(count);
      navItem.appendChild(badge);
    });
  },

  _toastBoasVindas() {
    const user    = this.currentUser;
    if (!user) return;
    const badges  = this._badgesPendentes || {};
    const hora    = new Date().getHours();
    const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
    const nomeAbrev = (user.nome || '').split(' ')[0];

    const LABELS = {
      aprovacoes:  'aprovação pendente',
      cotacoes:    'cotação aguardando demandante',
      ordens:      'OC aguardando avaliação',
      recebimento: 'OC aguardando recebimento',
      qualidade:   'material aguardando qualidade',
    };

    const pendencias = Object.entries(badges)
      .filter(([, count]) => count > 0)
      .map(([rota, count]) => {
        const label = LABELS[rota] || rota;
        return `${count} ${count > 1 ? label + 's' : label}`;
      });

    if (pendencias.length === 0) {
      Components.Toast.success(`${saudacao}, ${nomeAbrev}! Nenhuma pendência no momento. ✅`);
      return;
    }

    const msg = pendencias.length === 1
      ? `${saudacao}, ${nomeAbrev}! Você tem ${pendencias[0]}.`
      : `${saudacao}, ${nomeAbrev}! Pendências: ${pendencias.join(' · ')}.`;

    Components.Toast.warning(msg);
  },

  /* ----------------------------------------------------------
     TOPBAR
  ---------------------------------------------------------- */
  _renderTopbar() {
    const user   = this.currentUser;
    const roleEl = document.getElementById('topbar-role-badge');
    if (roleEl) roleEl.textContent = user.role;
  },

  setPageTitle(title) {
    const el = document.getElementById('page-title');
    if (el) el.textContent = title;
  },

  /* ----------------------------------------------------------
     SIDEBAR MOBILE
  ---------------------------------------------------------- */
  _bindSidebarToggle() {
    const toggle  = document.getElementById('sidebar-toggle');
    const overlay = document.getElementById('sidebar-overlay');

    toggle?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('open');
      overlay?.classList.toggle('visible');
    });

    overlay?.addEventListener('click', () => this._closeSidebar());

    // Collapse desktop: restaurar estado salvo
    if (localStorage.getItem('fc_sidebar_collapsed') === 'true') {
      document.body.classList.add('sidebar-collapsed');
    }

    // Collapse via clique na logo (delegado no sidebar)
    const _toggleCollapse = () => {
      const collapsed = document.body.classList.toggle('sidebar-collapsed');
      localStorage.setItem('fc_sidebar_collapsed', collapsed);
    };
    document.getElementById('sidebar')?.addEventListener('click', e => {
      if (e.target.closest('#sidebar-collapse-btn')) _toggleCollapse();
    });
    document.getElementById('sidebar')?.addEventListener('keydown', e => {
      if (e.target.closest('#sidebar-collapse-btn') && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        _toggleCollapse();
      }
    });
  },

  _closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('visible');
  },

  /* ----------------------------------------------------------
     LOGOUT — movido para o rodapé da sidebar (_renderSidebar)
  ---------------------------------------------------------- */
  _bindLogout() {
    // Logout agora é gerenciado pelo botão .sb-logout-btn no rodapé
    // da sidebar, rebindado em _renderSidebar() a cada render.
  },

  /* ----------------------------------------------------------
     ROTEAMENTO DE PÁGINAS
  ---------------------------------------------------------- */
  _routePage(route) {
    const parts     = route.split('/');
    const baseRoute = parts[0];
    const param     = parts[1] || null;
    const sub       = parts[2] || null;

    // Lê window.Pages explicitamente para evitar problemas de escopo com bundlers
    const P = window.Pages || {};

    try {
      // Caso especial: requisicoes/nova
      if (route === 'requisicoes/nova') {
        P.NovaRequisicao.render();
        return;
      }

      // Caso especial: requisicoes/:id/editar
      if (baseRoute === 'requisicoes' && param && sub === 'editar') {
        if (P.EditarRequisicao) {
          P.EditarRequisicao.render(param);
        } else {
          this._wip('Editar Requisição');
        }
        return;
      }

      // Caso especial: requisicoes/:id
      if (baseRoute === 'requisicoes' && param && param !== 'nova') {
        if (P.RequisicaoDetalhe) {
          P.RequisicaoDetalhe.render(param);
        } else {
          this._wip('Detalhe de Requisição');
        }
        return;
      }

      // Caso especial: cotacoes/:id
      if (baseRoute === 'cotacoes' && param) {
        if (P.DetalheCotacao) {
          P.DetalheCotacao.render(param);
        } else {
          this._wip('Detalhe de Cotação');
        }
        return;
      }

      // Caso especial: ordens/:id
      if (baseRoute === 'ordens' && param) {
        if (P.DetalheOrdem) {
          P.DetalheOrdem.render(param);
        } else {
          this._wip('Detalhe de Ordem de Compra');
        }
        return;
      }

      const map = {
        'dashboard':     () => P.Dashboard.render(),
        'requisicoes':   () => P.Requisicoes.render(),
        'aprovacoes':    () => P.Aprovacoes.render(),
        'cotacoes':      () => P.Cotacoes.render(),
        'ordens':        () => P.Ordens.render(),
        'recebimento':   () => P.Recebimento.render(),
        'qualidade':     () => P.Qualidade.render(),
        'fornecedores':  () => P.Fornecedores.render(),
        'relatorios':    () => P.Relatorios.render(),
        'catalogo':              () => P.Catalogo.render(),
        'catalogo-categorias':   () => P.CatalogoCategorias.render(),
        'fornecedores-cadastro': () => P.FornecedoresCadastro.render(),
        'usuarios':              () => P.Usuarios.render(),
        'centros-custo':         () => P.CentrosCusto.render(),
        'alcadas':               () => P.Alcadas.render(),
        'fluxo-aprovacao':       () => P.Configuracoes.carregarAbaFluxo(),
        'configuracoes':         () => P.Configuracoes.render(),
      };

      const handler = map[baseRoute];
      if (handler) {
        handler();
      } else {
        this._wip(baseRoute);
      }
    } catch (err) {
      console.error('[Fluxo Compras] Erro ao renderizar rota "' + route + '":', err);
      const safe = String(err && err.message ? err.message : err).replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const content = document.getElementById('main-content');
      if (content) {
        content.innerHTML =
          '<div style="padding:40px;text-align:center;">' +
          '<div style="font-size:48px;margin-bottom:16px;">⚠️</div>' +
          '<h2 style="color:#1e293b;margin-bottom:8px;">Erro ao carregar a página</h2>' +
          '<p style="font-family:monospace;font-size:13px;color:#64748b;margin-bottom:24px;max-width:600px;margin-left:auto;margin-right:auto;">' + safe + '</p>' +
          '<button class="btn btn-secondary" onclick="App.navigate(\'dashboard\')">Voltar ao Dashboard</button>' +
          '</div>';
      }
    }
  },

  /* ----------------------------------------------------------
     PÁGINA GENÉRICA "EM CONSTRUÇÃO"
  ---------------------------------------------------------- */
  _wip(name) {
    this.setPageTitle(name);
    const content = document.getElementById('main-content');
    if (content) {
      content.innerHTML = `
        <div class="wip-page">
          <div class="wip-icon">🚧</div>
          <div class="wip-title">Em construção</div>
          <div class="wip-subtitle">A página "${Utils.escapeHtml(name)}" ainda não foi implementada.</div>
          <button class="btn btn-secondary" onclick="App.navigate('dashboard')">Voltar ao Dashboard</button>
        </div>`;
    }
  },
};

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => App.init());
