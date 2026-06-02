/* ============================================================
   FLUXOCOMPRAS — Recebimento de Material Premium v2
   Identidade: verde escuro hsl(142,93%,8%) + esmeralda #6ee7b7
   ============================================================ */

var Pages = window.Pages || {};

Pages.Recebimento = {
  ocsPendentes: [],
  arquivoNF:    null,
  ocAtual:      null,

  async render() {
    document.title = 'Fluxo Compras — Recebimento de Material';
    App.setPageTitle('Recebimento');

    document.getElementById('main-content').innerHTML = `
      ${Components.pageHeader({
        title:    'Recebimento de Material',
        subtitle: 'Confira e registre a entrada de materiais no almoxarifado',
      })}

      <div class="receb-layout">

        <!-- Painel esquerdo: OCs pendentes -->
        <div class="receb-painel-card">
          <div class="receb-painel-header">
            <span class="receb-painel-title">
              📦 OCs Aguardando Recebimento
            </span>
            <span class="receb-count-badge" id="badge-pendentes" style="display:none;">0</span>
          </div>
          <div class="receb-painel-body" id="lista-ocs-pendentes">
            ${this._skeletonOCs()}
          </div>
        </div>

        <!-- Painel direito: histórico -->
        <div class="receb-painel-card">
          <div class="receb-painel-header">
            <span class="receb-painel-title">
              📋 Recebimentos Realizados
            </span>
          </div>
          <div id="lista-recebimentos">
            ${this._skeletonHist()}
          </div>
        </div>

      </div>`;

    await this.loadDados();
  },

  async loadDados() {
    try {
      const [ocs, recebimentos] = await Promise.all([
        Storage.list(TABLES.ordens, { order: { column: 'created_at', ascending: false } }),
        Storage.list(TABLES.recebimentos, {
          order: { column: 'created_at', ascending: false },
          limit: 10,
        }),
      ]);

      this.ocsPendentes = (ocs || []).filter(o => o.status === 'Aguardando Recebimento');

      this.renderPaineisOCs(this.ocsPendentes);
      this.renderRecebimentos(recebimentos || []);

      const badge = document.getElementById('badge-pendentes');
      if (badge) {
        badge.textContent   = this.ocsPendentes.length;
        badge.style.display = this.ocsPendentes.length ? '' : 'none';
      }
    } catch (e) {
      Components.Toast.error('Erro ao carregar dados de recebimento: ' + e.message);
    }
  },

  renderPaineisOCs(ocs) {
    const container = document.getElementById('lista-ocs-pendentes');
    if (!container) return;

    if (!ocs.length) {
      container.innerHTML = `
        <div class="receb-empty">
          <div class="receb-empty-icon">✅</div>
          <div class="receb-empty-text">Nenhuma OC aguardando recebimento</div>
        </div>`;
      return;
    }

    container.innerHTML = ocs.map((oc, i) => {
      const itensCount = Array.isArray(oc.itens) ? oc.itens.length : '—';
      const entrega    = oc.data_entrega_prevista
        ? Utils.formatDate(oc.data_entrega_prevista) : '—';
      const fornecedor = oc.fornecedor_nome || '—';

      return `
        <div class="receb-oc-card" style="animation-delay:${i * 60}ms">
          <div class="receb-oc-header">
            <div>
              <span class="receb-oc-numero">${Utils.escapeHtml(oc.numero || '—')}</span>
              <span class="receb-oc-req">
                ${Utils.escapeHtml(oc.numero_requisicao || '')}
              </span>
            </div>
            ${Components.badge(oc.status)}
          </div>
          <div class="receb-oc-meta">
            <div>
              <span class="receb-meta-label">Fornecedor</span>
              <span class="receb-meta-value">${Utils.escapeHtml(fornecedor)}</span>
            </div>
            <div>
              <span class="receb-meta-label">Valor Total</span>
              <span class="receb-meta-value" style="color:hsl(142,72%,26%);">
                ${Utils.formatCurrency(oc.valor_total || 0)}
              </span>
            </div>
            <div>
              <span class="receb-meta-label">Entrega Prevista</span>
              <span class="receb-meta-value">${entrega}</span>
            </div>
            <div>
              <span class="receb-meta-label">Itens</span>
              <span class="receb-meta-value">${itensCount} ${itensCount === 1 ? 'item' : 'itens'}</span>
            </div>
          </div>
          <div class="receb-oc-footer">
            <button class="receb-btn-registrar btn-registrar-recebimento"
              data-id="${Utils.escapeHtml(String(oc.id))}">
              📥 Registrar Recebimento
            </button>
          </div>
        </div>`;
    }).join('');

    container.querySelectorAll('.btn-registrar-recebimento').forEach(btn =>
      btn.addEventListener('click', () => this.abrirDialogRegistro(btn.dataset.id))
    );
  },

  renderRecebimentos(recebimentos) {
    const container = document.getElementById('lista-recebimentos');
    if (!container) return;

    if (!recebimentos.length) {
      container.innerHTML = `
        <div class="receb-empty">
          <div class="receb-empty-icon">📭</div>
          <div class="receb-empty-text">Nenhum recebimento registrado ainda</div>
        </div>`;
      return;
    }

    container.innerHTML = recebimentos.map(rec => `
      <div class="receb-hist-item">
        <div class="receb-hist-header">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="receb-hist-numero">
              ${Utils.escapeHtml(rec.ordem_compra_numero || '—')}
            </span>
            ${Components.badge(rec.status || 'Aguardando Qualidade')}
          </div>
          <span class="receb-hist-data">${Utils.formatDate(rec.created_at)}</span>
        </div>
        <div class="receb-hist-body">
          NF: ${Utils.escapeHtml(rec.numero_nota_fiscal || '—')}
          · Almoxarife: ${Utils.escapeHtml(rec.almoxarife || '—')}
        </div>
      </div>`).join('');
  },

  abrirDialogRegistro(ocId) {
    this.ocAtual   = this.ocsPendentes.find(o => String(o.id) === String(ocId));
    this.arquivoNF = null;

    if (!this.ocAtual) { Components.Toast.error('OC não encontrada.'); return; }

    Components.Modal.show({
      title:   `Registrar Recebimento — ${this.ocAtual.numero}`,
      content: this.htmlDialogRecebimento(this.ocAtual),
      size:    'xxl',
      footer: `
        <button class="drawer-btn-cancelar" id="btn-cancelar-recebimento">Cancelar</button>
        <button class="drawer-btn-salvar"   id="btn-confirmar-recebimento">✅ Confirmar Recebimento</button>`,
    });

    this.inicializarUpload();
    const _drEl = document.getElementById('data-recebimento');
    if (_drEl) _drEl.value = new Date().toISOString().split('T')[0];
    Utils.initDatePicker('data-recebimento');
    document.getElementById('btn-cancelar-recebimento')?.addEventListener('click', () => Components.Modal.hide());
    document.getElementById('btn-confirmar-recebimento')
      ?.addEventListener('click', () => this.confirmarRecebimento(ocId));
  },

  htmlDialogRecebimento(oc) {
    const itens = Array.isArray(oc.itens) ? oc.itens : [];

    return `
      <!-- Nota Fiscal -->
      <div class="receb-dialog-section">
        <div class="receb-dialog-section-title">📄 Nota Fiscal</div>
        <div class="drawer-form-row" style="margin-bottom:12px;">
          <div class="drawer-field">
            <label class="drawer-label" for="numero-nf">Número da Nota Fiscal *</label>
            <input type="number" class="drawer-input" id="numero-nf"
              placeholder="Ex: 001234" min="0" step="1" inputmode="numeric" />
          </div>
          <div class="drawer-field">
            <label class="drawer-label" for="data-recebimento">Data de Recebimento</label>
            <input type="date" class="drawer-input" id="data-recebimento" />
          </div>
        </div>

        <label class="drawer-label">
          Arquivo da Nota Fiscal * <span style="font-weight:400;color:#A0AEC0;">(PDF ou imagem)</span>
        </label>
        <div class="receb-upload-area" id="upload-area-nf">
          <div class="receb-upload-placeholder" id="upload-placeholder-nf">
            <span class="receb-upload-icon">📎</span>
            <span class="receb-upload-text">Arraste o arquivo aqui</span>
            <span class="receb-upload-hint">PDF, JPG ou PNG — máx. 10MB</span>
          </div>
          <div class="receb-upload-btns">
            <label class="receb-upload-btn" for="file-nf">📁 Selecionar Arquivo</label>
            <label class="receb-upload-btn" for="file-nf-camera">📷 Tirar Foto</label>
          </div>
          <div class="receb-upload-preview" id="upload-preview-nf">
            <span class="receb-upload-file-name" id="nf-file-name"></span>
            <button class="receb-btn-remove-file" id="btn-remove-nf" type="button">✕</button>
          </div>
          <div class="receb-foto-preview" id="foto-preview-nf">
            <img id="foto-preview-img" src="" alt="Foto da NF" />
            <span class="receb-foto-preview-nome" id="foto-preview-nome"></span>
            <button class="receb-btn-remove-file" id="btn-remove-nf-foto" type="button">✕ Remover foto</button>
          </div>
          <input type="file" id="file-nf" accept=".pdf,.jpg,.jpeg,.png" style="display:none;" />
          <input type="file" id="file-nf-camera" accept="image/*" capture="environment" style="display:none;" />
        </div>
      </div>

      <!-- Conferência de Itens -->
      <div class="receb-dialog-section">
        <div class="receb-dialog-section-title">📦 Conferência de Itens</div>
        ${itens.length > 0 ? `
          <table class="receb-conf-table">
            <colgroup>
              <col class="col-item" />
              <col class="col-esp" />
              <col class="col-rec" />
              <col class="col-recebeu" />
              <col class="col-cond" />
              <col class="col-obs" />
            </colgroup>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align:right">Qtd Esperada</th>
                <th style="text-align:right">Qtd Recebida</th>
                <th>Recebido?</th>
                <th>Condição</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              ${itens.map((item, i) => this._criarLinhaConferencia(item, i)).join('')}
            </tbody>
          </table>` : `
          <div class="receb-empty" style="padding:20px;">
            <div class="receb-empty-text">Nenhum item encontrado nesta OC.</div>
          </div>`}
      </div>

      <!-- Observações -->
      <div class="receb-dialog-section">
        <div class="receb-dialog-section-title">📝 Observações Gerais</div>
        <textarea class="drawer-textarea" id="obs-recebimento" rows="2"
          placeholder="Observações gerais sobre o recebimento..."></textarea>
      </div>`;
  },

  _criarLinhaConferencia(item, index) {
    const qtd = item.quantidade || 0;
    const un  = Utils.escapeHtml(item.unidade || '');
    return `
      <tr>
        <td>${Utils.escapeHtml(item.descricao || '—')}</td>
        <td style="text-align:right;">${qtd} ${un}</td>
        <td>
          <input type="number" class="receb-conf-input conf-qtd-recebida"
            value="${qtd}" min="0" step="0.01" data-index="${index}" />
        </td>
        <td>
          <select class="receb-conf-select conf-recebido" data-index="${index}">
            <option value="Sim">✅ Sim</option>
            <option value="Parcial">⚠️ Parcial</option>
            <option value="Não">❌ Não</option>
          </select>
        </td>
        <td>
          <select class="receb-conf-select conf-condicao" data-index="${index}">
            <option value="Conforme">Conforme</option>
            <option value="Com ressalvas">Com ressalvas</option>
            <option value="Avariado">Avariado</option>
            <option value="Recusado">Recusado</option>
          </select>
        </td>
        <td>
          <input type="text" class="receb-conf-obs-input conf-obs"
            data-index="${index}" placeholder="Obs..." />
        </td>
      </tr>`;
  },

  inicializarUpload() {
    const area    = document.getElementById('upload-area-nf');
    const input   = document.getElementById('file-nf');
    const camera  = document.getElementById('file-nf-camera');
    if (!area) return;

    area.addEventListener('dragover', e => {
      e.preventDefault();
      area.classList.add('drag-over');
    });
    area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
    area.addEventListener('drop', e => {
      e.preventDefault();
      area.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this.selecionarArquivoNF(file);
    });

    input?.addEventListener('change', e => {
      if (e.target.files[0]) this.selecionarArquivoNF(e.target.files[0]);
    });

    camera?.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) this.selecionarFotoNF(file);
    });

    document.getElementById('btn-remove-nf')
      ?.addEventListener('click', () => this.removerArquivoNF());
    document.getElementById('btn-remove-nf-foto')
      ?.addEventListener('click', () => this.removerArquivoNF());
  },

  selecionarArquivoNF(file) {
    const tiposValidos = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!tiposValidos.includes(file.type)) {
      Components.Toast.error('Tipo inválido. Use PDF, JPG ou PNG.'); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      Components.Toast.error('Arquivo muito grande. Máximo 10MB.'); return;
    }

    this.arquivoNF = file;
    const sizeKB   = (file.size / 1024).toFixed(0);

    document.getElementById('upload-placeholder-nf').style.display = 'none';
    document.getElementById('upload-preview-nf').style.display     = 'flex';
    document.getElementById('nf-file-name').textContent =
      `📎 ${file.name} (${sizeKB} KB)`;
  },

  selecionarFotoNF(file) {
    if (!file.type.startsWith('image/')) {
      Components.Toast.error('Formato inválido. Use JPG ou PNG.'); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      Components.Toast.error('Foto muito grande. Máximo 10MB.'); return;
    }

    this.arquivoNF = file;
    const reader   = new FileReader();
    reader.onload  = ev => {
      document.getElementById('upload-placeholder-nf').style.display = 'none';
      document.getElementById('upload-preview-nf').style.display     = 'none';
      const prev = document.getElementById('foto-preview-nf');
      if (prev) prev.style.display = 'flex';
      const img = document.getElementById('foto-preview-img');
      if (img) img.src = ev.target.result;
      const nome = document.getElementById('foto-preview-nome');
      if (nome) nome.textContent = `📷 ${file.name} (${(file.size/1024).toFixed(0)} KB)`;
    };
    reader.readAsDataURL(file);
  },

  removerArquivoNF() {
    this.arquivoNF = null;
    const input  = document.getElementById('file-nf');
    const camera = document.getElementById('file-nf-camera');
    if (input)  input.value  = '';
    if (camera) camera.value = '';
    document.getElementById('upload-placeholder-nf').style.display = 'flex';
    document.getElementById('upload-preview-nf').style.display     = 'none';
    const prev = document.getElementById('foto-preview-nf');
    if (prev) { prev.style.display = 'none'; }
    const img = document.getElementById('foto-preview-img');
    if (img) img.src = '';
  },

  async confirmarRecebimento(ocId) {
    const oc = this.ocsPendentes.find(o => String(o.id) === String(ocId));
    if (!oc) return;

    const usuario  = App.currentUser;
    const numeroNF = document.getElementById('numero-nf')?.value.trim();

    if (!numeroNF)       { Components.Toast.warning('Informe o número da nota fiscal.'); return; }
    if (!this.arquivoNF) { Components.Toast.warning('Anexe o arquivo da nota fiscal.'); return; }

    const dataRec = Utils.getDataISO('data-recebimento')
      || new Date().toISOString().split('T')[0];

    const itens = Array.isArray(oc.itens) ? oc.itens : [];
    const itensConferencia = itens.map((item, i) => ({
      descricao:           item.descricao,
      quantidade_esperada: item.quantidade,
      quantidade_recebida: parseFloat(
        document.querySelector(`.conf-qtd-recebida[data-index="${i}"]`)?.value ?? item.quantidade
      ),
      recebido:    document.querySelector(`.conf-recebido[data-index="${i}"]`)?.value   || 'Sim',
      condicao:    document.querySelector(`.conf-condicao[data-index="${i}"]`)?.value   || 'Conforme',
      observacoes: document.querySelector(`.conf-obs[data-index="${i}"]`)?.value?.trim() || '',
    }));

    const btn = document.getElementById('btn-confirmar-recebimento');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Salvando...'; }

    try {
      let urlNF = null;
      try {
        const ext    = this.arquivoNF.name.split('.').pop();
        const nfPath = `nf/${oc.numero}/${Date.now()}.${ext}`;
        const uploadData = await Storage.uploadFile(nfPath, this.arquivoNF);
        urlNF = Storage.getFileUrl(uploadData?.path || nfPath);
      } catch (uploadErr) {
        console.warn('[Recebimento] Upload NF:', uploadErr.message);
        urlNF = `[arquivo local: ${this.arquivoNF.name}]`;
      }

      const obsGerais   = document.getElementById('obs-recebimento')?.value?.trim() || '';
      const fornecedor  = oc.fornecedor_nome || '—';
      const hoje        = new Date().toISOString().split('T')[0];
      const dataEntrega = oc.data_entrega_prevista || oc.data_necessidade || null;
      const atrasado    = dataEntrega && hoje > dataEntrega;

      // Classificar situação: Completo / Parcial / Não Recebido
      const algumNao      = itensConferencia.some(i => i.recebido === 'Não');
      const algumParcial  = itensConferencia.some(i => i.recebido === 'Parcial');
      const tudoNao       = itensConferencia.every(i => i.recebido === 'Não');

      if (tudoNao) {
        // ── Nenhum item recebido: marcar OC como Entrega Atrasada e registrar ocorrência
        await Storage.update(TABLES.ordens, oc.id, { status: 'Entrega Atrasada' });

        await Storage.create(TABLES.historico, {
          requisicao_id:   oc.requisicao_id || null,
          acao:            'Entrega Não Realizada',
          usuario:         usuario.nome,
          usuario_email:   usuario.email,
          detalhes:        `Fornecedor: ${fornecedor}. ` +
                           (atrasado ? `Entrega prevista: ${Utils.formatarData(dataEntrega)} (ATRASADA). ` : '') +
                           `Observações: ${obsGerais || '—'}`,
          status_anterior: 'Aguardando Recebimento',
          status_novo:     'Entrega Atrasada',
        });

        Components.Modal.hide();
        Components.Toast.warning(`⚠️ Entrega não realizada registrada. Fornecedor: ${fornecedor}.`);
        Notificacoes.notificarNovo('urgente', 'Entrega não realizada',
          `OC ${oc.numero} — Fornecedor: ${fornecedor}`, 'recebimento');

      } else if (algumParcial || algumNao) {
        // ── Recebimento parcial: registrar o que chegou e manter OC em aberto
        await Storage.create(TABLES.recebimentos, {
          ordem_compra_id:     oc.id,
          ordem_compra_numero: oc.numero,
          requisicao_id:       oc.requisicao_id || null,
          fornecedor_nome:     fornecedor,
          data_recebimento:    dataRec,
          numero_nota_fiscal:  numeroNF,
          nota_fiscal_url:     urlNF,
          itens_conferencia:   itensConferencia,
          observacoes:         obsGerais,
          almoxarife:          usuario.nome,
          almoxarife_email:    usuario.email,
          status:              'Recebimento Parcial',
        });

        await Storage.update(TABLES.ordens, oc.id, { status: 'Recebimento Parcial' });

        await Storage.create(TABLES.historico, {
          requisicao_id:   oc.requisicao_id || null,
          acao:            'Recebimento Parcial',
          usuario:         usuario.nome,
          usuario_email:   usuario.email,
          detalhes:        `Fornecedor: ${fornecedor}. NF: ${numeroNF}. ` +
                           `Itens pendentes: ${itensConferencia.filter(i => i.recebido !== 'Sim').length}. ` +
                           (atrasado ? `Entrega prevista: ${Utils.formatarData(dataEntrega)} (ATRASADA). ` : ''),
          status_anterior: 'Aguardando Recebimento',
          status_novo:     'Recebimento Parcial',
        });

        Components.Modal.hide();
        Components.Toast.warning(`⚠️ Recebimento parcial registrado. OC permanece em aberto para itens pendentes.`);
        Notificacoes.notificarNovo('urgente', 'Recebimento parcial',
          `OC ${oc.numero} — Fornecedor: ${fornecedor}`, 'recebimento');

      } else {
        // ── Tudo recebido: fluxo normal → Qualidade
        await Storage.create(TABLES.recebimentos, {
          ordem_compra_id:     oc.id,
          ordem_compra_numero: oc.numero,
          requisicao_id:       oc.requisicao_id || null,
          fornecedor_nome:     fornecedor,
          data_recebimento:    dataRec,
          numero_nota_fiscal:  numeroNF,
          nota_fiscal_url:     urlNF,
          itens_conferencia:   itensConferencia,
          observacoes:         obsGerais,
          almoxarife:          usuario.nome,
          almoxarife_email:    usuario.email,
          status:              'Aguardando Qualidade',
        });

        await Storage.update(TABLES.ordens, oc.id, { status: 'Recebida' });

        if (oc.requisicao_id) {
          await Storage.update(TABLES.requisicoes, oc.requisicao_id, {
            status: 'Aguardando Analise de Qualidade',
          });
        }

        await Storage.create(TABLES.historico, {
          requisicao_id:   oc.requisicao_id || null,
          acao:            'Material Recebido',
          usuario:         usuario.nome,
          usuario_email:   usuario.email,
          detalhes:        `Fornecedor: ${fornecedor}. NF: ${numeroNF}. ${itensConferencia.length} itens conferidos.`,
          status_anterior: 'Aguardando Recebimento',
          status_novo:     'Aguardando Analise de Qualidade',
        });

        Components.Modal.hide();
        Components.Toast.success('✅ Recebimento registrado! Material aguarda análise de qualidade.');
        Notificacoes.notificarNovo('recebimento', 'Recebimento confirmado',
          'Material registrado e enviado para qualidade', 'qualidade');
      }

      App._loadAllBadges?.();
      await this.loadDados();

    } catch (e) {
      console.error('[Recebimento]', e);
      Components.Toast.error('Erro ao registrar recebimento: ' + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '✅ Confirmar Recebimento'; }
    }
  },

  _skeletonOCs() {
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
      <div class="receb-hist-item" style="opacity:1;">
        <div class="skeleton skeleton-text" style="width:60%;margin-bottom:6px;"></div>
        <div class="skeleton skeleton-text" style="width:80%;"></div>
      </div>`).join('');
  },
};

window.Pages = Pages;
