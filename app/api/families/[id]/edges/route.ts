import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { AppEdgeSchema } from '@/lib/validations';
import { AppEdge } from '@/lib/types';
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
        const validation = AppEdgeSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid edge data', details: validation.error.format() },
                { status: 400 }
            );
        }

        const newEdge = await storage.addEdge(id, validation.data as AppEdge);
        logger.info({ familyId: id, edgeId: newEdge.id, userId }, 'Edge created');
        return NextResponse.json(newEdge, { status: 201 });
    } catch (error) {
        logger.error({ err: error, familyId: (await params).id }, 'Failed to create edge');
        return NextResponse.json({ error: 'Failed to create edge' }, { status: 500 });
    }
}
