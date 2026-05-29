/* ============================================================
   FLUXOCOMPRAS — CustomSelect
   Identidade Concrem: verde hsl(142,93%,8%) + esmeralda #6ee7b7
   Substitui todos os <select> nativos do sistema
============================================================ */

var CustomSelect = (function () {

  /* ----------------------------------------------------------
     Injetar estilos do componente (executar uma vez)
  ---------------------------------------------------------- */
  function _injetarEstilos() {
    if (document.getElementById('cs-styles')) return;
    var style = document.createElement('style');
    style.id = 'cs-styles';
    style.textContent = `
      /* ── Wrapper ── */
      .cs-wrap { position: relative; width: 100%; }

      /* ── Trigger (botão que abre o dropdown) ── */
      .cs-trigger {
        display: flex; align-items: center; justify-content: space-between; gap: 8px;
        height: 40px; padding: 0 12px; width: 100%;
        background: #ffffff; border: 1.5px solid #d1d5db; border-radius: 10px;
        cursor: pointer; font-size: 14px; color: #111827;
        font-family: 'Manrope', sans-serif;
        transition: border-color .15s, box-shadow .15s;
        user-select: none; text-align: left;
      }
      .cs-trigger:hover   { border-color: #6ee7b7; }
      .cs-trigger.open    { border-color: hsl(142,93%,8%); box-shadow: 0 0 0 3px hsla(142,93%,8%,.08); }
      .cs-trigger.invalid { border-color: #ef4444; }
      .cs-trigger.disabled{ opacity: .5; cursor: not-allowed; background: #f9fafb; pointer-events: none; }

      /* ── Placeholder vs valor selecionado ── */
      .cs-value { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .cs-value.placeholder { color: #9ca3af; }

      /* ── Tags para multi-select ── */
      .cs-tags { display: flex; align-items: center; gap: 5px; flex: 1; overflow: hidden; }
      .cs-tag  {
        display: flex; align-items: center; gap: 3px; padding: 2px 8px;
        background: hsla(142,93%,8%,.09); color: hsl(142,50%,22%);
        border-radius: 6px; font-size: 12px; font-weight: 600; white-space: nowrap; flex-shrink: 0;
      }
      .cs-tag-x { cursor: pointer; opacity: .5; font-size: 13px; margin-left: 1px; line-height: 1; }
      .cs-tag-x:hover { opacity: 1; }
      .cs-tag-more { font-size: 11px; color: #9ca3af; white-space: nowrap; flex-shrink: 0; }

      /* ── Seta ── */
      .cs-arrow {
        width: 18px; height: 18px; flex-shrink: 0; color: #9ca3af;
        display: flex; align-items: center; justify-content: center;
        transition: transform .2s, color .15s;
      }
      .cs-trigger.open .cs-arrow { transform: rotate(180deg); color: hsl(142,93%,8%); }

      /* ── Dropdown ── */
      .cs-dropdown {
        position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 9999;
        background: #ffffff; border: 1.5px solid hsl(142,93%,8%); border-radius: 12px;
        box-shadow: 0 8px 28px rgba(0,0,0,.13); overflow: hidden;
        animation: csDropIn .15s ease;
      }
      @keyframes csDropIn { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }

      /* ── Posição acima (quando não cabe abaixo) ── */
      .cs-dropdown.above { top: auto; bottom: calc(100% + 6px); animation: csDropUp .15s ease; }
      @keyframes csDropUp { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }

      /* ── Busca ── */
      .cs-search-wrap { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; position: relative; }
      .cs-search-icon { position: absolute; top: 50%; left: 20px; transform: translateY(-50%); color: #9ca3af; pointer-events: none; }
      .cs-search-input {
        width: 100%; height: 32px; padding: 0 10px 0 32px;
        border: 1.5px solid #e5e7eb; border-radius: 8px;
        font-size: 13px; font-family: 'Manrope', sans-serif;
        color: #111827; background: #f9fafb; outline: none;
        transition: border-color .15s;
      }
      .cs-search-input:focus { border-color: #6ee7b7; }

      /* ── Lista ── */
      .cs-list { max-height: 224px; overflow-y: auto; padding: 4px; }
      .cs-list::-webkit-scrollbar { width: 4px; }
      .cs-list::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }

      /* ── Grupo ── */
      .cs-group-label {
        padding: 7px 10px 3px; font-size: 10.5px; font-weight: 700;
        color: hsl(142,55%,25%); text-transform: uppercase; letter-spacing: .06em;
      }

      /* ── Opção ── */
      .cs-option {
        display: flex; align-items: center; gap: 10px;
        padding: 9px 10px; border-radius: 8px; cursor: pointer;
        font-size: 13.5px; color: #111827; transition: background .1s;
        user-select: none;
      }
      .cs-option:hover    { background: hsla(142,93%,8%,.05); }
      .cs-option.selected { background: hsla(142,93%,8%,.08); font-weight: 600; color: hsl(142,93%,8%); }
      .cs-option.disabled { opacity: .4; cursor: not-allowed; pointer-events: none; }
      .cs-option.hidden   { display: none; }

      /* ── Ícone da opção ── */
      .cs-opt-icon {
        width: 28px; height: 28px; border-radius: 7px; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; background: #f3f4f6;
      }

      /* ── Metadados da opção ── */
      .cs-opt-meta { display: flex; flex-direction: column; flex: 1; min-width: 0; }
      .cs-opt-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .cs-opt-sub { font-size: 11px; color: #6b7280; margin-top: 1px; }

      /* ── Badge da opção ── */
      .cs-opt-badge {
        font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 5px;
        margin-left: auto; flex-shrink: 0; white-space: nowrap;
      }
      .cs-opt-badge.green { background: hsla(142,55%,25%,.1); color: hsl(142,55%,25%); }
      .cs-opt-badge.gray  { background: #f3f4f6; color: #6b7280; }
      .cs-opt-badge.red   { background: #fee2e2; color: #991b1b; }
      .cs-opt-badge.amber { background: #fef3c7; color: #92400e; }

      /* ── Check do item selecionado ── */
      .cs-check { width: 16px; height: 16px; flex-shrink: 0; color: hsl(142,93%,8%); opacity: 0; transition: opacity .1s; }
      .cs-option.selected .cs-check { opacity: 1; }

      /* ── Divisor ── */
      .cs-divider { height: 1px; background: #f3f4f6; margin: 3px 0; }

      /* ── Vazio ── */
      .cs-empty { padding: 18px; text-align: center; font-size: 13px; color: #9ca3af; }

      /* ── Rodapé ── */
      .cs-footer {
        padding: 6px 10px; border-top: 1px solid #f3f4f6;
        display: flex; align-items: center; justify-content: space-between;
      }
      .cs-btn-clear {
        font-size: 12px; color: #9ca3af; cursor: pointer; padding: 2px 6px;
        border-radius: 5px; background: none; border: none;
        font-family: 'Manrope', sans-serif; transition: color .12s, background .12s;
      }
      .cs-btn-clear:hover { color: hsl(142,93%,8%); background: hsla(142,93%,8%,.06); }
      .cs-footer-count { font-size: 11px; color: #9ca3af; }

      /* ── Dot de status (status badges inline) ── */
      .cs-status-dot {
        width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; display: inline-block;
      }

    `;
    document.head.appendChild(style);
  }

  /* ----------------------------------------------------------
     SVG helpers
  ---------------------------------------------------------- */
  var SVG_ARROW = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6l4 4 4-4"/></svg>`;
  var SVG_CHECK = `<svg class="cs-check" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 8l3.5 3.5L13 5"/></svg>`;
  var SVG_SEARCH = `<svg class="cs-search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7" cy="7" r="4"/><path d="M11 11l2.5 2.5"/></svg>`;

  /* ----------------------------------------------------------
     Estado global
  ---------------------------------------------------------- */
  var _aberto = null;

  function fecharTodos() {
    if (_aberto) { _aberto.fechar(); _aberto = null; }
  }

  // Fechar ao clicar fora — sem overlay, compatível com modais
  document.addEventListener('click', function (e) {
    if (_aberto && !e.target.closest('.cs-wrap')) {
      fecharTodos();
    }
  }, true);

  /* ----------------------------------------------------------
     Verificar se dropdown cabe abaixo ou vai acima
  ---------------------------------------------------------- */
  function _ajustarPosicao(trigger, dropdown) {
    var rect = trigger.getBoundingClientRect();
    var spaceBelow = window.innerHeight - rect.bottom;
    var spaceAbove = rect.top;
    if (spaceBelow < 260 && spaceAbove > spaceBelow) {
      dropdown.classList.add('above');
    } else {
      dropdown.classList.remove('above');
    }
  }

  /* ----------------------------------------------------------
     Criar instância do Custom Select
  ---------------------------------------------------------- */
  function criar(container, opcoes, config) {
    _injetarEstilos();

    config = Object.assign({
      placeholder: 'Selecione...',
      multi:    false,
      busca:    opcoes.length > 6,
      limpar:   true,
      rodape:   opcoes.length > 6,
      onChange: null,
      value:    config && config.multi ? [] : '',
      disabled: false,
    }, config || {});

    var selecionados = config.multi
      ? (Array.isArray(config.value) ? config.value.slice() : [])
      : config.value || '';

    /* -- Montar HTML -- */
    var wrap = document.createElement('div');
    wrap.className = 'cs-wrap';

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'cs-trigger' + (config.disabled ? ' disabled' : '');
    trigger.innerHTML = '<span class="cs-value placeholder">' + config.placeholder + '</span>' +
      '<div class="cs-arrow">' + SVG_ARROW + '</div>';
    wrap.appendChild(trigger);

    var dropdown = document.createElement('div');
    dropdown.className = 'cs-dropdown';
    dropdown.style.display = 'none';

    var inputBusca = null;
    if (config.busca) {
      var searchWrap = document.createElement('div');
      searchWrap.className = 'cs-search-wrap';
      searchWrap.innerHTML = SVG_SEARCH;
      inputBusca = document.createElement('input');
      inputBusca.type = 'text';
      inputBusca.className = 'cs-search-input';
      inputBusca.placeholder = 'Buscar...';
      searchWrap.appendChild(inputBusca);
      dropdown.appendChild(searchWrap);
    }

    var lista = document.createElement('div');
    lista.className = 'cs-list';
    dropdown.appendChild(lista);

    var rodapeEl = null;
    if (config.limpar || config.rodape) {
      rodapeEl = document.createElement('div');
      rodapeEl.className = 'cs-footer';
      if (config.limpar) {
        var btnLimpar = document.createElement('button');
        btnLimpar.type = 'button';
        btnLimpar.className = 'cs-btn-clear';
        btnLimpar.textContent = 'Limpar';
        btnLimpar.addEventListener('click', function (e) {
          e.stopPropagation();
          if (config.multi) { selecionados = []; } else { selecionados = ''; }
          _renderizarTrigger();
          _renderizarOpcoes();
          if (config.onChange) config.onChange(config.multi ? [] : '');
        });
        rodapeEl.appendChild(btnLimpar);
      }
      if (config.rodape) {
        var countEl = document.createElement('span');
        countEl.className = 'cs-footer-count';
        countEl.textContent = opcoes.length + ' opções';
        rodapeEl.appendChild(countEl);
      }
      dropdown.appendChild(rodapeEl);
    }

    wrap.appendChild(dropdown);

    /* -- Renderizar lista de opções -- */
    function _renderizarOpcoes(filtro) {
      lista.innerHTML = '';
      var filtroLower = filtro ? filtro.toLowerCase() : '';
      var grupoAtual = null;
      var visiveis = 0;

      opcoes.forEach(function (op) {
        if (filtroLower) {
          var texto = (op.label + ' ' + (op.sublabel || '') + ' ' + (op.group || '')).toLowerCase();
          if (!texto.includes(filtroLower)) return;
        }
        visiveis++;

        if (op.group && op.group !== grupoAtual) {
          grupoAtual = op.group;
          var g = document.createElement('div');
          g.className = 'cs-group-label';
          g.textContent = op.group;
          lista.appendChild(g);
        }

        if (op.divider) {
          var div = document.createElement('div');
          div.className = 'cs-divider';
          lista.appendChild(div);
          return;
        }

        var li = document.createElement('div');
        li.className = 'cs-option' +
          (op.disabled ? ' disabled' : '') +
          (_isSelected(op.value) ? ' selected' : '');
        li.dataset.value = op.value;

        var html = '';
        if (op.icon) html += '<div class="cs-opt-icon">' + op.icon + '</div>';
        if (op.dotColor) html += '<span class="cs-status-dot" style="background:' + op.dotColor + '"></span>';

        html += '<div class="cs-opt-meta">';
        html += '<div class="cs-opt-label">' + _escHtml(op.label) + '</div>';
        if (op.sublabel) html += '<div class="cs-opt-sub">' + _escHtml(op.sublabel) + '</div>';
        html += '</div>';

        if (op.badge) {
          html += '<span class="cs-opt-badge ' + (op.badgeColor || 'gray') + '">' + _escHtml(op.badge) + '</span>';
        }

        html += SVG_CHECK;
        li.innerHTML = html;

        li.addEventListener('click', function (e) {
          e.stopPropagation();
          if (op.disabled) return;
          if (config.multi) {
            var idx = selecionados.indexOf(op.value);
            if (idx === -1) { selecionados.push(op.value); }
            else            { selecionados.splice(idx, 1); }
            _renderizarTrigger();
            _renderizarOpcoes(inputBusca ? inputBusca.value : '');
            if (config.onChange) config.onChange(selecionados.slice());
          } else {
            selecionados = op.value;
            _renderizarTrigger();
            fecharTodos();
            if (config.onChange) config.onChange(selecionados);
          }
        });

        lista.appendChild(li);
      });

      if (visiveis === 0) {
        var empty = document.createElement('div');
        empty.className = 'cs-empty';
        empty.textContent = 'Nenhum resultado encontrado';
        lista.appendChild(empty);
      }

      if (rodapeEl && config.rodape) {
        var countSpan = rodapeEl.querySelector('.cs-footer-count');
        if (countSpan) countSpan.textContent = visiveis + ' opções';
      }
    }

    function _isSelected(val) {
      return config.multi ? selecionados.indexOf(val) !== -1 : selecionados === val;
    }

    /* -- Renderizar trigger -- */
    function _renderizarTrigger() {
      var valueEl = trigger.querySelector('.cs-value, .cs-tags');
      if (valueEl) trigger.removeChild(valueEl);

      if (config.multi) {
        var tagsWrap = document.createElement('div');
        tagsWrap.className = 'cs-tags';

        if (selecionados.length === 0) {
          var ph = document.createElement('span');
          ph.className = 'cs-value placeholder';
          ph.textContent = config.placeholder;
          tagsWrap.appendChild(ph);
        } else {
          var MAX_TAGS = 2;
          selecionados.slice(0, MAX_TAGS).forEach(function (val) {
            var op = opcoes.find(function (o) { return o.value === val; });
            if (!op) return;
            var tag = document.createElement('span');
            tag.className = 'cs-tag';
            tag.innerHTML = _escHtml(op.label) +
              '<span class="cs-tag-x" data-val="' + val + '">×</span>';
            tag.querySelector('.cs-tag-x').addEventListener('click', function (e) {
              e.stopPropagation();
              var idx = selecionados.indexOf(val);
              if (idx !== -1) selecionados.splice(idx, 1);
              _renderizarTrigger();
              _renderizarOpcoes();
              if (config.onChange) config.onChange(selecionados.slice());
            });
            tagsWrap.appendChild(tag);
          });
          if (selecionados.length > MAX_TAGS) {
            var more = document.createElement('span');
            more.className = 'cs-tag-more';
            more.textContent = '+' + (selecionados.length - MAX_TAGS) + ' mais';
            tagsWrap.appendChild(more);
          }
        }
        trigger.insertBefore(tagsWrap, trigger.querySelector('.cs-arrow'));

      } else {
        var span = document.createElement('span');
        if (!selecionados) {
          span.className = 'cs-value placeholder';
          span.textContent = config.placeholder;
        } else {
          span.className = 'cs-value';
          var op = opcoes.find(function (o) { return o.value === selecionados; });
          if (op) {
            if (op.dotColor) {
              span.innerHTML = '<span class="cs-status-dot" style="background:' + op.dotColor + ';margin-right:7px"></span>' + _escHtml(op.label);
            } else {
              span.textContent = op.label;
            }
          } else {
            span.textContent = selecionados;
          }
        }
        trigger.insertBefore(span, trigger.querySelector('.cs-arrow'));
      }
    }

    /* -- Abrir/fechar -- */
    function abrir() {
      if (config.disabled) return;
      fecharTodos();
      _aberto = instancia;
      dropdown.style.display = 'block';
      trigger.classList.add('open');
      _ajustarPosicao(trigger, dropdown);
      if (inputBusca) { inputBusca.value = ''; inputBusca.focus(); _renderizarOpcoes(); }
    }

    function fechar() {
      dropdown.style.display = 'none';
      trigger.classList.remove('open');
    }

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (dropdown.style.display === 'none') { abrir(); } else { fechar(); _aberto = null; }
    });

    if (inputBusca) {
      inputBusca.addEventListener('input', function () {
        _renderizarOpcoes(inputBusca.value.trim());
      });
      inputBusca.addEventListener('click', function (e) { e.stopPropagation(); });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && _aberto === instancia) { fechar(); _aberto = null; }
    });

    _renderizarOpcoes();
    _renderizarTrigger();

    container.innerHTML = '';
    container.appendChild(wrap);

    var instancia = {
      fechar:      fechar,
      abrir:       abrir,
      getValue:    function () { return config.multi ? selecionados.slice() : selecionados; },
      setValue:    function (val) {
        selecionados = config.multi ? (Array.isArray(val) ? val.slice() : []) : (val || '');
        _renderizarTrigger(); _renderizarOpcoes();
      },
      setOpcoes:   function (novas) { opcoes = novas; _renderizarOpcoes(); _renderizarTrigger(); },
      setDisabled: function (d) {
        config.disabled = d;
        d ? trigger.classList.add('disabled') : trigger.classList.remove('disabled');
      },
      setInvalid:  function (inv) {
        inv ? trigger.classList.add('invalid') : trigger.classList.remove('invalid');
      },
      destruir:    function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }
    };

    return instancia;
  }

  /* ----------------------------------------------------------
     Helper: escapar HTML
  ---------------------------------------------------------- */
  function _escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ----------------------------------------------------------
     API pública
  ---------------------------------------------------------- */
  return { criar: criar, fecharTodos: fecharTodos };

})();
