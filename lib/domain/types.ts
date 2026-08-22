/** Serializable shapes exchanged between the API and the client. */

export type Role = 'CREATOR' | 'ADMIN' | 'EDITOR' | 'VIEWER';
export type Sex = 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';
export type UnionKind = 'MARRIAGE' | 'PARTNERSHIP' | 'OTHER';
export type UnionStatus = 'CURRENT' | 'SEPARATED' | 'DIVORCED' | 'WIDOWED' | 'UNKNOWN';
export type ParentKind = 'BIOLOGICAL' | 'ADOPTED' | 'STEP' | 'FOSTER' | 'GUARDIAN';

export interface Person {
  id: string;
  treeId: string;
  givenName: string;
  familyName: string | null;
  nickname: string | null;
  maidenName: string | null;
  sex: Sex;

  birthDate: string | null;
  birthPlace: string | null;
  birthLat: number | null;
  birthLng: number | null;

  isLiving: boolean;
  deathDate: string | null;
  deathPlace: string | null;
  deathLat: number | null;
  deathLng: number | null;

  residencePlace: string | null;
  residenceLat: number | null;
  residenceLng: number | null;

  occupation: string | null;
  bio: string | null;
  photoUrl: string | null;

  claimedByUserId: string | null;

  createdAt: string;
  updatedAt: string;

  /** Set when `protectLiving` withheld fields from this viewer. */
  redacted?: boolean;
}

export interface Union {
  id: string;
  treeId: string;
  kind: UnionKind;
  status: UnionStatus;
  startDate: string | null;
  endDate: string | null;
  place: string | null;
  note: string | null;
  partnerIds: string[];
}

export interface ParentLink {
  id: string;
  treeId: string;
  childId: string;
  parentId: string;
  unionId: string | null;
  kind: ParentKind;
}

export interface Tree {
  id: string;
  name: string;
  description: string | null;
  accent: string | null;
  protectLiving: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface TreeSummary extends Tree {
  role: Role;
  personCount: number;
  memberCount: number;
  lastActivityAt: string | null;
}

export interface Member {
  id: string;
  userId: string;
  treeId: string;
  role: Role;
  joinedAt: string;
  user: { name: string | null; email: string; image: string | null };
  online?: boolean;
  personId?: string | null;
}

export interface Invite {
  id: string;
  treeId: string;
  code: string;
  role: Role;
  note: string | null;
  maxUses: number | null;
  useCount: number;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  createdBy: { name: string | null; image: string | null } | null;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'EXHAUSTED';
}

export interface ActivityEvent {
  id: number;
  action: string;
  subject: string;
  actorId: string | null;
  actorName: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

export interface TreeGraph {
  tree: Tree;
  role: Role;
  persons: Person[];
  unions: Union[];
  links: ParentLink[];
  /** Cursor into the event log; the live stream resumes from here. */
  cursor: number;
}

export interface PresenceUser {
  userId: string;
  name: string | null;
  image: string | null;
  lastSeenAt: string;
}
