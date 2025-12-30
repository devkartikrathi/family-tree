"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <h2 className="text-3xl font-bold mb-4">Something went wrong!</h2>
      <p className="text-muted-foreground mb-8 max-w-md text-center">
        An unexpected error occurred. We&apos;ve been notified and are looking into it.
      </p>
      <div className="flex gap-4">
        <Button onClick={() => reset()} variant="default" className="rounded-full">
          Try again
        </Button>
        <Button onClick={() => (window.location.href = "/")} variant="outline" className="rounded-full">
          Go Home
        </Button>
      </div>
    </div>
  );
}
