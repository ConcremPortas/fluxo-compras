/* ============================================================
   FLUXOCOMPRAS — DatePicker Custom
   Identidade verde Concrem hsl(142,93%,8%) + esmeralda #6ee7b7
============================================================ */

var DatePicker = (function() {

  var _aberto  = null;
  var _overlay = null;

  var MESES = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
  ];

  var DIAS_SEMANA = ['D','S','T','Q','Q','S','S'];

  /* ----------------------------------------------------------
     Criar o elemento do calendário (singleton reutilizável)
  ---------------------------------------------------------- */
  function _criarCalendario() {
    var cal = document.createElement('div');
    cal.id  = 'dp-calendario';
    cal.innerHTML =
      '<div class="dp-header">' +
        '<button class="dp-nav" id="dp-prev" type="button">&#8249;</button>' +
        '<span class="dp-mes-ano" id="dp-mes-ano"></span>' +
        '<button class="dp-nav" id="dp-next" type="button">&#8250;</button>' +
      '</div>' +
      '<div class="dp-dias-semana">' +
        DIAS_SEMANA.map(function(d){ return '<span>' + d + '</span>'; }).join('') +
      '</div>' +
      '<div class="dp-dias" id="dp-dias"></div>' +
      '<div class="dp-footer">' +
        '<button class="dp-btn-hoje" id="dp-hoje" type="button">Hoje</button>' +
        '<button class="dp-btn-limpar" id="dp-limpar" type="button">Limpar</button>' +
      '</div>';

    document.body.appendChild(cal);

    _overlay = document.createElement('div');
    _overlay.id = 'dp-overlay';
    _overlay.addEventListener('click', fecharTodos);
    document.body.appendChild(_overlay);

    return cal;
  }

  /* ----------------------------------------------------------
     Inicializar um input como datepicker
  ---------------------------------------------------------- */
  function init(input, opcoes) {
    opcoes = opcoes || {};

    // Evitar dupla inicialização
    if (input._dpIniciado) {
      // Apenas atualizar opções se re-inicializado
      if (input._dp) {
        if (opcoes.minDate) input._dp.minDate = opcoes.minDate;
        if (opcoes.maxDate) input._dp.maxDate = opcoes.maxDate;
        if (opcoes.onChange) input._dp.onChange = opcoes.onChange;
      }
      return;
    }
    input._dpIniciado = true;

    // Capturar valor ISO existente (vindo de value ou data-value)
    var valorExistente = input.dataset.value || input.value || '';

    input.setAttribute('type', 'text');
    input.setAttribute('readonly', 'true');
    input.setAttribute('autocomplete', 'off');
    input.classList.add('dp-ativo');

    input._dp = {
      ano:      new Date().getFullYear(),
      mes:      new Date().getMonth(),
      valorISO: '',
      onChange: opcoes.onChange || null,
      minDate:  opcoes.minDate  || null,
      maxDate:  opcoes.maxDate  || null,
    };

    // Se tiver valor ISO válido, formatar e exibir
    if (valorExistente && /^\d{4}-\d{2}-\d{2}$/.test(valorExistente)) {
      var partes = valorExistente.split('-');
      input.value        = partes[2] + '/' + partes[1] + '/' + partes[0];
      input._dp.valorISO = valorExistente;
      var d = new Date(valorExistente + 'T00:00:00');
      input._dp.ano = d.getFullYear();
      input._dp.mes = d.getMonth();
    } else {
      input.value = '';
    }

    input.addEventListener('click', function(e) {
      e.stopPropagation();
      if (_aberto === input) { fecharTodos(); return; }
      abrir(input);
    });

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') fecharTodos();
    });
  }

  /* ----------------------------------------------------------
     Abrir o calendário para um input
  ---------------------------------------------------------- */
  function abrir(input) {
    fecharTodos();

    var cal = document.getElementById('dp-calendario') || _criarCalendario();
    _aberto = input;

    var rect = input.getBoundingClientRect();
    cal.style.display = 'block';
    cal.style.top     = (rect.bottom + window.scrollY + 6) + 'px';
    cal.style.left    = (rect.left   + window.scrollX) + 'px';

    if (_overlay) _overlay.style.display = 'block';

    // Ajuste de borda após renderização
    requestAnimationFrame(function() {
      var calRect = cal.getBoundingClientRect();
      if (calRect.right > window.innerWidth - 8) {
        cal.style.left = (window.innerWidth - calRect.width - 8 + window.scrollX) + 'px';
      }
      if (calRect.bottom > window.innerHeight - 8) {
        cal.style.top = (rect.top + window.scrollY - calRect.height - 6) + 'px';
      }
    });

    _renderMes(input._dp.ano, input._dp.mes);

    document.getElementById('dp-prev').onclick = function(e) {
      e.stopPropagation();
      input._dp.mes--;
      if (input._dp.mes < 0) { input._dp.mes = 11; input._dp.ano--; }
      _renderMes(input._dp.ano, input._dp.mes);
    };

    document.getElementById('dp-next').onclick = function(e) {
      e.stopPropagation();
      input._dp.mes++;
      if (input._dp.mes > 11) { input._dp.mes = 0; input._dp.ano++; }
      _renderMes(input._dp.ano, input._dp.mes);
    };

    document.getElementById('dp-hoje').onclick = function(e) {
      e.stopPropagation();
      var hoje = new Date();
      _selecionarData(input, hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    };

    document.getElementById('dp-limpar').onclick = function(e) {
      e.stopPropagation();
      input.value        = '';
      input._dp.valorISO = '';
      if (input._dp.onChange) input._dp.onChange('', input);
      fecharTodos();
    };
  }

  /* ----------------------------------------------------------
     Renderizar o grid de dias do mês
  ---------------------------------------------------------- */
  function _renderMes(ano, mes) {
    var cal = document.getElementById('dp-calendario');
    if (!cal) return;

    document.getElementById('dp-mes-ano').textContent = MESES[mes] + ' ' + ano;

    var primeiroDia  = new Date(ano, mes, 1).getDay();
    var diasNoMes    = new Date(ano, mes + 1, 0).getDate();
    var diasMesAnter = new Date(ano, mes, 0).getDate();

    var hoje       = new Date();
    var valorAtual = _aberto ? _aberto._dp.valorISO : '';
    var minDate    = _aberto ? _aberto._dp.minDate  : null;
    var maxDate    = _aberto ? _aberto._dp.maxDate  : null;

    var html = '';

    // Dias do mês anterior
    for (var i = primeiroDia - 1; i >= 0; i--) {
      html += '<button class="dp-dia dp-dia-outro" type="button" disabled>' +
        (diasMesAnter - i) + '</button>';
    }

    // Dias do mês atual
    for (var d = 1; d <= diasNoMes; d++) {
      var isoStr = ano + '-' +
        String(mes + 1).padStart(2, '0') + '-' +
        String(d).padStart(2, '0');

      var classes = ['dp-dia'];
      var disabled = false;

      if (isoStr === valorAtual) classes.push('dp-dia-selecionado');

      if (d === hoje.getDate() &&
          mes === hoje.getMonth() &&
          ano === hoje.getFullYear()) classes.push('dp-dia-hoje');

      if ((minDate && isoStr < minDate) || (maxDate && isoStr > maxDate)) {
        classes.push('dp-dia-desabilitado');
        disabled = true;
      }

      html += '<button class="' + classes.join(' ') + '" type="button"' +
        ' data-y="' + ano + '" data-m="' + mes + '" data-d="' + d + '"' +
        (disabled ? ' disabled' : '') + '>' + d + '</button>';
    }

    // Completar grid com dias do próximo mês
    var total  = primeiroDia + diasNoMes;
    var sobram = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (var n = 1; n <= sobram; n++) {
      html += '<button class="dp-dia dp-dia-outro" type="button" disabled>' + n + '</button>';
    }

    var grid = document.getElementById('dp-dias');
    grid.innerHTML = html;

    grid.onclick = function(e) {
      var btn = e.target.closest('.dp-dia:not(.dp-dia-outro):not(.dp-dia-desabilitado)');
      if (!btn || !_aberto) return;
      e.stopPropagation();
      _selecionarData(_aberto,
        parseInt(btn.dataset.y),
        parseInt(btn.dataset.m),
        parseInt(btn.dataset.d)
      );
    };
  }

  /* ----------------------------------------------------------
     Selecionar uma data
  ---------------------------------------------------------- */
  function _selecionarData(input, ano, mes, dia) {
    var isoStr = ano + '-' +
      String(mes + 1).padStart(2, '0') + '-' +
      String(dia).padStart(2, '0');

    var exibir = String(dia).padStart(2, '0') + '/' +
      String(mes + 1).padStart(2, '0') + '/' + ano;

    input.value        = exibir;
    input._dp.valorISO = isoStr;
    input._dp.ano      = ano;
    input._dp.mes      = mes;

    if (input._dp.onChange) input._dp.onChange(isoStr, input);

    _renderMes(ano, mes);
    setTimeout(fecharTodos, 150);
  }

  /* ----------------------------------------------------------
     Fechar todos os calendários
  ---------------------------------------------------------- */
  function fecharTodos() {
    var cal = document.getElementById('dp-calendario');
    if (cal) cal.style.display = 'none';
    if (_overlay) _overlay.style.display = 'none';
    _aberto = null;
  }

  /* ----------------------------------------------------------
     Inicializar todos os inputs de data na página
  ---------------------------------------------------------- */
  function initAll(seletor, opcoes) {
    seletor = seletor || 'input[type="date"], input.dp-input';
    document.querySelectorAll(seletor).forEach(function(input) {
      if (!input.dataset.value && input.value) {
        input.dataset.value = input.value;
      }
      init(input, opcoes || {});
    });
  }

  /* ----------------------------------------------------------
     Obter o valor ISO de um input datepicker
  ---------------------------------------------------------- */
  function getValue(input) {
    return input && input._dp ? input._dp.valorISO : (input ? input.value : '');
  }

  /* Fechar com Escape global */
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') fecharTodos();
  });

  return {
    init:     init,
    initAll:  initAll,
    getValue: getValue,
    fechar:   fecharTodos,
  };

})();

window.DatePicker = DatePicker;
