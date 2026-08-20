import type { Metadata } from 'next';
import { LegalPage } from '@/components/landing/legal-page';

export const metadata: Metadata = {
  title: 'Terms',
  description: 'The short version of what you can expect from Legacy, and what it expects of you.',
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms" updated="20 August 2026">
      <p>
        The short version: use Legacy for your own family history, treat the living people in it with
        care, and keep your own backups. The rest is detail.
      </p>

      <h2>Your account</h2>
      <p>
        You need an account to use Legacy, and you are responsible for what happens under it. Invite
        links are keys to a private archive — send them only to people you want inside it.
      </p>

      <h2>Your content</h2>
      <p>
        The family history you enter is yours. You keep every right to it; we store and display it so
        that you and the members you invite can use it. Export it whenever you want.
      </p>

      <h2>Other people&apos;s details</h2>
      <p>
        A family tree records real, living people who did not sign up themselves. Add only what you
        are comfortable being seen by everyone you invite, use protected mode when a tree holds
        sensitive details about the living, and remove anything a relative asks you to remove.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not use Legacy to harass, stalk, impersonate or expose anyone.</li>
        <li>Do not upload material you have no right to share.</li>
        <li>Do not attempt to reach trees you were not invited to.</li>
      </ul>

      <h2>Availability</h2>
      <p>
        Legacy is provided as-is, without warranty. We aim to keep it running and intact, but you
        should keep your own exports — that is true of any service, and it is why the export button
        is one click away.
      </p>

      <h2>Ending it</h2>
      <p>
        You can delete your trees or leave them at any time. We may suspend accounts that break these
        terms, particularly where someone else&apos;s safety is involved.
      </p>
    </LegalPage>
  );
}
