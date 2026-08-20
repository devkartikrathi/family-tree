'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { ArrowRight } from 'lucide-react';
import { Wordmark } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '#how', label: 'How it works' },
  { href: '#privacy', label: 'Privacy' },
  { href: '#open', label: 'Your data' },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        scrolled ? 'glass border-b border-border/70' : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
        <Link href="/" className="rounded-lg" aria-label="Legacy home">
          <Wordmark />
        </Link>

        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <ThemeToggle className="hidden sm:inline-flex" />
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </SignInButton>
            <SignInButton mode="modal">
              <Button size="sm" className="gap-1.5">
                Start a tree
                <ArrowRight className="size-3.5" />
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/tree">
                Your trees
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
            <UserButton />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
