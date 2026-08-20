'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { SignInButton, SignedIn, SignedOut } from '@clerk/nextjs';
import { ArrowRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TreePreview } from './tree-preview';

const rise = {
  hidden: { opacity: 0, y: 16 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function Hero() {
  return (
    <section className="relative overflow-hidden px-5 pt-16 pb-24 sm:pt-24">
      {/* A warm wash behind the illustration, never behind the text. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-10%] right-[-20%] size-[46rem] rounded-full opacity-[0.5] blur-3xl"
        style={{
          background:
            'radial-gradient(circle, color-mix(in oklab, var(--ochre) 22%, transparent), transparent 68%)',
        }}
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div>
          <motion.p
            variants={rise}
            initial="hidden"
            animate="show"
            custom={0}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground"
          >
            <Lock className="size-3 text-sage" />
            Invite-only by design
          </motion.p>

          <motion.h1
            variants={rise}
            initial="hidden"
            animate="show"
            custom={0.06}
            className="font-display mt-6 text-[2.75rem] leading-[1.05] font-semibold tracking-[-0.03em] sm:text-6xl"
          >
            Everyone remembers
            <br />
            a different piece.
            <br />
            <span className="text-ochre">Keep them together.</span>
          </motion.h1>

          <motion.p
            variants={rise}
            initial="hidden"
            animate="show"
            custom={0.12}
            className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground"
          >
            Legacy is a private home for your family history. Build the tree with the relatives who
            hold the missing names, see where everyone came from on a map, and keep it all somewhere
            it won&apos;t be lost.
          </motion.p>

          <motion.div
            variants={rise}
            initial="hidden"
            animate="show"
            custom={0.18}
            className="mt-9 flex flex-col gap-3 sm:flex-row"
          >
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
            <Button asChild size="xl" variant="outline">
              <a href="#how">See how it works</a>
            </Button>
          </motion.div>

          <motion.p
            variants={rise}
            initial="hidden"
            animate="show"
            custom={0.26}
            className="mt-6 text-sm text-muted-foreground"
          >
            Free while it&apos;s in the open. Export to GEDCOM whenever you like.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="rounded-3xl border border-border bg-card/80 p-4 shadow-[var(--shadow-float)] backdrop-blur-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between px-1">
              <div>
                <p className="font-display text-sm font-semibold">The Rathi Family</p>
                <p className="text-xs text-muted-foreground">3 generations · 8 people</p>
              </div>
              <div className="flex -space-x-1.5">
                {['bg-ochre', 'bg-sage', 'bg-clay'].map((tint) => (
                  <span
                    key={tint}
                    className={`size-5 rounded-full ring-2 ring-card ${tint}`}
                    title="A member viewing this tree"
                  />
                ))}
              </div>
            </div>
            <TreePreview />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
