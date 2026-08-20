import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** Empty is a state worth designing: it is the first thing every new tree shows. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('mx-auto flex max-w-sm flex-col items-center px-6 py-14 text-center', className)}>
      {icon && (
        <div className="mb-5 grid size-14 place-items-center rounded-2xl border border-border bg-card text-muted-foreground shadow-[var(--shadow-paper)]">
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg font-semibold tracking-tight">{title}</h3>
      {description && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
