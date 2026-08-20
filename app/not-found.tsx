import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Wordmark } from '@/components/brand/logo';

export default function NotFound() {
  return (
    <div className="relative isolate grid min-h-[100dvh] place-items-center px-5">
      <div className="w-full max-w-md text-center">
        <Wordmark className="justify-center" />

        <p className="font-display mt-10 text-6xl font-semibold tracking-tight text-ochre">404</p>
        <h1 className="font-display mt-4 text-2xl font-semibold tracking-tight">
          There&apos;s nothing at this address
        </h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          The page may have moved, or the tree you were looking for is private — trees are visible
          only to the people invited into them.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild className="gap-2">
            <Link href="/tree">
              <ArrowLeft className="size-4" />
              Your trees
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">Back to the start</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
