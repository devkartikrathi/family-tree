import { z } from 'zod';

export const PersonMetadataSchema = z.object({
  name: z.string().min(1, "Name is required"),
  dateOfBirth: z.string().optional(),
  dateOfDeath: z.string().optional(),
  alive: z.boolean().optional(),
  notes: z.string().optional(),
  occupation: z.string().optional(),
  birthLocation: z.string().optional(),
  deathLocation: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  latitude: z.union([z.string(), z.number()]).optional(),
  longitude: z.union([z.string(), z.number()]).optional(),
});

export const FamilyNodeMetadataSchema = z.object({
  primary: PersonMetadataSchema,
  spouse: PersonMetadataSchema.optional(),
  familySurname: z.string().optional().default(""),
  primaryRootNodeId: z.string().optional(),
  spouseRootNodeId: z.string().optional(),
});

export const FamilyNodeDataSchema = FamilyNodeMetadataSchema.and(
  z.object({
    label: z.string().optional(),
  })
);

export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const AppNodeSchema = z.object({
  id: z.string().optional(),
  position: PositionSchema,
  data: FamilyNodeDataSchema,
  type: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  selected: z.boolean().optional(),
  dragging: z.boolean().optional(),
});

export const CreateNodeSchema = AppNodeSchema;

export const CreateFamilySchema = z.object({
  name: z.string().min(1, "Family name is required").max(100, "Name is too long"),
});

export const JoinFamilySchema = z.object({
  familyId: z.string().uuid("Invalid Family ID format"),
});

export const UpdateNodeSchema = AppNodeSchema.partial();

export const AppEdgeSchema = z.object({
  id: z.string().optional(),
  source: z.string(),
  target: z.string(),
  data: z.object({
    relationshipType: z.literal('PARENT_OF'),
  }).optional(),
  type: z.string().optional(),
});
