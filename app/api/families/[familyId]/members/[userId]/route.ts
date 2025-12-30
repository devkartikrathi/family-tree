import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { auth } from '@clerk/nextjs/server';
import { Role } from '@/lib/types';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ familyId: string; userId: string }> }
) {
    try {
        const { userId: currentUserId } = await auth();
        if (!currentUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const resolvedParams = await params;
        const { familyId, userId: targetUserId } = resolvedParams;
        const { role } = await request.json();

        // Check permission
        const members = await storage.getMembers(familyId);
        const currentUserMember = members.find(m => m.userId === currentUserId);

        if (currentUserMember?.role !== 'CREATOR') {
            return NextResponse.json({ error: 'Only the creator can change roles' }, { status: 403 });
        }

        // Update role
        const updated = await storage.updateMemberRole(familyId, targetUserId, role as Role);
        return NextResponse.json(updated);
    } catch (error) {
        console.error('Failed to update member role', error);
        return NextResponse.json({ error: 'Failed to update member role' }, { status: 500 });
    }
}
