'use client';

import { useState } from 'react';
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Layers, Eye, Play, History, Globe, Lock } from "lucide-react";
import Link from 'next/link';
import { toast } from "sonner";

const PRESETS = {
  colors: ["red", "blue", "green", "orange", "black", "white", "brown", "gray", "golden", "silver"],
  environments: ["indoor", "outdoor", "studio", "nature", "urban", "forest", "beach", "mountain"],
  actions: ["sitting", "standing", "running", "sleeping", "eating", "playing", "walking", "jumping"],
  styles: ["photorealistic", "cinematic", "artistic", "professional", "detailed", "studio lit"],
  lighting: ["natural", "studio", "golden hour", "dramatic", "soft", "backlit"],
  camera: ["close-up", "portrait", "full body", "wide angle", "macro", "eye-level"]
};

export default function BulkGeneratePage() {
  const { user, loading: authLoading } = useAuth();
  
  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [targetSubject, setTargetSubject] = useState('');
  const [totalImages, setTotalImages] = useState(100);
  const [model, setModel] = useState('sd15');
  const [isPublic, setIsPublic] = useState(true);
  
  // Variations - all selected by default
  const [colors, setColors] = useState<string[]>([...PRESETS.colors]);
  const [environments, setEnvironments] = useState<string[]>([...PRESETS.environments]);
  const [actions, setActions] = useState<string[]>([...PRESETS.actions]);
  const [styles, setStyles] = useState<string[]>(['photorealistic']);
  const [lighting, setLighting] = useState<string[]>([...PRESETS.lighting]);
  const [camera, setCamera] = useState<string[]>([...PRESETS.camera]);
  
  // UI State
  const [previewPrompts, setPreviewPrompts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  
  const buildVariations = () => ({ colors, environments, actions, styles, lighting, camera });
  
  const generatePreview = async () => {
    if (!targetSubject.trim()) { toast.error("Enter a target subject"); return; }
    setIsPreviewing(true);
    try {
      const res = await api.post('/batch/preview', {
        target_subject: targetSubject,
        variations: buildVariations(),
        count: 3
      });
      if (res.data.success) {
        setPreviewPrompts(res.data.data.prompts);
        toast.success(`${res.data.data.max_unique_combinations} unique combinations possible`);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Preview failed");
    } finally {
      setIsPreviewing(false);
    }
  };
  
  const createBatchJob = async () => {
    if (!targetSubject.trim() || !category.trim()) { toast.error("Fill required fields"); return; }
    setIsLoading(true);
    try {
      const res = await api.post('/batch', {
        name: name || `${targetSubject} batch`,
        category,
        target_subject: targetSubject,
        total_images: totalImages,
        variations: buildVariations(),
        model,
        width: 512,
        height: 512,
        is_public: isPublic
      });
      if (res.data.success) {
        toast.success(`Batch created! ID: ${res.data.data.id}`);
        setName(''); setTargetSubject(''); setPreviewPrompts([]);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed");
    } finally {
      setIsLoading(false);
    }
  };

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  };
  
  const selectAll = () => {
    setColors([...PRESETS.colors]); setEnvironments([...PRESETS.environments]);
    setActions([...PRESETS.actions]); setStyles([...PRESETS.styles]);
    setLighting([...PRESETS.lighting]); setCamera([...PRESETS.camera]);
  };
  
  const clearAll = () => {
    setColors([]); setEnvironments([]); setActions([]);
    setStyles([]); setLighting([]); setCamera([]);
  };
  
  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-neutral-950"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  
  if (!user) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 gap-3">
      <Layers className="w-12 h-12 text-neutral-700" />
      <h1 className="text-xl font-bold text-white">Login Required</h1>
      <Link href="/login"><Button className="bg-indigo-600 hover:bg-indigo-700">Login</Button></Link>
    </div>
  );
  
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-neutral-950/80 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Layers className="w-6 h-6 text-amber-400" />
              <h1 className="text-xl font-bold">Bulk Generate</h1>
            </div>
            
            <Link href="/bulk/history">
              <Button variant="ghost" className="border border-neutral-700 bg-neutral-800/80 text-white hover:bg-neutral-700 hover:text-white h-10 px-6 text-sm transition-all duration-200 shadow-sm">
                <History className="w-4 h-4 mr-2 text-indigo-400" />
                View Batches
              </Button>
            </Link>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-6">
        {/* Config Row */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 ml-1">Batch Name</label>
              <Input placeholder="e.g. Summer Collection" value={name} onChange={(e) => setName(e.target.value)} className="bg-neutral-950 border-neutral-800 h-10 text-sm focus-visible:ring-indigo-500/50 text-neutral-100 placeholder:text-neutral-600" />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 ml-1">Category*</label>
              <Input placeholder="e.g. Animals" value={category} onChange={(e) => setCategory(e.target.value)} className="bg-neutral-950 border-neutral-800 h-10 text-sm focus-visible:ring-indigo-500/50 text-neutral-100 placeholder:text-neutral-600" />
            </div>
            
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-medium text-neutral-300 ml-1">Object of Interest*</label>
              <Input placeholder="e.g. A cute scottish fold cat" value={targetSubject} onChange={(e) => setTargetSubject(e.target.value)} className="bg-neutral-950 border-neutral-800 h-10 text-sm focus-visible:ring-indigo-500/50 text-neutral-100 placeholder:text-neutral-600" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 ml-1">Quantity</label>
              <Input type="number" min={1} max={10000} value={totalImages} onChange={(e) => setTotalImages(Number(e.target.value))} className="bg-neutral-950 border-neutral-800 h-10 text-sm focus-visible:ring-indigo-500/50 text-neutral-100" />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 ml-1">Model</label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="bg-neutral-950 border-neutral-800 h-10 text-sm focus-visible:ring-indigo-500/50 text-neutral-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-800 text-neutral-200">
                  <SelectItem value="sd15">DreamShaper (SD 1.5)</SelectItem>
                  <SelectItem value="lcm">Fast Turbo (LCM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {/* Variations */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Variations</span>
            <div className="flex gap-1">
              <button onClick={selectAll} className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20">All</button>
              <button onClick={clearAll} className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 hover:bg-neutral-700">Clear</button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <ChipGroup title="Colors" options={PRESETS.colors} selected={colors} onToggle={(v) => toggle(colors, setColors, v)} onAll={() => setColors([...PRESETS.colors])} onNone={() => setColors([])} />
            <ChipGroup title="Environments" options={PRESETS.environments} selected={environments} onToggle={(v) => toggle(environments, setEnvironments, v)} onAll={() => setEnvironments([...PRESETS.environments])} onNone={() => setEnvironments([])} />
            <ChipGroup title="Actions" options={PRESETS.actions} selected={actions} onToggle={(v) => toggle(actions, setActions, v)} onAll={() => setActions([...PRESETS.actions])} onNone={() => setActions([])} />
            <ChipGroup title="Styles" options={PRESETS.styles} selected={styles} onToggle={(v) => toggle(styles, setStyles, v)} onAll={() => setStyles([...PRESETS.styles])} onNone={() => setStyles([])} />
            <ChipGroup title="Lighting" options={PRESETS.lighting} selected={lighting} onToggle={(v) => toggle(lighting, setLighting, v)} onAll={() => setLighting([...PRESETS.lighting])} onNone={() => setLighting([])} />
            <ChipGroup title="Camera" options={PRESETS.camera} selected={camera} onToggle={(v) => toggle(camera, setCamera, v)} onAll={() => setCamera([...PRESETS.camera])} onNone={() => setCamera([])} />
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex flex-col md:flex-row gap-3 pt-2">
          {/* Public/Private Toggle */}
          <Button
            variant="ghost"
            className={`border border-neutral-700 h-10 px-4 text-sm transition-colors w-full md:w-auto ${
              isPublic 
                ? "bg-neutral-800 hover:bg-neutral-700 text-neutral-300" 
                : "bg-amber-900/20 border-amber-500/30 text-amber-500 hover:bg-amber-900/30"
            }`}
            onClick={() => setIsPublic(!isPublic)}
          >
            {isPublic ? (
              <>
                <Globe className="w-4 h-4 mr-2" />
                Public
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Private
              </>
            )}
          </Button>

          <Button variant="outline" onClick={generatePreview} disabled={isPreviewing || !targetSubject.trim()} className="border-neutral-700 h-10 px-6 text-sm hover:bg-neutral-800 text-neutral-300 hover:text-white w-full md:w-auto">
            {isPreviewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
            Preview
          </Button>
          <Button onClick={createBatchJob} disabled={isLoading || !targetSubject.trim() || !category.trim()} className="bg-indigo-600 hover:bg-indigo-700 h-10 text-sm font-medium w-full md:flex-1">
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            Generate {totalImages} Images
          </Button>
        </div>
        
        {/* Preview Prompts */}
        {previewPrompts.length > 0 && (
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 space-y-2">
            <span className="text-sm font-medium text-neutral-400">Sample Prompts:</span>
            {previewPrompts.map((p, i) => (
              <div key={i} className="text-sm text-neutral-300 p-3 bg-neutral-800/50 rounded border border-neutral-800/50">{p}</div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ChipGroup({
  title, options, selected, onToggle, onAll, onNone
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  onAll: () => void;
  onNone: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">{title}</span>
        <div className="flex gap-2">
          <button onClick={onAll} className="text-[10px] font-medium text-indigo-400 hover:text-indigo-300">SELECT ALL</button>
          <span className="text-neutral-700 text-[10px]">|</span>
          <button onClick={onNone} className="text-[10px] font-medium text-neutral-500 hover:text-neutral-300">NONE</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-200 capitalize ${
              selected.includes(opt)
                ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200 shadow-[0_0_10px_-2px_rgba(99,102,241,0.3)]'
                : 'bg-neutral-800/40 border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:bg-neutral-800 hover:text-neutral-200'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
