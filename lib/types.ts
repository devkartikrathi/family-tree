import { Node, Edge } from '@xyflow/react';



export interface Family {
    id: string;
    name: string;
    createdAt: string;
    userId?: string | null;
}

export type Role = 'CREATOR' | 'ADMIN' | 'MEMBER';

export interface FamilyMember {
    id: string;
    userId: string;
    familyId: string;
    role: Role;
    joinedAt: string;
    user?: {
        email: string;
        name: string | null;
        image: string | null;
    };
}

export interface PersonMetadata {
    dateOfBirth?: string;
    dateOfDeath?: string;
    alive?: boolean;
    birthLocation?: string;
    deathLocation?: string;
    occupation?: string;
    notes?: string;
}

export interface FamilyNodeMetadata {
    primary: PersonMetadata & { name: string };
    spouse?: PersonMetadata & { name: string };
    familySurname: string;
    primaryRootNodeId?: string;
    spouseRootNodeId?: string;
}


export type FamilyNodeData = FamilyNodeMetadata & {
    label?: string;
    [key: string]: unknown;
};


export type AppNode = Node<FamilyNodeData>;

export interface FamilyEdgeData {
    relationshipType: 'PARENT_OF';
    [key: string]: unknown;
}


export type AppEdge = Edge<FamilyEdgeData>;


export interface FamilyGraph {
    family: Family;
    nodes: AppNode[];
    edges: AppEdge[];
}
