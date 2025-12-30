import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <h2 className="text-6xl font-bold mb-4">404</h2>
      <p className="text-xl text-muted-foreground mb-8">
        Oops! The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Button asChild className="rounded-full">
        <Link href="/">Return Home</Link>
      </Button>
    </div>
  );
}
