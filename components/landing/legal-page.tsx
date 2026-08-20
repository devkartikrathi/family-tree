import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-5 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back
        </Link>

        <h1 className="font-display mt-6 text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>

        <div
          className="mt-10 space-y-6 text-[0.95rem] leading-relaxed text-muted-foreground
            [&_a]:text-ochre [&_a]:underline [&_a]:underline-offset-4
            [&_h2]:font-display [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground
            [&_li]:pl-1 [&_strong]:font-medium [&_strong]:text-foreground
            [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5"
        >
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
