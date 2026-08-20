import { z } from 'zod';
import { isValidPartialDate } from './dates';

/** "1948", "1948-03" and "1948-03-12" are all legitimate genealogical dates. */
const partialDate = z
  .string()
  .trim()
  .max(10)
  .refine(isValidPartialDate, { message: 'Use YYYY, YYYY-MM or YYYY-MM-DD' });

const optionalDate = partialDate.or(z.literal('')).nullish();
const optionalText = (max: number) => z.string().trim().max(max).or(z.literal('')).nullish();
const latitude = z.number().min(-90).max(90).nullish();
const longitude = z.number().min(-180).max(180).nullish();

export const RoleSchema = z.enum(['CREATOR', 'ADMIN', 'EDITOR', 'VIEWER']);
export const AssignableRoleSchema = z.enum(['ADMIN', 'EDITOR', 'VIEWER']);
export const SexSchema = z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']);
export const UnionKindSchema = z.enum(['MARRIAGE', 'PARTNERSHIP', 'OTHER']);
export const UnionStatusSchema = z.enum(['CURRENT', 'SEPARATED', 'DIVORCED', 'WIDOWED', 'UNKNOWN']);
export const ParentKindSchema = z.enum(['BIOLOGICAL', 'ADOPTED', 'STEP', 'FOSTER', 'GUARDIAN']);
export const LayoutModeSchema = z.enum(['AUTO', 'FREEFORM']);

// ---------------------------------------------------------------------------
// Tree
// ---------------------------------------------------------------------------

export const CreateTreeSchema = z.object({
  name: z.string().trim().min(1, 'Give your tree a name').max(80),
  description: optionalText(500),
});

export const UpdateTreeSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    description: optionalText(500),
    accent: z.enum(['ochre', 'sage', 'clay', 'indigo', 'plum']).optional(),
    layoutMode: LayoutModeSchema.optional(),
    protectLiving: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update' });

// ---------------------------------------------------------------------------
// Person
// ---------------------------------------------------------------------------

export const PersonInputSchema = z.object({
  givenName: z.string().trim().min(1, 'A first name is required').max(80),
  familyName: optionalText(80),
  nickname: optionalText(60),
  maidenName: optionalText(80),
  sex: SexSchema.default('UNKNOWN'),

  birthDate: optionalDate,
  birthPlace: optionalText(160),
  birthLat: latitude,
  birthLng: longitude,

  isLiving: z.boolean().default(true),
  deathDate: optionalDate,
  deathPlace: optionalText(160),
  deathLat: latitude,
  deathLng: longitude,

  residencePlace: optionalText(160),
  residenceLat: latitude,
  residenceLng: longitude,

  occupation: optionalText(120),
  bio: optionalText(4000),
  photoUrl: z.string().url().max(2000).or(z.literal('')).nullish(),
});

export const UpdatePersonSchema = PersonInputSchema.partial().extend({
  posX: z.number().finite().nullish(),
  posY: z.number().finite().nullish(),
});

/**
 * Creating a person is almost always creating a *relationship* too — "add her
 * mother", "add their third child". Accepting the relationship in the same
 * request is what removes UUID-pasting from the product.
 */
export const CreatePersonSchema = PersonInputSchema.extend({
  relateTo: z
    .object({
      personId: z.string().uuid(),
      as: z.enum(['parent', 'child', 'partner', 'sibling']),
      /** For 'child': attribute to this union so siblings group correctly. */
      unionId: z.string().uuid().nullish(),
      parentKind: ParentKindSchema.default('BIOLOGICAL'),
      unionKind: UnionKindSchema.default('MARRIAGE'),
    })
    .nullish(),
});

export const MovePersonSchema = z.object({
  posX: z.number().finite(),
  posY: z.number().finite(),
});

export const ClaimPersonSchema = z.object({ claim: z.boolean() });

// ---------------------------------------------------------------------------
// Relationships
// ---------------------------------------------------------------------------

export const CreateUnionSchema = z.object({
  partnerIds: z.array(z.string().uuid()).min(2, 'Pick two people').max(2),
  kind: UnionKindSchema.default('MARRIAGE'),
  status: UnionStatusSchema.default('CURRENT'),
  startDate: optionalDate,
  endDate: optionalDate,
  place: optionalText(160),
  note: optionalText(1000),
});

export const UpdateUnionSchema = z.object({
  kind: UnionKindSchema.optional(),
  status: UnionStatusSchema.optional(),
  startDate: optionalDate,
  endDate: optionalDate,
  place: optionalText(160),
  note: optionalText(1000),
});

export const CreateLinkSchema = z.object({
  parentId: z.string().uuid(),
  childId: z.string().uuid(),
  unionId: z.string().uuid().nullish(),
  kind: ParentKindSchema.default('BIOLOGICAL'),
});

export const UpdateLinkSchema = z.object({
  kind: ParentKindSchema.optional(),
  unionId: z.string().uuid().nullish(),
});

// ---------------------------------------------------------------------------
// Membership & invites
// ---------------------------------------------------------------------------

export const CreateInviteSchema = z.object({
  role: AssignableRoleSchema.default('VIEWER'),
  note: optionalText(120),
  maxUses: z.number().int().min(1).max(500).nullish(),
  expiresInDays: z.number().int().min(1).max(365).nullish(),
});

export const UpdateMemberSchema = z.object({ role: AssignableRoleSchema });

export const TransferOwnershipSchema = z.object({ userId: z.string().min(1) });

export const DeleteTreeSchema = z.object({
  confirm: z.string(),
});

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export const GeocodeQuerySchema = z.object({
  q: z.string().trim().min(2).max(160),
});

export const ImportSchema = z.object({
  format: z.enum(['legacy-json']).default('legacy-json'),
  data: z.unknown(),
});

export type CreateTreeInput = z.infer<typeof CreateTreeSchema>;
export type CreatePersonInput = z.infer<typeof CreatePersonSchema>;
export type UpdatePersonInput = z.infer<typeof UpdatePersonSchema>;
export type CreateUnionInput = z.infer<typeof CreateUnionSchema>;
export type CreateLinkInput = z.infer<typeof CreateLinkSchema>;
export type CreateInviteInput = z.infer<typeof CreateInviteSchema>;
