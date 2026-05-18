/* ============================================================
   FLUXOCOMPRAS — Motor de Permissões Granular
   Dois níveis: Grupo (por role) + Usuário (override individual)
   ============================================================ */

const ACOES = ['ver', 'criar', 'editar', 'excluir', 'aprovar', 'exportar', 'configurar'];

const TELAS_CONFIG = [
  { id: 'dashboard',             label: 'Dashboard',              acoes: ['ver'] },
  { id: 'requisicoes',           label: 'Requisições',            acoes: ['ver','criar','editar','excluir'] },
  { id: 'aprovacoes',            label: 'Aprovações',             acoes: ['ver','aprovar'] },
  { id: 'cotacoes',              label: 'Cotações',               acoes: ['ver','criar','editar','excluir','exportar'] },
  { id: 'ordens',                label: 'Ordens de Compra',       acoes: ['ver','criar','editar','exportar'] },
  { id: 'recebimento',           label: 'Recebimento',            acoes: ['ver','criar','editar'] },
  { id: 'qualidade',             label: 'Qualidade',              acoes: ['ver','criar','editar'] },
  { id: 'fornecedores',          label: 'Fornecedores',           acoes: ['ver','exportar'] },
  { id: 'relatorios',            label: 'Relatórios',             acoes: ['ver','exportar'] },
  { id: 'catalogo',              label: 'Catálogo de Itens',      acoes: ['ver','criar','editar','excluir'] },
  { id: 'fornecedores-cadastro', label: 'Cadastro Fornecedores',  acoes: ['ver','criar','editar','excluir'] },
  { id: 'usuarios',              label: 'Usuários',               acoes: ['ver','criar','editar','excluir','configurar'] },
  { id: 'centros-custo',         label: 'Centros de Custo',       acoes: ['ver','criar','editar','excluir'] },
  { id: 'alcadas',               label: 'Alçadas',                acoes: ['ver','criar','editar','excluir','configurar'] },
  { id: 'configuracoes',         label: 'Configurações',          acoes: ['ver','configurar'] },
];

/* Permissões padrão por role — usadas como fallback quando não há registro no banco */
const _DEFAULTS = {
  admin: null, // admin sempre tem tudo
  solicitante: {
    dashboard:   { ver: true },
    requisicoes: { ver: true, criar: true },
    catalogo:    { ver: true },
  },
  supervisor: {
    dashboard:   { ver: true },
    requisicoes: { ver: true },
    relatorios:  { ver: true, exportar: true },
    catalogo:    { ver: true },
  },
  gerente: {
    dashboard:               { ver: true },
    requisicoes:             { ver: true, criar: true, editar: true },
    aprovacoes:              { ver: true, aprovar: true },
    cotacoes:                { ver: true, criar: true, editar: true, exportar: true },
    ordens:                  { ver: true, criar: true, exportar: true },
    fornecedores:            { ver: true },
    relatorios:              { ver: true, exportar: true },
    catalogo:                { ver: true, criar: true, editar: true },
    'fornecedores-cadastro': { ver: true, criar: true, editar: true },
  },
  diretor: {
    dashboard:  { ver: true },
    aprovacoes: { ver: true, aprovar: true },
    relatorios: { ver: true, exportar: true },
  },
  almoxarife: {
    recebimento: { ver: true, criar: true, editar: true },
  },
  qualidade: {
    qualidade: { ver: true, criar: true, editar: true },
  },
};

const Permissoes = {
  ACOES,
  TELAS_CONFIG,

  _grupos:    {},   // { role: { tela: { acao: bool } } }
  _usuarios:  {},   // { userId: { tela: { acao: bool } } }
  _userMeta:  {},   // { userId: { nivel_alcada: string, ... } }
  _lideres:   {},   // { role: [userId, ...] }
  _carregado: false,

  /* ── Carrega do banco ─────────────────────────────────────── */
  async carregar() {
    try {
      const configs = await Storage.list(TABLES.configPermissoes).catch(() => []);
      const cfg = (configs && configs.length > 0) ? configs[0] : {};

      // A tabela tem uma coluna JSONB chamada "permissoes" que guarda tudo
      const src = cfg.permissoes
        ? (typeof cfg.permissoes === 'string' ? JSON.parse(cfg.permissoes) : cfg.permissoes)
        : {};
      this._grupos    = src._granular_grupos   || {};
      this._usuarios  = src._granular_usuarios || {};
      this._userMeta  = src._user_meta         || {};
      this._lideres   = src._lideres           || {};

      this._carregado = true;
      this._syncAppPermissions();
    } catch (e) {
      console.warn('[Permissoes] Erro ao carregar:', e.message || e);
      this._grupos    = {};
      this._usuarios  = {};
      this._userMeta  = {};
      this._lideres   = {};
      this._carregado = true;
    }
  },

  /* ── Verifica se o usuário logado lidera algum grupo ─────── */
  _isLiderDeGrupo() {
    const u = (typeof App !== 'undefined') ? App.currentUser : null;
    if (!u) return false;
    return Object.values(this._lideres).some(lista => {
      const arr = Array.isArray(lista) ? lista : (lista ? [lista] : []);
      return arr.some(uid => String(uid) === String(u.id));
    });
  },

  /* ── Verifica uma ação em uma tela para o usuário logado ─── */
  pode(tela, acao) {
    const u = (typeof App !== 'undefined') ? App.currentUser : null;
    if (!u) return false;
    if (u.role === 'admin') return true;

    // Override individual: se houver entrada para este usuário nesta tela, usa ela
    const uPerms = this._usuarios[u.id]?.[tela];
    if (uPerms !== undefined) return !!uPerms[acao];

    // Permissões do grupo (banco)
    const gPerms = this._grupos[u.role]?.[tela];
    if (gPerms !== undefined) return !!gPerms[acao];

    // Fallback para defaults hard-coded
    return !!(_DEFAULTS[u.role]?.[tela]?.[acao]);
  },

  /* ── Atalho: verifica se o usuário pode ver (acessar) a tela */
  podeVerTela(tela) {
    const u = (typeof App !== 'undefined') ? App.currentUser : null;
    if (!u) return false;
    if (u.role === 'admin') return true;

    // Líder de grupo sempre pode acessar a tela de usuários
    if (tela === 'usuarios' && this._isLiderDeGrupo()) return true;

    if (!this._carregado) {
      // Antes do carregamento, usa App.PERMISSIONS legado
      return ((typeof App !== 'undefined' ? App.PERMISSIONS[u.role] : null) || []).includes(tela);
    }
    return this.pode(tela, 'ver');
  },

  /* ── Retorna permissões efetivas do grupo (DB ou defaults) ── */
  getGrupo(role) {
    if (this._grupos[role]) return this._grupos[role];
    return _DEFAULTS[role] ? JSON.parse(JSON.stringify(_DEFAULTS[role])) : {};
  },

  /* ── Salva permissões de grupos ────────────────────────────── */
  async salvarGrupos(grupos) {
    this._grupos = grupos;
    await this._persistir();
    this._syncAppPermissions();
  },

  /* ── Salva override de um usuário ──────────────────────────── */
  async salvarUsuarioOverride(userId, telaOverrides) {
    this._usuarios = { ...this._usuarios, [userId]: telaOverrides };
    await this._persistir();
  },

  /* ── Remove override de um usuário ─────────────────────────── */
  async removerUsuarioOverride(userId) {
    const copia = { ...this._usuarios };
    delete copia[userId];
    this._usuarios = copia;
    await this._persistir();
  },

  /* ── Persiste no banco ──────────────────────────────────────── */
  async _persistir() {
    const configs = await Storage.list(TABLES.configPermissoes).catch(() => []);

    // Preserva o conteúdo existente da coluna "permissoes" e injeta os dados granulares
    const existente = (configs && configs.length > 0) ? configs[0] : {};
    const permExistente = existente.permissoes
      ? (typeof existente.permissoes === 'string' ? JSON.parse(existente.permissoes) : existente.permissoes)
      : {};

    const payload = {
      permissoes: {
        ...permExistente,
        _granular_grupos:   this._grupos,
        _granular_usuarios: this._usuarios,
      },
      updated_at: new Date().toISOString(),
      updated_by: (typeof App !== 'undefined') ? (App.currentUser?.nome || 'admin') : 'admin',
    };
    if (configs && configs.length > 0) {
      await Storage.update(TABLES.configPermissoes, configs[0].id, payload);
    } else {
      await Storage.create(TABLES.configPermissoes, payload);
    }
  },

  /* ── Sincroniza App.PERMISSIONS (backwards compat com roteador) */
  _syncAppPermissions() {
    if (typeof App === 'undefined') return;
    const roles = Object.keys(_DEFAULTS);
    roles.forEach(role => {
      if (role === 'admin') return;
      const perms = this._grupos[role] || _DEFAULTS[role] || {};
      App.PERMISSIONS[role] = Object.keys(perms).filter(tela => perms[tela]?.ver);
    });
  },
};

window.Permissoes = Permissoes;
