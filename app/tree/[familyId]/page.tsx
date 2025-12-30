'use client';

import { useState, useEffect, useCallback } from 'react';
import { useNodesState, useEdgesState, addEdge, NodeChange } from '@xyflow/react';
import { useParams, useRouter } from 'next/navigation';
import { FamilyCanvas } from '@/components/family-canvas/FamilyCanvas';
import { Sidebar, SidebarMode } from '@/components/sidebar/Sidebar';
import { AppNode, AppEdge, FamilyNodeData, FamilyGraph } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { MenuIcon, Sparkles, Users } from 'lucide-react';
import { toast } from "sonner";
import { performAutoLayout } from '@/lib/graphUtils';
import { useUser } from "@clerk/nextjs";
import { MembersSidebar } from '@/components/sidebar/MembersSidebar';
import { FamilyMember, Role } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";



export default function FamilyTreePage() {
  const { user } = useUser();
  const params = useParams();
  const router = useRouter();
  const familyId = params.familyId as string;

  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<AppEdge>([]);
  

  const [familyName, setFamilyName] = useState('My Family Tree');
  const [selectedNode, setSelectedNode] = useState<AppNode | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('VIEW');
  const [shouldLayout, setShouldLayout] = useState(false);
  const [loading, setLoading] = useState(true);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [membersSidebarOpen, setMembersSidebarOpen] = useState(false);

  const currentUserMember = members.find(m => m.userId === user?.id);
  const myRole = currentUserMember?.role;
  const canEdit = myRole === 'CREATOR' || myRole === 'ADMIN';


  useEffect(() => {
    if (!familyId) return;

    const fetchFamily = async () => {
      try {
        setLoading(true);

        const graphRes = await fetch(`/api/families/${familyId}`);
        
        if (!graphRes.ok) {
            if (graphRes.status === 404) {
                toast.error("Family not found");
                router.push('/tree');
                return;
            }
            throw new Error("Failed to load family");
        }

        const graph: FamilyGraph = await graphRes.json();
        

        const flowNodes = graph.nodes.map(n => ({
            ...n,
            type: 'familyNode',

            position: n.position || { x: 0, y: 0 }
        }));
        

        const layoutedNodes = performAutoLayout(flowNodes, graph.edges);
        setNodes(layoutedNodes.length > 0 ? layoutedNodes : flowNodes);
        setEdges(graph.edges);
        setFamilyName(graph.family.name);


        if (flowNodes.length === 0) {
            setSidebarOpen(true);
            setSidebarMode('VIEW');
        }
        
      } catch (err) {
        console.error("Failed to load family data", err);
      } finally {
        setLoading(false);
      }
    };
    

    
    const fetchMembers = async () => {
        try {
            const res = await fetch(`/api/families/${familyId}/members`);
            if (res.ok) {
                const data = await res.json();
                setMembers(data);
            }
        } catch (e) {
            console.error("Failed to fetch members", e);
        }
    };

    fetchFamily();
    fetchMembers();
  }, [familyId, setNodes, setEdges, router]); 


  useEffect(() => {
      if (shouldLayout) {
          setNodes((nds) => performAutoLayout(nds, edges));
          setShouldLayout(false);
      }
  }, [shouldLayout, edges, setNodes]); 



  const handleNodeClick = (node: AppNode) => {
    setSelectedNode(node);
    setSidebarMode('VIEW');
    setSidebarOpen(true);
  };

  const handlePaneClick = () => {
    setSelectedNode(null);
    setSidebarOpen(false);
  };



  const handleAddNode = () => {
    if (!canEdit) {
        toast.error("You don't have permission to add nodes");
        return;
    }
    setSelectedNode(null);
    setSidebarMode('CREATE');
    setSidebarOpen(true);
  };

  const handleEditNode = () => {
    if (selectedNode) {
        setSidebarMode('EDIT');
    }
  };

  const handleAddChild = () => {
    if (!canEdit) {
        toast.error("You don't have permission to add children");
        return;
    }
    if (selectedNode) {
        setSidebarMode('CREATE_CHILD');
    }
  };

  const handleSaveNode = async (data: FamilyNodeData) => {
    if (!canEdit) {
        toast.error("You don't have permission to save changes");
        return;
    }
    if (!familyId) {
        console.error("No family ID selected");
        return;
    }

    try {
        let savedNode: AppNode;
        let isNew = false;

        if (sidebarMode === 'CREATE' || sidebarMode === 'CREATE_CHILD') {
            isNew = true;
            // Calculate position: if child, below parent; else random/center
            let position = { x: 100, y: 100 };
            if (sidebarMode === 'CREATE_CHILD' && selectedNode) {
                position = {
                    x: selectedNode.position.x,
                    y: selectedNode.position.y + 300
                };
            } else if (nodes.length > 0) {

                 const lastNode = nodes[nodes.length - 1];
                 position = { x: lastNode.position.x + 50, y: lastNode.position.y + 50 };
            }

            const res = await fetch(`/api/families/${familyId}/nodes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'familyNode', position, data })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create node');
            }

            savedNode = await res.json();
            
            setNodes((nds) => {
                const newNodes = [...nds, savedNode];
                return performAutoLayout(newNodes, edges);
            });
        } else if (sidebarMode === 'EDIT' && selectedNode) {
            const res = await fetch(`/api/families/${familyId}/nodes/${selectedNode.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data })
            });
            
            if (!res.ok) throw new Error('Failed to update node');
            
            savedNode = await res.json();
            setNodes((nds) => nds.map((n) => (n.id === savedNode.id ? savedNode : n)));
        } else {
            return;
        }


        const oldData = isNew ? {} as Partial<FamilyNodeData> : selectedNode?.data;
        const newData = data;
        let edgesChanged = false;

        const syncEdge = async (oldRootId: string | undefined, newRootId: string | undefined, targetId: string, isPrimary: boolean) => {
            if (oldRootId === newRootId) return;


            if (oldRootId) {
                const oldEdge = edges.find(e => e.source === oldRootId && e.target === targetId);
                if (oldEdge) {
                    await fetch(`/api/families/${familyId}/edges/${oldEdge.id}`, { method: 'DELETE' });
                    setEdges(eds => eds.filter(e => e.id !== oldEdge.id));
                    edgesChanged = true;
                }
            }


            if (newRootId) {
                const newEdgePayload = {
                    source: newRootId,
                    target: targetId,
                    data: { relationshipType: 'PARENT_OF' },
                    type: 'smoothstep',
                    animated: !isPrimary,
                    style: isPrimary ? { stroke: '#000', strokeWidth: 1.5 } : { stroke: '#999', strokeDasharray: '5,5' }
                };
                
                try {
                    const edgeRes = await fetch(`/api/families/${familyId}/edges`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newEdgePayload)
                    });
                    if (edgeRes.ok) {
                        const savedEdge = await edgeRes.json();
                        setEdges((eds) => addEdge(savedEdge, eds));
                        edgesChanged = true;
                    }
                } catch (err) {
                    console.error("Failed to sync edge", err);
                }
            }
        };


        await syncEdge(oldData?.primaryRootNodeId, newData.primaryRootNodeId, savedNode.id, true);

        await syncEdge(oldData?.spouseRootNodeId, newData.spouseRootNodeId, savedNode.id, false);

        if (edgesChanged) {
            setShouldLayout(true);
        }


        setSelectedNode(savedNode);
        setSidebarOpen(false);
        setSidebarMode('VIEW');

    } catch (error) {
        console.error("Failed to save node", error);
        toast.error("Failed to save changes");
    }
  };

  const handleUpdateMemberRole = async (targetUserId: string, newRole: Role) => {
      try {
          const res = await fetch(`/api/families/${familyId}/members/${targetUserId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ role: newRole })
          });
          
          if (!res.ok) throw new Error("Failed to update role");
          
          const updated = await res.json();
          setMembers(mems => mems.map(m => m.userId === targetUserId ? { ...m, role: newRole } : m));
          toast.success(`Role updated to ${newRole}`);
      } catch (error) {
          toast.error("Failed to update role");
          console.error(error);
      }
  };

  const handleJoin = async () => {
      try {
          const res = await fetch(`/api/families/${familyId}/members`, { method: 'POST' });
          if (res.ok) {
              const data = await res.json();
              if (data.message === 'Already a member') {
                  toast.info("Already a member");
              } else {
                  toast.success("Joined family successfully!");
                  setMembers(prev => [...prev, data]);
              }
          } else {
              throw new Error("Failed to join");
          }
      } catch (e) {
          console.error("Failed to join", e);
          toast.error("Failed to join family");
      }
  };

  const handleRenameFamily = async (newName: string) => {
      if (!familyId) return;
      try {
          const res = await fetch(`/api/families/${familyId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: newName })
          });
          if (res.ok) {
              const updated = await res.json();
              setFamilyName(updated.name);
          }
      } catch (error) {
          console.error("Failed to rename family", error);
      }
  };

  const handleDeleteNode = () => {
      if (!selectedNode || !familyId) return;
      setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
      if (!selectedNode || !familyId) return;

      try {

          const childrenToUpdate = nodes.filter(n => 
              n.data.primaryRootNodeId === selectedNode.id || 
              n.data.spouseRootNodeId === selectedNode.id
          );

          await Promise.all(childrenToUpdate.map(async (child) => {
              const newData = { ...child.data };
              if (newData.primaryRootNodeId === selectedNode.id) newData.primaryRootNodeId = undefined;
              if (newData.spouseRootNodeId === selectedNode.id) newData.spouseRootNodeId = undefined;

              await fetch(`/api/families/${familyId}/nodes/${child.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ data: newData })
              });
          }));


          await fetch(`/api/families/${familyId}/nodes/${selectedNode.id}`, {
              method: 'DELETE'
          });

          setNodes((nds) => {

              const filteredNodes = nds.filter((n) => n.id !== selectedNode.id);
              

              const updatedNodes = filteredNodes.map(n => {
                  if (n.data.primaryRootNodeId === selectedNode.id || n.data.spouseRootNodeId === selectedNode.id) {
                      return {
                          ...n,
                          data: {
                              ...n.data,
                              primaryRootNodeId: n.data.primaryRootNodeId === selectedNode.id ? undefined : n.data.primaryRootNodeId,
                              spouseRootNodeId: n.data.spouseRootNodeId === selectedNode.id ? undefined : n.data.spouseRootNodeId,
                          }
                      };
                  }
                  return n;
              });

              return performAutoLayout(updatedNodes, edges);
          });
          setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
          
          setSelectedNode(null);
          setSidebarOpen(false);
          toast.success("Node deleted successfully");
      } catch (error) {
          console.error("Failed to delete", error);
          toast.error("Failed to delete node");
      } finally {
          setDeleteDialogOpen(false);
      }
  };


    const handleNodesChange = useCallback(
      (changes: NodeChange<AppNode>[]) => {
          onNodesChange(changes);
      },
      [onNodesChange]
    );

  const handleNodeDragStop = useCallback(async (event: React.MouseEvent, node: AppNode) => {
      if (!familyId || !canEdit) return; // Prevent drag save if not allowed
      try {

          await fetch(`/api/families/${familyId}/nodes/${node.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ position: node.position })
          });
      } catch (error) {
          console.error("Failed to save position", error);
      }
  }, [familyId]);

  if (loading) {
      return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Loading your legacy...</div>;
  }

  const handleRemoveMember = async (userId: string) => {
    if (!canEdit) return;
    try {
        const res = await fetch(`/api/families/${familyId}/members/${userId}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            const err = await res.json();
             throw new Error(err.error || 'Failed to remove member');
        }
        
        setMembers(prev => prev.filter(m => m.userId !== userId));
        toast.success("Member removed");
    } catch (e: any) {
        toast.error(e.message);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      <FamilyCanvas 
        nodes={nodes} 
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onNodeDragStop={handleNodeDragStop}
      />
      


      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 max-w-[50vw]">
          <div className="flex flex-col items-center justify-center h-12 px-6 bg-background/80 backdrop-blur-md rounded-full border border-border/50 shadow-md transition-all hover:shadow-lg cursor-default select-none">
              <h1 className="text-base md:text-lg font-semibold text-foreground whitespace-nowrap overflow-hidden text-ellipsis">{familyName}</h1>
          </div>
      </div>

       <div className="absolute top-6 left-6 z-10">
            <Button
                onClick={() => setMembersSidebarOpen(true)}
                className="h-12 w-12 md:w-auto md:px-5 rounded-full shadow-md bg-background/80 backdrop-blur-md border border-border/50 hover:bg-background/90"
                variant="outline"
            >
                <Users className="w-5 h-5 md:mr-2" />
                <span className="hidden md:inline font-medium">Members</span>
            </Button>
       </div>


      

      {!sidebarOpen && (
        <>
           <div className="absolute top-6 right-6 z-10">
                <Button 
                    onClick={() => {
                        setSelectedNode(null);
                        setSidebarMode('VIEW');
                        setSidebarOpen(true);
                    }}
                    className="h-12 w-12 md:w-auto md:px-5 rounded-full shadow-md bg-foreground text-background hover:bg-foreground/90"
                >
                    <MenuIcon className="w-5 h-5 md:mr-2" /> 
                    <span className="hidden md:inline font-medium">Menu</span>
                </Button>
           </div>
            

           <div className="absolute bottom-6 right-6 z-10 flex gap-2">
                <Button 
                    onClick={() => {
                        setNodes(nds => performAutoLayout(nds, edges));
                    }}
                    className="shadow-lg h-12 w-12 rounded-full p-0"
                    variant="outline"
                    title="Auto Layout"
                >
                    <Sparkles className="w-5 h-5" />
                </Button>
           </div>
        </>
      )}


      <Sidebar 
        open={sidebarOpen}
        mode={sidebarMode}
        selectedNode={selectedNode}
        familyName={familyName}
        familyId={familyId}
        onClose={() => setSidebarOpen(false)}
        onAddNode={handleAddNode}
        onEditNode={handleEditNode}
        onAddChild={handleAddChild}
        onDeleteNode={handleDeleteNode}
        onSaveNode={handleSaveNode}
        onRenameFamily={handleRenameFamily}
        onCancelEdit={() => {
            setSidebarMode('VIEW');
            if(!selectedNode) setSidebarOpen(false);
        }}
      />

      <MembersSidebar 
        open={membersSidebarOpen}
        onClose={() => setMembersSidebarOpen(false)}
        members={members}
        currentUserId={user?.id}
        onUpdateRole={handleUpdateMemberRole}
        onRemoveMember={handleRemoveMember}
        onJoin={handleJoin}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the node
              &quot;{selectedNode?.data.primary.name}&quot; and remove their data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
