import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { FamilyMember, Role } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { UsersIcon, ShieldAlertIcon, ShieldCheckIcon, UserIcon, MoreVertical, Crown, Trash2 } from "lucide-react";

interface MembersSidebarProps {
    open: boolean;
    onClose: () => void;
    members: FamilyMember[];
    currentUserId?: string;
    onUpdateRole: (userId: string, newRole: Role) => Promise<void>;
    onRemoveMember: (userId: string) => Promise<void>;
    onJoin: () => void;
}

export function MembersSidebar({
    open,
    onClose,
    members,
    currentUserId,
    onUpdateRole,
    onRemoveMember,
    onJoin
}: MembersSidebarProps) {

    const currentUserMember = members.find(m => m.userId === currentUserId);
    const isMember = !!currentUserMember;
    const isCreator = currentUserMember?.role === 'CREATOR';
    const isAdmin = currentUserMember?.role === 'ADMIN';

    const getRoleColor = (role: Role) => {
        switch (role) {
            case 'CREATOR': return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/25';
            case 'ADMIN': return 'bg-amber-500/15 text-amber-600 border-amber-500/20 hover:bg-amber-500/25';
            case 'MEMBER': return 'bg-slate-500/15 text-slate-600 border-slate-500/20 hover:bg-slate-500/25';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    const getRoleIcon = (role: Role) => {
        switch (role) {
            case 'CREATOR': return <Crown className="w-3 h-3 mr-1" />;
            case 'ADMIN': return <ShieldCheckIcon className="w-3 h-3 mr-1" />;
            default: return <UserIcon className="w-3 h-3 mr-1" />;
        }
    };

    const sortedMembers = [...members].sort((a, b) => {
        const order = { CREATOR: 0, ADMIN: 1, MEMBER: 2 };
        return order[a.role] - order[b.role];
    });

    return (
        <Sheet open={open} onOpenChange={(open) => !open && onClose()} modal={false}>
            <SheetContent 
                side="left" 
                className="w-[320px] sm:w-[380px] p-0 border-r border-border/40 shadow-2xl flex flex-col h-full bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60"
            >
                <SheetHeader className="p-6 border-b border-border/40">
                    <SheetTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                        <UsersIcon className="w-5 h-5 text-primary" />
                        Family Members
                        <span className="text-muted-foreground text-sm font-normal ml-auto bg-muted px-2 py-0.5 rounded-full mr-6">
                            {members.length}
                        </span>
                    </SheetTitle>
                </SheetHeader>

                <ScrollArea className="flex-1 px-4 py-6">
                    <div className="space-y-3">
                        {sortedMembers.map((member) => {
                            let name = member.user?.name;
                            if (!name && member.user?.email) {
                                name = member.user.email.split('@')[0];
                            }
                            name = name || 'Unknown';
                            
                            const initial = name.charAt(0).toUpperCase();

                            return (
                                <div 
                                    key={member.id} 
                                    className="group flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition-all duration-200 border border-transparent hover:border-border/40"
                                >
                                    <Avatar className="w-12 h-12 border-2 border-background shadow-sm ring-1 ring-border/10">
                                        <AvatarImage src={member.user?.image || ""} />
                                        <AvatarFallback className="bg-primary/5 text-primary font-medium">
                                            {initial}
                                        </AvatarFallback>
                                    </Avatar>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="font-semibold text-sm truncate text-foreground/90">
                                                {name}
                                            </p>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            <Badge 
                                                variant="outline" 
                                                className={`flex items-center gap-0.5 h-5 px-1.5 text-[10px] uppercase tracking-wider font-semibold border ${getRoleColor(member.role)}`}
                                            >
                                                {getRoleIcon(member.role)}
                                                {member.role}
                                            </Badge>
                                            <span className="text-[10px] text-muted-foreground/60">
                                                • Joined {new Date(member.joinedAt).getFullYear()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Menu (Creator can remove/change anyone, Admin can remove members) */}
                                    {((isCreator && member.userId !== currentUserId) || (isAdmin && member.role === 'MEMBER')) && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40">
                                                {isCreator && (
                                                    <>
                                                        <DropdownMenuItem onClick={() => onUpdateRole(member.userId, 'ADMIN')}>
                                                            <ShieldCheckIcon className="w-4 h-4 mr-2" />
                                                            Make Admin
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => onUpdateRole(member.userId, 'MEMBER')}>
                                                            <UserIcon className="w-4 h-4 mr-2" />
                                                            Make Member
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                    </>
                                                )}
                                                
                                                <DropdownMenuItem 
                                                    onClick={() => onRemoveMember(member.userId)}
                                                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Remove Member
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
                
                {!isMember && (
                    <div className="p-6 border-t border-border/40 mt-auto bg-gradient-to-t from-background/50 to-transparent">
                        <Button 
                            className="w-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all" 
                            size="lg"
                            onClick={onJoin}
                        >
                            Join Family Tree
                        </Button>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
