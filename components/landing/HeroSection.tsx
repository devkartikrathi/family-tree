"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { DemoCanvas } from "./DemoCanvas";

export function HeroSection() {
  return (
    <div className="min-h-screen w-full bg-background relative flex items-center justify-center overflow-hidden pt-20 pb-10 px-4 md:px-8">
      
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        
        {/* Left Column: Content */}
        <div className="flex flex-col gap-6 text-center lg:text-left items-center lg:items-start">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium mb-4">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    v1.0 Now Available
                </div>
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
                    Document your <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Family Legacy.</span>
                </h1>
            </motion.div>

            <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-lg text-muted-foreground max-w-lg leading-relaxed mx-auto lg:mx-0"
            >
                A powerful, interactive node-based system to visualize your ancestry. 
                Collaborate in real-time, secure your data, and pass down your history with clarity.
            </motion.p>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex flex-col sm:flex-row gap-4 mt-2 w-full sm:w-auto"
            >
                <Link href="/tree" className="w-full sm:w-auto">
                    <Button size="lg" className="h-12 px-8 text-base rounded-lg shadow-sm w-full sm:w-auto">
                        Start Building Free <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                </Link>
                <Link href="#features" className="w-full sm:w-auto">
                    <Button variant="ghost" size="lg" className="h-12 px-8 text-base text-muted-foreground hover:bg-muted rounded-lg w-full sm:w-auto">
                        View Features
                    </Button>
                </Link>
            </motion.div>

            <motion.div
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 transition={{ duration: 0.5, delay: 0.4 }}
                 className="flex items-center justify-center lg:justify-start gap-6 mt-4 text-sm text-muted-foreground font-medium w-full"
            >
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500"/> Always Free</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500"/> Open Source</div>
            </motion.div>
        </div>

        {/* Right Column: Interactive Demo/Canvas */}
        <motion.div
            initial={{ opacity: 0, scale: 0.95, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2, type: "spring" }}
            className="relative h-[500px] w-full"
        >
             {/* Decorative Elements */}
            <div className="absolute -top-12 -right-12 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl z-0"></div>
            <div className="absolute -bottom-12 -left-12 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl z-0"></div>
            
            <DemoCanvas />
        </motion.div>

      </div>
    </div>
  );
}
