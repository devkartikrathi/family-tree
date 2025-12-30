import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FamilyMember, Role } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { UsersIcon, ShieldAlertIcon, ShieldCheckIcon, UserIcon } from "lucide-react";

interface MembersSidebarProps {
    open: boolean;
    onClose: () => void;
    members: FamilyMember[];
    currentUserId?: string;
    onUpdateRole: (userId: string, newRole: Role) => Promise<void>;
    onJoin: () => void;
}

export function MembersSidebar({
    open,
    onClose,
    members,
    currentUserId,
    onUpdateRole,
    onJoin
}: MembersSidebarProps) {

    const currentUserMember = members.find(m => m.userId === currentUserId);
    const isMember = !!currentUserMember;
    const isCreator = currentUserMember?.role === 'CREATOR';

    const getRoleColor = (role: Role) => {
        switch (role) {
            case 'CREATOR': return 'bg-green-500 hover:bg-green-600 text-white border-transparent';
            case 'ADMIN': return 'bg-yellow-500 hover:bg-yellow-600 text-white border-transparent';
            case 'MEMBER': return 'bg-gray-500 hover:bg-gray-600 text-white border-transparent';
            default: return 'bg-gray-500';
        }
    };

    const getRoleIcon = (role: Role) => {
        switch (role) {
            case 'CREATOR': return <ShieldAlertIcon className="w-3 h-3 mr-1" />;
            case 'ADMIN': return <ShieldCheckIcon className="w-3 h-3 mr-1" />;
            default: return <UserIcon className="w-3 h-3 mr-1" />;
        }
    };

    const sortedMembers = [...members].sort((a, b) => {
        // Creator first, then Admin, then Member
        const order = { CREATOR: 0, ADMIN: 1, MEMBER: 2 };
        return order[a.role] - order[b.role];
    });

    return (
        <Sheet open={open} onOpenChange={(open) => !open && onClose()} modal={false}>
            <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0 border-r shadow-xl flex flex-col h-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <SheetHeader className="p-4 border-b text-left">
                    <SheetTitle className="flex items-center gap-2">
                        <UsersIcon className="w-5 h-5" />
                        Family Members ({members.length})
                    </SheetTitle>
                </SheetHeader>

                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                        {sortedMembers.map((member) => (
                            <div key={member.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                <Avatar className="w-10 h-10 border">
                                    <AvatarImage src="" /> {/* Avatar URL not available in simple schema yet */}
                                    <AvatarFallback>{member.user?.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <p className="font-medium text-sm truncate" title={member.user?.email}>
                                            {member.user?.email || 'Unknown User'}
                                        </p>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                         {/* If Creator and looking at someone else, allow change */}
                                         {isCreator && member.userId !== currentUserId ? (
                                             <Select 
                                                defaultValue={member.role}
                                                onValueChange={(val) => onUpdateRole(member.userId, val as Role)}
                                             >
                                                <SelectTrigger className="h-7 text-xs w-[110px] bg-transparent border-muted-foreground/30">
                                                    <div className="flex items-center">
                                                        <Badge variant="outline" className={`mr-1 px-1 py-0 h-4 border-0 ${getRoleColor(member.role)}`}>
                                                            {getRoleIcon(member.role)}
                                                       </Badge>
                                                       <SelectValue />
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                                    <SelectItem value="MEMBER">Member</SelectItem>
                                                    {/* Creator cannot transfer ownership here easily without extra logic, keeping it simple */}
                                                </SelectContent>
                                             </Select>
                                         ) : (
                                            <Badge variant="secondary" className={`flex items-center gap-1 text-[10px] px-2 py-0.5 pointer-events-none ${getRoleColor(member.role)}`}>
                                                {getRoleIcon(member.role)}
                                                {member.role}
                                            </Badge>
                                         )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                
                
                {!isMember && (
                    <div className="p-4 border-t mt-auto">
                        <Button className="w-full" onClick={onJoin}>Join Family</Button>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
