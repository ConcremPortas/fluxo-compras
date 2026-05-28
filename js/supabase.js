/* ============================================================
   FLUXOCOMPRAS — Cliente Supabase Auth
   ============================================================ */

const _sb = window.supabase.createClient(
  window.__SUPABASE_URL__      || CONFIG.SUPABASE_URL,
  window.__SUPABASE_ANON_KEY__ || CONFIG.SUPABASE_KEY,
  { auth: { storage: window.localStorage, detectSessionInUrl: false } }
);

window._sb = _sb;

window._turnstileToken = null;

window.onTurnstileSuccess = function(token) {
  window._turnstileToken = token;
  const btn = document.getElementById('btn-entrar');
  if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = ''; }
  const status = document.getElementById('turnstile-status');
  if (status) { status.textContent = '✓ Verificação concluída'; }
};

window.onTurnstileExpired = function() {
  window._turnstileToken = null;
  const btn = document.getElementById('btn-entrar');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; btn.style.cursor = 'not-allowed'; }
  const status = document.getElementById('turnstile-status');
  if (status) { status.textContent = '⟳ Verificação expirada, aguarde...'; }
};

window.onTurnstileError = function() {
  window._turnstileToken = null;
  const status = document.getElementById('turnstile-status');
  if (status) { status.textContent = '⚠ Erro na verificação. Recarregue a página.'; status.style.color = '#dc2626'; }
};
