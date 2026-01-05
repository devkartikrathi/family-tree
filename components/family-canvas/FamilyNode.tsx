import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CopyIcon } from 'lucide-react';
import { FamilyNodeData } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FamilyNodeProps extends NodeProps {
    data: FamilyNodeData;
}

export const FamilyNode = memo(({ id, data, selected }: FamilyNodeProps) => {
  const { primary, spouse, familySurname, primaryRootNodeId, spouseRootNodeId } = data;

  const copyToClipboard = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <Card className={cn(
        "min-w-[280px] border-2 shadow-sm transition-all duration-200", 
        selected ? "border-primary ring-2 ring-primary/20 shadow-lg" : "border-border hover:border-primary/50"
    )}>
      {/* Input Handle - Ancestors come from top */}
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground w-3 h-3" />

      <CardContent className="p-0">
        {/* Header: Root IDs */}
        <div className="bg-muted/30 px-3 py-1.5 flex justify-between items-center text-[10px] text-muted-foreground">
             <div className="flex items-center gap-2">
                 {/* Node ID (Own) */}
                 <div className="flex items-center gap-1 bg-background/50 px-1.5 rounded border border-border/50">
                    <span className="font-semibold text-primary/70">ID:</span>
                    <button onClick={(e) => copyToClipboard(id, e)} className="hover:text-primary flex items-center gap-0.5" title="Copy Node ID">
                        {id.slice(0, 4)}... <CopyIcon className="w-2 h-2" />
                    </button>
                 </div>

                 {/* Parent Links */}
                 <div className="flex items-center gap-1">
                    <span className="font-semibold">P:</span>
                    {primaryRootNodeId ? (
                        <button onClick={(e) => copyToClipboard(primaryRootNodeId, e)} className="hover:text-primary flex items-center gap-0.5" title="Copy Parent ID">
                            {primaryRootNodeId.slice(0, 4)}... <CopyIcon className="w-2 h-2" />
                        </button>
                    ) : <span className="text-muted-foreground/50">None</span>}
                 </div>
             </div>
             {spouse && (
                 <div className="flex items-center gap-1">

                    <span className="font-semibold">S:</span>
                    {spouseRootNodeId ? (
                         <button onClick={(e) => copyToClipboard(spouseRootNodeId, e)} className="hover:text-primary flex items-center gap-0.5" title="Copy Root ID">
                            {spouseRootNodeId.slice(0, 4)}... <CopyIcon className="w-2 h-2" />
                        </button>
                    ) : <span className="text-muted-foreground/50">None</span>}
                 </div>
             )}
        </div>
        <Separator />
        
        {/* Main Content */}
        <div className="p-4 space-y-3">
            {/* Primary Person */}
            <div className="flex justify-between items-start">
                <div>
                     <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{familySurname}</div>
                     <div className="text-lg font-bold leading-tight">{primary.name}</div>
                     <div className="text-xs text-muted-foreground mt-0.5">
                         {primary.dateOfBirth || '?'} - {(primary.alive ?? true) ? (primary.dateOfBirth ? 'Present' : '') : (primary.dateOfDeath || 'Deceased')}
                     </div>
                </div>
                {!(primary.alive ?? true) && <Badge variant="secondary" className="text-[10px] px-1 h-5">Deceased</Badge>}
            </div>

            {/* Spouse Section */}
            {spouse && (
                <>
                    <Separator className="my-2" />
                    <div className="flex justify-between items-start">
                        <div>
                             <div className="text-base font-semibold text-foreground/90">{spouse.name}</div>
                             <div className="text-xs text-muted-foreground mt-0.5">
                                 {spouse.dateOfBirth || '?'} - {(spouse.alive ?? true) ? (spouse.dateOfBirth ? 'Present' : '') : (spouse.dateOfDeath || 'Deceased')}
                             </div>
                        </div>
                         {!(spouse.alive ?? true) && <Badge variant="secondary" className="text-[10px] px-1 h-5">Deceased</Badge>}
                    </div>
                </>
            )}
        </div>

      </CardContent>

      {/* Output Handle - Descendants go to bottom */}
      <Handle type="source" position={Position.Bottom} className="!bg-primary w-3 h-3" />
    </Card>
  );
});

FamilyNode.displayName = "FamilyNode";
