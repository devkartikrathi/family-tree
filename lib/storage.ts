
import { AppNode, AppEdge, Family, FamilyGraph, FamilyNodeData, FamilyMember, Role } from './types';
import { prisma } from './db';
import { Prisma } from '@prisma/client';

export const storage = {

    async getFamilies(userId?: string): Promise<Family[]> {
        const whereClause = userId ? {
            OR: [
                { userId: userId },
                { members: { some: { userId } } }
            ]
        } : {};

        const families = await prisma.family.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            select: { id: true, name: true, createdAt: true, userId: true }
        });

        return families.map(f => ({
            ...f,
            createdAt: f.createdAt.toISOString()
        }));
    },

    async joinFamily(familyId: string, userId: string) {
        return await prisma.familyMember.create({
            data: {
                familyId,
                userId
            }
        });
    },

    async leaveFamily(familyId: string, userId: string) {

        return await prisma.familyMember.deleteMany({
            where: {
                familyId,
                userId
            }
        });
    },

    async getFamily(id: string): Promise<FamilyGraph | null> {
        const family = await prisma.family.findUnique({
            where: { id },
            include: {
                nodes: true,
                edges: true
            }
        });

        if (!family) return null;

        return {
            family: {
                id: family.id,
                name: family.name,
                createdAt: family.createdAt.toISOString()
            },
            nodes: family.nodes.map(n => ({
                id: n.id,
                position: { x: n.positionX, y: n.positionY },
                data: n.data as unknown as FamilyNodeData,
                type: 'familyNode'
            })),
            edges: family.edges.map(e => {

                const targetNode = family.nodes.find(n => n.id === e.target);
                const targetData = targetNode?.data as unknown as FamilyNodeData;
                const isPrimary = targetData?.primaryRootNodeId === e.source;

                return {
                    id: e.id,
                    source: e.source,
                    target: e.target,
                    type: 'smoothstep',
                    animated: !isPrimary,
                    style: isPrimary ? { stroke: '#000', strokeWidth: 1.5 } : { stroke: '#999', strokeDasharray: '5,5' },
                    data: { relationshipType: 'PARENT_OF' }
                };
            })
        };
    },

    async createFamily(name: string, userId?: string): Promise<Family> {
        const family = await prisma.family.create({
            data: {
                name,
                userId: userId || null
            }
        });

        if (userId) {
            await prisma.familyMember.create({
                data: {
                    familyId: family.id,
                    userId,
                    role: 'CREATOR'
                }
            });
        }

        return {
            ...family,
            createdAt: family.createdAt.toISOString()
        };
    },

    async getMembers(familyId: string): Promise<FamilyMember[]> {
        const members = await prisma.familyMember.findMany({
            where: { familyId },
            include: { user: { select: { email: true } } }
        });

        return members.map(m => ({
            id: m.id,
            userId: m.userId,
            familyId: m.familyId,
            role: m.role as Role,
            joinedAt: m.joinedAt.toISOString(),
            user: m.user ? { email: m.user.email } : undefined
        }));
    },

    async updateMemberRole(familyId: string, userId: string, role: Role) {
        return await prisma.familyMember.update({
            where: {
                userId_familyId: {
                    userId,
                    familyId
                }
            },
            data: { role }
        });
    },

    async updateFamily(id: string, name: string): Promise<Family> {
        const family = await prisma.family.update({
            where: { id },
            data: { name }
        });

        return {
            ...family,
            createdAt: family.createdAt.toISOString()
        };
    },


    async addNode(familyId: string, node: AppNode): Promise<AppNode> {
        const newNode = await prisma.familyNode.create({
            data: {
                id: node.id || undefined,
                familyId,
                data: node.data as Prisma.InputJsonValue,
                positionX: node.position.x,
                positionY: node.position.y
            }
        });

        return {
            id: newNode.id,
            position: { x: newNode.positionX, y: newNode.positionY },
            data: newNode.data as unknown as FamilyNodeData,
            type: 'familyNode'
        };
    },

    async updateNode(familyId: string, nodeId: string, updates: Partial<AppNode>): Promise<AppNode> {
        const dataUpdate: Prisma.FamilyNodeUpdateInput = {};

        if (updates.position) {
            dataUpdate.positionX = updates.position.x;
            dataUpdate.positionY = updates.position.y;
        }

        if (updates.data) {

            const existingNode = await prisma.familyNode.findUnique({
                where: { id: nodeId },
                select: { data: true }
            });

            if (existingNode) {
                const currentData = existingNode.data as unknown as FamilyNodeData;
                dataUpdate.data = {
                    ...currentData,
                    ...updates.data
                } as Prisma.InputJsonValue;
            } else {
                dataUpdate.data = updates.data as Prisma.InputJsonValue;
            }
        }

        const updated = await prisma.familyNode.update({
            where: { id: nodeId },
            data: dataUpdate
        });

        return {
            id: updated.id,
            position: { x: updated.positionX, y: updated.positionY },
            data: updated.data as unknown as FamilyNodeData,
            type: 'familyNode'
        };
    },

    async deleteNode(familyId: string, nodeId: string): Promise<void> {

        const familyNodes = await prisma.familyNode.findMany({
            where: { familyId }
        });

        const childrenToUpdate = familyNodes.filter(n => {
            const data = n.data as unknown as FamilyNodeData;
            return data.primaryRootNodeId === nodeId || data.spouseRootNodeId === nodeId;
        });

        for (const child of childrenToUpdate) {
            const data = child.data as unknown as FamilyNodeData;

            if (data.primaryRootNodeId === nodeId) {
                delete data.primaryRootNodeId;
            }
            if (data.spouseRootNodeId === nodeId) {
                delete data.spouseRootNodeId;
            }

            await prisma.familyNode.update({
                where: { id: child.id },
                data: { data: data as Prisma.InputJsonValue }
            });
        }


        await prisma.familyNode.delete({
            where: { id: nodeId }
        });
    },


    async addEdge(familyId: string, edge: AppEdge): Promise<AppEdge> {
        const newEdge = await prisma.familyEdge.create({
            data: {
                id: edge.id || undefined,
                familyId,
                source: edge.source,
                target: edge.target,
                relationshipType: 'PARENT_OF'
            }
        });


        const targetNode = await prisma.familyNode.findUnique({
            where: { id: edge.target },
            select: { data: true }
        });

        const targetData = targetNode?.data as unknown as FamilyNodeData;
        const isPrimary = targetData?.primaryRootNodeId === edge.source;

        return {
            id: newEdge.id,
            source: newEdge.source,
            target: newEdge.target,
            type: 'smoothstep',
            animated: !isPrimary,
            style: isPrimary ? { stroke: '#000', strokeWidth: 1.5 } : { stroke: '#999', strokeDasharray: '5,5' },
            data: { relationshipType: 'PARENT_OF' }
        };
    },

    async deleteEdge(familyId: string, edgeId: string): Promise<void> {
        await prisma.familyEdge.delete({
            where: { id: edgeId }
        });
    }
};
