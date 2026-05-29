/* ============================================================
   Fluxo Compras — Login Premium v2
   Verde escuro hsl(142,93%,8%) + esmeralda #6ee7b7
   ============================================================ */

var Pages = window.Pages || {};

Pages.Login = {

  render() {
    document.title = 'Fluxo Compras — Entrar';

    const app = document.getElementById('app');
    app.className = 'login-mode';

    app.innerHTML = `
      <div class="login-page">

        <!-- ── PAINEL ESQUERDO ── -->
        <div class="login-brand">
          <div class="login-grid-bg"></div>
          <div class="login-orb login-orb-1"></div>
          <div class="login-orb login-orb-2"></div>
          <div class="login-orb login-orb-3"></div>

          <div class="login-brand-content">
            <div class="login-brand-logo">
              <img src="Logos/concrem-logo.png" alt="Concrem" class="login-logo-img" draggable="false" />
            </div>

            <h1>Gestão <span>inteligente</span><br>do ciclo de compras</h1>

            <p>Controle total do processo de aquisição da sua empresa,<br>
               do pedido ao recebimento com rastreabilidade completa.</p>

            <ul class="login-brand-features">
              <li><i class="login-check">✓</i> Fluxo completo de aprovação com alçadas</li>
              <li><i class="login-check">✓</i> Cotações comparativas com fornecedores</li>
              <li><i class="login-check">✓</i> Rastreabilidade e controle de qualidade</li>
            </ul>
          </div>

          <div class="login-stats">
            <div>
              <span class="login-stat-value" data-count="6"   data-suffix="">0</span>
              <span class="login-stat-label">Etapas do fluxo</span>
            </div>
            <div>
              <span class="login-stat-value" data-count="8"   data-suffix="">0</span>
              <span class="login-stat-label">Perfis de acesso</span>
            </div>
            <div>
              <span class="login-stat-value" data-count="100" data-suffix="%">0%</span>
              <span class="login-stat-label">Rastreabilidade</span>
            </div>
          </div>
        </div>

        <!-- ── PAINEL DIREITO ── -->
        <div class="login-form-area">
          <div class="login-form-box">

            <!-- Badge sistema -->
            <div class="login-sistema-badge">
              <span class="login-sistema-dot"></span>
              Fluxo Compras
            </div>

            <h2>Bem-vindo</h2>
            <span class="login-subtitle">Acesse com suas credenciais corporativas</span>

            <div class="login-divider"></div>

            <!-- Erro geral -->
            <div class="login-erro-geral" id="login-erro-geral" style="display:none;">
              <span>⚠️</span>
              <span id="login-erro-msg"></span>
            </div>

            <!-- E-mail -->
            <div class="login-field-wrap">
              <label class="login-field-label" for="login-email">E-mail corporativo</label>
              <div class="login-input-wrap">
                <span class="login-input-icon">✉️</span>
                <input
                  type="email"
                  id="login-email"
                  class="login-input"
                  placeholder="seu.nome@concrem.com.br"
                  autocomplete="username"
                  inputmode="email"
                />
              </div>
              <span class="login-field-error" id="err-email"></span>
            </div>

            <!-- Senha -->
            <div class="login-field-wrap">
              <label class="login-field-label" for="login-senha">Senha</label>
              <div class="login-input-wrap">
                <span class="login-input-icon">🔒</span>
                <input
                  type="password"
                  id="login-senha"
                  class="login-input"
                  placeholder="••••••••"
                  autocomplete="current-password"
                />
                <button class="login-toggle-senha" id="btn-toggle-senha" type="button" tabindex="-1">👁️</button>
              </div>
              <span class="login-field-error" id="err-senha"></span>
            </div>

            <div class="cf-turnstile"
              data-sitekey="0x4AAAAAADXZ9JJBI4r7lXPO"
              data-theme="light"
              data-callback="onTurnstileSuccess"
              data-expired-callback="onTurnstileExpired"
              data-error-callback="onTurnstileError">
            </div>
            <div id="turnstile-status" style="font-size:12px;color:#6b7280;margin-bottom:12px;">
              🔒 Verificando segurança...
            </div>

            <!-- Botão entrar -->
            <button class="login-btn-entrar" id="btn-entrar" type="button" disabled style="opacity:0.6;cursor:not-allowed;">
              <span id="btn-entrar-text">Entrar →</span>
              <span id="btn-entrar-spinner" style="display:none;">⏳</span>
            </button>

          </div>
        </div>

      </div>`;

    this._bindEvents();
    this._animateCounters();
    this._initTurnstile();
  },

  _bindEvents() {
    document.getElementById('login-email')
      ?.addEventListener('keydown', e => { if (e.key === 'Enter') Pages.Login._handleLogin(); });
    document.getElementById('login-senha')
      ?.addEventListener('keydown', e => { if (e.key === 'Enter') Pages.Login._handleLogin(); });
    document.getElementById('btn-entrar')
      ?.addEventListener('click', () => Pages.Login._handleLogin());

    document.getElementById('btn-toggle-senha')
      ?.addEventListener('click', () => {
        const input = document.getElementById('login-senha');
        if (!input) return;
        const isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';
        document.getElementById('btn-toggle-senha').textContent = isPass ? '🙈' : '👁️';
      });
  },

  async _handleLogin() {
    const email = (document.getElementById('login-email')?.value || '').trim().toLowerCase();
    const senha = document.getElementById('login-senha')?.value || '';

    document.getElementById('err-email').textContent = '';
    document.getElementById('err-senha').textContent = '';
    document.getElementById('login-erro-geral').style.display = 'none';

    let valido = true;
    if (!email) {
      document.getElementById('err-email').textContent = 'Informe seu e-mail.';
      document.getElementById('login-email').classList.add('error');
      valido = false;
    } else {
      document.getElementById('login-email').classList.remove('error');
    }
    if (!senha) {
      document.getElementById('err-senha').textContent = 'Informe sua senha.';
      document.getElementById('login-senha').classList.add('error');
      valido = false;
    } else {
      document.getElementById('login-senha').classList.remove('error');
    }
    if (!valido) return;

    // Verificar Turnstile
    if (!window._turnstileToken) {
      this._mostrarErro('Aguarde a verificação de segurança.');
      return;
    }

    const btn     = document.getElementById('btn-entrar');
    const btnText = document.getElementById('btn-entrar-text');
    const spinner = document.getElementById('btn-entrar-spinner');
    btn.disabled          = true;
    btnText.style.display = 'none';
    spinner.style.display = 'inline';

    try {
      // Suporte a username ou e-mail
      let emailLogin = email;
      if (!email.includes('@')) {
        const { data: userRow } = await _sb
          .from('concrem_fxcp_usuarios')
          .select('email')
          .eq('username', email)
          .eq('ativo', true)
          .maybeSingle();
        if (!userRow) {
          this._mostrarErro('Usuário não encontrado.');
          return;
        }
        emailLogin = userRow.email;
      }

      const { data, error } = await _sb.auth.signInWithPassword({
        email: emailLogin,
        password: senha,
      });

      if (error) {
        this._mostrarErro('E-mail ou senha incorretos.');
        document.getElementById('login-senha').classList.add('error');
        return;
      }

      // Buscar perfil do usuário
      const { data: perfil } = await _sb
        .from('concrem_fxcp_usuarios')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!perfil || !perfil.ativo) {
        await _sb.auth.signOut();
        this._mostrarErro('Usuário inativo. Contate o administrador.');
        return;
      }


      // Verificar troca de senha obrigatória
      if (perfil.trocar_senha) {
        App._perfilPendente = perfil;
        App.navigate('trocar-senha');
        return;
      }

      const sessao = {
        id:     perfil.id,
        nome:   perfil.nome,
        email:  perfil.email,
        role:   perfil.role,
        avatar: (perfil.nome || '?').charAt(0).toUpperCase(),
      };

      sessionStorage.setItem('fc_usuario_logado', JSON.stringify(sessao));
      App.currentUser = sessao;
      await Permissoes.carregar();

      const nivel = Permissoes._userMeta[perfil.id]?.nivel_alcada;
      if (nivel) {
        sessao.nivel_alcada = nivel;
        App.currentUser = sessao;
        sessionStorage.setItem('fc_usuario_logado', JSON.stringify(sessao));
      }

      sessionStorage.setItem('fc_redirect_after_login', 'dashboard');
      window.location.reload();
      return;

    } catch (e) {
      console.error('[Login]', e);
      this._mostrarErro('Erro de conexão. Tente novamente.');
    } finally {
      btn.disabled          = false;
      btnText.style.display = 'inline';
      spinner.style.display = 'none';
    }
  },

  _mostrarErro(msg) {
    const wrap = document.getElementById('login-erro-geral');
    const span = document.getElementById('login-erro-msg');
    if (wrap && span) {
      span.textContent       = msg;
      wrap.style.display     = 'flex';
      wrap.style.animation   = 'none';
      requestAnimationFrame(() => { wrap.style.animation = ''; });
    }
  },

  _animateCounters() {
    setTimeout(() => {
      document.querySelectorAll('.login-stat-value[data-count]').forEach(el => {
        const target   = parseInt(el.dataset.count, 10);
        const suffix   = el.dataset.suffix || '';
        const duration = 1400;
        const start    = performance.now();

        const tick = (now) => {
          const p = Math.min((now - start) / duration, 1);
          const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
          el.textContent = Math.round(e * target) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
      });
    }, 1500);
  },

  _initTurnstile() {
    if (!window.turnstile) return;
    const el = document.querySelector('.cf-turnstile');
    if (!el) return;
    // Limpar qualquer widget anterior neste elemento
    try { window.turnstile.remove(el); } catch(_) {}
    window._turnstileToken = null;
    window.turnstile.render(el, {
      sitekey: '0x4AAAAAADXZ9JJBI4r7lXPO',
      theme: 'light',
      callback: window.onTurnstileSuccess,
      'expired-callback': window.onTurnstileExpired,
      'error-callback': window.onTurnstileError,
    });
  },

};

window.Pages = Pages;
