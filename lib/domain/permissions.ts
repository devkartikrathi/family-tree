import type { Role } from '@/lib/domain/types';

/**
 * One table, consulted on the server for every mutation. The client mirrors it
 * to grey out buttons, but the client's answer is never load-bearing.
 */
const RANK: Record<Role, number> = { VIEWER: 0, EDITOR: 1, ADMIN: 2, CREATOR: 3 };

export function rankOf(role: Role): number {
  return RANK[role] ?? -1;
}

export function atLeast(role: Role, minimum: Role): boolean {
  return rankOf(role) >= rankOf(minimum);
}

export const can = {
  view: (role: Role) => rankOf(role) >= RANK.VIEWER,
  editPeople: (role: Role) => rankOf(role) >= RANK.EDITOR,
  manageMembers: (role: Role) => rankOf(role) >= RANK.ADMIN,
  manageSettings: (role: Role) => rankOf(role) >= RANK.ADMIN,
  viewAudit: (role: Role) => rankOf(role) >= RANK.ADMIN,
  deleteTree: (role: Role) => role === 'CREATOR',
  transferOwnership: (role: Role) => role === 'CREATOR',
};

export const ROLE_LABELS: Record<Role, { label: string; description: string }> = {
  CREATOR: { label: 'Creator', description: 'Owns the tree. Can delete it or hand it over.' },
  ADMIN: { label: 'Admin', description: 'Manages people, members, invites and settings.' },
  EDITOR: { label: 'Editor', description: 'Adds and edits people and relationships.' },
  VIEWER: { label: 'Viewer', description: 'Can look, and nothing more.' },
};

/**
 * When a tree turns on `protectLiving`, viewers see that a living person
 * exists — their name and place in the tree — but not the private detail.
 * Editors and admins are trusted with the whole record.
 */
export function shouldRedactLiving(role: Role, protectLiving: boolean, isLiving: boolean): boolean {
  return protectLiving && isLiving && !atLeast(role, 'EDITOR');
}
