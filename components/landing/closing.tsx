'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { SignInButton, SignedIn, SignedOut } from '@clerk/nextjs';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Closing() {
  return (
    <section id="open" className="border-t border-border/70 px-5 py-28">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-2xl text-center"
      >
        <div className="rule-ornament mb-8">
          <span className="text-xs tracking-[0.2em] uppercase">Begin</span>
        </div>

        <h2 className="font-display text-4xl leading-[1.1] font-semibold tracking-tight sm:text-5xl">
          The people who remember won&apos;t always be here to ask.
        </h2>

        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
          Start with one name. Add the two above it. Send the link to the person most likely to
          correct you — that is usually how the good stuff surfaces.
        </p>

        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <SignedOut>
            <SignInButton mode="modal">
              <Button size="xl" className="gap-2">
                Start your family tree
                <ArrowRight className="size-4" />
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Button asChild size="xl" className="gap-2">
              <Link href="/tree">
                Open your trees
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </SignedIn>
        </div>
      </motion.div>
    </section>
  );
}
