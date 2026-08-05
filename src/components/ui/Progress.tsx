import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

export function Progress({
  value,
  className,
  barClassName,
}: {
  value: number;
  className?: string;
  barClassName?: string;
}) {
  const normalized = Math.max(0, Math.min(100, value));

  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-white/10', className)}>
      <motion.div
        className={cn('h-full rounded-full bg-spider-red', barClassName)}
        initial={{ width: 0 }}
        animate={{ width: `${normalized}%` }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />
    </div>
  );
}
