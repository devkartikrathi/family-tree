"use client";
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { FamilyNode } from '@/components/family-canvas/FamilyNode';
import { AppNode, AppEdge } from '@/lib/types';


const nodeTypes: NodeTypes = {
  familyNode: FamilyNode,
};


const initialNodes: AppNode[] = [
  {
    id: '1',
    type: 'familyNode',
    position: { x: 250, y: 0 },
    data: {
      primary: { name: 'Arthur Weasley', alive: true, dateOfBirth: '1950-02-06' },
      spouse: { name: 'Molly Prewett', alive: true, dateOfBirth: '1949-10-30' },
      familySurname: 'Weasley',
      primaryRootNodeId: undefined,
      spouseRootNodeId: undefined,
    },
  },
  {
    id: '2',
    type: 'familyNode',
    position: { x: 0, y: 300 },
    data: {
      primary: { name: 'Bill Weasley', alive: true, dateOfBirth: '1970-11-29' },
      spouse: { name: 'Fleur Delacour', alive: true, dateOfBirth: '1977-06-25' },
      familySurname: 'Weasley',
      primaryRootNodeId: '1',
    },
  },
  {
    id: '3',
    type: 'familyNode',
    position: { x: 500, y: 300 },
    data: {
      primary: { name: 'Ginny Weasley', alive: true, dateOfBirth: '1981-08-11' },
      spouse: { name: 'Harry Potter', alive: true, dateOfBirth: '1980-07-31' },
      familySurname: 'Potter',
      primaryRootNodeId: '1',
    },
  },
];

const initialEdges: AppEdge[] = [
  { id: 'e1-2', source: '1', target: '2', type: 'smoothstep', animated: true, style: { stroke: '#64748b', strokeWidth: 2 } },
  { id: 'e1-3', source: '1', target: '3', type: 'smoothstep', animated: true, style: { stroke: '#64748b', strokeWidth: 2 } },
];

export function DemoCanvas() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="w-full h-full min-h-[400px] bg-slate-50 rounded-xl border-2 border-slate-200 shadow-xl overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold text-slate-500 border border-slate-200">
        Live Preview
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        attributionPosition="bottom-right"
        defaultEdgeOptions={{
            type: 'smoothstep', 
            animated: true,
            style: { stroke: '#64748b', strokeWidth: 2 } 
        }}
      >
        <Background color="#cbd5e1" gap={20} />
      </ReactFlow>
    </div>
  );
}
