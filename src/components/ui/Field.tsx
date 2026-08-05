import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

const inputClass =
  'focus-ring h-11 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-spider-ink placeholder:text-spider-muted/60 transition duration-200 hover:border-white/20';

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn('block space-y-2', className)}>
      <span className="text-sm font-medium text-spider-muted">{label}</span>
      {children}
      {hint ? <span className="block text-xs leading-5 text-spider-muted/75">{hint}</span> : null}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputClass, 'appearance-none', className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, 'min-h-28 resize-y py-3 leading-relaxed', className)} {...props} />;
}
