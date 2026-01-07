"use client";
import { Button } from "../ui/button";
import Link from "next/link";

export function CTASection() {
  return (
    <div className="relative py-32 bg-slate-50 dark:bg-black flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        {/* Subtle Background */}
        <div className="absolute inset-0 w-full h-full bg-slate-50 dark:bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
      
      <div className="relative z-10 max-w-2xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
          Start your legacy today.
        </h2>
        <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
          Create, collaborate, and preserve your family history with the tools built for the future. Open source and free forever.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto">
            <Link href="/tree" className="w-full sm:w-auto">
                <Button size="lg" className="h-12 px-8 rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-200 w-full sm:w-auto">
                    Get Started for Free
                </Button>
            </Link>
        </div>
      </div>
      
    </div>
  );
}
