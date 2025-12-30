"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

export default function GlobalError({
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
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen bg-white text-slate-900 p-4">
          <h2 className="text-3xl font-bold mb-4">Critical Error</h2>
          <p className="mb-8">A critical error occurred. Please try refreshing the page.</p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-slate-900 text-white rounded-full"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
