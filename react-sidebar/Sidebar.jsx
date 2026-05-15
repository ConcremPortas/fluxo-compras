'use client'

/**
 * Sidebar premium · dark · emerald accent
 * React 18+ · Tailwind CSS v3.2+
 * lucide-react required: npm i lucide-react
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  LayoutDashboard, FileText, CheckSquare, DollarSign,
  Package, Truck, FlaskConical, BarChart2, Building2,
  Settings, ChevronLeft, ChevronRight, ChevronDown,
  Sun, Moon, LogOut, X, Activity,
} from 'lucide-react'

/* ─── utility ──────────────────────────────────────────────── */
const cx = (...args) => args.filter(Boolean).join(' ')

/* ─── defaults (overridable via props) ──────────────────────── */
export const DEFAULT_BRAND = {
  logoText:    'FC',
  name:        'Fluxo Compras',
  product:     'Procurement Suite',
  environment: 'PROD',
  status:      'Operação estável',
}

export const DEFAULT_USER = {
  name: 'Admin Sistema',
  role: 'Administrador',
}

export const DEFAULT_NAV_GROUPS = [
  {
    id: 'operacao',
    label: 'Operação',
    items: [
      { id: 'dashboard',   label: 'Dashboard',    icon: LayoutDashboard, path: '/dashboard' },
      { id: 'requisicoes', label: 'Requisições',   icon: FileText,        path: '/requisicoes' },
      { id: 'aprovacoes',  label: 'Aprovações',    icon: CheckSquare,     path: '/aprovacoes', badge: 3 },
    ],
  },
  {
    id: 'gestao',
    label: 'Gestão',
    items: [
      { id: 'cotacoes', label: 'Cotações',          icon: DollarSign, path: '/cotacoes' },
      { id: 'ordens',   label: 'Ordens de Compra',  icon: Package,    path: '/ordens' },
      {
        id: 'logistica',
        label: 'Logística',
        icon: Truck,
        path: '/logistica',
        children: [
          { id: 'recebimento', label: 'Recebimento', path: '/recebimento' },
          { id: 'qualidade',   label: 'Qualidade',   path: '/qualidade'   },
        ],
      },
    ],
  },
  {
    id: 'analises',
    label: 'Análises',
    items: [
      { id: 'relatorios',   label: 'Relatórios',   icon: BarChart2,    path: '/relatorios'   },
      { id: 'fornecedores', label: 'Fornecedores', icon: Building2,    path: '/fornecedores' },
      { id: 'qualidade-b',  label: 'Qualidade',    icon: FlaskConical, path: '/qualidade'    },
    ],
  },
  {
    id: 'sistema',
    label: 'Sistema',
    items: [
      { id: 'config', label: 'Configurações', icon: Settings, path: '/configuracoes' },
    ],
  },
]

/* ══════════════════════════════════════════════════════════════
   TOOLTIP — aparece à direita no modo colapsado
══════════════════════════════════════════════════════════════ */
function Tooltip({ label, enabled, children }) {
  if (!enabled) return <>{children}</>
  return (
    <div className="group/tip relative">
      {children}
      <div
        role="tooltip"
        className={cx(
          // posição: à direita do ícone
          'pointer-events-none absolute left-full top-1/2 z-[999]',
          '-translate-y-1/2 ml-3',
          // visual
          'whitespace-nowrap rounded-md',
          'bg-zinc-800 dark:bg-zinc-700',
          'border border-zinc-700/70 dark:border-zinc-600/70',
          'px-2.5 py-[7px]',
          'text-[11px] font-medium leading-none text-zinc-100',
          'shadow-[0_8px_24px_rgba(0,0,0,0.4)]',
          // animação
          '-translate-x-1 opacity-0 transition-all duration-150',
          'group-hover/tip:translate-x-0 group-hover/tip:opacity-100',
        )}
      >
        {/* caret esquerdo */}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-[4px] border-transparent border-r-zinc-800 dark:border-r-zinc-700" />
        {label}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   NAV ITEM — com suporte a filhos (submenu)
══════════════════════════════════════════════════════════════ */
function NavItem({ item, collapsed, currentPath, onNavigate, depth = 0 }) {
  const Icon         = item.icon
  const hasChildren  = Boolean(item.children?.length)
  const isActive     = currentPath === item.path
  const childActive  = hasChildren && item.children.some(c => c.path === currentPath)
  const showActive   = isActive || (hasChildren && !collapsed && childActive)

  const [open, setOpen] = useState(childActive)

  const handleClick = () => {
    if (hasChildren && !collapsed) {
      setOpen(v => !v)
    } else {
      onNavigate(item.path)
    }
  }

  const isChild = depth > 0

  return (
    <div>
      <Tooltip label={item.label} enabled={collapsed}>
        {/* wrapper relativo para a barra ativa */}
        <div className="relative">
          {/* barra verde lateral (só raiz, só ativo) */}
          {!isChild && (
            <span
              className={cx(
                'pointer-events-none absolute left-0 rounded-r-full bg-emerald-400',
                'transition-all duration-200',
                showActive
                  ? 'bottom-[3px] top-[3px] w-[3px] opacity-100'
                  : 'inset-y-0 w-0 opacity-0',
              )}
            />
          )}

          <button
            onClick={handleClick}
            aria-current={isActive ? 'page' : undefined}
            className={cx(
              // base
              'group/btn relative flex w-full items-center rounded-md',
              'transition-colors duration-150 outline-none',
              'focus-visible:ring-1 focus-visible:ring-emerald-500/60',
              // dimensões
              collapsed
                ? 'h-9 justify-center px-0'
                : cx('h-8 pr-2', isChild ? 'pl-7 gap-2' : 'pl-3.5 gap-2.5'),
              // cores
              showActive
                ? 'bg-emerald-500/[0.09] text-emerald-400'
                : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200',
            )}
          >
            {/* ícone principal (raiz) */}
            {Icon && !isChild && (
              <Icon
                className={cx(
                  'shrink-0 transition-colors duration-150',
                  collapsed ? 'h-[17px] w-[17px]' : 'h-[15px] w-[15px]',
                  showActive
                    ? 'text-emerald-400'
                    : 'text-zinc-500 group-hover/btn:text-zinc-300',
                )}
                strokeWidth={showActive ? 2 : 1.75}
              />
            )}

            {/* ponto (filho) */}
            {isChild && (
              <span
                className={cx(
                  'h-[5px] w-[5px] shrink-0 rounded-full transition-colors duration-150',
                  currentPath === item.path
                    ? 'bg-emerald-400'
                    : 'bg-zinc-600 group-hover/btn:bg-zinc-400',
                )}
              />
            )}

            {/* texto */}
            {!collapsed && (
              <span
                className={cx(
                  'flex-1 truncate text-left leading-none',
                  isChild ? 'text-[12px] text-zinc-400' : 'text-[13px] font-medium',
                )}
              >
                {item.label}
              </span>
            )}

            {/* badge numérico */}
            {!collapsed && item.badge != null && (
              <span
                className={cx(
                  'ml-1 flex h-4 min-w-[16px] shrink-0 items-center justify-center',
                  'rounded-full px-1 text-[10px] font-semibold tabular-nums',
                  showActive
                    ? 'bg-emerald-400/20 text-emerald-300'
                    : 'bg-zinc-700/80 text-zinc-400',
                )}
              >
                {item.badge}
              </span>
            )}

            {/* chevron submenu */}
            {!collapsed && hasChildren && (
              <ChevronDown
                className={cx(
                  'ml-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600',
                  'transition-transform duration-200',
                  open && 'rotate-180',
                )}
                strokeWidth={2}
              />
            )}

            {/* badge ponto (colapsado) */}
            {collapsed && item.badge != null && (
              <span className="absolute right-[9px] top-[9px] h-[7px] w-[7px] rounded-full bg-emerald-400 ring-1 ring-[#0c0c0e]" />
            )}
          </button>
        </div>
      </Tooltip>

      {/* submenu */}
      {hasChildren && !collapsed && (
        <div
          className={cx(
            'overflow-hidden transition-[max-height,opacity] duration-200 ease-in-out',
            open ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0',
          )}
        >
          <div className="mb-0.5 ml-[21px] mt-0.5 border-l border-zinc-800/60 pl-3 pt-0.5">
            {item.children.map(child => (
              <NavItem
                key={child.id}
                item={child}
                collapsed={false}
                currentPath={currentPath}
                onNavigate={onNavigate}
                depth={1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   NAV GROUP — rótulo + itens
══════════════════════════════════════════════════════════════ */
function NavGroup({ group, collapsed, currentPath, onNavigate }) {
  return (
    <div className="mb-3">
      {collapsed ? (
        <div className="mx-auto mb-2 mt-1 h-px w-6 rounded-full bg-zinc-800/80" />
      ) : (
        <p className="mb-1.5 select-none px-3 text-[10px] font-semibold uppercase tracking-[0.09em] text-zinc-600">
          {group.label}
        </p>
      )}
      <div className="space-y-px">
        {group.items.map(item => (
          <NavItem
            key={item.id}
            item={item}
            collapsed={collapsed}
            currentPath={currentPath}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   HEADER — branding + toggle integrado
══════════════════════════════════════════════════════════════ */
function SidebarHeader({ brand, collapsed, isMobile, onToggle, onClose }) {
  return (
    <div className="shrink-0 border-b border-emerald-900/30">
      <div
        className={cx(
          'flex items-start gap-3',
          collapsed && !isMobile ? 'flex-col items-center px-[14px] py-4' : 'px-4 py-4',
        )}
      >
        {/* logo mark — clicável para expandir quando colapsado */}
        <button
          onClick={collapsed && !isMobile ? onToggle : undefined}
          aria-label={collapsed ? 'Expandir menu' : brand.name}
          title={collapsed ? 'Expandir menu' : brand.name}
          className={cx(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px]',
            'bg-emerald-500/10 ring-1 ring-emerald-500/20',
            'transition-all duration-150',
            'hover:bg-emerald-500/15 hover:ring-emerald-500/30',
            collapsed && !isMobile ? 'cursor-pointer' : 'cursor-default',
          )}
        >
          <span className="select-none text-[14px] font-bold tracking-tighter text-emerald-400">
            {brand.logoText}
          </span>
        </button>

        {/* textos de branding (ocultos quando colapsado) */}
        {(!collapsed || isMobile) && (
          <div className="min-w-0 flex-1 pt-px">
            {/* nome + badge de ambiente */}
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-semibold leading-none tracking-tight text-zinc-100">
                {brand.name}
              </span>
              <span
                className={cx(
                  'shrink-0 rounded-[4px] px-[5px] py-[2px] leading-none',
                  'text-[9px] font-bold uppercase tracking-[0.1em]',
                  'bg-emerald-500/[0.12] text-emerald-400/90 ring-1 ring-emerald-500/20',
                )}
              >
                {brand.environment}
              </span>
            </div>

            {/* subtítulo */}
            <p className="mt-[5px] truncate text-[11px] leading-none tracking-tight text-zinc-500">
              {brand.product}
            </p>

            {/* status com ping */}
            <div className="mt-[9px] flex items-center gap-[7px]">
              <span className="relative flex h-[7px] w-[7px] shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-emerald-400" />
              </span>
              <span className="truncate text-[11px] leading-none tracking-tight text-zinc-500">
                {brand.status}
              </span>
            </div>
          </div>
        )}

        {/* toggle recolher (desktop, expandido) */}
        {!isMobile && !collapsed && (
          <button
            onClick={onToggle}
            aria-label="Recolher menu"
            title="Recolher"
            className={cx(
              'mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
              'text-zinc-600 transition-colors duration-150',
              'hover:bg-zinc-800/60 hover:text-zinc-400',
            )}
          >
            <ChevronLeft className="h-[14px] w-[14px]" strokeWidth={2.5} />
          </button>
        )}

        {/* fechar drawer (mobile) */}
        {isMobile && (
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            className="mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-600 transition-colors hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* botão expandir (desktop, colapsado) */}
      {!isMobile && collapsed && (
        <div className="flex justify-center pb-3">
          <button
            onClick={onToggle}
            aria-label="Expandir menu"
            title="Expandir"
            className={cx(
              'flex h-6 w-6 items-center justify-center rounded-md',
              'text-zinc-600 transition-colors duration-150',
              'hover:bg-zinc-800/60 hover:text-zinc-400',
            )}
          >
            <ChevronRight className="h-[14px] w-[14px]" strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   FOOTER — usuário · tema · logout
══════════════════════════════════════════════════════════════ */
function SidebarFooter({ user, collapsed, isDark, onToggleTheme, onLogout }) {
  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase() ?? '')
    .join('')

  const Avatar = (
    <div className="flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-300 ring-1 ring-zinc-700/80">
      {initials}
    </div>
  )

  const ThemeBtn = (
    <button
      onClick={onToggleTheme}
      aria-label={isDark ? 'Modo claro' : 'Modo escuro'}
      title={isDark ? 'Modo claro' : 'Modo escuro'}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-800/80 hover:text-zinc-300"
    >
      {isDark
        ? <Sun  className="h-[13px] w-[13px]" strokeWidth={2} />
        : <Moon className="h-[13px] w-[13px]" strokeWidth={2} />
      }
    </button>
  )

  const LogoutBtn = (
    <button
      onClick={onLogout}
      aria-label="Sair"
      title="Sair do sistema"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
    >
      <LogOut className="h-[13px] w-[13px]" strokeWidth={2} />
    </button>
  )

  return (
    <div
      className={cx(
        'shrink-0 border-t border-zinc-800/50',
        collapsed ? 'px-2 py-3' : 'px-3 py-3',
      )}
    >
      {collapsed ? (
        /* colapsado: empilhado e centralizado */
        <div className="flex flex-col items-center gap-1">
          <Tooltip label={`${user.name} · ${user.role}`} enabled>{Avatar}</Tooltip>
          <Tooltip label={isDark ? 'Modo claro' : 'Modo escuro'} enabled>{ThemeBtn}</Tooltip>
          <Tooltip label="Sair" enabled>{LogoutBtn}</Tooltip>
        </div>
      ) : (
        /* expandido: linha horizontal */
        <div className="flex items-center gap-2">
          {Avatar}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium leading-none text-zinc-200">
              {user.name}
            </p>
            <p className="mt-[5px] truncate text-[11px] leading-none text-zinc-500">
              {user.role}
            </p>
          </div>
          <div className="flex items-center gap-0.5">
            {ThemeBtn}
            {LogoutBtn}
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   SIDEBAR — componente principal (export)

   Props
   ──────────────────────────────────────────────────────────────
   brand            { logoText, name, product, environment, status }
   navigationGroups grupo[] → { id, label, items[] → { id, label,
                    icon, path, badge?, children?[] } }
   user             { name, role }
   currentPath      string — rota ativa
   isCollapsed      boolean — largura colapsada (desktop)
   isMobile         boolean — breakpoint mobile
   isOpen           boolean — drawer mobile aberto
   onToggle         () ⇒ void
   onClose          () ⇒ void
   onNavigate       (path: string) ⇒ void
   onLogout         () ⇒ void
══════════════════════════════════════════════════════════════ */
export function Sidebar({
  brand            = DEFAULT_BRAND,
  navigationGroups = DEFAULT_NAV_GROUPS,
  user             = DEFAULT_USER,
  currentPath      = '/dashboard',
  isCollapsed      = false,
  isMobile         = false,
  isOpen           = false,
  onToggle,
  onClose,
  onNavigate,
  onLogout,
}) {
  const [isDark, setIsDark] = useState(true)

  const handleNavigate = useCallback((path) => {
    onNavigate?.(path)
    if (isMobile) onClose?.()
  }, [onNavigate, isMobile, onClose])

  const handleTheme = () => {
    setIsDark(v => !v)
    document.documentElement.classList.toggle('dark')
  }

  /* colapsado real = só no desktop */
  const collapsed = isCollapsed && !isMobile

  return (
    <>
      {/* backdrop mobile */}
      {isMobile && isOpen && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
        />
      )}

      <aside
        aria-label="Menu lateral"
        className={cx(
          /* visual */
          'flex flex-col',
          'bg-[#0c0c0e]',
          'border-r border-zinc-800/50',

          /* desktop — transição de largura */
          !isMobile && [
            'relative z-auto h-screen',
            'transition-[width] duration-300 ease-in-out',
            collapsed ? 'w-[72px]' : 'w-[244px]',
          ],

          /* mobile — drawer lateral */
          isMobile && [
            'fixed inset-y-0 left-0 z-50 h-screen w-[244px]',
            'transition-transform duration-300 ease-in-out',
            isOpen ? 'translate-x-0 shadow-[4px_0_24px_rgba(0,0,0,0.4)]' : '-translate-x-full',
          ],
        )}
      >
        {/* header */}
        <SidebarHeader
          brand={brand}
          collapsed={collapsed}
          isMobile={isMobile}
          onToggle={onToggle}
          onClose={onClose}
        />

        {/* nav */}
        <nav
          aria-label="Navegação principal"
          className={cx(
            'flex-1 overflow-y-auto overflow-x-hidden',
            'py-3',
            collapsed ? 'px-[10px]' : 'px-2',
            '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          )}
        >
          {navigationGroups.map(group => (
            <NavGroup
              key={group.id}
              group={group}
              collapsed={collapsed}
              currentPath={currentPath}
              onNavigate={handleNavigate}
            />
          ))}
        </nav>

        {/* footer */}
        <SidebarFooter
          user={user}
          collapsed={collapsed}
          isDark={isDark}
          onToggleTheme={handleTheme}
          onLogout={onLogout ?? (() => {})}
        />
      </aside>
    </>
  )
}
