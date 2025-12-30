import { syncUser } from "@/lib/auth-sync";
import { redirect } from "next/navigation";

export default async function TreeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await syncUser();

    if (!user) {

        redirect("/"); 
    }

    return (
        <>
            {children}
        </>
    );
}
