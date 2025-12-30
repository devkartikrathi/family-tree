import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(
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
            include: {
                members: {
                    where: { userId }
                }
            }
        });

        if (!family) {
            return NextResponse.json({ error: 'Family not found' }, { status: 404 });
        }

        const isOwner = family.userId === userId;
        const isMember = family.members.length > 0;

        if (!isOwner && !isMember) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }


        const graph = await storage.getFamily(id);

        if (!graph) {
            return NextResponse.json({ error: 'Family not found' }, { status: 404 });
        }

        return NextResponse.json(graph);

    } catch (error) {
        logger.error({ err: error, familyId: (await params).id }, 'Get family error');
        return NextResponse.json({ error: 'Failed to fetch family' }, { status: 500 });
    }
}

export async function DELETE(
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
            where: { id }
        });

        if (!family) {
            return NextResponse.json({ error: 'Family not found' }, { status: 404 });
        }

        if (family.userId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.family.delete({
            where: { id }
        });

        logger.info({ familyId: id, userId }, 'Family deleted');
        return NextResponse.json({ success: true });

    } catch (error) {
        logger.error({ err: error, familyId: (await params).id }, 'Delete family error');
        return NextResponse.json({ error: 'Failed to delete family' }, { status: 500 });
    }
}
