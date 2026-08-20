'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { ThemeProvider, useTheme } from 'next-themes';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

/**
 * Clerk renders the first screen most people ever see. Matching it to the rest
 * of the product — same paper, same ochre, same corner radius — is the cheapest
 * trust signal there is.
 */
function ClerkWithTheme({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <ClerkProvider
      appearance={{
        baseTheme: isDark ? dark : undefined,
        variables: {
          colorPrimary: isDark ? '#d4a24c' : '#a8761f',
          colorBackground: isDark ? '#201d16' : '#ffffff',
          colorText: isDark ? '#f5f0e8' : '#1c1917',
          colorTextSecondary: isDark ? '#a79e90' : '#6b6259',
          colorInputBackground: isDark ? '#262219' : '#ffffff',
          borderRadius: '0.625rem',
          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
        },
        elements: {
          card: 'shadow-[var(--shadow-float)] border border-border',
          headerTitle: 'font-display',
          formButtonPrimary: 'font-medium',
          footerActionLink: 'text-[--ochre]',
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      position="bottom-center"
      closeButton
      richColors={false}
      toastOptions={{
        classNames: {
          toast:
            'font-sans rounded-xl border border-border bg-popover text-popover-foreground shadow-[var(--shadow-float)]',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground rounded-md',
          cancelButton: 'bg-muted text-muted-foreground rounded-md',
        },
      }}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ClerkWithTheme>
        <TooltipProvider delayDuration={280} skipDelayDuration={400}>
          {children}
          <ThemedToaster />
        </TooltipProvider>
      </ClerkWithTheme>
    </ThemeProvider>
  );
}
