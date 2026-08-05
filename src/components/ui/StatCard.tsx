import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

export function StatCard({
  label,
  value,
  detail,
  icon,
  accent = 'red',
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon: ReactNode;
  accent?: 'red' | 'blue' | 'green' | 'gold';
}) {
  const accentClass = {
    red: 'from-spider-red/20 text-red-100',
    blue: 'from-blue-500/20 text-blue-100',
    green: 'from-emerald-500/20 text-emerald-100',
    gold: 'from-yellow-500/20 text-yellow-100',
  }[accent];

  return (
    <motion.div
      className="rounded-lg border border-white/10 bg-white/[0.055] p-4 shadow-card"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-spider-muted">{label}</p>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br to-white/5', accentClass)}>
          {icon}
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold text-spider-ink">{value}</div>
      {detail ? <div className="mt-1 text-sm text-spider-muted">{detail}</div> : null}
    </motion.div>
  );
}
