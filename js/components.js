/* ============================================================
   FLUXOCOMPRAS — Components: Componentes reutilizáveis em JS
   ============================================================ */

const Components = {

  /* ----------------------------------------------------------
     MODAL
  ---------------------------------------------------------- */
  Modal: {
    _current: null,

    show({ title, content, footer = '', size = '', onClose, icon } = {}) {
      this.hide();

      const sizeClass = size ? `modal-${size}` : '';
      const titleHtml = icon
        ? `${icon} ${Utils.escapeHtml(title)}`
        : Utils.escapeHtml(title);

      const html = `
        <div class="modal-overlay" id="active-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal ${sizeClass}" id="active-modal-panel">
            <div class="modal-header">
              <h2 class="modal-title" id="modal-title">${titleHtml}</h2>
              <button class="modal-close" id="modal-close-btn" aria-label="Fechar">✕</button>
            </div>
            <div class="modal-body">
              ${content}
            </div>
            ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
          </div>
        </div>`;

      document.getElementById('modal-container').innerHTML = html;
      this._current = document.getElementById('active-modal-overlay');

      this._current.addEventListener('click', (e) => {
        if (e.target === this._current) this._fecharComAnimacao(onClose);
      });

      document.getElementById('modal-close-btn').addEventListener('click', () => {
        this._fecharComAnimacao(onClose);
      });

      document.addEventListener('keydown', this._escHandler);

      setTimeout(() => {
        const first = document.querySelector('#active-modal-panel input, #active-modal-panel select, #active-modal-panel textarea');
        if (first) first.focus();
      }, 320);
    },

    _fecharComAnimacao(onClose) {
      const overlay = document.getElementById('active-modal-overlay');
      const panel   = document.getElementById('active-modal-panel');
      if (!overlay || !panel) { this.hide(); return; }

      panel.classList.add('closing');
      overlay.classList.add('closing');

      setTimeout(() => {
        this.hide();
        onClose && onClose();
      }, 220);
    },

    hide() {
      const container = document.getElementById('modal-container');
      if (container) container.innerHTML = '';
      document.removeEventListener('keydown', this._escHandler);
      this._current = null;
    },

    _escHandler(e) {
      if (e.key === 'Escape') Components.Modal._fecharComAnimacao();
    },

    confirm({ title, message, onConfirm, onCancel, danger = false, type, icon, confirmLabel } = {}) {
      this.hide();

      const t = type || (danger ? 'danger' : 'success');

      const ICONS = {
        danger:  icon || '🚪',
        warning: icon || '⚠️',
        success: icon || '✅',
        info:    icon || 'ℹ️',
      };

      const LABELS = {
        danger:  confirmLabel || 'Confirmar',
        warning: confirmLabel || 'Continuar',
        success: confirmLabel || 'Confirmar',
        info:    confirmLabel || 'Ok',
      };

      const html = `
        <div class="modal-overlay modal-center" id="active-modal-overlay"
             role="dialog" aria-modal="true" aria-labelledby="modal-confirm-title-el">
          <div class="modal-center-box" id="active-modal-center">
            <div class="modal-confirm-icon-wrap">
              <div class="modal-confirm-icon ${t}">${ICONS[t]}</div>
            </div>
            <div class="modal-confirm-body">
              <div class="modal-confirm-title" id="modal-confirm-title-el">${Utils.escapeHtml(title)}</div>
              <div class="modal-confirm-msg">${Utils.escapeHtml(message)}</div>
            </div>
            <div class="modal-confirm-footer">
              <button class="modal-confirm-btn-cancel" id="modal-cancel-btn">Cancelar</button>
              <button class="modal-confirm-btn-ok ${t}" id="modal-confirm-btn">${LABELS[t]}</button>
            </div>
          </div>
        </div>`;

      document.getElementById('modal-container').innerHTML = html;
      this._current = document.getElementById('active-modal-overlay');

      this._current.addEventListener('click', (e) => {
        if (e.target === this._current) this._fecharConfirm(onCancel);
      });

      document.addEventListener('keydown', this._escHandlerConfirm);

      document.getElementById('modal-cancel-btn').addEventListener('click', () => {
        this._fecharConfirm(onCancel);
      });

      document.getElementById('modal-confirm-btn').addEventListener('click', () => {
        this._fecharConfirm(null);
        onConfirm && onConfirm();
      });
    },

    _fecharConfirm(callback) {
      const box     = document.getElementById('active-modal-center');
      const overlay = document.getElementById('active-modal-overlay');
      if (!box || !overlay) {
        this.hide();
        callback && callback();
        return;
      }
      box.classList.add('closing');
      overlay.classList.add('closing');
      setTimeout(() => {
        this.hide();
        callback && callback();
      }, 200);
    },

    _escHandlerConfirm(e) {
      if (e.key === 'Escape') Components.Modal._fecharConfirm();
    },
  },

  /* ----------------------------------------------------------
     TOAST
  ---------------------------------------------------------- */
  Toast: {
    _icons: {
      success: '✅',
      error:   '❌',
      warning: '⚠️',
      info:    'ℹ️',
    },

    _show(type, message, title) {
      const container = document.getElementById('toast-container');
      if (!container) return;

      const id = Utils.uid();
      const icon = this._icons[type] || 'ℹ️';
      const titleText = title || { success: 'Sucesso', error: 'Erro', warning: 'Atenção', info: 'Informação' }[type];

      const el = document.createElement('div');
      el.className = `toast toast-${type}`;
      el.id = `toast-${id}`;
      el.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <div class="toast-content">
          <div class="toast-title">${Utils.escapeHtml(titleText)}</div>
          <div class="toast-message">${Utils.escapeHtml(message)}</div>
        </div>
        <button class="toast-dismiss" aria-label="Fechar">&times;</button>`;

      container.appendChild(el);

      el.querySelector('.toast-dismiss').addEventListener('click', () => this._remove(el));

      setTimeout(() => this._remove(el), 4000);
    },

    _remove(el) {
      if (!el || !el.parentNode) return;
      el.classList.add('toast-out');
      setTimeout(() => el.parentNode && el.parentNode.removeChild(el), 300);
    },

    success(message, title) { this._show('success', message, title); },
    error(message, title)   { this._show('error',   message, title); },
    warning(message, title) { this._show('warning', message, title); },
    info(message, title)    { this._show('info',    message, title); },
  },

  /* ----------------------------------------------------------
     BADGE DE STATUS
  ---------------------------------------------------------- */

  /** Retorna string HTML de um badge de status */
  badge(status) {
    const cls   = Utils.getStatusBadgeClass(status);
    const label = Utils.getStatusLabel(status);
    return `<span class="badge ${cls}">${Utils.escapeHtml(label)}</span>`;
  },

  /* ----------------------------------------------------------
     TABELA GENÉRICA
  ---------------------------------------------------------- */
  Table: {
    /**
     * Renderiza uma tabela dentro de um container.
     * @param {{
     *   container: HTMLElement,
     *   columns: Array<{ key: string, label: string, render?: Function }>,
     *   data: Array<object>,
     *   actions?: Array<{ label: string, icon?: string, onClick: Function, condition?: Function }>,
     *   emptyMessage?: string,
     *   onRowClick?: Function,
     * }} opts
     */
    render({ container, columns, data, actions = [], emptyMessage = 'Nenhum registro encontrado.', onRowClick } = {}) {
      if (!container) return;

      if (!data || data.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <div class="empty-state-title">Nenhum registro</div>
            <div class="empty-state-message">${Utils.escapeHtml(emptyMessage)}</div>
          </div>`;
        return;
      }

      const hasActions = actions.length > 0;

      const thead = columns.map(c => `<th>${Utils.escapeHtml(c.label)}</th>`).join('') +
        (hasActions ? '<th style="text-align:right">Ações</th>' : '');

      const tbody = data.map((row, idx) => {
        const cells = columns.map(c => {
          const val = c.render ? c.render(row[c.key], row, idx) : Utils.escapeHtml(String(row[c.key] ?? '—'));
          return `<td>${val}</td>`;
        }).join('');

        const visibleActions = actions.filter(a => !a.condition || a.condition(row));
        const actionCells = hasActions
          ? `<td><div class="table-actions" style="justify-content:flex-end">${
              visibleActions.map(a =>
                `<button class="btn btn-ghost btn-sm" data-action-idx="${idx}" data-action-key="${Utils.escapeHtml(a.label)}" title="${Utils.escapeHtml(a.label)}">
                  ${a.icon ? a.icon + ' ' : ''}${Utils.escapeHtml(a.label)}
                </button>`
              ).join('')
            }</div></td>`
          : '';

        const clickable = onRowClick ? 'style="cursor:pointer"' : '';
        return `<tr data-row-idx="${idx}" ${clickable}>${cells}${actionCells}</tr>`;
      }).join('');

      container.innerHTML = `
        <div class="table-container">
          <table class="table">
            <thead><tr>${thead}</tr></thead>
            <tbody>${tbody}</tbody>
          </table>
        </div>`;

      // Event delegation para ações
      if (hasActions) {
        container.querySelector('tbody').addEventListener('click', (e) => {
          const btn = e.target.closest('[data-action-key]');
          if (!btn) return;
          e.stopPropagation();
          const idx = parseInt(btn.dataset.actionIdx, 10);
          const key = btn.dataset.actionKey;
          const action = actions.find(a => a.label === key);
          if (action) action.onClick(data[idx], idx);
        });
      }

      // Event delegation para clique na linha
      if (onRowClick) {
        container.querySelector('tbody').addEventListener('click', (e) => {
          if (e.target.closest('[data-action-key]')) return;
          const tr = e.target.closest('tr[data-row-idx]');
          if (tr) onRowClick(data[parseInt(tr.dataset.rowIdx, 10)]);
        });
      }
    },
  },

  /* ----------------------------------------------------------
     LOADING STATE
  ---------------------------------------------------------- */

  /** Exibe skeleton loading dentro de um container */
  showLoading(container) {
    if (!container) return;
    container.innerHTML = `
      <div class="loading-table">
        ${[...Array(5)].map(() => `
          <div style="display:flex; gap:16px; align-items:center;">
            <div class="skeleton skeleton-text" style="width:80px"></div>
            <div class="skeleton skeleton-text" style="flex:1"></div>
            <div class="skeleton skeleton-text" style="width:120px"></div>
            <div class="skeleton skeleton-text" style="width:80px"></div>
          </div>`).join('')}
      </div>`;
  },

  /** Remove skeleton loading do container */
  hideLoading(container) {
    if (!container) return;
    const loading = container.querySelector('.loading-table');
    if (loading) loading.remove();
  },

  /* ----------------------------------------------------------
     PAGE HEADER
  ---------------------------------------------------------- */

  /**
   * Retorna HTML de um cabeçalho de página padronizado.
   * @param {{ title: string, subtitle?: string, actions?: Array<{ label: string, icon?: string, onClick?: Function, primary?: boolean, id?: string }> }} opts
   */
  pageHeader({ title, titleHtml, subtitle = '', subtitleHtml, actions = [] } = {}) {
    const actionsHtml = actions.map(a => {
      const cls = a.primary ? 'btn-primary' : 'btn-secondary';
      const id  = a.id ? `id="${a.id}"` : '';
      return `<button class="btn ${cls}" ${id}>${a.icon ? a.icon + ' ' : ''}${Utils.escapeHtml(a.label)}</button>`;
    }).join('');

    // titleHtml e subtitleHtml aceitam HTML bruto (badges, spans, etc.)
    const h1Content  = titleHtml    ?? Utils.escapeHtml(title    ?? '');
    const subContent = subtitleHtml ?? (subtitle ? Utils.escapeHtml(subtitle) : '');

    return `
      <div class="page-header">
        <div class="page-header-info">
          <h1>${h1Content}</h1>
          ${subContent ? `<p>${subContent}</p>` : ''}
        </div>
        ${actionsHtml ? `<div class="page-header-actions">${actionsHtml}</div>` : ''}
      </div>`;
  },

  /* ----------------------------------------------------------
     LOADING OVERLAY GLOBAL
  ---------------------------------------------------------- */

  showGlobalLoading() {
    const el = document.getElementById('loading-overlay');
    if (el) el.hidden = false;
  },

  hideGlobalLoading() {
    const el = document.getElementById('loading-overlay');
    if (el) el.hidden = true;
  },
};
