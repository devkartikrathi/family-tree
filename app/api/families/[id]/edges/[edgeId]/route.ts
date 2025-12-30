import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; edgeId: string }> }
) {
    try {
        const { userId } = await auth();
        const { id, edgeId } = await params;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }


        const family = await prisma.family.findUnique({
            where: { id },
            include: { members: { where: { userId } } }
        });

        if (!family) {
            return NextResponse.json({ error: 'Family not found' }, { status: 404 });
        }

        if (family.userId !== userId && family.members.length === 0) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await storage.deleteEdge(id, edgeId);
        logger.info({ familyId: id, edgeId, userId }, 'Edge deleted');
        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error({ err: error, familyId: (await params).id, edgeId: (await params).edgeId }, 'Failed to delete edge');
        return NextResponse.json({ error: 'Failed to delete edge' }, { status: 500 });
    }
}
