import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { User } from "@prisma/client";

export async function syncUser(): Promise<User | null> {
    const clerkUser = await currentUser();

    if (!clerkUser) {
        return null;
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
        console.warn(`User ${clerkUser.id} has no email address`);
        return null;
    }

    const user = await prisma.user.upsert({
        where: { id: clerkUser.id },
        update: {
            email: email,
        },
        create: {
            id: clerkUser.id,
            email: email,
        },
    });

    return user;
}
