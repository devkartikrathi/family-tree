import type { Metadata } from 'next';
import { LegalPage } from '@/components/landing/legal-page';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What Legacy stores, who can see it, and how to take it back.',
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="20 August 2026">
      <p>
        Legacy holds family history — birth dates, addresses, the names of children. That is among
        the most sensitive data anyone will ever type into software. This page says plainly what
        happens to it.
      </p>

      <h2>What we store</h2>
      <ul>
        <li>
          <strong>Your account.</strong> Your name, email address and profile picture, mirrored from
          Clerk, our authentication provider. We never see or store your password.
        </li>
        <li>
          <strong>What you enter.</strong> The people, relationships, dates, places, notes and
          photographs you add to a tree.
        </li>
        <li>
          <strong>Activity.</strong> A record of which member made which change, and when.
        </li>
        <li>
          <strong>Place lookups.</strong> When you search for a place, the query is sent to
          OpenStreetMap&apos;s Nominatim service and the result is cached so we ask it less often.
          Place names are not linked to your account in that cache.
        </li>
      </ul>

      <h2>Who can see it</h2>
      <p>
        Only members of a tree. There is no public directory, no discovery, and no way to join by
        guessing an identifier — the only way in is an invite link created by an admin, which can be
        revoked, expired or capped. Each request is checked against your role on the server.
      </p>
      <p>
        If a tree has <strong>protected mode</strong> turned on, the dates, places, occupations and
        notes of living people are withheld from view-only members. That filtering happens on the
        server, before the data reaches the browser.
      </p>

      <h2>What we do not do</h2>
      <ul>
        <li>We do not sell or rent your data.</li>
        <li>We do not run advertising, and there are no third-party ad or tracking scripts.</li>
        <li>We do not use your family data to train anything.</li>
      </ul>

      <h2>Taking it with you</h2>
      <p>
        Any member can export a whole tree as GEDCOM, JSON or CSV at any time, from the tree&apos;s
        settings. GEDCOM is the standard format read by Ancestry, MyHeritage, Gramps and most other
        genealogy software, so the export is a real exit and not a gesture.
      </p>

      <h2>Deleting it</h2>
      <p>
        The creator of a tree can delete it. That removes the people, relationships, invites and
        activity history from the database. Members can leave a tree at any time, which removes their
        access and unlinks their account from the person record they had claimed.
      </p>

      <h2>Getting in touch</h2>
      <p>
        Questions about any of this, or a request to see or remove your data, can go to the person
        running this instance of Legacy.
      </p>
    </LegalPage>
  );
}
