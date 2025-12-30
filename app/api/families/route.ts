import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { auth } from '@clerk/nextjs/server';
import { logger } from '@/lib/logger';
import { CreateFamilySchema } from '@/lib/validations';

export async function GET() {
    try {
        const { userId } = await auth();
        const families = await storage.getFamilies(userId || undefined);
        return NextResponse.json(families);
    } catch (error) {
        logger.error({ err: error }, 'Failed to fetch families');
        return NextResponse.json({ error: 'Failed to fetch families' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const validated = CreateFamilySchema.safeParse(body);

        if (!validated.success) {
            return NextResponse.json({ error: validated.error.format() }, { status: 400 });
        }

        const family = await storage.createFamily(validated.data.name, userId);
        logger.info({ familyId: family.id, userId }, 'Family created');
        return NextResponse.json(family, { status: 201 });
    } catch (error) {
        logger.error({ err: error }, 'Failed to create family');
        return NextResponse.json({ error: 'Failed to create family' }, { status: 500 });
    }
}
