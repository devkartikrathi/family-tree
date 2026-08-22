'use client';

import { motion } from 'motion/react';
import {
  CalendarRange,
  FileDown,
  GitBranch,
  Heart,
  History,
  MapPin,
  Search,
  Sparkles,
} from 'lucide-react';

const FEATURES = [
  {
    icon: GitBranch,
    title: 'A tree that lays itself out',
    body: 'Generations line up, couples sit together, siblings hang beneath the parents who had them. Remarriages, half-siblings and adoptions are first-class, not workarounds.',
    span: 'md:col-span-2',
  },
  {
    icon: Heart,
    title: 'Real relationships',
    body: 'Ask how you are related to anyone and get the phrase your family would use.',
  },
  {
    icon: MapPin,
    title: 'A map of where you came from',
    body: 'Births, deaths and homes plotted together, with the lines each generation travelled.',
  },
  {
    icon: CalendarRange,
    title: 'A century in one view',
    body: 'Every birth, marriage and death on a single timeline you can scrub through.',
  },
  {
    icon: Search,
    title: 'Find anyone instantly',
    body: 'Press ⌘K and start typing a name, a place, a decade.',
  },
  {
    icon: History,
    title: 'Nothing happens quietly',
    body: 'Every edit is recorded with who made it and when — a family archive deserves an archive of its own.',
  },
  {
    icon: FileDown,
    title: 'Yours to take',
    body: 'Export the whole tree to GEDCOM, JSON or CSV in one click. Import from Ancestry or Gramps just as easily.',
    span: 'md:col-span-2',
  },
  {
    icon: Sparkles,
    title: 'Built for the long run',
    body: 'Dark mode, keyboard shortcuts, and a layout that stays readable at four hundred people.',
  },
];

export function Capabilities() {
  return (
    <section className="border-t border-border/70 px-4 py-16 sm:px-5 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-sm font-medium tracking-wide text-ochre uppercase">What you get</p>
          <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight sm:text-4xl md:text-[2.75rem]">
            Everything a family archive needs. Nothing it doesn&apos;t.
          </h2>
        </div>

        <div className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2 md:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: (index % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className={`card-lift rounded-2xl border border-border bg-card p-6 ${feature.span ?? ''}`}
            >
              <feature.icon className="size-5 text-ochre" />
              <h3 className="font-display mt-4 text-lg font-semibold tracking-tight">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
