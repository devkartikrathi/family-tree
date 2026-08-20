'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Wordmark } from '@/components/brand/logo';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled error in the app shell', error);
  }, [error]);

  return (
    <div className="relative isolate grid min-h-[100dvh] place-items-center px-5">
      <div className="w-full max-w-md text-center">
        <Wordmark className="justify-center" />

        <h1 className="font-display mt-10 text-2xl font-semibold tracking-tight">
          Something broke on our side
        </h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Nothing you had saved is affected — every change is written the moment you make it. Try
          again, and if it keeps happening, let us know.
        </p>

        {error.digest && (
          <p className="mt-4 font-mono text-xs text-muted-foreground">Reference {error.digest}</p>
        )}

        <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="size-4" />
            Try again
          </Button>
          <Button asChild variant="ghost">
            <Link href="/tree">Back to your trees</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
