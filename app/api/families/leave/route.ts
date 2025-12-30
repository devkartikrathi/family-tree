import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { auth } from '@clerk/nextjs/server';
import { logger } from '@/lib/logger';
import { JoinFamilySchema } from '@/lib/validations';

export async function POST(request: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const validated = JoinFamilySchema.safeParse(body);

        if (!validated.success) {
            return NextResponse.json({ error: validated.error.format() }, { status: 400 });
        }

        const familyId = validated.data.familyId;

        try {
            await storage.leaveFamily(familyId, userId);
            logger.info({ familyId, userId }, 'User left family');
            return NextResponse.json({ success: true }, { status: 200 });
        } catch (error) {
            throw error;
        }

    } catch (error) {
        logger.error({ err: error }, 'Leave family error');
        return NextResponse.json({ error: 'Failed to leave family' }, { status: 500 });
    }
}
