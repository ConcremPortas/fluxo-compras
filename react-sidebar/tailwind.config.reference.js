// tailwind.config.js — configuração de referência para a sidebar
// Copie/mescle com seu tailwind.config.js existente

/** @type {import('tailwindcss').Config} */
module.exports = {
  // dark mode via classe no <html> — ex: document.documentElement.classList.toggle('dark')
  darkMode: 'class',

  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    // Ajuste para o caminho do seu projeto
  ],

  theme: {
    extend: {
      // Animação do ping do status (já está no Tailwind base)
      // Apenas verifique que `animate-ping` não foi purgado
    },
  },

  plugins: [],
}

/*
  Classes usadas na sidebar que exigem atenção:

  ┌─ Opacidade / mix ──────────────────────────────────────────┐
  │  bg-emerald-500/[0.08]   → valor arbitrário de opacidade   │
  │  bg-emerald-500/10, /12, /15, /20                          │
  │  ring-emerald-500/20, /30                                  │
  │  border-emerald-900/30, /40                                │
  │  bg-zinc-800/50, /60, /70, /80                             │
  └────────────────────────────────────────────────────────────┘

  ┌─ Scrollbar oculto ─────────────────────────────────────────┐
  │  [&::-webkit-scrollbar]:hidden                             │
  │  [-ms-overflow-style:none]                                 │
  │  [scrollbar-width:none]                                    │
  └────────────────────────────────────────────────────────────┘

  ┌─ Transição de largura ─────────────────────────────────────┐
  │  transition-[width]                                        │
  │  transition-[max-height,opacity]                           │
  └────────────────────────────────────────────────────────────┘

  ┌─ Grupo aninhado ───────────────────────────────────────────┐
  │  group/btn, group/tip, group/tooltip                       │
  │  group-hover/btn:..., group-hover/tip:...                  │
  └────────────────────────────────────────────────────────────┘

  Todas as classes acima são suportadas nativamente pelo Tailwind v3.2+
  Se estiver em v3.1 ou inferior, faça upgrade.

  ┌─ Versão mínima recomendada ────────────────────────────────┐
  │  tailwindcss >= 3.2.0                                      │
  │  react >= 18                                               │
  │  lucide-react >= 0.263                                     │
  └────────────────────────────────────────────────────────────┘
*/
