import type { ActivityEvent } from './types';

/** Human sentence for the activity feed. */
export function describeEvent(event: ActivityEvent): string {
  const who = event.actorName ?? 'Someone';
  const what = event.subject;

  switch (event.action) {
    case 'tree.created': return `${who} started this tree`;
    case 'tree.updated': return `${who} updated the tree settings`;
    case 'tree.imported': return `${who} imported ${what}`;
    case 'person.created': return `${who} added ${what}`;
    case 'person.updated': return `${who} updated ${what}`;
    case 'person.deleted': return `${who} removed ${what}`;
    case 'person.claimed': return `${who} linked their account to ${what}`;
    case 'union.created': return `${who} recorded a marriage: ${what}`;
    case 'union.updated': return `${who} updated the marriage of ${what}`;
    case 'union.deleted': return `${who} removed the marriage of ${what}`;
    case 'link.created': return `${who} connected ${what}`;
    case 'link.updated': return `${who} changed how ${what} are connected`;
    case 'link.deleted': return `${who} disconnected ${what}`;
    case 'member.joined': return `${what} joined the tree`;
    case 'member.left': return `${what} left the tree`;
    case 'member.removed': return `${who} removed ${what}`;
    case 'member.role_changed': return `${who} changed ${what}'s role`;
    case 'invite.created': return `${who} created an invite link`;
    case 'invite.revoked': return `${who} revoked an invite link`;
    default: return `${who} made a change`;
  }
}
