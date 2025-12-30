import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { UpdateNodeSchema } from '@/lib/validations';
import { AppNode } from '@/lib/types';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
    try {
        const { userId } = await auth();
        const { id, nodeId } = await params;

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

        const body = await request.json();
        const validation = UpdateNodeSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid update data', details: validation.error.format() },
                { status: 400 }
            );
        }

        const updatedNode = await storage.updateNode(id, nodeId, validation.data as Partial<AppNode>);
        logger.info({ familyId: id, nodeId, userId }, 'Node updated');
        return NextResponse.json(updatedNode);
    } catch (error) {
        logger.error({ err: error, familyId: (await params).id, nodeId: (await params).nodeId }, 'Failed to update node');
        return NextResponse.json({ error: 'Failed to update node' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
    try {
        const { userId } = await auth();
        const { id, nodeId } = await params;

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

        await storage.deleteNode(id, nodeId);
        logger.info({ familyId: id, nodeId, userId }, 'Node deleted');
        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error({ err: error, familyId: (await params).id, nodeId: (await params).nodeId }, 'Failed to delete node');
        return NextResponse.json({ error: 'Failed to delete node' }, { status: 500 });
    }
}
