import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { Wordmark } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

export function AppHeader({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl',
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-5">
        <Link href="/tree" className="rounded-lg" aria-label="Your trees">
          <Wordmark />
        </Link>

        <div className="flex flex-1 items-center justify-end gap-3">
          {children}
          <ThemeToggle className="hidden sm:inline-flex" />
          <UserButton
            appearance={{ elements: { avatarBox: 'size-8 ring-1 ring-border' } }}
            userProfileProps={{ appearance: { elements: { rootBox: 'w-full' } } }}
          />
        </div>
      </div>
    </header>
  );
}
