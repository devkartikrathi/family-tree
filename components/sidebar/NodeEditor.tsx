
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label";
import { FamilyNodeData } from "@/lib/types";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect } from "react";

const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
    "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const personSchema = z.object({
  name: z.string().min(2, "Name is required"),
  dateOfBirth: z.string().optional(),
  dateOfDeath: z.string().optional(),
  birthLocation: z.string().optional(),
  deathLocation: z.string().optional(),
  occupation: z.string().optional(),
  alive: z.boolean(),
  notes: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  latitude: z.union([z.string(), z.number()]).optional(),
  longitude: z.union([z.string(), z.number()]).optional(),
});

const formSchema = z.object({
  familySurname: z.string().min(2, "Surname is required"),
  primary: personSchema,
  hasSpouse: z.boolean(),
  spouse: z.object({
      name: z.string().optional(),
      dateOfBirth: z.string().optional(),
      dateOfDeath: z.string().optional(),
      birthLocation: z.string().optional(),
      deathLocation: z.string().optional(),
      occupation: z.string().optional(),
      alive: z.boolean().optional(),
      notes: z.string().optional(),
  }).optional(),
  primaryRootNodeId: z.string().optional(),
  spouseRootNodeId: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.hasSpouse) {
        if (!data.spouse?.name || data.spouse.name.length < 2) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Spouse name is required",
                path: ["spouse", "name"]
             });
        }
    }
});

interface NodeEditorProps {
    initialData?: Partial<FamilyNodeData>;
    onSave: (data: FamilyNodeData) => void;
    onCancel: () => void;
}

export function NodeEditor({ initialData, onSave, onCancel }: NodeEditorProps) {
    const defaultValues: Partial<z.infer<typeof formSchema>> = {
        familySurname: initialData?.familySurname || "",
        primary: {
            name: initialData?.primary?.name || "",
            dateOfBirth: initialData?.primary?.dateOfBirth || "",
            dateOfDeath: initialData?.primary?.dateOfDeath || "",
            birthLocation: initialData?.primary?.birthLocation || "",
            deathLocation: initialData?.primary?.deathLocation || "",
            occupation: initialData?.primary?.occupation || "",
            alive: initialData?.primary?.alive ?? true,
            notes: initialData?.primary?.notes || "",
            city: initialData?.primary?.city || "",
            state: initialData?.primary?.state || "",
            pincode: initialData?.primary?.pincode || "",
            latitude: initialData?.primary?.latitude || "",
            longitude: initialData?.primary?.longitude || "",
        },
        hasSpouse: !!initialData?.spouse,
        spouse: initialData?.spouse ? {
            name: initialData.spouse.name,
            alive: initialData.spouse.alive ?? true,
            dateOfBirth: initialData.spouse.dateOfBirth || "",
            dateOfDeath: initialData.spouse.dateOfDeath || "",
            birthLocation: initialData.spouse.birthLocation || "",
            deathLocation: initialData.spouse.deathLocation || "",
            occupation: initialData.spouse.occupation || "",
            notes: initialData.spouse.notes || ""
        } : { 
            name: "", 
            alive: true,
            dateOfBirth: "",
            dateOfDeath: "",
            birthLocation: "",
            deathLocation: "",
            occupation: "",
            notes: ""
        },
        primaryRootNodeId: initialData?.primaryRootNodeId || "",
        spouseRootNodeId: initialData?.spouseRootNodeId || "",
    };

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues,
    });

    const hasSpouse = useWatch({ control: form.control, name: "hasSpouse" });
    const primaryAlive = useWatch({ control: form.control, name: "primary.alive" });
    const spouseAlive = useWatch({ control: form.control, name: "spouse.alive" });


    function onSubmit(values: z.infer<typeof formSchema>) {
        const submissionData: FamilyNodeData = {
            familySurname: values.familySurname,
            primary: values.primary,
            primaryRootNodeId: values.primaryRootNodeId || undefined,
            spouseRootNodeId: values.spouseRootNodeId || undefined,
            spouse: values.hasSpouse && values.spouse && values.spouse.name ? {
                name: values.spouse.name,
                alive: values.spouse.alive ?? true,
                dateOfBirth: values.spouse.dateOfBirth,
                dateOfDeath: values.spouse.dateOfDeath,
                birthLocation: values.spouse.birthLocation,
                deathLocation: values.spouse.deathLocation,
                occupation: values.spouse.occupation,
                notes: values.spouse.notes
            } : undefined
        };
        onSave(submissionData);
    }

    function onError() {
        toast.error("Please check the form for errors.");
    }

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">{initialData ? 'Edit Family Node' : 'New Family Node'}</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6">
                        
                        <FormField
                            control={form.control}
                            name="familySurname"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Family Surname</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Windsor" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Separator />
                        
                        <div className="space-y-4">
                            <h4 className="font-semibold text-sm text-primary">Primary Person</h4>
                            
                            <FormField
                                control={form.control}
                                name="primary.name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Full Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John Doe" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            {/* Location Section */}
                            <div className="p-3 bg-secondary/20 rounded-md space-y-3">
                                <h5 className="text-xs font-medium text-muted-foreground uppercase">Current Location (for Map)</h5>
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField
                                        control={form.control}
                                        name="primary.city"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>City</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Mumbai" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name="primary.state"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>State</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select State" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {INDIAN_STATES.map((state) => (
                                                            <SelectItem key={state} value={state}>
                                                                {state}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField
                                        control={form.control}
                                        name="primary.pincode"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Pincode</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. 400001" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField
                                        control={form.control}
                                        name="primary.latitude"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Latitude (Edit if needed)</FormLabel>
                                                <FormControl>
                                                    <Input {...field} value={field.value || ''} onChange={e => field.onChange(e.target.value)} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="primary.longitude"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Longitude (Edit if needed)</FormLabel>
                                                <FormControl>
                                                    <Input {...field} value={field.value || ''} onChange={e => field.onChange(e.target.value)} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                           <div className="grid grid-cols-2 gap-3">
                                <FormField
                                    control={form.control}
                                    name="primary.dateOfBirth"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Birth Date</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                
                                <FormField
                                    control={form.control}
                                    name="primary.birthLocation"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Birth Place</FormLabel>
                                            <FormControl>
                                                <Input placeholder="City, Country" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                           </div>

                            <FormField
                                control={form.control}
                                name="primary.alive"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 rounded-md border p-3 h-[50px]">
                                        <FormControl>
                                            <input 
                                                type="checkbox" 
                                                checked={field.value} 
                                                onChange={field.onChange}
                                                className="w-4 h-4 accent-primary"
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>
                                                Living?
                                            </FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            {!primaryAlive && (
                               <div className="grid grid-cols-2 gap-3">
                                    <FormField
                                        control={form.control}
                                        name="primary.dateOfDeath"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Death Date</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="primary.deathLocation"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Death Place</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="City, Country" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                               </div>
                            )}

                            <FormField
                                control={form.control}
                                name="primary.occupation"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Occupation</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Software Engineer" {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="primary.notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notes</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Bio or other details..." {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                           <FormField
                                control={form.control}
                                name="primaryRootNodeId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Primary Parents (Root ID)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Paste UUID of parents' node..." className="font-mono text-xs" {...field} />
                                        </FormControl>
                                        <FormDescription>UUID of the node containing this person&apos;s parents</FormDescription>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <Separator />

                        <FormField
                            control={form.control}
                            name="hasSpouse"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Spouse</FormLabel>
                                        <FormDescription>
                                            Does this family unit include a spouse?
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <input 
                                            type="checkbox" 
                                            checked={field.value} 
                                            onChange={field.onChange}
                                            className="w-5 h-5 accent-primary"
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        {hasSpouse && (
                             <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                                <h4 className="font-semibold text-sm text-primary">Spouse Details</h4>
                                
                                <FormField
                                    control={form.control}
                                    name="spouse.name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Full Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Jane Doe" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                               <div className="grid grid-cols-2 gap-3">
                                    <FormField
                                        control={form.control}
                                        name="spouse.dateOfBirth"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Birth Date</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="spouse.birthLocation"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Birth Place</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="City, Country" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                               </div>
                                    
                                <FormField
                                    control={form.control}
                                    name="spouse.alive"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-x-3 rounded-md border p-3 h-[50px]">
                                            <FormControl>
                                                    <input 
                                                    type="checkbox" 
                                                    checked={field.value} 
                                                    onChange={field.onChange}
                                                    className="w-4 h-4 accent-primary"
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>
                                                    Living?
                                                </FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />

                               {!spouseAlive && (
                                   <div className="grid grid-cols-2 gap-3">
                                        <FormField
                                            control={form.control}
                                            name="spouse.dateOfDeath"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Death Date</FormLabel>
                                                    <FormControl>
                                                        <Input type="date" {...field} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="spouse.deathLocation"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Death Place</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="City, Country" {...field} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                   </div>
                               )}

                                <FormField
                                    control={form.control}
                                    name="spouse.occupation"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Occupation</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Software Engineer" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="spouse.notes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Notes</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Bio or other details..." {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                               <FormField
                                    control={form.control}
                                    name="spouseRootNodeId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Spouse Parents (Root ID)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Paste UUID of spouse' parents..." className="font-mono text-xs" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        <div className="pt-4 flex gap-2">
                            <Button type="submit" className="flex-1">Save Family Node</Button>
                            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
}
