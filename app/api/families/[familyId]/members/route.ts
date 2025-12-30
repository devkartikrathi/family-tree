import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { auth } from '@clerk/nextjs/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ familyId: string }> }
) {
    try {
        const resolvedParams = await params;
        const familyId = resolvedParams.familyId;
        const members = await storage.getMembers(familyId);
        return NextResponse.json(members);
    } catch (error) {
        console.error('Failed to fetch members', error);
        return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ familyId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const resolvedParams = await params;
        const familyId = resolvedParams.familyId;

        // Check if already member
        const members = await storage.getMembers(familyId);
        if (members.some(m => m.userId === userId)) {
            return NextResponse.json({ message: 'Already a member' }, { status: 200 });
        }

        // Join
        const member = await storage.joinFamily(familyId, userId);
        return NextResponse.json(member, { status: 201 });
    } catch (error) {
        console.error('Failed to join family', error);
        return NextResponse.json({ error: 'Failed to join family' }, { status: 500 });
    }
}
