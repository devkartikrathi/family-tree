"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Users, PlusCircle, Trash2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";
import { Family } from "@/lib/types";

export default function TreeIndexPage() {
    const { userId } = useAuth();
    const router = useRouter();
    const [joinId, setJoinId] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [families, setFamilies] = useState<Family[]>([]);


    useEffect(() => {
        const fetchFamilies = async () => {
            try {
                const res = await fetch('/api/families');
                if (res.ok) {
                    const data = await res.json();
                    setFamilies(data);
                }
            } catch (error) {
                console.error("Failed to load families", error);
            } finally {

            }
        };
        fetchFamilies();
    }, []);

    const handleCreate = async () => {
        try {
            setIsCreating(true);
            const res = await fetch('/api/families', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'My New Family' })
            });
            
            if (!res.ok) throw new Error('Failed to create family');
            
            const family = await res.json();
            router.push(`/tree/${family.id}`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to create family. Please try again.");
            setIsCreating(false);
        }
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinId.trim()) return;

        setIsJoining(true);
        try {
            const res = await fetch('/api/families/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId: joinId.trim() })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to join family');
            }

            const data = await res.json();
            router.push(`/tree/${data.family.id}`);
        } catch (error) {
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                 toast.error("An unknown error occurred");
            }
            setIsJoining(false);
        }
    };

    const handleLeave = async (e: React.MouseEvent, familyId: string) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to remove this family from your list?")) return;

        try {
            const res = await fetch('/api/families/leave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId })
            });

            if (!res.ok) throw new Error("Failed to leave family");

            setFamilies(prev => prev.filter(f => f.id !== familyId));
            toast.success("Family removed from your list");
        } catch {
            toast.error("Failed to remove family");
        }
    };

    const handleDeleteFamily = async (e: React.MouseEvent, familyId: string) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to PERMANENTLY delete this family? This action cannot be undone.")) return;

        try {
            const res = await fetch(`/api/families/${familyId}`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error("Failed to delete family");

            setFamilies(prev => prev.filter(f => f.id !== familyId));
            toast.success("Family deleted successfully");
        } catch {
            toast.error("Failed to delete family");
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
            
            <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8">
                

                <div className="group relative bg-card text-card-foreground border border-border rounded-3xl p-8 hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-xl">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                         <PlusCircle className="w-24 h-24" />
                    </div>
                    
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold mb-2">Create New Legacy</h2>
                            <p className="text-muted-foreground">Start a fresh family tree from scratch. Perfect for documenting your own lineage.</p>
                        </div>
                        
                        <div className="mt-auto">
                            <Button 
                                onClick={handleCreate} 
                                disabled={isCreating}
                                size="lg" 
                                className="w-full rounded-full"
                            >
                                {isCreating ? 'Creating...' : 'Start New Tree'}
                                {!isCreating && <ArrowRight className="ml-2 w-4 h-4" />}
                            </Button>
                        </div>
                    </div>
                </div>


                <div className="group relative bg-card text-card-foreground border border-border rounded-3xl p-8 hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-xl">
                     <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                         <Users className="w-24 h-24" />
                    </div>

                    <div className="relative z-10 flex flex-col h-full">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold mb-2">Join Existing Family</h2>
                            <p className="text-muted-foreground">Have a family ID? Enter it here to collaborate on an existing heritage.</p>
                        </div>
                        
                        <div className="mt-auto">
                            <form onSubmit={handleJoin} className="flex flex-col gap-4">
                                <Input 
                                    type="text" 
                                    placeholder="Enter Family ID (UUID)" 
                                    value={joinId}
                                    onChange={(e) => setJoinId(e.target.value)}
                                    className="w-full px-4 py-6 rounded-xl"
                                />
                                <Button 
                                    type="submit"
                                    disabled={isJoining || !joinId}
                                    size="lg" 
                                    variant="outline"
                                    className="w-full rounded-full"
                                >
                                    {isJoining ? 'Joining...' : 'Join Family'}
                                    {!isJoining && <ArrowRight className="ml-2 w-4 h-4" />}
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>

            </div>
            

            {families.length > 0 && (
                <div className="mt-12 w-full max-w-4xl">
                    <h3 className="text-xl font-semibold mb-4 text-foreground">Your Families</h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {families.map((family) => (
                            <div 
                                key={family.id}
                                onClick={() => router.push(`/tree/${family.id}`)}
                                className="cursor-pointer bg-card text-card-foreground border border-border p-4 rounded-xl hover:border-primary/50 hover:shadow-md transition-all flex flex-col group relative"
                            >
                                <div className="flex flex-col items-start h-full">
                                    <h4 className="font-medium text-lg mb-1">{family.name}</h4>
                                    <span className="text-xs text-muted-foreground mb-3">Created: {new Date(family.createdAt).toLocaleDateString()}</span>
                                    
                                    {userId && (
                                        <>
                                            {family.userId !== userId ? (
                                                <button 
                                                    onClick={(e) => handleLeave(e, family.id)}
                                                    className="flex items-center gap-2 text-xs font-medium text-destructive hover:bg-destructive/10 px-3 py-1.5 -ml-3 rounded-lg transition-colors mb-2"
                                                    title="Leave this family"
                                                >
                                                    <LogOut className="w-3.5 h-3.5" />
                                                    Leave Family
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={(e) => handleDeleteFamily(e, family.id)}
                                                    className="flex items-center gap-2 text-xs font-medium text-destructive hover:bg-destructive/10 px-3 py-1.5 -ml-3 rounded-lg transition-colors mb-2"
                                                    title="Delete this family permanently"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Delete Family
                                                </button>
                                            )}
                                        </>
                                    )}

                                    <div className="mt-auto flex justify-end w-full text-primary text-sm font-medium items-center group/link">
                                        Open Tree <ArrowRight className="ml-1 w-3 h-3 group-hover/link:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <p className="mt-12 text-center text-muted-foreground text-sm">
                Need help finding your Family ID? Ask the person who invited you.
            </p>
        </div>
    );
}
