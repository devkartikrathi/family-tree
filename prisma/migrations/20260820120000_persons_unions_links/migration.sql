-- Legacy v1 → v2
--
-- v1 stored a *couple* per node with parent links duplicated in JSON and in an
-- edges table. v2 stores people, unions and parent→child links as first-class
-- rows. The two schemas share table and type names, so anything v1 left behind
-- is moved aside here — preserved as legacy_v1_* when it holds data, dropped
-- when it is empty — and `bun run migrate:legacy` copies it forward.

DO $$
DECLARE
  has_v1 boolean;
  has_rows boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'family_nodes'
  ) INTO has_v1;

  IF NOT has_v1 THEN
    RETURN;
  END IF;

  EXECUTE 'SELECT EXISTS (SELECT 1 FROM family_nodes LIMIT 1)' INTO has_rows;

  IF has_rows THEN
    ALTER TABLE "family_edges"   RENAME TO "legacy_v1_family_edges";
    ALTER TABLE "family_nodes"   RENAME TO "legacy_v1_family_nodes";
    ALTER TABLE "family_members" RENAME TO "legacy_v1_family_members";
    ALTER TABLE "families"       RENAME TO "legacy_v1_families";
    ALTER TABLE "users"          RENAME TO "legacy_v1_users";
    ALTER TYPE  "Role"           RENAME TO "legacy_v1_role";
    -- Renaming a table leaves its constraints named as they were, and v2 needs
    -- the name `users_pkey` back for its own users table.
    ALTER TABLE "legacy_v1_users" RENAME CONSTRAINT "users_pkey" TO "legacy_v1_users_pkey";
  ELSE
    DROP TABLE IF EXISTS "family_edges"   CASCADE;
    DROP TABLE IF EXISTS "family_nodes"   CASCADE;
    DROP TABLE IF EXISTS "family_members" CASCADE;
    DROP TABLE IF EXISTS "families"       CASCADE;
    DROP TABLE IF EXISTS "users"          CASCADE;
    DROP TYPE  IF EXISTS "Role"           CASCADE;
  END IF;
END $$;

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CREATOR', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "LayoutMode" AS ENUM ('AUTO', 'FREEFORM');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "UnionKind" AS ENUM ('MARRIAGE', 'PARTNERSHIP', 'OTHER');

-- CreateEnum
CREATE TYPE "UnionStatus" AS ENUM ('CURRENT', 'SEPARATED', 'DIVORCED', 'WIDOWED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ParentKind" AS ENUM ('BIOLOGICAL', 'ADOPTED', 'STEP', 'FOSTER', 'GUARDIAN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invites" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "note" TEXT,
    "maxUses" INTEGER,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "accent" TEXT DEFAULT 'ochre',
    "layoutMode" "LayoutMode" NOT NULL DEFAULT 'AUTO',
    "protectLiving" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persons" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "givenName" TEXT NOT NULL,
    "familyName" TEXT,
    "nickname" TEXT,
    "maidenName" TEXT,
    "sex" "Sex" NOT NULL DEFAULT 'UNKNOWN',
    "birthDate" TEXT,
    "birthPlace" TEXT,
    "birthLat" DOUBLE PRECISION,
    "birthLng" DOUBLE PRECISION,
    "isLiving" BOOLEAN NOT NULL DEFAULT true,
    "deathDate" TEXT,
    "deathPlace" TEXT,
    "deathLat" DOUBLE PRECISION,
    "deathLng" DOUBLE PRECISION,
    "residencePlace" TEXT,
    "residenceLat" DOUBLE PRECISION,
    "residenceLng" DOUBLE PRECISION,
    "occupation" TEXT,
    "bio" TEXT,
    "photoUrl" TEXT,
    "posX" DOUBLE PRECISION,
    "posY" DOUBLE PRECISION,
    "claimedByUserId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unions" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "kind" "UnionKind" NOT NULL DEFAULT 'MARRIAGE',
    "status" "UnionStatus" NOT NULL DEFAULT 'CURRENT',
    "startDate" TEXT,
    "endDate" TEXT,
    "place" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "union_partners" (
    "id" TEXT NOT NULL,
    "unionId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "union_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_child" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "unionId" TEXT,
    "kind" "ParentKind" NOT NULL DEFAULT 'BIOLOGICAL',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_child_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tree_events" (
    "id" SERIAL NOT NULL,
    "treeId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "action" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tree_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presence" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "presence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geocode_cache" (
    "query" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "geocode_cache_pkey" PRIMARY KEY ("query")
);

-- CreateIndex
CREATE INDEX "memberships_treeId_idx" ON "memberships"("treeId");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_userId_treeId_key" ON "memberships"("userId", "treeId");

-- CreateIndex
CREATE UNIQUE INDEX "invites_code_key" ON "invites"("code");

-- CreateIndex
CREATE INDEX "invites_treeId_idx" ON "invites"("treeId");

-- CreateIndex
CREATE INDEX "trees_createdById_idx" ON "trees"("createdById");

-- CreateIndex
CREATE INDEX "persons_treeId_idx" ON "persons"("treeId");

-- CreateIndex
CREATE INDEX "persons_treeId_familyName_idx" ON "persons"("treeId", "familyName");

-- CreateIndex
CREATE UNIQUE INDEX "persons_treeId_claimedByUserId_key" ON "persons"("treeId", "claimedByUserId");

-- CreateIndex
CREATE INDEX "unions_treeId_idx" ON "unions"("treeId");

-- CreateIndex
CREATE INDEX "union_partners_personId_idx" ON "union_partners"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "union_partners_unionId_personId_key" ON "union_partners"("unionId", "personId");

-- CreateIndex
CREATE INDEX "parent_child_treeId_idx" ON "parent_child"("treeId");

-- CreateIndex
CREATE INDEX "parent_child_parentId_idx" ON "parent_child"("parentId");

-- CreateIndex
CREATE INDEX "parent_child_unionId_idx" ON "parent_child"("unionId");

-- CreateIndex
CREATE UNIQUE INDEX "parent_child_childId_parentId_key" ON "parent_child"("childId", "parentId");

-- CreateIndex
CREATE INDEX "tree_events_treeId_id_idx" ON "tree_events"("treeId", "id");

-- CreateIndex
CREATE INDEX "presence_treeId_lastSeenAt_idx" ON "presence"("treeId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "presence_treeId_userId_key" ON "presence"("treeId", "userId");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_claimedByUserId_fkey" FOREIGN KEY ("claimedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unions" ADD CONSTRAINT "unions_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "union_partners" ADD CONSTRAINT "union_partners_unionId_fkey" FOREIGN KEY ("unionId") REFERENCES "unions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "union_partners" ADD CONSTRAINT "union_partners_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_child" ADD CONSTRAINT "parent_child_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_child" ADD CONSTRAINT "parent_child_childId_fkey" FOREIGN KEY ("childId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_child" ADD CONSTRAINT "parent_child_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_child" ADD CONSTRAINT "parent_child_unionId_fkey" FOREIGN KEY ("unionId") REFERENCES "unions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tree_events" ADD CONSTRAINT "tree_events_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presence" ADD CONSTRAINT "presence_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presence" ADD CONSTRAINT "presence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

