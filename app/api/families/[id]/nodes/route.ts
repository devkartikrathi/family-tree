import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { CreateNodeSchema } from '@/lib/validations';
import { AppNode } from '@/lib/types';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        const { id } = await params;

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
        const validation = CreateNodeSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid node data', details: validation.error.format() },
                { status: 400 }
            );
        }

        const newNode = await storage.addNode(id, validation.data as AppNode);
        logger.info({ familyId: id, nodeId: newNode.id, userId }, 'Node created');
        return NextResponse.json(newNode, { status: 201 });
    } catch (error) {
        logger.error({ err: error, familyId: (await params).id }, 'Failed to create node');
        return NextResponse.json({ error: 'Failed to create node' }, { status: 500 });
    }
}
