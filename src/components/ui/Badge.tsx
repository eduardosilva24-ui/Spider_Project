import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'red' | 'blue' | 'green' | 'gold';
  className?: string;
}) {
  const tones = {
    neutral: 'border-white/10 bg-white/[0.07] text-spider-muted',
    red: 'border-red-400/20 bg-red-500/10 text-red-100',
    blue: 'border-blue-400/20 bg-blue-500/10 text-blue-100',
    green: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
    gold: 'border-yellow-400/20 bg-yellow-500/10 text-yellow-100',
  };

  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', tones[tone], className)}>
      {children}
    </span>
  );
}
