'use client';

import { useEffect } from 'react';

/**
 * The last line of defence: the root layout itself failed, so this renders its
 * own <html> and cannot rely on any provider, font or stylesheet.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Fatal error at the root layout', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#fbf8f3',
          color: '#1c1917',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          padding: '1.5rem',
        }}
      >
        <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'ui-serif, Georgia, serif', fontSize: '1.5rem', margin: 0 }}>
            Legacy could not start
          </h1>
          <p style={{ marginTop: '0.75rem', lineHeight: 1.6, color: '#6b6259' }}>
            Your family data is untouched. Reloading usually clears this.
          </p>
          {error.digest && (
            <p style={{ marginTop: '1rem', fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem', color: '#6b6259' }}>
              Reference {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: '1.5rem',
              padding: '0.6rem 1.4rem',
              borderRadius: '0.625rem',
              border: 'none',
              background: '#1f1c17',
              color: '#fbf8f3',
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
