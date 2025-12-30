-- CreateTable
CREATE TABLE "families" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_nodes" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "positionX" DOUBLE PRECISION NOT NULL,
    "positionY" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "family_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_edges" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_edges_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "family_nodes" ADD CONSTRAINT "family_nodes_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_edges" ADD CONSTRAINT "family_edges_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_edges" ADD CONSTRAINT "family_edges_source_fkey" FOREIGN KEY ("source") REFERENCES "family_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_edges" ADD CONSTRAINT "family_edges_target_fkey" FOREIGN KEY ("target") REFERENCES "family_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
