
import {
  ReactFlow,
  Controls,
  Background,
  NodeTypes,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { FamilyNode } from './FamilyNode';
import { AppNode, AppEdge } from '@/lib/types';


const nodeTypes: NodeTypes = {
  familyNode: FamilyNode,
};

interface FamilyCanvasProps {
    nodes: AppNode[];
    edges: AppEdge[];
    onNodeClick: (node: AppNode) => void;
    onPaneClick: () => void;
    onNodesChange?: (changes: NodeChange<AppNode>[]) => void;
    onEdgesChange?: (changes: EdgeChange<AppEdge>[]) => void; 
    onNodeDragStop?: (event: React.MouseEvent, node: AppNode) => void;
}

export function FamilyCanvas({ 
    nodes: initialNodes, 
    edges: initialEdges, 
    onNodeClick, 
    onPaneClick ,
    onNodesChange: externalOnNodesChange,
    onEdgesChange: externalOnEdgesChange,
    onNodeDragStop
}: FamilyCanvasProps) {
  
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        nodeTypes={nodeTypes}
        onNodesChange={externalOnNodesChange}
        onEdgesChange={externalOnEdgesChange}
        onNodeClick={(_, node) => onNodeClick(node as AppNode)}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
        defaultEdgeOptions={{
            type: 'smoothstep', 
            animated: true,
            style: { stroke: '#64748b', strokeWidth: 2 } 
        }}
      >
        <Background gap={20} color="#f1f5f9" />
        <Controls />
      </ReactFlow>
    </div>
  );
}
