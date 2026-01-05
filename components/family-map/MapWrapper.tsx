"use client";

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import type { Node } from '@xyflow/react';
import type { FamilyNodeData } from '@/lib/types';

// Dynamically import the map component with no SSR
const MapComponent = dynamic(
  () => import('./FamilyMap'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-secondary/20 animate-pulse">
        <div className="flex flex-col items-center">
             <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
             <p className="text-muted-foreground text-sm">Loading Map of India...</p>
        </div>
      </div>
    )
  }
);

interface MapWrapperProps {
    nodes: Node<FamilyNodeData>[];
}

export default function FamilyMapWrapper({ nodes }: MapWrapperProps) {
    const memoizedNodes = useMemo(() => nodes, [nodes]);
    return <MapComponent nodes={memoizedNodes} />;
}
