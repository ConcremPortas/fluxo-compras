/* ============================================================
   FLUXOCOMPRAS — Sistema de Notificações
   Sino na topbar com dropdown de pendências e histórico
============================================================ */

var Notificacoes = (function() {

  var _naoLidas  = 0;
  var _aberto    = false;
  var _abaAtiva  = 'pendencias';
  var _dados     = { pendencias: [], historico: [] };
  var _lidas     = new Set(JSON.parse(localStorage.getItem('fc_notif_lidas') || '[]'));

  /* ----------------------------------------------------------
     Ícones e cores por tipo
  ---------------------------------------------------------- */
  var TIPOS = {
    aprovacao:   { icone: '✅', bg: '#f0fdf4', cor: '#166534' },
    rejeicao:    { icone: '❌', bg: '#fef2f2', cor: '#991b1b' },
    urgente:     { icone: '🚨', bg: '#fff7ed', cor: '#c2410c' },
    cotacao:     { icone: '📋', bg: '#eff6ff', cor: '#1e40af' },
    oc:          { icone: '📦', bg: '#f0fdf4', cor: '#166534' },
    recebimento: { icone: '🏭', bg: '#fdf4ff', cor: '#6b21a8' },
    qualidade:   { icone: '🔬', bg: '#ecfeff', cor: '#155e75' },
    avaliacao:   { icone: '⭐', bg: '#fffbeb', cor: '#92400e' },
    devolucao:   { icone: '↩️', bg: '#fff7ed', cor: '#c2410c' },
    info:        { icone: 'ℹ️', bg: '#F8FAFC', cor: '#64748b' },
  };

  /* ----------------------------------------------------------
     Inicializar — inserir sino na topbar (chamado 1 vez)
  ---------------------------------------------------------- */
  function inicializar() {
    var topbar = document.querySelector('#topbar-right, .topbar-right, .top-bar-right');
    if (!topbar) {
      console.warn('[Notificacoes] Topbar não encontrada.');
      return;
    }

    // Criar wrap do sino
    var wrap = document.createElement('div');
    wrap.id = 'notif-wrap';
    wrap.style.cssText = 'position:relative;display:inline-flex;margin-right:8px;';
    wrap.innerHTML =
      '<button id="notif-btn" class="notif-btn" title="Notificações" aria-label="Notificações">' +
        '🔔' +
        '<span id="notif-badge" class="notif-badge oculto">0</span>' +
      '</button>';

    topbar.insertBefore(wrap, topbar.firstChild);

    // Overlay (fecha ao clicar fora)
    var overlay = document.createElement('div');
    overlay.id = 'notif-overlay';
    overlay.className = 'notif-overlay';
    document.body.appendChild(overlay);

    // Painel dropdown
    var painel = document.createElement('div');
    painel.id = 'notif-painel';
    painel.className = 'notif-painel';
    painel.innerHTML = _htmlPainel();
    document.body.appendChild(painel);

    // Bind: abrir/fechar
    document.getElementById('notif-btn')
      .addEventListener('click', function(e) { e.stopPropagation(); _toggle(); });

    overlay.addEventListener('click', fechar);

    // Bind: marcar todas como lidas
    document.getElementById('notif-btn-marcar-todas')
      .addEventListener('click', marcarTodasLidas);

    // Bind: abas (uma única vez)
    document.querySelectorAll('.notif-aba-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        _abaAtiva = btn.dataset.aba;
        document.querySelectorAll('.notif-aba-btn').forEach(function(b) {
          b.classList.toggle('active', b === btn);
        });
        _renderLista();
      });
    });

    // Bind: ver tudo no histórico
    document.getElementById('notif-ver-tudo')
      .addEventListener('click', function() {
        fechar();
        App.navigate('historico');
      });
  }

  /* ----------------------------------------------------------
     HTML do painel
  ---------------------------------------------------------- */
  function _htmlPainel() {
    return [
      '<div class="notif-header">',
        '<span class="notif-header-title">🔔 Notificações</span>',
        '<div class="notif-header-actions">',
          '<button class="notif-btn-marcar-todas" id="notif-btn-marcar-todas">',
            'Marcar todas como lidas',
          '</button>',
        '</div>',
      '</div>',
      '<div class="notif-abas">',
        '<button class="notif-aba-btn active" data-aba="pendencias">',
          'Pendências <span class="notif-aba-count" id="notif-count-pend">0</span>',
        '</button>',
        '<button class="notif-aba-btn" data-aba="historico">',
          'Histórico <span class="notif-aba-count" id="notif-count-hist">0</span>',
        '</button>',
      '</div>',
      '<div class="notif-lista" id="notif-lista"></div>',
      '<div class="notif-footer">',
        '<button class="notif-footer-link" id="notif-ver-tudo">Ver tudo no histórico →</button>',
      '</div>',
    ].join('');
  }

  /* ----------------------------------------------------------
     Abrir / fechar
  ---------------------------------------------------------- */
  function _toggle() {
    _aberto ? fechar() : abrir();
  }

  function abrir() {
    _aberto = true;
    document.getElementById('notif-painel').classList.add('visivel');
    document.getElementById('notif-overlay').classList.add('visivel');
    document.getElementById('notif-btn').classList.add('ativo');

    // Marcar itens da aba visível como lidos após 1.5s
    setTimeout(function() {
      (_dados[_abaAtiva] || []).forEach(function(n) { _lidas.add(n.id); });
      _salvarLidas();
      _atualizarBadge();
      _renderLista();
    }, 1500);

    carregar();
  }

  function fechar() {
    _aberto = false;
    var painel  = document.getElementById('notif-painel');
    var overlay = document.getElementById('notif-overlay');
    var btn     = document.getElementById('notif-btn');
    if (painel)  painel.classList.remove('visivel');
    if (overlay) overlay.classList.remove('visivel');
    if (btn)     btn.classList.remove('ativo');
  }

  /* ----------------------------------------------------------
     Carregar dados do banco
  ---------------------------------------------------------- */
  async function carregar() {
    var user = App.currentUser;
    if (!user) return;

    var role  = user.role;
    var email = user.email;

    try {
      var results = await Promise.all([
        Storage.list(TABLES.requisicoes).catch(function() { return []; }),
        Storage.list(TABLES.ordens).catch(function() { return []; }),
        Storage.list(TABLES.recebimentos).catch(function() { return []; }),
        Storage.list(TABLES.historico, {
          order: { column: 'created_at', ascending: false },
        }).catch(function() { return []; }),
      ]);

      var reqs         = results[0] || [];
      var ordens       = results[1] || [];
      var recebimentos = results[2] || [];
      var historico    = results[3] || [];

      _dados.pendencias = [];

      // Aprovações pendentes — Avaliação de Compras
      if (['admin','gerente'].includes(role)) {
        reqs
          .filter(function(r) { return r.status === 'Aguardando Avaliacao de Compras'; })
          .forEach(function(r) {
            _dados.pendencias.push({
              id:     'pend-comp-' + r.id,
              tipo:   'aprovacao',
              titulo: 'Aprovação de Compras',
              msg:    (r.numero || '—') + ' — ' + (r.solicitante_nome || '—') + ' · ' + Utils.formatCurrency(r.valor_total || 0),
              tempo:  r.created_at,
              rota:   'aprovacoes',
              urgente: r.urgente,
            });
          });
      }

      // Aprovações pendentes — Diretoria
      if (['admin','gerente','diretor'].includes(role)) {
        reqs
          .filter(function(r) { return r.status === 'Aguardando Aprovacao da Diretoria'; })
          .forEach(function(r) {
            _dados.pendencias.push({
              id:     'pend-dir-' + r.id,
              tipo:   'urgente',
              titulo: 'Aprovação da Diretoria',
              msg:    (r.numero || '—') + ' aguardando sua aprovação',
              tempo:  r.created_at,
              rota:   'aprovacoes',
            });
          });
      }

      // Cotações aguardando aprovação do demandante
      reqs
        .filter(function(r) {
          return r.status === 'Aguardando Aprovacao do Demandante' &&
            (r.solicitante_email === email || role === 'admin');
        })
        .forEach(function(r) {
          _dados.pendencias.push({
            id:     'pend-cot-' + r.id,
            tipo:   'cotacao',
            titulo: 'Cotação aguardando sua aprovação',
            msg:    (r.numero || '—') + ' — Você precisa aprovar a cotação',
            tempo:  r.created_at,
            rota:   'cotacoes',
          });
        });

      // OCs aguardando recebimento
      if (['admin','almoxarife'].includes(role)) {
        ordens
          .filter(function(o) { return o.status === 'Aguardando Recebimento'; })
          .forEach(function(o) {
            _dados.pendencias.push({
              id:     'pend-rec-' + o.id,
              tipo:   'recebimento',
              titulo: 'Material aguardando recebimento',
              msg:    (o.numero || '—') + ' — ' + (o.fornecedor_nome || o.fornecedor || '—'),
              tempo:  o.created_at,
              rota:   'recebimento',
            });
          });
      }

      // OCs aguardando análise de qualidade
      if (['admin','qualidade'].includes(role)) {
        recebimentos
          .filter(function(r) { return r.status === 'Aguardando Qualidade'; })
          .forEach(function(r) {
            _dados.pendencias.push({
              id:     'pend-qual-' + r.id,
              tipo:   'qualidade',
              titulo: 'Material aguardando análise de qualidade',
              msg:    'OC ' + (r.ordem_compra_numero || '—'),
              tempo:  r.created_at,
              rota:   'qualidade',
            });
          });
      }

      // OCs aguardando avaliação de fornecedor
      if (['admin','gerente'].includes(role)) {
        ordens
          .filter(function(o) { return o.status === 'Recebida'; })
          .forEach(function(o) {
            _dados.pendencias.push({
              id:     'pend-aval-' + o.id,
              tipo:   'avaliacao',
              titulo: 'Avaliação de fornecedor pendente',
              msg:    (o.numero || '—') + ' — ' + (o.fornecedor_nome || '—') + ' · Avalie para concluir',
              tempo:  o.created_at,
              rota:   'ordens',
            });
          });
      }

      // Histórico das últimas ações
      _dados.historico = historico.slice(0, 25).map(function(h) {
        return {
          id:      'hist-' + h.id,
          tipo:    _tipoDeAcao(h.acao),
          titulo:  h.acao || 'Ação registrada',
          msg:     [h.detalhes, h.status_novo ? ('→ ' + h.status_novo) : ''].filter(Boolean).join(' '),
          tempo:   h.created_at,
          rota:    'requisicoes',
          usuario: h.usuario,
        };
      });

      _atualizarBadge();
      if (_aberto) _renderLista();

      // Atualizar contadores das abas
      var elPend = document.getElementById('notif-count-pend');
      var elHist = document.getElementById('notif-count-hist');
      if (elPend) elPend.textContent = _dados.pendencias.length;
      if (elHist) elHist.textContent = _dados.historico.length;

    } catch(e) {
      console.warn('[Notificacoes]', e);
    }
  }

  /* ----------------------------------------------------------
     Renderizar lista de itens
  ---------------------------------------------------------- */
  function _renderLista() {
    var lista = document.getElementById('notif-lista');
    if (!lista) return;

    var items = _dados[_abaAtiva] || [];

    if (!items.length) {
      lista.innerHTML =
        '<div class="notif-empty">' +
          '<div class="notif-empty-icon">' + (_abaAtiva === 'pendencias' ? '✅' : '📋') + '</div>' +
          '<div class="notif-empty-title">' + (_abaAtiva === 'pendencias' ? 'Nenhuma pendência!' : 'Sem histórico recente') + '</div>' +
          '<div class="notif-empty-sub">' + (_abaAtiva === 'pendencias'
            ? 'Tudo em dia. Sem ações necessárias no momento.'
            : 'As ações do sistema aparecerão aqui.') + '</div>' +
        '</div>';
      return;
    }

    lista.innerHTML = items.map(function(n) {
      var tipo  = TIPOS[n.tipo] || TIPOS.info;
      var lida  = _lidas.has(n.id);
      var tempo = _tempoRelativo(n.tempo);
      return (
        '<div class="notif-item ' + (lida ? '' : 'nao-lida') + '"' +
            ' data-id="'   + Utils.escapeHtml(String(n.id))  + '"' +
            ' data-rota="' + Utils.escapeHtml(n.rota || '') + '">' +
          '<span class="notif-dot ' + (lida ? 'lida' : '') + '"></span>' +
          '<span class="notif-icone" style="background:' + tipo.bg + ';color:' + tipo.cor + ';">' +
            (n.urgente ? '🚨' : tipo.icone) +
          '</span>' +
          '<div class="notif-conteudo">' +
            '<div class="notif-titulo">' + Utils.escapeHtml(n.titulo) + '</div>' +
            '<div class="notif-msg">'    + Utils.escapeHtml(n.msg || '') + '</div>' +
            '<div class="notif-tempo">'  + tempo + (n.usuario ? ' · ' + Utils.escapeHtml(n.usuario) : '') + '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    // Clicar num item → marcar lido + navegar
    lista.querySelectorAll('.notif-item').forEach(function(el) {
      el.addEventListener('click', function() {
        var id   = el.dataset.id;
        var rota = el.dataset.rota;
        _lidas.add(id);
        _salvarLidas();
        el.classList.remove('nao-lida');
        var dot = el.querySelector('.notif-dot');
        if (dot) dot.classList.add('lida');
        _atualizarBadge();
        if (rota) { fechar(); App.navigate(rota); }
      });
    });
  }

  /* ----------------------------------------------------------
     Badge de contagem
  ---------------------------------------------------------- */
  function _atualizarBadge() {
    var badge = document.getElementById('notif-badge');
    if (!badge) return;

    var total = _dados.pendencias.concat(_dados.historico)
      .filter(function(n) { return !_lidas.has(n.id); }).length;

    _naoLidas = total;

    if (total > 0) {
      badge.textContent = total > 99 ? '99+' : String(total);
      badge.classList.remove('oculto');
      var btn = document.getElementById('notif-btn');
      if (btn) {
        btn.classList.remove('agitando');
        setTimeout(function() { btn.classList.add('agitando'); }, 10);
      }
    } else {
      badge.classList.add('oculto');
    }
  }

  /* ----------------------------------------------------------
     Marcar todas como lidas
  ---------------------------------------------------------- */
  function marcarTodasLidas() {
    _dados.pendencias.concat(_dados.historico).forEach(function(n) { _lidas.add(n.id); });
    _salvarLidas();
    _atualizarBadge();
    _renderLista();
    Components.Toast.success('Todas as notificações marcadas como lidas.');
  }

  /* ----------------------------------------------------------
     Persistência no localStorage
  ---------------------------------------------------------- */
  function _salvarLidas() {
    var arr = Array.from(_lidas).slice(-200);
    localStorage.setItem('fc_notif_lidas', JSON.stringify(arr));
  }

  /* ----------------------------------------------------------
     Helpers
  ---------------------------------------------------------- */
  function _tipoDeAcao(acao) {
    if (!acao) return 'info';
    var a = acao.toLowerCase();
    if (a.includes('aprova'))                           return 'aprovacao';
    if (a.includes('reprova') || a.includes('rejeit'))  return 'rejeicao';
    if (a.includes('devolvid'))                         return 'devolucao';
    if (a.includes('cotacao') || a.includes('cotação')) return 'cotacao';
    if (a.includes('ordem') || a.includes(' oc'))       return 'oc';
    if (a.includes('recebiment'))                       return 'recebimento';
    if (a.includes('qualidade'))                        return 'qualidade';
    if (a.includes('avalia'))                           return 'avaliacao';
    return 'info';
  }

  function _tempoRelativo(iso) {
    if (!iso) return '';
    var diff = Date.now() - new Date(iso).getTime();
    var min  = Math.floor(diff / 60000);
    var h    = Math.floor(min  / 60);
    var d    = Math.floor(h    / 24);
    if (min  < 1)  return 'agora mesmo';
    if (min  < 60) return 'há ' + min + ' min';
    if (h    < 24) return 'há ' + h + 'h';
    if (d    < 7)  return 'há ' + d + ' dia' + (d > 1 ? 's' : '');
    return Utils.formatDate(iso);
  }

  /* ----------------------------------------------------------
     API pública — adicionar notificação instantânea + agitar sino
  ---------------------------------------------------------- */
  function notificarNovo(tipo, titulo, msg, rota) {
    var n = {
      id:    'novo-' + Date.now(),
      tipo:  tipo,
      titulo: titulo,
      msg:   msg || '',
      rota:  rota || '',
      tempo: new Date().toISOString(),
    };
    _dados.pendencias.unshift(n);
    _atualizarBadge();
  }

  return {
    inicializar:      inicializar,
    carregar:         carregar,
    fechar:           fechar,
    marcarTodasLidas: marcarTodasLidas,
    notificarNovo:    notificarNovo,
  };

})();

window.Notificacoes = Notificacoes;
