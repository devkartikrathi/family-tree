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
            await storage.joinFamily(familyId, userId);


            const family = await storage.getFamily(familyId);

            if (!family) {
                return NextResponse.json({ error: 'Family not found' }, { status: 404 });
            }

            logger.info({ familyId, userId }, 'User joined family');
            return NextResponse.json(family, { status: 200 });
        } catch (error) {
            const e = error as { code?: string };
            if (e.code === 'P2002') {
                return NextResponse.json({ error: 'Already a member of this family' }, { status: 409 });
            }
            if (e.code === 'P2003') {
                return NextResponse.json({ error: 'Family not found' }, { status: 404 });
            }
            throw error;
        }

    } catch (error) {
        logger.error({ err: error }, 'Join family error');
        return NextResponse.json({ error: 'Failed to join family' }, { status: 500 });
    }
}
