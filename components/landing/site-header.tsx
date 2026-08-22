'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { ArrowRight, Menu, X } from 'lucide-react';
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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // A menu left open behind a resize to desktop would trap the page in the
  // mobile layout's scroll lock.
  useEffect(() => {
    if (!menuOpen) return;
    const media = window.matchMedia('(min-width: 768px)');
    const close = () => setMenuOpen(false);
    media.addEventListener('change', close);
    return () => media.removeEventListener('change', close);
  }, [menuOpen]);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        scrolled || menuOpen ? 'glass border-b border-border/70' : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-5">
        <Link
          href="/"
          className="shrink-0 rounded-lg"
          aria-label="Legacy home"
          onClick={() => setMenuOpen(false)}
        >
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

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2 md:ml-0">
          <ThemeToggle className="hidden sm:inline-flex" />

          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                Sign in
              </Button>
            </SignInButton>
            <SignInButton mode="modal">
              <Button size="sm" className="gap-1.5">
                <span className="sm:hidden">Start</span>
                <span className="hidden sm:inline">Start a tree</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/tree">
                <span className="sm:hidden">Trees</span>
                <span className="hidden sm:inline">Your trees</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
            <UserButton />
          </SignedIn>

          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div id="site-menu" className="border-t border-border/70 md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-2 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </a>
            ))}

            <div className="mt-1 flex items-center justify-between border-t border-border/70 px-2 pt-3 pb-2">
              <span className="text-sm text-muted-foreground">Theme</span>
              <ThemeToggle />
            </div>

            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="outline" className="mb-2 w-full">
                  Sign in
                </Button>
              </SignInButton>
            </SignedOut>
          </nav>
        </div>
      )}
    </header>
  );
}
