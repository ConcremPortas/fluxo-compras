/* ============================================================
   FLUXOCOMPRAS — Aprovações com Dupla Etapa Sequencial
   Identidade: verde escuro hsl(142,93%,8%) + esmeralda #6ee7b7
   ============================================================ */

var Pages = window.Pages || {};

Pages.Aprovacoes = {
  _pendentes: [],
  _porEtapa:  { etapa1: [], etapa2: [], diretoria: [] },
  _etapaAtiva: null,

  /* ----------------------------------------------------------
     RENDER PRINCIPAL
  ---------------------------------------------------------- */
  async render() {
    document.title = 'Fluxo Compras — Aprovações';
    App.setPageTitle('Aprovações');

    const user = App.currentUser;
    const isAdmin = user.role === 'admin';

    // Acesso permitido por role de aprovador OU por nivel_alcada configurado
    const ROLES_APROVADORES = ['admin','gerente','diretor'];
    const temAcesso = ROLES_APROVADORES.includes(user.role) || !!user.nivel_alcada;
    if (!temAcesso) {
      document.getElementById('main-content').innerHTML = `
        <div class="aprov-header"><h1>Aprovações</h1><p>Requisições pendentes de avaliação</p></div>
        <div class="aprov-empty" style="margin-top:24px;">
          <div class="aprov-empty-icon">🔒</div>
          <div class="aprov-empty-title">Sem permissão de aprovação</div>
          <div class="aprov-empty-sub">Seu perfil não possui nível de alçada configurado. Solicite ao administrador.</div>
        </div>`;
      return;
    }

    document.getElementById('main-content').innerHTML = `
      <div class="aprov-header">
        <h1>Aprovações</h1>
        <p>Requisições pendentes de avaliação sequencial</p>
      </div>
      <div id="aprov-filtros" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;"></div>
      <div id="aprov-lista">${this._skeleton()}</div>`;

    await this._carregar();
  },

  /* ----------------------------------------------------------
     CARREGAR E FILTRAR POR ETAPA
  ---------------------------------------------------------- */
  async _carregar() {
    const user  = App.currentUser;
    const role  = user?.role;
    // nivel_alcada define o nível máximo de requisições que o usuário pode aprovar
    // (independente do grupo/role). Ex: admin com nivel_alcada 'Supervisor' só vê reqs Supervisor.
    const nivel = user?.nivel_alcada || null;

    const STATUS_APROVACAO = [
      'Aguardando Aprovacao Etapa 1',
      'Aguardando Aprovacao Etapa 2',
      'Aguardando Aprovacao da Diretoria',
      'Aguardando Avaliacao de Compras',
    ];

    // Hierarquia de alçadas em ordem crescente (sem Coordenador)
    const HIERARQUIA = ['Supervisor', 'Gerente', 'Diretor'];
    const idxNivel   = nivel ? HIERARQUIA.findIndex(n => n.toLowerCase() === nivel.toLowerCase()) : -1;

    try {
      const todas = await Storage.list(TABLES.requisicoes, {
        order: { column: 'urgente', ascending: false },
      }) || [];

      this._pendentes = todas.filter(r => {
        if (!STATUS_APROVACAO.includes(r.status)) return false;

        // Filtro por nivel_alcada: se definido, só vê reqs até seu nível
        if (idxNivel >= 0) {
          const idxReq = HIERARQUIA.findIndex(
            n => n.toLowerCase() === (r.alcada_aprovacao || '').toLowerCase()
          );
          // Alcada da req maior que o nível do usuário → não pode aprovar
          if (idxReq >= 0 && idxReq > idxNivel) return false;
          // Admin dentro do seu nível de alcada: pode aprovar qualquer etapa
          if (role === 'admin') return true;
        }

        return FluxoAprovacao.podeAprovar(r.alcada_aprovacao, r.status, role, nivel);
      });

      this._porEtapa = {
        etapa1: this._pendentes.filter(r =>
          r.status === 'Aguardando Aprovacao Etapa 1' ||
          r.status === 'Aguardando Avaliacao de Compras'
        ),
        etapa2: this._pendentes.filter(r => r.status === 'Aguardando Aprovacao Etapa 2'),
        diretoria: this._pendentes.filter(r => r.status === 'Aguardando Aprovacao da Diretoria'),
      };

      // Selecionar aba com pendências, mantendo a ativa se já escolhida
      if (!this._etapaAtiva ||
          (this._porEtapa[this._etapaAtiva] || []).length === 0) {
        this._etapaAtiva =
          this._porEtapa.etapa1.length    > 0 ? 'etapa1'    :
          this._porEtapa.etapa2.length    > 0 ? 'etapa2'    :
          this._porEtapa.diretoria.length > 0 ? 'diretoria' : 'etapa1';
      }

      this._renderFiltros();
      this._renderLista();

    } catch(e) {
      console.error('[Aprovacoes]', e);
      Components.Toast.error('Erro ao carregar aprovações pendentes.');
    }
  },

  /* ----------------------------------------------------------
     PILLS DE ETAPA
  ---------------------------------------------------------- */
  _renderFiltros() {
    const wrap = document.getElementById('aprov-filtros');
    if (!wrap) return;

    const abas = [
      {
        key: 'etapa1', cor: '#3b82f6', bgAtivo: '#eff6ff',
        label: '1ª Aprovação',
        count: this._porEtapa.etapa1.length,
        desc: 'Aguard. 1ª Etapa',
      },
      {
        key: 'etapa2', cor: '#8b5cf6', bgAtivo: '#f5f3ff',
        label: '2ª Aprovação',
        count: this._porEtapa.etapa2.length,
        desc: 'Aguard. 2ª Etapa',
      },
      {
        key: 'diretoria', cor: '#f97316', bgAtivo: '#fff7ed',
        label: '🏛️ Diretoria',
        count: this._porEtapa.diretoria.length,
        desc: 'Aguard. Diretoria',
      },
    ];

    wrap.innerHTML = abas.map(aba => {
      const ativo = this._etapaAtiva === aba.key;
      return `
        <button class="req-status-pill ${ativo ? 'ativo' : ''}" data-etapa="${aba.key}"
          style="--pill-cor:${aba.cor};${ativo ? 'background:' + aba.bgAtivo + ';border-color:' + aba.cor + ';color:' + aba.cor + ';' : ''}
            display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;
            border:1.5px solid ${ativo ? aba.cor : '#E2E8F0'};cursor:pointer;
            font-size:13px;font-weight:600;font-family:'Manrope',sans-serif;
            background:${ativo ? aba.bgAtivo : 'white'};color:${ativo ? aba.cor : '#64748b'};
            transition:all 0.15s;">
          ${aba.label}
          ${aba.count > 0 ? `<span style="background:${ativo ? aba.cor : '#E2E8F0'};color:${ativo ? 'white' : '#64748b'};
              border-radius:10px;font-size:11px;font-weight:700;padding:1px 7px;min-width:20px;text-align:center;">
            ${aba.count}</span>` : ''}
        </button>`;
    }).join('');

    wrap.querySelectorAll('[data-etapa]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._etapaAtiva = btn.dataset.etapa;
        this._renderFiltros();
        this._renderLista();
      });
    });
  },

  /* ----------------------------------------------------------
     LISTA DE REQUISIÇÕES DA ETAPA ATIVA
  ---------------------------------------------------------- */
  _renderLista() {
    const container = document.getElementById('aprov-lista');
    if (!container) return;

    const reqs = this._porEtapa[this._etapaAtiva] || [];

    if (!reqs.length) {
      const labels = { etapa1: '1ª Aprovação', etapa2: '2ª Aprovação', diretoria: 'Diretoria' };
      container.innerHTML = `
        <div class="aprov-empty">
          <div class="aprov-empty-icon">🎉</div>
          <div class="aprov-empty-title">Nenhuma pendência em ${labels[this._etapaAtiva] || 'aprovação'}</div>
          <div class="aprov-empty-sub">Todas as requisições desta etapa foram processadas.</div>
        </div>`;
      return;
    }

    container.innerHTML = reqs.map((r, i) => this._renderCard(r, i)).join('');

    container.querySelectorAll('.btn-ver-req').forEach(btn =>
      btn.addEventListener('click', () => App.navigate('requisicoes/' + btn.dataset.id))
    );
    container.querySelectorAll('.btn-avaliar').forEach(btn =>
      btn.addEventListener('click', () => this._abrirDialog(btn.dataset.id))
    );
  },

  /* ----------------------------------------------------------
     CARD DE REQUISIÇÃO
  ---------------------------------------------------------- */
  _renderCard(req, index) {
    const itens = Array.isArray(req.itens) ? req.itens
      : (typeof req.itens === 'string'
          ? (() => { try { return JSON.parse(req.itens); } catch { return []; } })()
          : []);

    const itensPreview = itens.slice(0, 3)
      .map(i => Utils.escapeHtml((i.descricao || '') + ' (' + i.quantidade + ' ' + (i.unidade || 'UN') + ')'))
      .join(' · ');
    const maisItens = itens.length > 3 ? ' · +' + (itens.length - 3) + ' mais' : '';

    const alcadaClsMap = {
      'Supervisor': 'aprov-alcada-supervisor',
      'Gerente':    'aprov-alcada-gerente',
      'Diretor':    'aprov-alcada-diretor',
    };
    const alcadaCls = alcadaClsMap[req.alcada_aprovacao] || 'aprov-alcada-supervisor';

    // Indicador de etapa da card
    const etapaLabel = FluxoAprovacao.labelEtapa(req.alcada_aprovacao, req.status);

    return `
      <div class="aprov-card${req.urgente ? ' urgente' : ''}" style="animation-delay:${index * 60}ms">
        <div class="aprov-card-header">
          <div>
            <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;">
              <span class="aprov-card-numero">${Utils.escapeHtml(req.numero || '—')}</span>
              ${req.urgente ? `<span class="aprov-urgente-pill"><span class="aprov-urgente-dot"></span>Urgente</span>` : ''}
              <span style="font-size:11px;font-weight:600;color:#64748b;background:#F1F5F9;
                padding:2px 8px;border-radius:10px;">${Utils.escapeHtml(etapaLabel)}</span>
            </div>
            <span class="aprov-card-solicitante">
              ${Utils.escapeHtml(req.solicitante_nome || '—')} — ${Utils.escapeHtml(req.setor || '—')}
            </span>
          </div>
          <div style="flex-shrink:0;">${Components.badge(req.status)}</div>
        </div>

        <div class="aprov-card-body">
          <div class="aprov-meta-grid">
            <div>
              <span class="aprov-meta-label">Valor Total</span>
              <span class="aprov-valor-destaque">${Utils.formatCurrency(req.valor_total)}</span>
            </div>
            <div>
              <span class="aprov-meta-label">Alçada</span>
              <span class="aprov-meta-value">
                <span class="aprov-alcada-badge ${alcadaCls}">${Utils.escapeHtml(req.alcada_aprovacao || '—')}</span>
              </span>
            </div>
            <div>
              <span class="aprov-meta-label">Data Necessidade</span>
              <span class="aprov-meta-value">${Utils.formatDate(req.data_necessidade)}</span>
            </div>
            <div>
              <span class="aprov-meta-label">Solicitado em</span>
              <span class="aprov-meta-value">${Utils.formatDate(req.data_requisicao || req.created_at)}</span>
            </div>
          </div>

          ${itens.length > 0 ? `
            <div class="aprov-itens-preview">
              <strong>Itens:</strong> ${itensPreview}${Utils.escapeHtml(maisItens)}
            </div>` : ''}

          ${req.observacoes ? `
            <div class="aprov-itens-preview" style="margin-top:6px;">
              <strong>Observações:</strong> ${Utils.escapeHtml(req.observacoes)}
            </div>` : ''}
        </div>

        <div class="aprov-card-footer">
          <button class="aprov-btn-ver btn-ver-req" data-id="${Utils.escapeHtml(String(req.id))}">
            👁️ Ver Detalhes
          </button>
          ${FluxoAprovacao.podeAprovar(req.alcada_aprovacao, req.status, App.currentUser?.role, App.currentUser?.nivel_alcada) ? `
          <button class="aprov-btn-avaliar btn-avaliar" data-id="${Utils.escapeHtml(String(req.id))}">
            ⚡ Avaliar
          </button>` : ''}
        </div>
      </div>`;
  },

  /* ----------------------------------------------------------
     ABRIR DIALOG DE AVALIAÇÃO
  ---------------------------------------------------------- */
  _abrirDialog(id) {
    const req = this._pendentes.find(r => String(r.id) === String(id));
    if (!req) { Components.Toast.error('Requisição não encontrada.'); return; }

    const labelEtapa = FluxoAprovacao.labelEtapa(req.alcada_aprovacao, req.status);

    Components.Modal.show({
      title: 'Avaliação — ' + req.numero,
      size:  'lg',
      content: this._htmlProgressBar(req) + this._resumoHtml(req) +
               '<div class="aprov-dialog-divider"></div>' +
               this._htmlDecisao(req),
      footer: `
        <button class="drawer-btn-cancelar" id="btn-modal-cancelar">Cancelar</button>
        <button class="drawer-btn-salvar"   id="btn-modal-confirmar">✓ Confirmar Decisão</button>`,
    });

    document.getElementById('btn-modal-cancelar')
      ?.addEventListener('click', () => Components.Modal.hide());
    document.getElementById('btn-modal-confirmar')
      ?.addEventListener('click', () => this._confirmarDecisao(id));
  },

  /* ----------------------------------------------------------
     BARRA DE PROGRESSO DAS ETAPAS
  ---------------------------------------------------------- */
  _htmlProgressBar(req) {
    const cfg = FluxoAprovacao.getConfig(req.alcada_aprovacao);
    const status = req.status;

    const stepStyle = (ativo, feito, cor) =>
      'display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:20px;' +
      'font-size:12px;font-weight:700;font-family:\'Manrope\',sans-serif;' +
      (feito  ? 'background:#dcfce7;color:hsl(142,70%,28%);' :
       ativo  ? 'background:' + cor + '22;color:' + cor + ';' :
                'background:#F1F5F9;color:#94a3b8;');

    const arrow = '<span style="color:#CBD5E0;font-size:14px;">→</span>';

    // Fluxo de Diretoria (sem dupla aprovação)
    if (!cfg || !cfg.usa_dupla_aprovacao) {
      const ativoDiretoria = status === 'Aguardando Aprovacao da Diretoria';
      return `
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;
                    padding:10px 14px;background:#F8FAFC;border-radius:10px;margin-bottom:14px;">
          <span style="${stepStyle(ativoDiretoria, false, '#f97316')}">
            ${ativoDiretoria ? '⏳' : '1'} Diretoria
          </span>
          ${arrow}
          <span style="${stepStyle(false, false, '#10b981')}">✓ Cotação</span>
        </div>`;
    }

    // Fluxo dupla aprovação
    const etapa1Label = cfg.etapa1_label || '1ª Aprovação';
    const etapa2Label = cfg.etapa2_label || '2ª Aprovação';
    const isEtapa1 = status === 'Aguardando Aprovacao Etapa 1' || status === 'Aguardando Avaliacao de Compras';
    const isEtapa2 = status === 'Aguardando Aprovacao Etapa 2';
    const etapa1Feita = !isEtapa1;
    const etapa2Feita = !isEtapa1 && !isEtapa2;

    return `
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;
                  padding:10px 14px;background:#F8FAFC;border-radius:10px;margin-bottom:14px;">
        <span style="${stepStyle(isEtapa1, etapa1Feita, '#3b82f6')}">
          ${etapa1Feita ? '✓' : isEtapa1 ? '⏳' : '1'} ${Utils.escapeHtml(etapa1Label)}
        </span>
        ${arrow}
        <span style="${stepStyle(isEtapa2, etapa2Feita, '#8b5cf6')}">
          ${etapa2Feita ? '✓' : isEtapa2 ? '⏳' : '2'} ${Utils.escapeHtml(etapa2Label)}
        </span>
        ${arrow}
        <span style="${stepStyle(false, etapa2Feita, '#10b981')}">
          ${etapa2Feita ? '✓' : ''} Cotação
        </span>
      </div>`;
  },

  /* ----------------------------------------------------------
     RESUMO DA REQUISIÇÃO NO DIALOG
  ---------------------------------------------------------- */
  _resumoHtml(req) {
    return `
      <div class="aprov-dialog-resumo">
        <div class="aprov-dialog-resumo-row">
          <span class="aprov-dlabel">Solicitante</span>
          <span class="aprov-dvalue">${Utils.escapeHtml(req.solicitante_nome || '—')}</span>
        </div>
        <div class="aprov-dialog-resumo-row">
          <span class="aprov-dlabel">Valor Total</span>
          <span class="aprov-dvalue-money">${Utils.formatCurrency(req.valor_total)}</span>
        </div>
        <div class="aprov-dialog-resumo-row">
          <span class="aprov-dlabel">Alçada</span>
          <span class="aprov-dvalue">${Utils.escapeHtml(req.alcada_aprovacao || '—')}</span>
        </div>
        <div class="aprov-dialog-resumo-row">
          <span class="aprov-dlabel">Urgente</span>
          <span class="aprov-dvalue">${req.urgente ? '🔴 Sim' : 'Não'}</span>
        </div>
        <div class="aprov-dialog-resumo-row">
          <span class="aprov-dlabel">Setor</span>
          <span class="aprov-dvalue">${Utils.escapeHtml(req.setor || '—')}</span>
        </div>
        ${req.parecer_compras ? `
          <div class="aprov-dialog-resumo-row col">
            <span class="aprov-dlabel">Parecer — Etapa Anterior</span>
            <span class="aprov-dvalue" style="font-weight:400;line-height:1.5;">
              ${Utils.escapeHtml(req.parecer_compras)}
              ${req.avaliador_compras ? ' — <em>' + Utils.escapeHtml(req.avaliador_compras) + '</em>' : ''}
            </span>
          </div>` : ''}
      </div>`;
  },

  /* ----------------------------------------------------------
     OPÇÕES DE DECISÃO
  ---------------------------------------------------------- */
  _htmlDecisao(req) {
    const cfg = FluxoAprovacao.getConfig(req.alcada_aprovacao);
    const status = req.status;
    const isDiretoria = status === 'Aguardando Aprovacao da Diretoria';

    // Só quem tem nivel_alcada = 'Diretor' OU role = 'diretor' (sem nivel restrito) libera para cotação
    const userCurrent = App.currentUser;
    const userNivel   = userCurrent?.nivel_alcada || null;
    const userRole    = userCurrent?.role;
    // Admin com nivel_alcada definido segue o nivel; admin sem nivel_alcada vai para Diretoria
    const isDiretor   = userNivel
      ? userNivel.toLowerCase() === 'diretor'
      : userRole === 'diretor';
    const proximoLabel = isDiretoria
      ? 'Liberar para Cotação'           // já está na etapa Diretoria — aprovação final
      : isDiretor
        ? 'Liberar para Cotação'         // nivel Diretor aprova direto
        : 'Encaminhar para Diretoria';   // demais encaminham para diretor

    const parecerId = 'parecer-atual';

    return `
      <span class="aprov-decisao-label">Decisão *</span>
      <div class="aprov-radio-group">
        <label class="aprov-radio-option aprov-radio-aprovar">
          <input type="radio" name="decisao-atual" value="aprovar" />
          <span class="aprov-radio-icon">✅</span>
          <div>
            <span class="aprov-radio-titulo">Aprovar</span>
            <span class="aprov-radio-desc">${proximoLabel}.</span>
          </div>
        </label>
        <label class="aprov-radio-option aprov-radio-devolver">
          <input type="radio" name="decisao-atual" value="devolver" />
          <span class="aprov-radio-icon">↩️</span>
          <div>
            <span class="aprov-radio-titulo">Devolver ao Solicitante</span>
            <span class="aprov-radio-desc">Retorna para correções ou complemento.</span>
          </div>
        </label>
        <label class="aprov-radio-option aprov-radio-reprovar">
          <input type="radio" name="decisao-atual" value="reprovar" />
          <span class="aprov-radio-icon">❌</span>
          <div>
            <span class="aprov-radio-titulo">Reprovar</span>
            <span class="aprov-radio-desc">Processo encerrado definitivamente.</span>
          </div>
        </label>
      </div>

      <span class="aprov-parecer-label">Parecer / Justificativa *</span>
      <textarea class="aprov-parecer-textarea" id="${parecerId}" rows="3"
        placeholder="Descreva o motivo da decisão (obrigatório)..."></textarea>`;
  },

  /* ----------------------------------------------------------
     CONFIRMAR DECISÃO (unificado para todas as etapas)
  ---------------------------------------------------------- */
  async _confirmarDecisao(reqId) {
    const decisao = document.querySelector('input[name="decisao-atual"]:checked')?.value;
    const parecer = document.getElementById('parecer-atual')?.value.trim();

    if (!decisao) { Components.Toast.warning('Selecione uma decisão.'); return; }
    if (!parecer) { Components.Toast.warning('O parecer é obrigatório.'); return; }

    const btn = document.getElementById('btn-modal-confirmar');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Salvando...'; }

    try {
      const user    = App.currentUser;
      const req     = this._pendentes.find(r => String(r.id) === String(reqId));
      const alcada  = req?.alcada_aprovacao || '';
      const status  = req?.status || '';
      const agora   = new Date().toISOString();

      // Libera para cotação apenas quem tem nivel_alcada = Diretor ou role = diretor
      const nivelUser = user.nivel_alcada || null;
      const isDiretor = nivelUser
        ? nivelUser.toLowerCase() === 'diretor'
        : user.role === 'diretor';
      const isDiretoriaStatus = status === 'Aguardando Aprovacao da Diretoria';
      let novoStatus;
      if (decisao !== 'aprovar') {
        novoStatus = FluxoAprovacao.proximoStatus(alcada, status, decisao);
      } else if (isDiretoriaStatus || isDiretor) {
        novoStatus = 'Em Cotacao';
      } else {
        novoStatus = 'Aguardando Aprovacao da Diretoria';
      }
      const payload = { status: novoStatus };

      // Preencher campos da etapa correspondente (campos *_etapa1/2 requerem SQL do Passo 1)
      if (status === 'Aguardando Aprovacao Etapa 1' || status === 'Aguardando Avaliacao de Compras') {
        payload.parecer_compras        = parecer;
        payload.avaliador_compras      = user.nome;
        payload.data_avaliacao_compras = agora;
      } else if (status === 'Aguardando Aprovacao Etapa 2') {
        payload.parecer_compras        = parecer;
        payload.avaliador_compras      = user.nome;
        payload.data_avaliacao_compras = agora;
      } else if (status === 'Aguardando Aprovacao da Diretoria') {
        payload.aprovador_diretoria      = user.nome;
        payload.data_aprovacao_diretoria = agora;
        payload.consideracoes_diretoria  = parecer;
        if (decisao === 'reprovar') payload.justificativa_rejeicao = parecer;
      }

      await Storage.update(TABLES.requisicoes, reqId, payload);

      await Storage.create(TABLES.historico, {
        requisicao_id:   reqId,
        acao:            FluxoAprovacao.labelEtapa(alcada, status) + ' — ' +
                         (decisao === 'aprovar'  ? 'Aprovado'  :
                          decisao === 'devolver' ? 'Devolvido' : 'Reprovado'),
        usuario:         user.nome,
        usuario_email:   user.email,
        detalhes:        parecer,
        status_anterior: status,
        status_novo:     novoStatus,
      }).catch(() => {});

      Components.Modal.hide();

      const msg = decisao === 'aprovar'
        ? novoStatus === 'Em Cotacao'
          ? '✅ Aprovado! Liberado para cotação.'
          : '✅ Etapa aprovada! Aguardando próxima aprovação.'
        : decisao === 'devolver'
          ? '↩️ Devolvido ao solicitante.'
          : '❌ Requisição reprovada.';

      Components.Toast.success(msg);

      if (typeof Notificacoes !== 'undefined') {
        Notificacoes.notificarNovo(
          decisao === 'aprovar' ? 'aprovacao' : decisao === 'devolver' ? 'devolucao' : 'rejeicao',
          msg.replace(/^[✅↩️❌]\s*/, ''),
          req?.numero || '', 'aprovacoes'
        );
      }

      App._loadAllBadges?.();
      this._etapaAtiva = null; // Reset para auto-selecionar aba com pendências
      await this._carregar();

    } catch(e) {
      console.error('[Aprovacoes]', e);
      Components.Toast.error('Erro ao salvar a decisão. Tente novamente.');
      if (btn) { btn.disabled = false; btn.textContent = '✓ Confirmar Decisão'; }
    }
  },

  /* ----------------------------------------------------------
     SKELETON DE CARREGAMENTO
  ---------------------------------------------------------- */
  _skeleton() {
    return [...Array(2)].map(() => `
      <div class="aprov-skeleton-card">
        <div class="aprov-skeleton-header">
          <div class="skeleton skeleton-text" style="width:120px;margin-bottom:6px;"></div>
          <div class="skeleton skeleton-text" style="width:200px;"></div>
        </div>
        <div class="aprov-skeleton-body">
          <div class="aprov-skeleton-grid">
            ${[...Array(4)].map(() => `
              <div>
                <div class="skeleton skeleton-text" style="width:60%;margin-bottom:6px;"></div>
                <div class="skeleton skeleton-text" style="width:80%;"></div>
              </div>`).join('')}
          </div>
        </div>
      </div>`).join('');
  },
};

window.Pages = Pages;
