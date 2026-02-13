'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, Wand2, ArrowRight, Layers, Image as ImageIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function BulkCreationPage() {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="z-10 max-w-5xl w-full space-y-12">
            <div className="text-center space-y-4">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-neutral-300 backdrop-blur-sm"
                >
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Bulk Creation Suite</span>
                </motion.div>
                <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-4xl md:text-5xl font-bold text-white tracking-tight"
                >
                    Start Large-Scale Generation
                </motion.h1>
                <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-lg text-neutral-400 max-w-2xl mx-auto"
                >
                    Choose your workflow to generate or edit hundreds of images at once with AI consistency.
                </motion.p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 px-4">
                {/* Text to Image Card */}
                <Link href="/bulk" className="group">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="relative h-full bg-neutral-900/40 hover:bg-neutral-900/60 border border-white/5 hover:border-amber-500/30 rounded-3xl p-8 transition-all duration-300 group-hover:shadow-[0_0_40px_-10px_rgba(245,158,11,0.15)] flex flex-col items-center text-center backdrop-blur-sm"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-amber-500/20">
                            <Sparkles className="w-10 h-10 text-amber-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">Text to Image</h2>
                        <p className="text-neutral-400 mb-8 leading-relaxed">
                            Generate hundreds of unique images from scratch using smart prompts and variables. Perfect for detailed catalogs.
                        </p>
                        
                        <div className="mt-auto w-full">
                            <Button className="w-full bg-neutral-800 hover:bg-amber-600 text-white border border-neutral-700 hover:border-amber-500 h-12 rounded-xl group-hover:translate-y-[-2px] transition-all duration-300">
                                Start Generating <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </motion.div>
                </Link>

                {/* Image to Image Card */}
                <Link href="/bulk-edit" className="group">
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="relative h-full bg-neutral-900/40 hover:bg-neutral-900/60 border border-white/5 hover:border-indigo-500/30 rounded-3xl p-8 transition-all duration-300 group-hover:shadow-[0_0_40px_-10px_rgba(99,102,241,0.15)] flex flex-col items-center text-center backdrop-blur-sm"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-indigo-500/20">
                            <Wand2 className="w-10 h-10 text-indigo-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">Image to Image</h2>
                        <p className="text-neutral-400 mb-8 leading-relaxed">
                            Upload a source image and generate variations using different prompts or styles. Ideal for product mockups.
                        </p>
                        
                        <div className="mt-auto w-full">
                            <Button className="w-full bg-neutral-800 hover:bg-indigo-600 text-white border border-neutral-700 hover:border-indigo-500 h-12 rounded-xl group-hover:translate-y-[-2px] transition-all duration-300">
                                Start Editing <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </motion.div>
                </Link>
            </div>
        </div>
    </div>
  );
}
