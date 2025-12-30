"use client";
import React from "react";
import { BentoGrid, BentoGridItem } from "../ui/bento-grid";
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

const Skeleton = ({ className }: { className?: string }) => (
    <div className={`flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-slate-200 dark:bg-slate-900 ${className}`}></div>
);

const items = [
  {
    title: "Interactive Canvas",
    description: "An infinite canvas to map out your lineage. Drag, connect, and organize with ease.",
    header: <Skeleton className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-100 dark:border-blue-900/50" />,
    icon: <IconHierarchy className="h-5 w-5 text-blue-500" />,
  },
  {
    title: "Privacy First",
    description: "Your data is yours. End-to-end encryption ensures your family secrets stay within the family.",
    header: <Skeleton className="bg-slate-100 dark:bg-slate-800" />,
    icon: <IconLock className="h-5 w-5 text-slate-500" />,
  },
  {
    title: "Real-time Collaboration",
    description: "Work together with your relatives. See changes happen live as you build the tree together.",
    header: <Skeleton className="bg-slate-100 dark:bg-slate-800" />,
    icon: <IconUsers className="h-5 w-5 text-slate-500" />,
  },
  {
    title: "Smart Auto-Layout",
    description:
      "Automatically arrange complex family structures into clean, readable diagrams with one click.",
    header: <Skeleton className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-100 dark:border-purple-900/50" />,
    icon: <IconClipboardCopy className="h-5 w-5 text-purple-500" />,
  },
];
