'use client'

/**
 * AppLayout — integra a Sidebar com o conteúdo principal.
 * Gerencia: colapso desktop, breakpoint mobile, drawer.
 */

import { useState, useEffect } from 'react'
import { Menu } from 'lucide-react'
import { Sidebar, DEFAULT_BRAND, DEFAULT_USER, DEFAULT_NAV_GROUPS } from './Sidebar'

const cx = (...args) => args.filter(Boolean).join(' ')

/* ─── hook de estado da sidebar ─────────────────────────────── */
function useSidebarState() {
  const [collapsed, setCollapsed]   = useState(false)
  const [isMobile,  setIsMobile]    = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (!mobile) setDrawerOpen(false)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return {
    collapsed,
    isMobile,
    drawerOpen,
    toggle:      () => setCollapsed(v => !v),
    openDrawer:  () => setDrawerOpen(true),
    closeDrawer: () => setDrawerOpen(false),
  }
}

/* ══════════════════════════════════════════════════════════════
   AppLayout

   Props
   ──────────────────────────────────────────────────────────────
   children         ReactNode — conteúdo da página
   currentPath      string    — rota ativa
   onNavigate       (path) ⇒ void
   brand            objeto de branding  (opcional)
   user             { name, role }      (opcional)
   navigationGroups config de navegação (opcional)
   pageTitle        string — título exibido na topbar mobile
══════════════════════════════════════════════════════════════ */
export function AppLayout({
  children,
  currentPath      = '/dashboard',
  onNavigate,
  brand            = DEFAULT_BRAND,
  user             = DEFAULT_USER,
  navigationGroups = DEFAULT_NAV_GROUPS,
  pageTitle,
}) {
  const sidebar = useSidebarState()

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-900">

      {/* ── sidebar ── */}
      <Sidebar
        brand={brand}
        user={user}
        navigationGroups={navigationGroups}
        currentPath={currentPath}
        isCollapsed={sidebar.collapsed}
        isMobile={sidebar.isMobile}
        isOpen={sidebar.drawerOpen}
        onToggle={sidebar.toggle}
        onClose={sidebar.closeDrawer}
        onNavigate={onNavigate}
      />

      {/* ── área principal ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* topbar mobile */}
        {sidebar.isMobile && (
          <header
            className={cx(
              'flex h-12 shrink-0 items-center gap-3 px-4',
              'border-b border-zinc-200 dark:border-zinc-800',
              'bg-white dark:bg-zinc-900',
            )}
          >
            <button
              onClick={sidebar.openDrawer}
              aria-label="Abrir menu lateral"
              className={cx(
                'flex h-8 w-8 items-center justify-center rounded-md',
                'text-zinc-500 transition-colors',
                'hover:bg-zinc-100 dark:hover:bg-zinc-800',
                'hover:text-zinc-700 dark:hover:text-zinc-300',
              )}
            >
              <Menu className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>

            {(pageTitle || brand.name) && (
              <span className="text-[13px] font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
                {pageTitle || brand.name}
              </span>
            )}
          </header>
        )}

        {/* conteúdo */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>

      </div>
    </div>
  )
}

// ─── Uso mínimo ──────────────────────────────────────────────
//
//   import { AppLayout } from './react-sidebar/AppLayout'
//   import { useState } from 'react'
//
//   export default function App() {
//     const [path, setPath] = useState('/dashboard')
//     return (
//       <AppLayout currentPath={path} onNavigate={setPath}>
//         <div className="p-8">
//           <h1 className="text-2xl font-bold">Dashboard</h1>
//         </div>
//       </AppLayout>
//     )
//   }
//
// ─── Personalizando navegação ─────────────────────────────────
//
//   const myGroups = [
//     {
//       id: 'main',
//       label: 'Principal',
//       items: [
//         { id: 'home',  label: 'Início', icon: Home,     path: '/' },
//         { id: 'docs',  label: 'Docs',   icon: FileText, path: '/docs' },
//         {
//           id: 'admin', label: 'Admin',  icon: Settings, path: '/admin',
//           children: [
//             { id: 'users', label: 'Usuários', path: '/admin/users' },
//             { id: 'roles', label: 'Roles',    path: '/admin/roles' },
//           ],
//         },
//       ],
//     },
//   ]
//
// ─── tailwind.config.js ──────────────────────────────────────
//
//   module.exports = {
//     darkMode: 'class',
//     content: ['./src/**/*.{js,jsx,ts,tsx}'],  // glob entre aspas simples
//     theme: { extend: {} },
//     plugins: [],
//   }
//
// ─── Versões mínimas ─────────────────────────────────────────
//   tailwindcss  >= 3.2
//   react        >= 18
//   lucide-react >= 0.263
