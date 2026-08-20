import type { Metadata, Viewport } from 'next';
import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'], display: 'swap' });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'], display: 'swap' });

/** Reserved for names, headlines and numbers — never for interface chrome. */
const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  display: 'swap',
  // Fraunces is a variable font: declaring axes means we take the whole range
  // rather than a fixed set of weights.
  axes: ['SOFT', 'WONK', 'opsz'],
});

const SITE = 'https://legacy.family';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'Legacy — keep your family, together',
    template: '%s · Legacy',
  },
  description:
    'A private, collaborative home for your family history. Build the tree, map where everyone came from, and invite the relatives who remember the rest.',
  applicationName: 'Legacy',
  keywords: ['family tree', 'genealogy', 'ancestry', 'family history', 'GEDCOM'],
  authors: [{ name: 'Legacy' }],
  openGraph: {
    type: 'website',
    siteName: 'Legacy',
    title: 'Legacy — keep your family, together',
    description:
      'A private, collaborative home for your family history. Invite-only, exportable, yours.',
    url: SITE,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Legacy — keep your family, together',
    description: 'A private, collaborative home for your family history.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbf8f3' },
    { media: '(prefers-color-scheme: dark)', color: '#17150f' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
