import Image from 'next/image';
import { cn } from '@/lib/utils';
import { initialsOf } from '@/lib/domain/graph';
import type { Person, Sex } from '@/lib/domain/types';

/**
 * Portraits carry the whole emotional weight of a family tree, so the fallback
 * has to be good too: warm monograms tinted from the person's own name, never
 * a grey silhouette.
 */
const TINTS = [
  'bg-ochre-soft text-ochre',
  'bg-sage-soft text-sage',
  'bg-clay-soft text-clay',
  'bg-secondary text-secondary-foreground',
];

function tintFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return TINTS[hash % TINTS.length];
}

const SIZES = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-base',
  xl: 'size-20 text-xl',
  '2xl': 'size-28 text-3xl',
} as const;

interface PersonAvatarProps {
  person: Pick<Person, 'givenName' | 'familyName' | 'photoUrl' | 'isLiving'> & { sex?: Sex };
  size?: keyof typeof SIZES;
  className?: string;
  /** Deceased portraits get a gentle desaturation — a quiet mark of respect. */
  dimDeceased?: boolean;
}

export function PersonAvatar({
  person,
  size = 'md',
  className,
  dimDeceased = true,
}: PersonAvatarProps) {
  const initials = initialsOf(person);
  const deceased = dimDeceased && person.isLiving === false;

  return (
    <span
      className={cn(
        'relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-medium select-none',
        'ring-1 ring-black/5 dark:ring-white/10',
        SIZES[size],
        !person.photoUrl && tintFor(`${person.givenName}${person.familyName ?? ''}`),
        className,
      )}
    >
      {person.photoUrl ? (
        <Image
          src={person.photoUrl}
          alt=""
          fill
          sizes="112px"
          unoptimized
          className={cn('object-cover', deceased && 'saturate-[0.55]')}
        />
      ) : (
        <span className="font-display leading-none">{initials}</span>
      )}
    </span>
  );
}
