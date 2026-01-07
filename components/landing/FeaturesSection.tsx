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
        <div className="relative w-full h-full min-h-[6rem] rounded-xl bg-slate-50 dark:bg-slate-900 overflow-hidden flex items-center justify-center">
             <div className="absolute inset-0 z-0 opacity-50">
                  <svg className="w-full h-full absolute inset-0 text-slate-200 dark:text-slate-800" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="grid-pattern-canvas" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="1"/>
                        </pattern>
                    </defs>
                    <motion.rect 
                        width="100%" 
                        height="100%" 
                        fill="url(#grid-pattern-canvas)" 
                        animate={{ x: [0, -20], y: [0, -20] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                    />
                </svg>
             </div>
             
             {/* Static Node Card */}
             <div className="absolute top-1/4 left-1/4 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm z-10 flex items-center gap-2 w-24">
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 flex-shrink-0" />
                <div className="space-y-1 w-full">
                    <div className="h-1.5 w-10 bg-slate-300 dark:bg-slate-600 rounded" />
                    <div className="h-1.5 w-6 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
             </div>

             {/* Connection Line */}
             <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                <motion.path
                    d="M 33% 38% L 65% 65%"
                    stroke="currentColor" 
                    className="text-indigo-400"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 4, times: [0, 0.4, 0.8, 1], repeat: Infinity, delay: 1 }}
                />
             </svg>

             {/* Draggable Node Card */}
             <motion.div
                className="absolute z-20 p-2 rounded-lg bg-white dark:bg-slate-800 border-2 border-indigo-500 shadow-xl flex items-center gap-2 w-24"
                initial={{ top: '60%', left: '70%', scale: 1 }}
                animate={{ 
                    top: ['60%', '60%', '55%', '55%', '60%'], 
                    left: ['70%', '70%', '40%', '40%', '70%'],
                    scale: [1, 1.05, 1.05, 1, 1],
                    zIndex: [20, 30, 30, 20, 20]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", times: [0, 0.2, 0.5, 0.8, 1] }}
             >
                 <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 flex-shrink-0" />
                <div className="space-y-1 w-full">
                    <div className="h-1.5 w-10 bg-slate-300 dark:bg-slate-600 rounded" />
                    <div className="h-1.5 w-6 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
             </motion.div>

             {/* Mac-style Hand Cursor */}
             <motion.div
                className="absolute z-40 pointer-events-none"
                initial={{ top: '65%', left: '75%', opacity: 0 }}
                animate={{ 
                    top: ['65%', '62%', '62%', '45%', '45%', '65%'], 
                    left: ['75%', '72%', '72%', '45%', '45%', '75%'],
                    scale: [1, 1, 0.9, 0.9, 1, 1],
                    opacity: [0, 1, 1, 1, 0, 0]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", times: [0, 0.1, 0.2, 0.5, 0.8, 1] }}
             >
                 {/* Mac Hand Cursor SVG */}
                 <svg className="w-8 h-8 drop-shadow-md" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path 
                        d="M13,3c0,0-0.4-0.1-0.9-0.1c-2.4,0-4.4,2-4.4,4.4v8.1c-0.6-0.7-1.5-1.1-2.4-1.1c-1.8,0-3.3,1.5-3.3,3.3c0,0.5,0.1,0.9,0.3,1.3l2.8,7.9c0.8,2.3,3,3.8,5.4,3.8h8.6c3.1,0,5.6-2.5,5.6-5.6v-10c0-2.4-1.9-4.4-4.3-4.4c-0.4,0-0.7,0.1-1.1,0.2V8.9c0-2.4-2-4.4-4.4-4.4c-0.4,0-0.8,0.1-1.2,0.2V3z" 
                        fill="black" 
                        stroke="white" 
                        strokeWidth="1.5"
                        transform="scale(0.8) translate(2, 2)"
                    />
                 </svg>
             </motion.div>
        </div>
    );
};

const AnimatedShield = () => {
    return (
        <div className="relative w-full h-full min-h-[6rem] rounded-xl bg-slate-50 dark:bg-slate-900 overflow-hidden flex flex-col items-center justify-center p-4">
             <div className="w-full space-y-2 relative z-0 blur-[2px] opacity-50 scale-95">
                <div className="h-2 w-3/4 bg-slate-300 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-2 w-full bg-slate-300 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-2 w-5/6 bg-slate-300 dark:bg-slate-700 rounded animate-pulse" />
                 <div className="h-2 w-2/3 bg-slate-300 dark:bg-slate-700 rounded animate-pulse" />
             </div>
             
             <motion.div 
                className="absolute inset-0 z-10 flex items-center justify-center bg-white/10 dark:bg-black/10 backdrop-blur-[1px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
             >
                <div className="relative">
                    <motion.div
                        className="absolute inset-0 bg-green-500/30 rounded-full"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                    <div className="bg-white dark:bg-black p-3 rounded-full shadow-xl border border-green-100 dark:border-green-900/30">
                        <IconLock className="w-8 h-8 text-green-500" />
                    </div>
                </div>
             </motion.div>
        </div>
    );
};

const AnimatedCollaboration = () => {
    return (
        <div className="relative w-full h-full min-h-[6rem] rounded-xl bg-slate-50 dark:bg-slate-900 overflow-hidden">
             {/* Mock Content */}
              <div className="absolute inset-0 p-4 opacity-30">
                 <div className="grid grid-cols-2 gap-2">
                     <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                     <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                     <div className="col-span-2 h-16 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                 </div>
              </div>

             {/* Cursor 1 */}
             <motion.div
                className="absolute z-10"
                initial={{ top: '60%', left: '20%' }}
                animate={{ 
                    top: ['60%', '30%', '40%', '60%'], 
                    left: ['20%', '50%', '80%', '20%'] 
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
             >
                 <svg className="w-5 h-5 text-purple-500 fill-current" viewBox="0 0 24 24">
                     <path d="M5.5 3.21l12.32 7.74-4.59 1.48 3.01 7.23-2.09.87-3.01-7.23-3.69 3.09V3.21z"/>
                 </svg>
                 <div className="px-2 py-0.5 bg-purple-500 text-white text-[10px] rounded-full whitespace-nowrap ml-2 -mt-1 shadow-sm">
                    Sarah
                 </div>
             </motion.div>

              {/* Cursor 2 */}
             <motion.div
                className="absolute z-10"
                initial={{ top: '20%', left: '80%' }}
                animate={{ 
                    top: ['20%', '50%', '30%', '20%'], 
                    left: ['80%', '40%', '20%', '80%'] 
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
             >
                 <svg className="w-5 h-5 text-blue-500 fill-current" viewBox="0 0 24 24">
                     <path d="M5.5 3.21l12.32 7.74-4.59 1.48 3.01 7.23-2.09.87-3.01-7.23-3.69 3.09V3.21z"/>
                 </svg>
                 <div className="px-2 py-0.5 bg-blue-500 text-white text-[10px] rounded-full whitespace-nowrap ml-2 -mt-1 shadow-sm">
                    Mike
                 </div>
             </motion.div>
        </div>
    );
};

const AnimatedLayout = () => {
    // Animation cycle: 
    // 0-0.5: Scattered state
    // 0.5-2.0: Cursor moves from bottom to button
    // 2.0-2.3: Click button
    // 2.3-4.0: Nodes organize
    // 4.0-5.0: Hold
    // 5.0: Reset
    
     return (
        <div className="relative w-full h-full min-h-[6rem] rounded-xl bg-slate-50 dark:bg-slate-900 overflow-hidden flex flex-col items-center justify-between p-4">
             {/* Nodes Container */}
             <div className="relative w-full h-full">
                 {/* Root */}
                  <motion.div 
                    className="absolute p-1.5 rounded-lg bg-white dark:bg-slate-800 border-2 border-indigo-500 shadow-md z-20 flex items-center justify-center gap-1 w-16"
                    animate={{ 
                        top: ['50%', '50%', '50%', '0%', '0%', '50%'],
                        left: ['10%', '10%', '10%', '50%', '50%', '10%'],
                        x: ['0%', '0%', '0%', '-50%', '-50%', '0%']
                    }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", times: [0, 0.4, 0.45, 0.55, 0.9, 1] }}
                  >
                      <div className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900" />
                      <div className="w-8 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
                  </motion.div>

                  {/* Child 1 */}
                  <motion.div 
                    className="absolute p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm z-10 flex items-center justify-center gap-1 w-16"
                    animate={{ 
                        top: ['20%', '20%', '20%', '50%', '50%', '20%'],
                        left: ['70%', '70%', '70%', '20%', '20%', '70%'],
                        x: ['0%', '0%', '0%', '-20%', '-20%', '0%']
                    }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", times: [0, 0.4, 0.45, 0.55, 0.9, 1] }}
                  >
                      <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-700" />
                      <div className="w-8 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
                  </motion.div>

                   {/* Child 2 */}
                  <motion.div 
                    className="absolute p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm z-10 flex items-center justify-center gap-1 w-16"
                    animate={{ 
                        top: ['30%', '30%', '30%', '50%', '50%', '30%'],
                        left: ['40%', '40%', '40%', '50%', '50%', '40%'],
                        x: ['0%', '0%', '0%', '-50%', '-50%', '0%']
                    }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", times: [0, 0.4, 0.45, 0.55, 0.9, 1] }}
                  >
                       <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-700" />
                       <div className="w-8 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
                  </motion.div>
                                   {/* Child 3 */}
                   <motion.div 
                    className="absolute p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm z-10 flex items-center justify-center gap-1 w-16"
                    animate={{ 
                        top: ['70%', '70%', '70%', '50%', '50%', '70%'],
                        // Actually let's make it form a nice tree: Root(50%), Child1(20%), Child2(50%), Child3(80%)
                        left: ['60%', '60%', '60%', '80%', '80%', '60%'],
                        x: ['0%', '0%', '0%', '-80%', '-80%', '0%']
                    }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", times: [0, 0.4, 0.45, 0.55, 0.9, 1] }}
                  >
                       <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-700" />
                       <div className="w-8 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
                  </motion.div>
                  
                  {/* Lines (Fade in only when organized) */}
                   <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                       <motion.g
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0, 0, 1, 1, 0] }}
                            transition={{ duration: 5, repeat: Infinity, times: [0, 0.4, 0.5, 0.6, 0.9, 1] }}
                       >
                           {/* From Root (50%, 0%+h) to Children */}
                           <path d="M 50% 15% L 50% 30%" stroke="currentColor" strokeWidth="1" className="text-slate-300 dark:text-slate-600" />
                           
                           {/* Horizontal bar */}
                           <path d="M 20% 30% L 80% 30%" stroke="currentColor" strokeWidth="1" className="text-slate-300 dark:text-slate-600" />
                           
                           {/* Vertical drops to children */}
                           <path d="M 20% 30% L 20% 50%" stroke="currentColor" strokeWidth="1" className="text-slate-300 dark:text-slate-600" />
                           <path d="M 50% 30% L 50% 50%" stroke="currentColor" strokeWidth="1" className="text-slate-300 dark:text-slate-600" />
                           <path d="M 80% 30% L 80% 50%" stroke="currentColor" strokeWidth="1" className="text-slate-300 dark:text-slate-600" />
                       </motion.g>
                  </svg>
             </div>

             {/* UI Button */}
             <div className="relative z-20 bg-white/50 dark:bg-black/50 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-full px-3 py-1 flex items-center gap-2 mb-2">
                 <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Auto-Layout</div>
                 <motion.button
                    className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center cursor-pointer"
                    animate={{ scale: [1, 1, 0.9, 1, 1, 1] }}
                    transition={{ duration: 5, repeat: Infinity, times: [0, 0.4, 0.42, 0.45, 0.9, 1] }}
                 >
                     <motion.svg 
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5 text-white"
                        animate={{ rotate: [0, 0, 0, 180, 180, 0] }}
                        transition={{ duration: 5, repeat: Infinity, times: [0, 0.4, 0.45, 0.9, 0.95, 1] }}
                     >
                         <path d="M4 12v-1h16v1m-16 6h16M4 6h16" />
                     </motion.svg>
                 </motion.button>
             </div>

             {/* Click Cursor in Layout */}
             <motion.div
                className="absolute z-40 pointer-events-none"
                animate={{ 
                    top: ['120%', '85%', '85%', '120%', '120%'], 
                    left: ['90%', '70%', '70%', '90%', '90%'],
                    opacity: [0, 1, 1, 0, 0]
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", times: [0, 0.35, 0.45, 0.55, 1] }}
             >
                {/* Same Mac Hand Cursor */}
                 <svg className="w-8 h-8 drop-shadow-md" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path 
                        d="M13,3c0,0-0.4-0.1-0.9-0.1c-2.4,0-4.4,2-4.4,4.4v8.1c-0.6-0.7-1.5-1.1-2.4-1.1c-1.8,0-3.3,1.5-3.3,3.3c0,0.5,0.1,0.9,0.3,1.3l2.8,7.9c0.8,2.3,3,3.8,5.4,3.8h8.6c3.1,0,5.6-2.5,5.6-5.6v-10c0-2.4-1.9-4.4-4.3-4.4c-0.4,0-0.7,0.1-1.1,0.2V8.9c0-2.4-2-4.4-4.4-4.4c-0.4,0-0.8,0.1-1.2,0.2V3z" 
                        fill="black" 
                        stroke="white" 
                        strokeWidth="1.5"
                        transform="scale(0.8) translate(2, 2)"
                    />
                 </svg>
             </motion.div>
        </div>
    );
};

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
