
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusIcon, Edit2Icon, Copy } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface NoSelectionProps {
    onAddNode: () => void;
    onRenameFamily: (name: string) => void;
    familyName: string;
    familyId: string;
}

export function NoSelection({ onAddNode, onRenameFamily, familyName, familyId }: NoSelectionProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(familyName);

    const handleRename = () => {
        onRenameFamily(name);
        setIsEditing(false);
    };

    const copyFamilyId = () => {
        navigator.clipboard.writeText(familyId);
        toast.success("Family ID copied to clipboard!");
    };

    return (
        <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto">
            <div className="space-y-4">
                {isEditing ? (
                    <div className="flex items-center gap-2">
                        <Input 
                            value={name} 
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                            className="text-xl font-bold h-10"
                            autoFocus
                        />
                        <Button size="sm" onClick={handleRename}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                    </div>
                ) : (
                    <div className="group flex items-center gap-2">
                        <h2 className="text-2xl font-bold tracking-tight">{familyName}</h2>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                                setName(familyName);
                                setIsEditing(true);
                            }}
                        >
                            <Edit2Icon className="h-4 w-4" />
                        </Button>
                    </div>
                )}
                
                {/* Family ID Display */}
                <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Family ID</span>
                    <div className="flex items-center gap-2 bg-muted p-2 rounded-md border border-border">
                        <code className="text-xs font-mono text-muted-foreground flex-1 truncate">{familyId}</code>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={copyFamilyId}
                            title="Copy Family ID"
                        >
                            <Copy className="h-3 w-3" />
                        </Button>
                    </div>
                </div>

                <p className="text-muted-foreground text-sm">Select a node to view details or edit genealogy.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button onClick={onAddNode} className="w-full justify-start" variant="default">
                        <PlusIcon className="mr-2 h-4 w-4" />
                        Add New Family Node
                    </Button>
                </CardContent>
            </Card>

            <div className="flex-1" />
            
            <div className="text-xs text-muted-foreground text-center">
                Family Graph Canvas v1.0
            </div>
        </div>
    );
}
