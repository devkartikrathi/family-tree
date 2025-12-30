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

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ familyId: string; userId: string }> }
) {
    try {
        const { userId: requesterId } = await auth();
        if (!requesterId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const resolvedParams = await params;
        const { familyId, userId: targetUserId } = resolvedParams;

        // Fetch all members to check roles
        const members = await storage.getMembers(familyId);

        const requester = members.find(m => m.userId === requesterId);
        const target = members.find(m => m.userId === targetUserId);

        if (!requester || !target) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }

        // Permission Logic
        const requesterRole = requester.role as Role;
        const targetRole = target.role as Role;

        // Cannot remove yourself
        if (requesterId === targetUserId) {
            return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
        }

        let canRemove = false;

        if (requesterRole === 'CREATOR') {
            canRemove = true; // Creator can remove anyone
        } else if (requesterRole === 'ADMIN') {
            // Admin can remove Members
            if (targetRole === 'MEMBER') {
                canRemove = true;
            }
        }

        if (!canRemove) {
            return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
        }

        await storage.removeMember(familyId, targetUserId);
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Failed to remove member', error);
        return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }
}
