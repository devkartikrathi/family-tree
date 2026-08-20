import { cn } from '@/lib/utils';

/**
 * A pedigree in miniature: two people joined, one below. The same three-node
 * figure the canvas draws thousands of times.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn('size-7', className)}
    >
      <path
        d="M10 10.5h12M16 10.5v8m0 0h-5.5v3m5.5-3h5.5v3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.45"
      />
      <circle cx="8.5" cy="10.5" r="3.75" fill="currentColor" />
      <circle cx="23.5" cy="10.5" r="3.75" fill="currentColor" opacity="0.55" />
      <circle cx="10.5" cy="24.5" r="3" fill="currentColor" opacity="0.8" />
      <circle cx="21.5" cy="24.5" r="3" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

export function Wordmark({ className, showMark = true }: { className?: string; showMark?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 text-foreground', className)}>
      {showMark && <LogoMark className="size-7 text-ochre" />}
      <span className="font-display text-[1.35rem] font-semibold tracking-tight">Legacy</span>
    </span>
  );
}
