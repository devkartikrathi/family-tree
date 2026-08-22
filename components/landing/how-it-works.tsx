'use client';

import { motion } from 'motion/react';
import { Map, Network, Users } from 'lucide-react';

const STEPS = [
  {
    icon: Users,
    step: 'One',
    title: 'Start with yourself',
    body: 'Add your name, then your parents, then theirs. Every person you add offers the next obvious question — who were their parents, who did they marry, who did they raise.',
    detail: 'No forms full of identifiers. You pick a person and say "add her mother".',
  },
  {
    icon: Network,
    step: 'Two',
    title: 'Invite the ones who remember',
    body: 'Send an invite link to the aunt who knows the dates and the cousin who has the photographs. They fill in what you can\'t, and you watch it appear.',
    detail: 'Roles decide who can edit. Every change is signed and reversible.',
  },
  {
    icon: Map,
    step: 'Three',
    title: 'See the shape of it',
    body: 'The tree lays itself out by generation. The map shows the towns your family left and the cities they landed in. The timeline puts a whole century in one view.',
    detail: 'Ask how anyone is related and get a plain answer: "your second cousin".',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="border-t border-border/70 px-4 py-16 sm:px-5 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-sm font-medium tracking-wide text-ochre uppercase">How it works</p>
          <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight sm:text-4xl md:text-[2.75rem]">
            A family tree is a group project.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            One person almost never has the whole picture. Legacy is built around the fact that the
            rest of it lives in other people&apos;s heads.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:mt-16 sm:gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.55, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="card-lift rounded-2xl border border-border bg-card p-6 sm:p-7"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-ochre-soft text-ochre">
                  <step.icon className="size-5" />
                </span>
                <span className="font-display text-sm font-medium text-muted-foreground">
                  {step.step}
                </span>
              </div>

              <h3 className="font-display mt-5 text-xl font-semibold tracking-tight">{step.title}</h3>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">{step.body}</p>

              <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground/80">
                {step.detail}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
