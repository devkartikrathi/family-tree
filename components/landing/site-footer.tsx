import Link from 'next/link';
import { Wordmark } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/theme-toggle';

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 px-4 py-10 sm:px-5 sm:py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Wordmark />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
            A private, collaborative home for your family history.
          </p>
        </div>

        <div className="flex flex-col gap-6 sm:items-end">
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/privacy" className="text-muted-foreground transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="text-muted-foreground transition-colors hover:text-foreground">
              Terms
            </Link>
            <Link href="/tree" className="text-muted-foreground transition-colors hover:text-foreground">
              Your trees
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Legacy
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
