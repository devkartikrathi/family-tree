'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { SignInButton, SignedIn, SignedOut } from '@clerk/nextjs';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Closing() {
  return (
    <section id="open" className="border-t border-border/70 px-4 py-20 sm:px-5 sm:py-28">
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

        <h2 className="font-display text-[1.75rem] leading-[1.15] font-semibold tracking-tight min-[420px]:text-3xl sm:text-4xl sm:leading-[1.1] md:text-5xl">
          The people who remember won&apos;t always be here to ask.
        </h2>

        <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
          Start with one name. Add the two above it. Send the link to the person most likely to
          correct you — that is usually how the good stuff surfaces.
        </p>

        <div className="mt-9 flex flex-col justify-center gap-3 sm:mt-10 sm:flex-row">
          <SignedOut>
            <SignInButton mode="modal">
              <Button size="xl" className="w-full gap-2 sm:w-auto">
                Start your family tree
                <ArrowRight className="size-4" />
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Button asChild size="xl" className="w-full gap-2 sm:w-auto">
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
