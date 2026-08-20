import type { Metadata } from 'next';
import { TreeSettings } from '@/components/tree/settings/tree-settings';

export const metadata: Metadata = {
  title: 'Settings',
  robots: { index: false, follow: false },
};

export default function TreeSettingsPage() {
  return <TreeSettings />;
}
