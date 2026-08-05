import { Button } from './Button';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-white/12 bg-black/20 p-8 text-center">
      <h3 className="text-base font-semibold text-spider-ink">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-spider-muted">{description}</p>
      {action ? (
        <Button className="mt-5" variant="secondary" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
