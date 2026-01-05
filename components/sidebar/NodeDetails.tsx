
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AppNode } from "@/lib/types";
import { CopyIcon, EditIcon, PlusCircleIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

interface NodeDetailsProps {
    node: AppNode;
    onEdit: () => void;
    onAddChild: () => void;
    onDelete: () => void;
}

export function NodeDetails({ node, onEdit, onAddChild, onDelete }: NodeDetailsProps) {
    const { primary, spouse, familySurname, primaryRootNodeId, spouseRootNodeId } = node.data;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!");
    };

    return (
        <div className="h-full flex flex-col">
            <div className="p-6 pb-2 border-b">
                <div className="flex justify-between items-start mb-4">
                    <div>
                         <h3 className="text-sm font-medium text-muted-foreground uppercase">{familySurname} Family</h3>
                         <h2 className="text-2xl font-bold">{primary.name}</h2>
                    </div>
                </div>
                
                <div className="flex gap-2 mb-4">
                    <Button onClick={onEdit} variant="outline" size="sm" className="flex-1">
                        <EditIcon className="w-4 h-4 mr-2" /> Edit
                    </Button>
                    <Button onClick={onDelete} variant="destructive" size="icon" className="h-9 w-9">
                        <Trash2Icon className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                    {/* Primary Person Details */}
                     <div className="space-y-4">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                             Primary Person (ID: {node.id.slice(0, 4)}...)
                             <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => copyToClipboard(node.id)}>
                                 <CopyIcon className="w-3 h-3" />
                             </Button>
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground block text-xs">Date of Birth</span>
                                {primary.dateOfBirth || '-'}
                            </div>
                            <div>
                                <span className="text-muted-foreground block text-xs">Date of Death</span>
                                {primary.dateOfDeath || '-'}
                            </div>
                            <div>
                                <span className="text-muted-foreground block text-xs">Status</span>
                                {(primary.alive ?? true) ? 'Living' : 'Deceased'}
                            </div>
                            <div>
                                <span className="text-muted-foreground block text-xs">Occupation</span>
                                {primary.occupation || '-'}
                            </div>
                            <div>
                                <span className="text-muted-foreground block text-xs">Birth Location</span>
                                {primary.birthLocation || '-'}
                            </div>
                            {!(primary.alive ?? true) && (
                                <div>
                                    <span className="text-muted-foreground block text-xs">Death Location</span>
                                    {primary.deathLocation || '-'}
                                </div>
                            )}
                        </div>
                        {primary.notes && (
                            <div className="bg-muted p-3 rounded-md text-sm italic">
                                &quot;{primary.notes}&quot;
                            </div>
                        )}
                        
                        <div className="bg-muted/50 p-3 rounded-md text-xs border">
                            <span className="text-muted-foreground font-semibold block mb-1">Parent Link (Root ID)</span>
                            <div className="flex justify-between items-center">
                                <span className="font-mono">{primaryRootNodeId || 'Not Linked'}</span>
                                {primaryRootNodeId && (
                                     <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(primaryRootNodeId!)}>
                                         <CopyIcon className="w-3 h-3" />
                                     </Button>
                                )}
                            </div>
                        </div>
                     </div>

                     <Separator />

                     {/* Spouse Details */}
                     {spouse ? (
                        <div className="space-y-4">
                            <h4 className="font-semibold text-sm">Spouse Details</h4>
                             <div className="text-lg font-bold">{spouse.name}</div>
                             <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground block text-xs">Date of Birth</span>
                                    {spouse.dateOfBirth || '-'}
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-xs">Date of Death</span>
                                    {spouse.dateOfDeath || '-'}
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-xs">Status</span>
                                    {(spouse.alive ?? true) ? 'Living' : 'Deceased'}
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-xs">Occupation</span>
                                    {spouse.occupation || '-'}
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-xs">Birth Location</span>
                                    {spouse.birthLocation || '-'}
                                </div>
                                {!(spouse.alive ?? true) && (
                                    <div>
                                        <span className="text-muted-foreground block text-xs">Death Location</span>
                                        {spouse.deathLocation || '-'}
                                    </div>
                                )}
                            </div>
                            {spouse.notes && (
                                <div className="bg-muted p-3 rounded-md text-sm italic">
                                    &quot;{spouse.notes}&quot;
                                </div>
                            )}
                            
                            <div className="bg-muted/50 p-3 rounded-md text-xs border">
                                <span className="text-muted-foreground font-semibold block mb-1">Spouse Parent Link (Root ID)</span>
                                <div className="flex justify-between items-center">
                                    <span className="font-mono">{spouseRootNodeId || 'Not Linked'}</span>
                                    {spouseRootNodeId && (
                                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(spouseRootNodeId!)}>
                                            <CopyIcon className="w-3 h-3" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                     ) : (
                         <div className="text-sm text-muted-foreground py-2 text-center border border-dashed rounded-md">
                             No spouse recorded
                         </div>
                     )}

                     <Separator />

                     {/* Actions */}
                     <div className="pt-2">
                        <Button onClick={onAddChild} className="w-full" variant="secondary">
                            <PlusCircleIcon className="w-4 h-4 mr-2" /> Add Child to this Family
                        </Button>
                     </div>
                </div>
            </div>
        </div>
    );
}
