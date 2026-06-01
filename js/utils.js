/* ============================================================
   FLUXOCOMPRAS — Utils: Funções utilitárias globais
   ============================================================ */

/* Mapa de cores por status — usado pelo CustomSelect */
var STATUS_CORES = {
  'Aguardando Avaliação de Compras':       '#f59e0b',
  'Aguardando Avaliacao de Compras':       '#f59e0b',
  'Devolvida ao Solicitante':              '#ef4444',
  'Aguardando Aprovação da Diretoria':     '#8b5cf6',
  'Aguardando Aprovacao da Diretoria':     '#8b5cf6',
  'Aprovada pela Diretoria':               '#10b981',
  'Não Aprovada':                          '#ef4444',
  'Em Cotação':                            '#3b82f6',
  'Aguardando Aprovação do Demandante':    '#f59e0b',
  'Aguardando Aprovacao do Demandante':    '#f59e0b',
  'Análise de Faturamento':                '#6366f1',
  'Ordem de Compra Gerada':                '#10b981',
  'Aguardando Recebimento':                '#f59e0b',
  'Aguardando Análise de Qualidade':       '#8b5cf6',
  'Aguardando Qualidade':                  '#8b5cf6',
  'Concluída':                             '#10b981',
  'Cancelada':                             '#6b7280',
  'Em Andamento':                          '#3b82f6',
  'Aprovada':                              '#10b981',
  'Em Revisão':                            '#f59e0b',
  'Aguardando Aprovacao Etapa 1':          '#f59e0b',
  'Aguardando Aprovacao Etapa 2':          '#8b5cf6',
  'Rascunho':                              '#9ca3af',
};

const Utils = {

  /* ----------------------------------------------------------
     FORMATAÇÃO DE VALORES
  ---------------------------------------------------------- */

  /** Formata número como moeda BRL: R$ 1.234,56 */
  formatCurrency(value) {
    if (value === null || value === undefined || value === '') return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(Number(value));
  },

  /** Formata data: 21/05/2025 */
  formatDate(date) {
    if (!date) return '—';
    const str = String(date);
    // Strings YYYY-MM-DD são datas puras — convertidas pelo Date() como UTC meia-noite,
    // o que causa adiantamento de 1 dia no fuso America/Sao_Paulo (UTC-3).
    // Reformata diretamente sem criar objeto Date para evitar o problema.
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split('-');
      return `${d}/${m}/${y}`;
    }
    const d = new Date(str);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  },

  /** Formata data e hora: 21/05/2025 14:30 */
  formatDateTime(date) {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d)) return '—';
    return d.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  /* ----------------------------------------------------------
     NUMERAÇÃO AUTOMÁTICA
  ---------------------------------------------------------- */

  /** Gera código RC com timestamp: RC-123456 */
  generateRC() {
    const ts  = Date.now().toString().slice(-5);
    const rnd = Math.floor(Math.random() * 10);
    return `RC-${ts}${rnd}`;
  },

  /** Gera código COT com timestamp+random: COT-123456 */
  generateCOT() {
    const ts  = Date.now().toString().slice(-5);
    const rnd = Math.floor(Math.random() * 10);
    return `COT-${ts}${rnd}`;
  },

  /** Gera número de OC sequencial: OC-0001 */
  generateOC(count) {
    const n = (count + 1).toString().padStart(4, '0');
    return `OC-${n}`;
  },

  /* ----------------------------------------------------------
     ALÇADA DE APROVAÇÃO
  ---------------------------------------------------------- */

  /**
   * Calcula o nível de alçada com base no valor total.
   * Faixas padrão — podem ser sobrescritas pela config_alcadas do banco.
   * @returns {'Supervisor'|'Gerente'|'Diretor'}
   */
  calcAlcada(valor, alcadasConfig = null) {
    const v = Number(valor);

    if (alcadasConfig && Array.isArray(alcadasConfig)) {
      // Usa configuração dinâmica do banco
      const sorted = [...alcadasConfig].sort((a, b) => a.valor_minimo - b.valor_minimo);
      for (const faixa of sorted) {
        if (faixa.sem_limite_maximo || v <= faixa.valor_maximo) {
          return faixa.nome;
        }
      }
    }

    // Faixas padrão (fallback)
    if (v <= 5000)   return 'Supervisor';
    if (v <= 100000) return 'Gerente';
    return 'Diretor';
  },

  /* ----------------------------------------------------------
     HELPERS DE STATUS
  ---------------------------------------------------------- */

  /** Retorna texto legível do status (valores vindos do banco) */
  getStatusLabel(status) {
    const labels = {
      // Status do banco (concrem_fxcp_requisicoes)
      'Aguardando Avaliacao de Compras':       'Aguard. Avaliação',
      'Aguardando Aprovacao Etapa 1':          'Aguard. 1ª Aprovação',
      'Aguardando Aprovacao Etapa 2':          'Aguard. 2ª Aprovação',
      'Devolvida ao Solicitante':              'Devolvida',
      'Aguardando Aprovacao da Diretoria':     'Aguard. Diretoria',
      'Aprovada pela Diretoria':               'Aprovada',
      'Nao Aprovada':                          'Não Aprovada',
      'Em Cotacao':                            'Em Cotação',
      'Aguardando Aprovacao do Demandante':    'Aguard. Demandante',
      'Analise de Faturamento':                'Anál. Faturamento',
      'Ordem de Compra Gerada':                'OC Gerada',
      'Aguardando Recebimento':                'Aguard. Recebimento',
      'Aguardando Analise de Qualidade':       'Aguard. Qualidade',
      'Aguardando Avaliacao Fornecedor':       'Aguard. Avaliação Fornecedor',
      'Concluida':                             'Concluída',
      'Cancelada':                             'Cancelada',
      // Fornecedores / usuários / centros de custo
      'Ativo':             'Ativo',
      'Inativo':           'Inativo',
      // Status de cotações / ordens
      'Em Andamento':      'Em Andamento',
      'Concluida Cotacao': 'Cotação Concluída',
      'Aprovado':          'Aprovado',
      'Reprovado':         'Reprovado',
      'Pendente':          'Pendente',
      'Aguardando Qualidade':    'Aguard. Qualidade',
      'Aguardando Confirmacao':  'Aguard. Confirmação',
      'Recebida':                'Recebida',
    };
    return labels[status] || status || '—';
  },

  /** Retorna a classe CSS do badge para o status do banco */
  getStatusBadgeClass(status) {
    const classes = {
      'Aguardando Avaliacao de Compras':    'badge-waiting',
      'Aguardando Aprovacao Etapa 1':       'badge-info',
      'Aguardando Aprovacao Etapa 2':       'badge-purple',
      'Devolvida ao Solicitante':           'badge-returned',
      'Aguardando Aprovacao da Diretoria':  'badge-waiting',
      'Aprovada pela Diretoria':            'badge-approved',
      'Nao Aprovada':                       'badge-rejected',
      'Em Cotacao':                         'badge-progress',
      'Aguardando Aprovacao do Demandante': 'badge-waiting',
      'Analise de Faturamento':             'badge-progress',
      'Ordem de Compra Gerada':             'badge-progress',
      'Aguardando Recebimento':             'badge-progress',
      'Aguardando Analise de Qualidade':    'badge-progress',
      'Aguardando Avaliacao Fornecedor':    'badge-progress',
      'Concluida':                          'badge-concluded',
      'Cancelada':                          'badge-cancelled',
      // Fornecedores / usuários / centros de custo
      'Ativo':                 'badge-approved',
      'Inativo':               'badge-cancelled',
      // Cotações / ordens / qualidade
      'Em Andamento':          'badge-progress',
      'Aprovado':              'badge-approved',
      'Reprovado':             'badge-rejected',
      'Pendente':              'badge-waiting',
      'Aguardando Qualidade':    'badge-progress',
      'Aguardando Confirmacao':  'badge-progress',
      'Recebida':                'badge-progress',
    };
    return classes[status] || 'badge-cancelled';
  },

  /* ----------------------------------------------------------
     PDF HELPERS
  ---------------------------------------------------------- */

  /**
   * Normaliza texto para uso em jsPDF (remove acentos e cedilhas).
   * jsPDF na versão básica não suporta UTF-8 sem fonte adicional.
   */
  norm(text) {
    if (!text) return '';
    return String(text)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^\x00-\x7F]/g, '');
  },

  /* ----------------------------------------------------------
     PERMISSÕES POR ROLE
  ---------------------------------------------------------- */

  /** Verifica se o role pode aprovar no fluxo de compras */
  canApproveCompras(role) {
    return ['supervisor', 'gerente', 'diretor', 'admin'].includes(role);
  },

  /** Verifica se o role pode aprovar no nível de diretoria */
  canApproveDiretoria(role) {
    return ['diretor', 'admin'].includes(role);
  },

  /**
   * Retorna o escopo de visibilidade do role.
   * @returns {'all'|'own'}
   */
  getVisibility(role) {
    const ownRoles = ['solicitante'];
    return ownRoles.includes(role) ? 'own' : 'all';
  },

  /* ----------------------------------------------------------
     VALIDAÇÃO
  ---------------------------------------------------------- */

  /** Valida CNPJ (formato e dígitos verificadores) */
  validateCNPJ(cnpj) {
    const c = cnpj.replace(/\D/g, '');
    if (c.length !== 14) return false;
    if (/^(\d)\1+$/.test(c)) return false;

    const calc = (c, n) => {
      let s = 0, p = n;
      for (let i = 0; i < n; i++, p = p === 2 ? 9 : p - 1) {
        s += parseInt(c[i]) * p;
      }
      const r = s % 11;
      return r < 2 ? 0 : 11 - r;
    };

    return calc(c, 12) === parseInt(c[12]) && calc(c, 13) === parseInt(c[13]);
  },

  /** Valida formato de e-mail */
  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  /** Valida que o campo não está vazio */
  validateRequired(value) {
    return value !== null && value !== undefined && String(value).trim() !== '';
  },

  /* ----------------------------------------------------------
     DATA HELPERS
  ---------------------------------------------------------- */

  /** Retorna quantos dias atrás foi a data */
  daysAgo(date) {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    return diff;
  },

  /** Retorna tempo relativo: 'há 2 dias', 'há 3 horas', 'agora' */
  formatRelativeTime(date) {
    if (!date) return '—';
    const d = new Date(date);
    const now = new Date();
    const seconds = Math.floor((now - d) / 1000);

    if (seconds < 60)          return 'agora';
    if (seconds < 3600)        return `há ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400)       return `há ${Math.floor(seconds / 3600)} h`;
    if (seconds < 2592000)     return `há ${Math.floor(seconds / 86400)} dias`;
    return Utils.formatDate(date);
  },

  /* ----------------------------------------------------------
     MISC
  ---------------------------------------------------------- */

  /** Gera iniciais do nome para avatar */
  getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  },

  /** Formata CNPJ: 00.000.000/0001-00 */
  formatCNPJ(cnpj) {
    const c = cnpj.replace(/\D/g, '');
    return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  },

  /** Debounce simples */
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  /** Gera um id único simples */
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  },

  /** Escapa HTML para evitar XSS ao inserir em innerHTML */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  },

  /**
   * Converte URLs no texto em links clicáveis (abre em nova aba).
   * O texto não-URL é escapado para prevenir XSS.
   */
  linkificar(text) {
    if (!text) return '';
    const URL_REGEX = /(https?:\/\/[^\s<>"']+)/g;
    return String(text)
      .split(URL_REGEX)
      .map((part, i) => {
        if (i % 2 === 1) {
          const escaped = this.escapeHtml(part);
          return `<a href="${escaped}" target="_blank" rel="noopener noreferrer"
            style="color:hsl(142,70%,28%);text-decoration:underline;word-break:break-all;">${escaped}</a>`;
        }
        return this.escapeHtml(part);
      })
      .join('');
  },

  /* ----------------------------------------------------------
     DATEPICKER HELPERS
  ---------------------------------------------------------- */

  /** Retorna o valor ISO (yyyy-mm-dd) de um input datepicker ou nativo */
  getDataISO(inputId) {
    const el = document.getElementById(inputId);
    if (!el) return '';
    if (el._dp) return el._dp.valorISO || '';
    return el.value || '';
  },

  /** Inicializa o datepicker customizado em um input pelo ID.
   *  Transfere automaticamente o value nativo para o componente. */
  initDatePicker(inputId, opcoes) {
    const el = document.getElementById(inputId);
    if (!el || !window.DatePicker) return;
    // Transferir valor nativo existente para que o datepicker exiba corretamente
    if (!el.dataset.value && el.value) {
      el.dataset.value = el.value;
    }
    DatePicker.init(el, opcoes || {});
  },
};

/* ============================================================
   CATÁLOGO — Geração sequencial de código MAT-XXXX
   ============================================================ */

Utils.generateCodigoItem = async function() {
  try {
    const itens = await Storage.list(TABLES.catalogoItens) || [];

    const numeros = itens
      .map(i => {
        const match = (i.codigo || '').match(/^MAT-(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => n > 0);

    const proximo = numeros.length > 0 ? Math.max(...numeros) + 1 : 1;
    return 'MAT-' + String(proximo).padStart(4, '0');
  } catch(e) {
    return 'MAT-' + Date.now().toString().slice(-4);
  }
};

/* ============================================================
   PDF HELPERS — cabeçalho, rodapé e seção padrão Concrem
   ============================================================ */

Utils.pdfCabecalho = function(doc, opcoes) {
  const W    = doc.internal.pageSize.getWidth();
  const norm = Utils.norm || (s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,''));

  // Fundo branco puro
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, doc.internal.pageSize.getHeight(), 'F');

  // Logo grande à esquerda
  if (typeof LOGO_CONCREM_B64 !== 'undefined' && LOGO_CONCREM_B64) {
    try {
      doc.addImage(LOGO_CONCREM_B64, 'PNG', 14, 10, 38, 13);
    } catch(e) {
      doc.setTextColor(10, 46, 22);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('CONCREM', 14, 24);
    }
  }

  // Título maiúsculo bold à direita
  doc.setTextColor(15, 35, 15);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(norm((opcoes.titulo || '').toUpperCase()), W - 14, 18, { align: 'right' });

  // Subtítulo / identificador abaixo do título
  if (opcoes.subtitulo) {
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(norm(opcoes.subtitulo), W - 14, 25, { align: 'right' });
  }

  // Linha horizontal verde escura separando header do corpo
  doc.setDrawColor(15, 35, 15);
  doc.setLineWidth(0.8);
  doc.line(14, 36, W - 14, 36);

  return 44; // y inicial para o conteúdo
};

Utils.pdfRodape = function(doc, opcoes) {
  const W    = doc.internal.pageSize.getWidth();
  const H    = doc.internal.pageSize.getHeight();
  const norm = Utils.norm || (s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,''));

  // Linha fina cinza
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(14, H - 12, W - 14, H - 12);

  doc.setTextColor(160, 160, 160);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');

  if (opcoes.rodapeEsq) {
    doc.text(norm(opcoes.rodapeEsq), 14, H - 7);
  }

  const totalPags = doc.internal.getNumberOfPages();
  const pagAtual  = opcoes.pagAtual || 1;
  doc.text(pagAtual + ' / ' + totalPags, W - 14, H - 7, { align: 'right' });
};

Utils.pdfMetaLinha = function(doc, y, campos) {
  // Linha de metadados inline: "Label: Valor   Label: Valor"
  const norm = Utils.norm || (s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,''));

  doc.setFontSize(8.5);
  let x = 14;

  campos.forEach((campo) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const labelTxt = norm(campo.label) + ': ';
    doc.text(labelTxt, x, y);
    const labelW = doc.getTextWidth(labelTxt);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 35, 15);
    const valorTxt = norm(String(campo.valor || '—'));
    doc.text(valorTxt, x + labelW, y);
    x += labelW + doc.getTextWidth(valorTxt) + 14;
  });

  return y + 8;
};

Utils.pdfSecaoTitulo = function(doc, y, texto) {
  // Minimalista: texto uppercase verde escuro, sem faixa colorida
  const norm = Utils.norm || (s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,''));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 35, 15);
  doc.text(norm(texto.toUpperCase()), 14, y);
  return y + 6;
};

Utils.pdfCamposGrid = function(doc, y, campos) {
  // Grid 2 colunas inline (label normal + valor bold)
  const W    = doc.internal.pageSize.getWidth();
  const norm = Utils.norm || (s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,''));
  const colW = (W - 28) / 2;
  const lineH = 7;

  campos.forEach((campo, i) => {
    const col  = i % 2;
    const row  = Math.floor(i / 2);
    const x    = 14 + col * (colW + 4);
    const yPos = y + row * lineH;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    const lbl = norm(campo.label) + ': ';
    doc.text(lbl, x, yPos);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 35, 15);
    doc.text(norm(String(campo.valor || '—')), x + doc.getTextWidth(lbl), yPos, { maxWidth: colW - 35 });
  });

  const linhas = Math.ceil(campos.length / 2);
  return y + linhas * lineH + 4;
};
