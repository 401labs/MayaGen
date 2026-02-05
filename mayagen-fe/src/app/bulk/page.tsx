'use client';

import { useState } from 'react';
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Layers, Eye, Play, History } from "lucide-react";
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
        height: 512
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 pb-24">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10">
            <Layers className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Bulk Generate</h1>
            <p className="text-xs text-neutral-500">Generate datasets with variations</p>
          </div>
        </div>
        <Link href="/bulk/history">
          <Button variant="outline" size="sm" className="border-neutral-700 text-xs">
            <History className="w-3 h-3 mr-1" />
            View Batches
          </Button>
        </Link>
      </div>
      
      <div className="max-w-5xl mx-auto space-y-3">
        {/* Config Row */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Input placeholder="Batch name" value={name} onChange={(e) => setName(e.target.value)} className="bg-neutral-800 border-neutral-700 h-8 text-xs" />
            <Input placeholder="Category* (animals/cats)" value={category} onChange={(e) => setCategory(e.target.value)} className="bg-neutral-800 border-neutral-700 h-8 text-xs" />
            <Input placeholder="Subject* (domestic cat)" value={targetSubject} onChange={(e) => setTargetSubject(e.target.value)} className="bg-neutral-800 border-neutral-700 h-8 text-xs md:col-span-2" />
            <div className="flex gap-2">
              <Input type="number" min={1} max={10000} value={totalImages} onChange={(e) => setTotalImages(Number(e.target.value))} className="bg-neutral-800 border-neutral-700 h-8 text-xs w-20" />
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="bg-neutral-800 border-neutral-700 h-8 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-700">
                  <SelectItem value="sd15">DreamShaper</SelectItem>
                  <SelectItem value="lcm">SD 1.5</SelectItem>
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={generatePreview} disabled={isPreviewing || !targetSubject.trim()} className="border-neutral-700 h-8 text-xs">
            {isPreviewing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Eye className="w-3 h-3 mr-1" />}
            Preview
          </Button>
          <Button onClick={createBatchJob} disabled={isLoading || !targetSubject.trim() || !category.trim()} className="bg-indigo-600 hover:bg-indigo-700 flex-1 h-8 text-xs">
            {isLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
            Generate {totalImages} Images
          </Button>
        </div>
        
        {/* Preview Prompts */}
        {previewPrompts.length > 0 && (
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-3 space-y-1">
            <span className="text-xs text-neutral-500">Sample Prompts:</span>
            {previewPrompts.map((p, i) => (
              <div key={i} className="text-xs text-neutral-400 p-2 bg-neutral-800/50 rounded">{p}</div>
            ))}
          </div>
        )}
      </div>
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
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-neutral-500">{title}</span>
        <div className="flex gap-1">
          <button onClick={onAll} className="text-[10px] text-indigo-400 hover:text-indigo-300">All</button>
          <span className="text-neutral-700">|</span>
          <button onClick={onNone} className="text-[10px] text-neutral-500 hover:text-white">None</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={`px-2 py-0.5 text-[10px] rounded-full border transition-all ${
              selected.includes(opt)
                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                : 'bg-neutral-800/50 border-neutral-700 text-neutral-500 hover:border-neutral-600'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
