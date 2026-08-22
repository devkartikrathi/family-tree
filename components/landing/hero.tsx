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
    <section className="relative overflow-hidden px-4 pt-10 pb-16 sm:px-5 sm:pt-24 sm:pb-24">
      {/* A warm wash behind the illustration, never behind the text. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-10%] right-[-20%] size-[26rem] rounded-full opacity-[0.5] blur-3xl sm:size-[46rem]"
        style={{
          background:
            'radial-gradient(circle, color-mix(in oklab, var(--ochre) 22%, transparent), transparent 68%)',
        }}
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 sm:gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="min-w-0">
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
            className="font-display mt-5 text-[2rem] leading-[1.08] font-semibold tracking-[-0.03em] min-[420px]:text-[2.5rem] sm:mt-6 sm:text-5xl sm:leading-[1.05] lg:text-6xl"
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
            className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg"
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
            className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row"
          >
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
            <Button asChild size="xl" variant="outline" className="w-full sm:w-auto">
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
          className="relative min-w-0"
        >
          <div className="rounded-3xl border border-border bg-card/80 p-3 shadow-[var(--shadow-float)] backdrop-blur-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3 px-1">
              <div className="min-w-0">
                <p className="font-display truncate text-sm font-semibold">The Rathi Family</p>
                <p className="truncate text-xs text-muted-foreground">3 generations · 8 people</p>
              </div>
              <div className="flex shrink-0 -space-x-1.5">
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
