"use client";
import React from "react";
import { BentoGrid, BentoGridItem } from "../ui/bento-grid";
import { motion } from "motion/react";
import {
  IconClipboardCopy,
  IconLock,
  IconUsers,
  IconHierarchy,
} from "@tabler/icons-react";

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-slate-50 dark:bg-black border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 mb-16 text-center">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
               Built for generations.
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                A complete toolkit to preserve your family&apos;s history, designed with privacy and longevity in mind.
            </p>
        </div>
        
      <BentoGrid className="max-w-5xl mx-auto px-4">
        {items.map((item, i) => (
          <BentoGridItem
            key={i}
            title={item.title}
            description={item.description}
            header={item.header}
            icon={item.icon}
            className={i === 3 || i === 0 ? "md:col-span-2" : ""}
          />
        ))}
      </BentoGrid>
    </section>
  );
}

const AnimatedCanvas = () => {
    return (
        <div className="relative w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 overflow-hidden flex items-center justify-center">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
            >
                 <svg className="w-full h-full absolute inset-0 pointer-events-none opacity-30" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid-pattern)" />
                </svg>
            </motion.div>

             <motion.div
                className="absolute w-8 h-8 rounded-full bg-blue-500 shadow-lg z-10"
                animate={{
                    x: [0, 50, -50, 0],
                    y: [0, 30, -30, 0],
                }}
                transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
            <motion.div
                className="absolute w-8 h-8 rounded-full bg-indigo-500 shadow-lg z-10"
                style={{ top: '30%', left: '30%'}}
                animate={{
                    x: [0, -30, 40, 0],
                    y: [0, 40, -20, 0],
                }}
                transition={{
                    duration: 7,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
             {/* Lines connecting nodes - simplified for demo */}
             <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <motion.path
                    d="M 120 80 L 180 110"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-slate-400 dark:text-slate-600"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                />
             </svg>
        </div>
    );
};

const AnimatedShield = () => {
    return (
        <div className="relative w-full h-full min-h-[6rem] rounded-xl bg-slate-100 dark:bg-slate-900 overflow-hidden flex items-center justify-center">
             <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
             >
                <div className="relative">
                     <motion.div
                        animate={{
                            boxShadow: ["0 0 0 0px rgba(34, 197, 94, 0.2)", "0 0 0 20px rgba(34, 197, 94, 0)"]
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeOut"
                        }}
                        className="absolute inset-0 rounded-full bg-green-500/20"
                     />
                    <IconLock className="w-12 h-12 text-green-600 dark:text-green-500 relative z-10" />
                </div>
             </motion.div>
        </div>
    );
};

const AnimatedCollaboration = () => {
    return (
        <div className="relative w-full h-full min-h-[6rem] rounded-xl bg-slate-100 dark:bg-slate-900 overflow-hidden">
             <motion.div
                className="absolute top-1/4 left-1/4"
                animate={{
                    x: [0, 40, 0],
                    y: [0, 20, 0],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
             >
                 <IconUsers className="w-6 h-6 text-blue-500" />
                 <div className="px-2 py-0.5 bg-blue-500 text-white text-[10px] rounded-full absolute -top-4 -right-4">You</div>
             </motion.div>

              <motion.div
                className="absolute bottom-1/4 right-1/4"
                animate={{
                    x: [0, -30, 0],
                    y: [0, -40, 0],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
             >
                 <IconUsers className="w-6 h-6 text-purple-500" />
                 <div className="px-2 py-0.5 bg-purple-500 text-white text-[10px] rounded-full absolute -top-4 -right-4">Cousin</div>
             </motion.div>
        </div>
    );
};

const AnimatedLayout = () => {
     return (
        <div className="relative w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-100 dark:border-purple-900/50 overflow-hidden flex items-center justify-center gap-2">
             <motion.div
                className="w-8 h-8 rounded bg-purple-400"
                layout
                animate={{ rotate: 180 }}
                transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
             />
              <motion.div
                className="w-12 h-12 rounded bg-pink-400"
                layout
                animate={{ borderRadius: ["20%", "50%", "20%"] }}
                transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
             />
               <motion.div
                className="w-6 h-6 rounded bg-purple-300"
                layout
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
             />
        </div>
    );
}

const items = [
  {
    title: "Interactive Canvas",
    description: "An infinite canvas to map out your lineage. Drag, connect, and organize with ease.",
    header: <AnimatedCanvas />,
    icon: <IconHierarchy className="h-5 w-5 text-blue-500" />,
  },
  {
    title: "Privacy First",
    description: "Your data is yours. End-to-end encryption ensures your family secrets stay within the family.",
    header: <AnimatedShield />,
    icon: <IconLock className="h-5 w-5 text-slate-500" />,
  },
  {
    title: "Real-time Collaboration",
    description: "Work together with your relatives. See changes happen live as you build the tree together.",
    header: <AnimatedCollaboration />,
    icon: <IconUsers className="h-5 w-5 text-slate-500" />,
  },
  {
    title: "Smart Auto-Layout",
    description:
      "Automatically arrange complex family structures into clean, readable diagrams with one click.",
    header: <AnimatedLayout />,
    icon: <IconClipboardCopy className="h-5 w-5 text-purple-500" />,
  },
];
