/* ============================================================
   FLUXOCOMPRAS — Controle de Qualidade Premium v2
   Identidade: verde escuro hsl(142,93%,8%) + esmeralda #6ee7b7
   ============================================================ */

var Pages = window.Pages || {};

Pages.Qualidade = {
  pendentes: [],
  ocMap:     {},

  BADGE_PARECER: {
    'Liberado':                'badge-approved',
    'Retido':                  'badge-waiting',
    'Devolvido ao Fornecedor': 'badge-rejected',
  },

  async render() {
    document.title = 'Fluxo Compras — Controle de Qualidade';
    App.setPageTitle('Qualidade');

    document.getElementById('main-content').innerHTML = `
      ${Components.pageHeader({
        title:    'Controle de Qualidade',
        subtitle: 'Inspecione e libere os materiais recebidos no almoxarifado',
      })}

      <div class="receb-layout">

        <!-- Painel esquerdo: pendentes -->
        <div class="receb-painel-card">
          <div class="receb-painel-header">
            <span class="receb-painel-title">🔬 Pendentes de Análise</span>
            <span class="receb-count-badge" id="badge-pendentes-qualidade" style="display:none;">0</span>
          </div>
          <div class="receb-painel-body" id="lista-pendentes-qualidade">
            ${this._skeletonCards()}
          </div>
        </div>

        <!-- Painel direito: histórico -->
        <div class="receb-painel-card">
          <div class="receb-painel-header">
            <span class="receb-painel-title">📋 Análises Realizadas</span>
          </div>
          <div id="lista-analises-qualidade">
            ${this._skeletonHist()}
          </div>
        </div>

      </div>`;

    await this.loadDados();
  },

  async loadDados() {
    try {
      const [recebimentos, analises, ocs] = await Promise.all([
        Storage.list(TABLES.recebimentos, { order: { column: 'created_at', ascending: false } }),
        Storage.list(TABLES.qualidade,    { order: { column: 'created_at', ascending: false }, limit: 10 }),
        Storage.list(TABLES.ordens,       { order: { column: 'created_at', ascending: false } }),
      ]);

      this.ocMap = {};
      (ocs || []).forEach(oc => { this.ocMap[oc.id] = oc; });

      this.pendentes = (recebimentos || []).filter(r => r.status === 'Aguardando Qualidade');

      this.renderPendentes(this.pendentes);
      this.renderAnalises(analises || []);

      const badge = document.getElementById('badge-pendentes-qualidade');
      if (badge) {
        badge.textContent   = this.pendentes.length;
        badge.style.display = this.pendentes.length ? '' : 'none';
      }
    } catch (e) {
      Components.Toast.error('Erro ao carregar dados de qualidade: ' + e.message);
    }
  },

  renderPendentes(pendentes) {
    const container = document.getElementById('lista-pendentes-qualidade');
    if (!container) return;

    if (!pendentes.length) {
      container.innerHTML = `
        <div class="receb-empty">
          <div class="receb-empty-icon">✅</div>
          <div class="receb-empty-text">Nenhum material aguardando análise</div>
        </div>`;
      return;
    }

    container.innerHTML = pendentes.map((rec, i) => {
      const oc         = this.ocMap[rec.ordem_compra_id] || {};
      const fornecedor = oc.fornecedor_nome || rec.fornecedor_nome || '—';
      const totalItens = Array.isArray(rec.itens_conferencia) ? rec.itens_conferencia.length : '—';
      const dataRec    = rec.data_recebimento
        ? Utils.formatDate(rec.data_recebimento)
        : Utils.formatDate(rec.created_at);

      return `
        <div class="receb-oc-card" style="animation-delay:${i * 60}ms">
          <div class="receb-oc-header">
            <div>
              <span class="receb-oc-numero">${Utils.escapeHtml(rec.ordem_compra_numero || '—')}</span>
            </div>
            ${Components.badge(rec.status || 'Aguardando Qualidade')}
          </div>
          <div class="receb-oc-meta">
            <div>
              <span class="receb-meta-label">Fornecedor</span>
              <span class="receb-meta-value">${Utils.escapeHtml(fornecedor)}</span>
            </div>
            <div>
              <span class="receb-meta-label">NF</span>
              <span class="receb-meta-value" style="font-family:'Courier New',monospace;">
                ${Utils.escapeHtml(rec.numero_nota_fiscal || '—')}
              </span>
            </div>
            <div>
              <span class="receb-meta-label">Recebido em</span>
              <span class="receb-meta-value">${dataRec}</span>
            </div>
            <div>
              <span class="receb-meta-label">Itens</span>
              <span class="receb-meta-value">${totalItens} ${totalItens === 1 ? 'item' : 'itens'}</span>
            </div>
          </div>
          <div class="receb-oc-footer">
            <button class="receb-btn-registrar btn-analisar"
              data-id="${Utils.escapeHtml(String(rec.id))}">
              🔬 Analisar Material
            </button>
          </div>
        </div>`;
    }).join('');

    container.querySelectorAll('.btn-analisar').forEach(btn =>
      btn.addEventListener('click', () => this.abrirDialogAnalise(btn.dataset.id))
    );
  },

  renderAnalises(analises) {
    const container = document.getElementById('lista-analises-qualidade');
    if (!container) return;

    if (!analises.length) {
      container.innerHTML = `
        <div class="receb-empty">
          <div class="receb-empty-icon">📭</div>
          <div class="receb-empty-text">Nenhuma análise registrada ainda</div>
        </div>`;
      return;
    }

    container.innerHTML = analises.map(an => {
      const nota = an.nota_media ? parseFloat(an.nota_media).toFixed(1) : null;
      return `
        <div class="qual-hist-item">
          <div class="qual-hist-header">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span class="qual-hist-oc">${Utils.escapeHtml(an.ordem_compra_numero || '—')}</span>
              ${Components.badge(an.parecer_final || '—')}
            </div>
            <span class="qual-hist-data">${Utils.formatDate(an.created_at)}</span>
          </div>
          <div class="qual-hist-body">
            <span>${Utils.escapeHtml(an.fornecedor || '—')}</span>
            ${nota ? `<span class="qual-nota-pill">⭐ ${nota} / 5</span>` : ''}
            <span>·</span>
            <span>Analista: ${Utils.escapeHtml(an.analista || '—')}</span>
          </div>
        </div>`;
    }).join('');
  },

  abrirDialogAnalise(recebimentoId) {
    const rec = this.pendentes.find(r => String(r.id) === String(recebimentoId));
    if (!rec) { Components.Toast.error('Recebimento não encontrado.'); return; }

    const oc         = this.ocMap[rec.ordem_compra_id] || {};
    const fornecedor = oc.fornecedor_nome || rec.fornecedor_nome || '—';
    const todosItens  = Array.isArray(rec.itens_conferencia) ? rec.itens_conferencia : [];
    const itensSim    = todosItens.filter(i => i.recebido === 'Sim');
    const totalItens  = itensSim.length > 0 ? itensSim.length : todosItens.length;

    Components.Modal.show({
      title:   `Análise de Qualidade — ${rec.ordem_compra_numero || 'OC'}`,
      content: this._htmlDialogAnalise(rec, oc, fornecedor),
      size:    'lg',
      footer: `
        <button class="drawer-btn-cancelar" id="btn-cancelar-analise">Cancelar</button>
        <button class="drawer-btn-salvar"   id="btn-concluir-analise">✅ Concluir Análise</button>`,
    });

    this.initStarRatingsItens(totalItens);
    document.getElementById('btn-cancelar-analise')?.addEventListener('click', () => Components.Modal.hide());
    document.getElementById('btn-concluir-analise')
      ?.addEventListener('click', () => this.concluirAnalise(recebimentoId));
  },

  _htmlDialogAnalise(rec, oc, fornecedor) {
    // Mostrar apenas itens completamente recebidos (recebido === 'Sim')
    const todosItens    = Array.isArray(rec.itens_conferencia) ? rec.itens_conferencia : [];
    const itensPendentes = todosItens.filter(i => i.recebido !== 'Sim');
    const itens         = todosItens.filter(i => i.recebido === 'Sim');
    // Fallback: se todos são Sim (recebimento completo), usar todos
    const itensAnalise  = itens.length > 0 ? itens : todosItens;
    const avisoPartial  = itensPendentes.length > 0
      ? `<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:13px;color:#92400e;">
           ⚠️ <strong>Recebimento parcial:</strong> ${itensPendentes.length} item(ns) ainda pendente(s) não aparecem aqui.
           Apenas os ${itensAnalise.length} item(ns) completamente recebidos estão disponíveis para análise.
         </div>`
      : '';
    // Sobrescrever itens com os filtrados para o resto do método
    rec = { ...rec, _itensParaAnalise: itensAnalise };
    return avisoPartial + this._htmlDialogAnaliseInterno(rec, oc, fornecedor, itensAnalise);
  },

  _htmlDialogAnaliseInterno(rec, oc, fornecedor, itens) {

    return `
      <!-- Resumo -->
      <div class="receb-dialog-section">
        <div class="receb-dialog-section-title">📦 Resumo do Recebimento</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
          <div style="background:#F8FAFC;border-radius:10px;padding:12px;">
            <span class="oc-field-label">Ordem de Compra</span>
            <span class="oc-field-value" style="font-family:'Courier New',monospace;">
              ${Utils.escapeHtml(rec.ordem_compra_numero || '—')}
            </span>
          </div>
          <div style="background:#F8FAFC;border-radius:10px;padding:12px;">
            <span class="oc-field-label">Fornecedor</span>
            <span class="oc-field-value">${Utils.escapeHtml(fornecedor)}</span>
          </div>
          <div style="background:#F8FAFC;border-radius:10px;padding:12px;">
            <span class="oc-field-label">Nota Fiscal</span>
            <span class="oc-field-value" style="font-family:'Courier New',monospace;">
              ${Utils.escapeHtml(rec.numero_nota_fiscal || '—')}
            </span>
          </div>
        </div>
      </div>

      <!-- Análise por item -->
      <div class="receb-dialog-section">
        <div class="receb-dialog-section-title">🔍 Análise por Item</div>
        <div id="itens-analise-container">
          ${itens.length > 0
            ? itens.map((item, i) => this._htmlItemAnalise(item, i)).join('')
            : `<div class="receb-empty" style="padding:20px;">
                <div class="receb-empty-text">Nenhum item encontrado no recebimento.</div>
               </div>`}
        </div>
      </div>

      <!-- Nota média -->
      <div class="qual-nota-media-bar">
        <span class="qual-nota-media-label">📊 Nota Média Calculada</span>
        <span class="qual-nota-media-valor" id="nota-media-display">—</span>
      </div>

      <!-- Parecer final -->
      <div class="receb-dialog-section">
        <div class="receb-dialog-section-title">📋 Parecer Final</div>
        <div class="aprov-radio-group">
          <label class="aprov-radio-option qual-parecer-liberado">
            <input type="radio" name="parecer-final" value="Liberado" />
            <span class="aprov-radio-icon">✅</span>
            <div>
              <span class="aprov-radio-titulo" style="color:hsl(142,80%,25%);">Liberado</span>
              <span class="aprov-radio-desc">Material aprovado. Processo de compra será concluído.</span>
            </div>
          </label>
          <label class="aprov-radio-option qual-parecer-retido">
            <input type="radio" name="parecer-final" value="Retido" />
            <span class="aprov-radio-icon">⚠️</span>
            <div>
              <span class="aprov-radio-titulo" style="color:#d97706;">Retido</span>
              <span class="aprov-radio-desc">Material retido para análise adicional ou aguardando documentação.</span>
            </div>
          </label>
          <label class="aprov-radio-option qual-parecer-devolvido">
            <input type="radio" name="parecer-final" value="Devolvido ao Fornecedor" />
            <span class="aprov-radio-icon">❌</span>
            <div>
              <span class="aprov-radio-titulo" style="color:#dc2626;">Devolvido ao Fornecedor</span>
              <span class="aprov-radio-desc">Material reprovado e devolvido. Processo permanece em aberto.</span>
            </div>
          </label>
        </div>
      </div>

      <!-- Observações -->
      <div class="receb-dialog-section">
        <div class="receb-dialog-section-title">📝 Observações Gerais</div>
        <textarea class="drawer-textarea" id="obs-qualidade" rows="2"
          placeholder="Observações técnicas gerais sobre a análise..."></textarea>
      </div>`;
  },

  _htmlItemAnalise(item, index) {
    const qtd = item.quantidade_recebida || item.quantidade_esperada || 0;
    const un  = Utils.escapeHtml(item.unidade || '');
    return `
      <div class="qual-item-card">
        <div class="qual-item-header">
          <span class="qual-item-nome">${Utils.escapeHtml(item.descricao || '—')}</span>
          <span class="qual-item-qtd">${qtd} ${un} recebidos</span>
        </div>
        <div class="qual-item-body">
          <div>
            <span class="qual-item-field-label">Critério de Análise</span>
            <select class="qual-select analise-criterio" data-index="${index}">
              <option value="Funcionamento">Funcionamento</option>
              <option value="Conformidade">Conformidade</option>
              <option value="Embalagem">Embalagem</option>
              <option value="Prazo de Validade">Prazo de Validade</option>
              <option value="Quantidade">Quantidade</option>
            </select>
          </div>
          <div>
            <span class="qual-item-field-label">Resultado</span>
            <select class="qual-select analise-resultado" data-index="${index}">
              <option value="Aprovado">✅ Aprovado</option>
              <option value="Com ressalvas">⚠️ Com ressalvas</option>
              <option value="Reprovado">❌ Reprovado</option>
            </select>
          </div>
          <div>
            <span class="qual-item-field-label">Nota (1–5)</span>
            <div class="qual-stars star-rating-sm" id="star-sm-${index}">
              ${[1,2,3,4,5].map(n =>
                `<span class="qual-star star-sm" data-index="${index}" data-value="${n}">★</span>`
              ).join('')}
            </div>
            <input type="hidden" class="analise-nota" data-index="${index}" value="0" />
          </div>
          <div>
            <span class="qual-item-field-label">Observações</span>
            <input type="text" class="qual-obs-input analise-obs"
              data-index="${index}" placeholder="Obs específicas..." />
          </div>
        </div>
      </div>`;
  },

  // ── LÓGICA DE NEGÓCIO — mantida intacta ──

  initStarRatingsItens(totalItens) {
    for (let i = 0; i < totalItens; i++) {
      const stars       = document.querySelectorAll(`.star-sm[data-index="${i}"]`);
      const hiddenInput = document.querySelector(`.analise-nota[data-index="${i}"]`);
      const container   = document.getElementById(`star-sm-${i}`);
      if (!stars.length || !hiddenInput) continue;

      stars.forEach(star => {
        star.addEventListener('click', () => {
          const val = parseInt(star.dataset.value);
          hiddenInput.value = val;
          stars.forEach(s =>
            s.classList.toggle('ativo', parseInt(s.dataset.value) <= val)
          );
          this.calcularNotaMedia(totalItens);
        });

        star.addEventListener('mouseover', () => {
          const val = parseInt(star.dataset.value);
          stars.forEach(s =>
            s.classList.toggle('hover', parseInt(s.dataset.value) <= val)
          );
        });
      });

      container?.addEventListener('mouseleave', () => {
        stars.forEach(s => s.classList.remove('hover'));
        const notaAtual = parseInt(hiddenInput.value) || 0;
        stars.forEach(s =>
          s.classList.toggle('ativo', parseInt(s.dataset.value) <= notaAtual)
        );
      });
    }
  },

  calcularNotaMedia(totalItens) {
    const notas = [];
    for (let i = 0; i < totalItens; i++) {
      const nota = parseInt(
        document.querySelector(`.analise-nota[data-index="${i}"]`)?.value
      ) || 0;
      if (nota > 0) notas.push(nota);
    }

    const media = notas.length > 0
      ? (notas.reduce((s, n) => s + n, 0) / notas.length).toFixed(1)
      : '—';

    const el = document.getElementById('nota-media-display');
    if (el) {
      el.textContent = media !== '—' ? `${media} / 5` : '—';
      el.classList.add('changed');
      setTimeout(() => el.classList.remove('changed'), 300);
    }

    return parseFloat(media) || 0;
  },

  async concluirAnalise(recebimentoId) {
    const rec = this.pendentes.find(r => String(r.id) === String(recebimentoId));
    if (!rec) return;

    const usuario = App.currentUser;
    const parecer = document.querySelector('input[name="parecer-final"]:checked')?.value;

    if (!parecer) { Components.Toast.warning('Selecione o parecer final.'); return; }

    const totalItens  = Array.isArray(rec.itens_conferencia) ? rec.itens_conferencia.length : 0;

    if (totalItens === 0) {
      Components.Toast.warning('Este recebimento não possui itens para analisar.');
      const btn = document.getElementById('btn-concluir-analise');
      if (btn) { btn.disabled = false; btn.textContent = '✅ Concluir Análise'; }
      return;
    }

    const notasVazias = [];
    for (let i = 0; i < totalItens; i++) {
      const nota = parseInt(
        document.querySelector(`.analise-nota[data-index="${i}"]`)?.value
      ) || 0;
      if (nota === 0) notasVazias.push(i + 1);
    }

    if (notasVazias.length > 0) {
      Components.Toast.warning(`Atribua nota aos itens: ${notasVazias.join(', ')}`);
      return;
    }

    // Usar apenas itens completamente recebidos (Sim) para análise
    const todosItensRec = Array.isArray(rec.itens_conferencia) ? rec.itens_conferencia : [];
    const itensParaAnalise = todosItensRec.filter(i => i.recebido === 'Sim');
    const base = itensParaAnalise.length > 0 ? itensParaAnalise : todosItensRec;

    const itensAnalise = base.map((item, i) => ({
      descricao:   item.descricao,
      criterio:    document.querySelector(`.analise-criterio[data-index="${i}"]`)?.value || 'Funcionamento',
      resultado:   document.querySelector(`.analise-resultado[data-index="${i}"]`)?.value || 'Aprovado',
      nota:        parseInt(document.querySelector(`.analise-nota[data-index="${i}"]`)?.value) || 0,
      observacoes: document.querySelector(`.analise-obs[data-index="${i}"]`)?.value?.trim() || '',
    }));

    const notaMedia  = this.calcularNotaMedia(totalItens);
    const oc         = this.ocMap[rec.ordem_compra_id] || {};
    const fornecedor = oc.fornecedor_nome || rec.fornecedor_nome || '';

    const statusRecNovo = parecer === 'Liberado' ? 'Concluida' : 'Retida';
    const statusReqNovo = parecer === 'Liberado'
      ? 'Aguardando Avaliacao Fornecedor'
      : 'Aguardando Analise de Qualidade';

    const btn = document.getElementById('btn-concluir-analise');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Salvando...'; }

    try {
      await Storage.create(TABLES.qualidade, {
        recebimento_id:      rec.id,
        requisicao_id:       rec.requisicao_id || null,
        ordem_compra_numero: rec.ordem_compra_numero,
        fornecedor_nome:     fornecedor,
        itens_analise:       itensAnalise,
        parecer_final:       parecer,
        nota_media:          notaMedia,
        analista:            usuario.nome,
        analista_email:      usuario.email,
        observacoes_gerais:  document.getElementById('obs-qualidade')?.value?.trim() || '',
        status:              parecer === 'Liberado' ? 'Concluida' : 'Em Andamento',
      });

      await Storage.update(TABLES.recebimentos, rec.id, { status: statusRecNovo });

      if (rec.requisicao_id) {
        await Storage.update(TABLES.requisicoes, rec.requisicao_id, { status: statusReqNovo });
      }

      try {
        await Storage.create(TABLES.historico, {
          requisicao_id:   rec.requisicao_id || null,
          acao:            'Análise de Qualidade Concluída',
          usuario:         usuario.nome,
          usuario_email:   usuario.email,
          detalhes:        `Parecer: ${parecer}. Nota média: ${notaMedia || '—'}/5.`,
          status_anterior: 'Aguardando Analise de Qualidade',
          status_novo:     statusReqNovo,
        });
      } catch { /* não crítico */ }

      Components.Modal.hide();
      App._loadAllBadges?.();

      if (parecer === 'Liberado') {
        Components.Toast.success('✅ Material liberado! Encaminhado para avaliação do fornecedor.');
      } else if (parecer === 'Retido') {
        Components.Toast.warning('⚠️ Material retido para análise adicional.');
      } else {
        Components.Toast.error('❌ Material devolvido ao fornecedor. Processo em aberto.');
      }

      await this.loadDados();

    } catch (e) {
      console.error('[Qualidade]', e);
      Components.Toast.error('Erro ao salvar análise: ' + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '✅ Concluir Análise'; }
    }
  },

  _skeletonCards() {
    return [...Array(2)].map(() => `
      <div class="receb-oc-card" style="opacity:1;transform:none;">
        <div class="receb-oc-header">
          <div class="skeleton skeleton-text" style="width:100px;"></div>
          <div class="skeleton skeleton-text" style="width:80px;"></div>
        </div>
        <div class="receb-oc-meta">
          ${[...Array(4)].map(() => `
            <div>
              <div class="skeleton skeleton-text" style="width:60%;margin-bottom:6px;"></div>
              <div class="skeleton skeleton-text" style="width:80%;"></div>
            </div>`).join('')}
        </div>
      </div>`).join('');
  },

  _skeletonHist() {
    return [...Array(3)].map(() => `
      <div class="qual-hist-item" style="opacity:1;">
        <div class="skeleton skeleton-text" style="width:60%;margin-bottom:6px;"></div>
        <div class="skeleton skeleton-text" style="width:80%;"></div>
      </div>`).join('');
  },
};

window.Pages = Pages;
