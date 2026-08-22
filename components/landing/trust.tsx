'use client';

import { motion } from 'motion/react';
import { Check, Download, Eye, KeyRound, ScrollText, Trash2 } from 'lucide-react';

const PROMISES = [
  {
    icon: KeyRound,
    title: 'Invite-only, always',
    body: 'There is no public directory and no way to join by guessing an address. The only door is a link an admin created, and they can revoke it, set it to expire, or cap how many times it works.',
  },
  {
    icon: Eye,
    title: 'Living people stay private',
    body: 'Turn on protected mode and the dates, places and life stories of anyone still living are withheld from view-only members. They still see the shape of the family — just not the private detail. Enforced on the server, not hidden in the interface.',
  },
  {
    icon: ScrollText,
    title: 'Every change is signed',
    body: 'Who added your grandmother, who corrected her birth year, who removed a link last Tuesday. The activity log is visible to admins and it is not editable by anyone.',
  },
  {
    icon: Download,
    title: 'Leave whenever you like',
    body: 'One click exports the entire tree as GEDCOM for other genealogy software, JSON for a faithful backup, or CSV for a spreadsheet. No export means no exit.',
  },
  {
    icon: Trash2,
    title: 'Delete means deleted',
    body: 'The creator can delete a tree outright — people, relationships, photos, history. You type its name to confirm, and then it is gone from the database.',
  },
];

const ROLES = [
  { name: 'Creator', can: 'Everything, including deleting the tree' },
  { name: 'Admin', can: 'Manage people, members, invites and settings' },
  { name: 'Editor', can: 'Add and edit people and relationships' },
  { name: 'Viewer', can: 'Look, and nothing more' },
];

export function Trust() {
  return (
    <section id="privacy" className="border-t border-border/70 bg-surface-sunken/40 px-4 py-16 sm:px-5 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-sm font-medium tracking-wide text-sage uppercase">Privacy</p>
          <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight sm:text-4xl md:text-[2.75rem]">
            You are handing us your family. We know what that means.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Birth dates, addresses, the names of children — this is the most personal data most
            people will ever type into anything. Here is exactly how it is handled.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:mt-14 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-10">
          <div className="grid gap-4 sm:grid-cols-2">
            {PROMISES.map((promise, index) => (
              <motion.div
                key={promise.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: (index % 2) * 0.08 }}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <promise.icon className="size-5 text-sage" />
                <h3 className="font-display mt-4 text-base font-semibold tracking-tight">
                  {promise.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{promise.body}</p>
              </motion.div>
            ))}
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-7">
              <h3 className="font-display text-lg font-semibold tracking-tight">
                Four roles, decided by you
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Permission is checked on the server for every single request — never only in the
                browser.
              </p>

              <ul className="mt-6 space-y-3.5">
                {ROLES.map((role) => (
                  <li key={role.name} className="flex gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-sage" />
                    <div>
                      <p className="text-sm font-medium">{role.name}</p>
                      <p className="text-sm text-muted-foreground">{role.can}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <p className="mt-6 border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">
                We do not sell data, run ads, or share anything with third parties. Sign-in is handled
                by Clerk, and everything travels over HTTPS.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
