import { cache } from 'react';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { ApiError } from './api';
import { atLeast } from '@/lib/domain/permissions';
import type { Role } from '@/lib/domain/types';

export interface SessionUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

/** Clerk's id for the caller, or null. Never touches the database. */
export const getUserId = cache(async (): Promise<string | null> => {
  const { userId } = await auth();
  return userId ?? null;
});

export async function requireUserId(): Promise<string> {
  const userId = await getUserId();
  if (!userId) throw ApiError.unauthorized();
  return userId;
}

/**
 * Mirrors the Clerk profile into our own `users` table. Called on the paths
 * that create rows pointing at a user, and once per visit to a tree, so the
 * members list can show real names without a round trip to Clerk.
 */
export const ensureUser = cache(async (): Promise<SessionUser | null> => {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? `${clerkUser.id}@unknown.local`;
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ').trim() ||
    clerkUser.username ||
    null;
  const image = clerkUser.imageUrl ?? null;

  const user = await prisma.user.upsert({
    where: { id: clerkUser.id },
    update: { email, name, image },
    create: { id: clerkUser.id, email, name, image },
    select: { id: true, name: true, email: true, image: true },
  });

  return user;
});

export async function requireUser(): Promise<SessionUser> {
  const user = await ensureUser();
  if (!user) throw ApiError.unauthorized();
  return user;
}

export interface TreeAccess {
  userId: string;
  role: Role;
  tree: {
    id: string;
    name: string;
    description: string | null;
    accent: string | null;
    protectLiving: boolean;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * The single gate in front of every tree-scoped route. Returns the caller's
 * role so handlers can make finer-grained decisions, and refuses to reveal
 * whether a tree exists to someone who isn't a member.
 */
export async function requireTreeAccess(treeId: string, minimum: Role = 'VIEWER'): Promise<TreeAccess> {
  const userId = await requireUserId();

  const membership = await prisma.membership.findUnique({
    where: { userId_treeId: { userId, treeId } },
    select: {
      role: true,
      tree: {
        select: {
          id: true,
          name: true,
          description: true,
          accent: true,
          protectLiving: true,
          createdById: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  // Deliberately a 404, not a 403: a stranger should not be able to probe
  // which tree ids exist.
  if (!membership) throw ApiError.notFound('That family tree is not available to you.');

  const role = membership.role as Role;
  if (!atLeast(role, minimum)) {
    throw ApiError.forbidden(
      minimum === 'EDITOR'
        ? 'You have view-only access to this tree. Ask an admin to make you an editor.'
        : 'Only admins can do that.',
    );
  }

  return { userId, role, tree: membership.tree };
}
