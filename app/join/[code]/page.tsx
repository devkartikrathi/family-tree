import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/server/auth';
import { inviteStatus } from '@/lib/server/trees';
import { AcceptInvite } from '@/components/tree/accept-invite';
import { Wordmark } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = {
  title: 'You have been invited',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const REASONS: Record<string, string> = {
  REVOKED: 'This invite has been revoked by an admin.',
  EXPIRED: 'This invite has expired.',
  EXHAUSTED: 'This invite has already been used the maximum number of times.',
};

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await requireUser();

  const invite = await prisma.invite.findUnique({
    where: { code: decodeURIComponent(code).trim().toUpperCase() },
    include: {
      tree: {
        select: {
          id: true,
          name: true,
          description: true,
          _count: { select: { persons: true, members: true } },
        },
      },
      createdBy: { select: { name: true, image: true } },
    },
  });

  if (!invite) notFound();

  const status = inviteStatus(invite);
  const membership = await prisma.membership.findUnique({
    where: { userId_treeId: { userId: user.id, treeId: invite.treeId } },
    select: { role: true },
  });

  return (
    <div className="relative isolate flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between gap-3 px-4 sm:px-5">
        <Link href="/" aria-label="Legacy home">
          <Wordmark />
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-5 sm:py-10">
        <AcceptInvite
          code={invite.code}
          status={status}
          reason={REASONS[status] ?? null}
          role={invite.role}
          note={invite.note}
          tree={{
            id: invite.tree.id,
            name: invite.tree.name,
            description: invite.tree.description,
            personCount: invite.tree._count.persons,
            memberCount: invite.tree._count.members,
          }}
          invitedBy={invite.createdBy}
          alreadyMember={Boolean(membership)}
        />
      </main>

      <footer className="px-4 py-8 text-center sm:px-5">
        <Link
          href="/tree"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to your trees
        </Link>
      </footer>
    </div>
  );
}
