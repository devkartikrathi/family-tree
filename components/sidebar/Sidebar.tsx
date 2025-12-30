
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { UserButton, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { AppNode, FamilyNodeData } from "@/lib/types";
import { NoSelection } from "./NoSelection";
import { NodeDetails } from "./NodeDetails";
import { NodeEditor } from "./NodeEditor";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export type SidebarMode = 'VIEW' | 'CREATE' | 'EDIT' | 'CREATE_CHILD';

interface SidebarProps {
    open: boolean;
    mode: SidebarMode;
    selectedNode: AppNode | null;
    familyName: string;
    familyId: string;
    onClose?: () => void;
    onAddNode: () => void;
    onEditNode: () => void;
    onAddChild: () => void;
    onDeleteNode: () => void;
    onSaveNode: (data: FamilyNodeData) => void;
    onRenameFamily: (name: string) => void;
    onCancelEdit: () => void;
}

export function Sidebar({ 
    open, 
    mode, 
    selectedNode, 
    familyName,
    familyId,
    onClose,
    onAddNode,
    onEditNode,
    onAddChild,
    onDeleteNode,
    onSaveNode,
    onRenameFamily,
    onCancelEdit 
}: SidebarProps) {


    const renderContent = () => {
        if (mode === 'CREATE') {
            return (
                <NodeEditor 
                    onSave={onSaveNode}
                    onCancel={onCancelEdit}
                />
            );
        }

        if (mode === 'EDIT' && selectedNode) {
            return (
                <NodeEditor 
                    initialData={selectedNode.data}
                    onSave={onSaveNode}
                    onCancel={onCancelEdit}
                />
            );
        }

        if (mode === 'CREATE_CHILD' && selectedNode) {
            return (
                <NodeEditor 
                    initialData={{
                        familySurname: selectedNode.data.familySurname,
                        primaryRootNodeId: selectedNode.id
                    }}
                    onSave={onSaveNode}
                    onCancel={onCancelEdit}
                />
            );
        }

        if (selectedNode) {
            return (
                <NodeDetails 
                    node={selectedNode}
                    onEdit={onEditNode}
                    onAddChild={onAddChild}
                    onDelete={onDeleteNode}
                />
            );
        }

        return <NoSelection onAddNode={onAddNode} onRenameFamily={onRenameFamily} familyName={familyName} familyId={familyId} />;
    };

    const router = useRouter();

    return (
        <Sheet open={open} onOpenChange={(open) => !open && onClose && onClose()} modal={false}>
            <SheetContent 
                side="right" 
                className="w-full xs:w-[90%] sm:w-[450px] md:w-[540px] p-0 border-l shadow-xl flex flex-col h-full"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >

                <SheetHeader className="sr-only">
                    <SheetTitle>Family Tree Details</SheetTitle>
                </SheetHeader>

                {renderContent()}
                

                <div className="p-4 border-t bg-muted/30 mt-auto space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <SignedIn>
                                <UserButton />
                                <span className="text-sm text-muted-foreground">Account</span>
                            </SignedIn>
                            <SignedOut>
                                <SignInButton mode="modal">
                                    <Button size="sm" variant="outline">Sign In</Button>
                                </SignInButton>
                            </SignedOut>
                        </div>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="sm"
                        className="w-full justify-start text-muted-foreground hover:text-foreground h-auto py-2" 
                        onClick={() => router.push('/tree')}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2"/> Switch Family
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
