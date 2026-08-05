import type { ReactNode } from 'react';
import { HeartPulse, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/cn';
import { NAV_ITEMS, type ViewKey } from './navConfig';

export function AppShell({
  activeView,
  onViewChange,
  children,
  status,
  error,
  onRefresh,
  spreadsheetUrl,
  lastSyncedAt,
}: {
  activeView: ViewKey;
  onViewChange: (view: ViewKey) => void;
  children: ReactNode;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  onRefresh: () => void;
  spreadsheetUrl: string;
  lastSyncedAt: string;
}) {
  const activeItem = NAV_ITEMS.find((item) => item.key === activeView) ?? NAV_ITEMS[0];

  return (
    <div className="min-h-screen spider-bg text-spider-ink">
      <div className="pointer-events-none fixed inset-0 hex-mask opacity-[0.18]" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1800px]">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-white/10 bg-spider-night/82 p-5 backdrop-blur-xl lg:block">
          <Brand />
          <nav className="mt-8 space-y-1" aria-label="Módulos do Projeto Spider">
            {NAV_ITEMS.map((item) => (
              <NavButton key={item.key} item={item} active={item.key === activeView} onClick={() => onViewChange(item.key)} />
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-spider-night/78 backdrop-blur-xl">
            <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 xl:px-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.08] text-spider-red shadow-glow lg:hidden">
                    <HeartPulse className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-spider-red">Projeto Spider</p>
                    <h1 className="truncate text-xl font-bold sm:text-2xl">{activeItem.label}</h1>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <SyncBadge status={status} error={error} lastSyncedAt={lastSyncedAt} />
                  {spreadsheetUrl ? (
                    <a
                      className="hidden rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-semibold text-spider-muted transition hover:bg-white/[0.1] hover:text-spider-ink sm:inline-flex"
                      href={spreadsheetUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Planilha
                    </a>
                  ) : null}
                  <Button variant="secondary" size="icon" onClick={onRefresh} loading={status === 'loading'} aria-label="Atualizar dados">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="Navegação mobile">
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.key}
                    className={cn(
                      'focus-ring inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition',
                      item.key === activeView
                        ? 'border-red-400/30 bg-spider-red text-white shadow-glow'
                        : 'border-white/10 bg-white/[0.06] text-spider-muted',
                    )}
                    onClick={() => onViewChange(item.key)}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-5 sm:px-6 xl:px-8 xl:py-8">
            {error ? (
              <div className="mb-5 rounded-lg border border-red-400/20 bg-red-950/45 p-4 text-sm leading-6 text-red-100">
                {error}
              </div>
            ) : null}
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-white/[0.08] text-spider-red shadow-glow">
        <HeartPulse className="h-6 w-6" />
        <span className="absolute inset-1 rounded-md border border-red-400/20" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-spider-red">Projeto</p>
        <p className="text-xl font-black tracking-normal text-white">Spider</p>
      </div>
    </div>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: (typeof NAV_ITEMS)[number];
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        'focus-ring flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold transition duration-200',
        active
          ? 'bg-spider-red text-white shadow-glow'
          : 'text-spider-muted hover:bg-white/[0.075] hover:text-spider-ink',
      )}
      onClick={onClick}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-black/18">{item.icon}</span>
      <span>{item.label}</span>
    </button>
  );
}

function SyncBadge({
  status,
  error,
  lastSyncedAt,
}: {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  lastSyncedAt: string;
}) {
  if (status === 'loading') return <Badge tone="blue">Sincronizando</Badge>;
  if (status === 'error' || error) return <Badge tone="red">Sheets offline</Badge>;
  if (!lastSyncedAt) return <Badge>Sem sync</Badge>;

  return <Badge tone="green">Sync ativo</Badge>;
}
