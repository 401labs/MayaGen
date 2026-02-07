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
  // Tab State
  const [activeTab, setActiveTab] = useState<'config' | 'variations' | 'template'>('config');

  const [model, setModel] = useState('sd15');
  const [isPublic, setIsPublic] = useState(true);

  // Custom Template State
  const [useCustomTemplate, setUseCustomTemplate] = useState(false);
  const [customTemplate, setCustomTemplate] = useState("A {color} {target} {action} in {environment}, {style}, {lighting}, 8k");
  
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
        base_prompt_template: useCustomTemplate ? customTemplate : null,
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
        base_prompt_template: useCustomTemplate ? customTemplate : null,
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

  // Helper to generate live preview text
  const getLivePreview = () => {
    let preview = customTemplate;
    
    // Replace standard variables with their first selected option or a placeholder
    preview = preview.replace(/{target}/g, targetSubject.trim() || "[Target]");
    preview = preview.replace(/{color}/g, colors.length > 0 ? colors[0] : "[Color]");
    preview = preview.replace(/{environment}/g, environments.length > 0 ? environments[0] : "[Environment]");
    preview = preview.replace(/{action}/g, actions.length > 0 ? actions[0] : "[Action]");
    preview = preview.replace(/{style}/g, styles.length > 0 ? styles[0] : "[Style]");
    preview = preview.replace(/{lighting}/g, lighting.length > 0 ? lighting[0] : "[Lighting]");
    preview = preview.replace(/{camera}/g, camera.length > 0 ? camera[0] : "[Camera]");
    
    return preview;
  };

  // Determine which variable buttons to show
  const availableVariables = [
    { label: '{target}', show: true },
    { label: '{color}', show: colors.length > 0 },
    { label: '{environment}', show: environments.length > 0 },
    { label: '{action}', show: actions.length > 0 },
    { label: '{style}', show: styles.length > 0 },
    { label: '{lighting}', show: lighting.length > 0 },
    { label: '{camera}', show: camera.length > 0 },
  ].filter(v => v.show).map(v => v.label);

  const insertVariable = (variable: string) => {
    setCustomTemplate(prev => prev + " " + variable);
  };
  
  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-neutral-950"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  
  if (!user) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 gap-3">
      <Layers className="w-12 h-12 text-neutral-700" />
      <h1 className="text-xl font-bold text-white">Login Required</h1>
      <Link href="/login"><Button className="bg-indigo-600 hover:bg-indigo-700">Login</Button></Link>
    </div>
  );

  const handleNext = () => {
    if (activeTab === 'config') setActiveTab('variations');
    else if (activeTab === 'variations') setActiveTab('template');
  };

  const handleBack = () => {
    if (activeTab === 'template') setActiveTab('variations');
    else if (activeTab === 'variations') setActiveTab('config');
  };

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
      
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-6">
        
        {/* Tab Navigation */}
        <div className="flex items-center justify-center mb-8">
            <div className="flex items-center bg-neutral-900/50 p-1 rounded-full border border-neutral-800">
                <button 
                    onClick={() => setActiveTab('config')}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${activeTab === 'config' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-200'}`}
                >
                    1. Config
                </button>
                <div className="w-px h-4 bg-neutral-800 mx-1" />
                <button 
                    onClick={() => setActiveTab('variations')}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${activeTab === 'variations' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-200'}`}
                >
                    2. Variations
                </button>
                 <div className="w-px h-4 bg-neutral-800 mx-1" />
                <button 
                    onClick={() => setActiveTab('template')}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${activeTab === 'template' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-200'}`}
                >
                    3. Template
                </button>
            </div>
        </div>

        {/* Step 1: Basic Configuration */}
        {activeTab === 'config' && (
        <section className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-neutral-900/30 p-8 rounded-2xl border border-neutral-800/50 shadow-sm">
            <div className="space-y-5">
               <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-300 ml-1 uppercase tracking-wide">Project Name</label>
                <Input placeholder="e.g. Summer Collection" value={name} onChange={(e) => setName(e.target.value)} className="bg-neutral-950 border-neutral-800 h-11 text-sm focus-visible:ring-indigo-500/50 text-neutral-100 placeholder:text-neutral-600" />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-300 ml-1 uppercase tracking-wide">Category <span className="text-indigo-400">*</span></label>
                <Input placeholder="e.g. Animals" value={category} onChange={(e) => setCategory(e.target.value)} className="bg-neutral-950 border-neutral-800 h-11 text-sm focus-visible:ring-indigo-500/50 text-neutral-100 placeholder:text-neutral-600" />
              </div>

               <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-300 ml-1 uppercase tracking-wide">Target Subject <span className="text-indigo-400">*</span></label>
                <Input placeholder="e.g. A cute scottish fold cat" value={targetSubject} onChange={(e) => setTargetSubject(e.target.value)} className="bg-neutral-950 border-neutral-800 h-11 text-sm focus-visible:ring-indigo-500/50 text-neutral-100 placeholder:text-neutral-600" />
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-300 ml-1 uppercase tracking-wide">Quantity</label>
                <div className="relative">
                    <Input type="number" min={1} max={10000} value={totalImages} onChange={(e) => setTotalImages(Number(e.target.value))} className="bg-neutral-950 border-neutral-800 h-11 text-sm focus-visible:ring-indigo-500/50 text-neutral-100 pr-24" />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 font-medium pointer-events-none">IMAGES TOTAL</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-300 ml-1 uppercase tracking-wide">Model</label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="bg-neutral-950 border-neutral-800 h-11 text-sm focus-visible:ring-indigo-500/50 text-neutral-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-900 border-neutral-800 text-neutral-200">
                    <SelectItem value="sd15">DreamShaper (SD 1.5)</SelectItem>
                    <SelectItem value="lcm">Fast Turbo (LCM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

               <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-300 ml-1 uppercase tracking-wide">Visibility</label>
                  <div className="flex gap-2">
                      <button 
                        onClick={() => setIsPublic(true)}
                        className={`flex-1 h-11 rounded-lg border text-xs font-medium transition-all flex items-center justify-center gap-2 ${isPublic ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300' : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-300'}`}
                      >
                        <Globe className="w-3.5 h-3.5" /> Public
                      </button>
                       <button 
                        onClick={() => setIsPublic(false)}
                        className={`flex-1 h-11 rounded-lg border text-xs font-medium transition-all flex items-center justify-center gap-2 ${!isPublic ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-300'}`}
                      >
                        <Lock className="w-3.5 h-3.5" /> Private
                      </button>
                  </div>
               </div>
            </div>
          </div>
        </section>
        )}

        {/* Step 2: Variations */}
        {activeTab === 'variations' && (
        <section className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
           <div className="flex items-center justify-between px-2 mb-2">
            <div className="flex flex-col">
                <h2 className="text-lg font-medium text-white">Define Variations</h2>
                <p className="text-sm text-neutral-500">Select the attributes you want to mix and match.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-[10px] px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors border border-indigo-500/20 font-medium">Select All</button>
              <button onClick={clearAll} className="text-[10px] px-3 py-1.5 rounded-full bg-neutral-800 text-neutral-400 hover:bg-neutral-700 transition-colors border border-neutral-700 font-medium">Clear</button>
            </div>
          </div>

          <div className="bg-neutral-900/30 p-6 rounded-2xl border border-neutral-800/50">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-8">
                <ChipGroup title="Colors" options={PRESETS.colors} selected={colors} onToggle={(v) => toggle(colors, setColors, v)} onAll={() => setColors([...PRESETS.colors])} onNone={() => setColors([])} />
                <ChipGroup title="Environments" options={PRESETS.environments} selected={environments} onToggle={(v) => toggle(environments, setEnvironments, v)} onAll={() => setEnvironments([...PRESETS.environments])} onNone={() => setEnvironments([])} />
                <ChipGroup title="Actions" options={PRESETS.actions} selected={actions} onToggle={(v) => toggle(actions, setActions, v)} onAll={() => setActions([...PRESETS.actions])} onNone={() => setActions([])} />
                <ChipGroup title="Styles" options={PRESETS.styles} selected={styles} onToggle={(v) => toggle(styles, setStyles, v)} onAll={() => setStyles([...PRESETS.styles])} onNone={() => setStyles([])} />
                <ChipGroup title="Lighting" options={PRESETS.lighting} selected={lighting} onToggle={(v) => toggle(lighting, setLighting, v)} onAll={() => setLighting([...PRESETS.lighting])} onNone={() => setLighting([])} />
                <ChipGroup title="Camera" options={PRESETS.camera} selected={camera} onToggle={(v) => toggle(camera, setCamera, v)} onAll={() => setCamera([...PRESETS.camera])} onNone={() => setCamera([])} />
              </div>
          </div>
        </section>
        )}

        {/* Step 3: Prompt Structure */}
        {activeTab === 'template' && (
        <section className="space-y-4 pb-20 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bg-neutral-900/30 p-8 rounded-2xl border border-neutral-800/50 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <span className="text-lg font-medium text-white">Custom Prompt Template</span>
                    <span className="text-sm text-neutral-500">Define the exact sentence structure using your variables.</span>
                </div>
                 <div className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out flex items-center ${useCustomTemplate ? 'bg-indigo-600' : 'bg-neutral-800 border border-neutral-700'}`} onClick={() => setUseCustomTemplate(!useCustomTemplate)}>
                    <div className={`w-6 h-6 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${useCustomTemplate ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
            </div>

            {useCustomTemplate ? (
                 <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                     <div className="p-1 bg-neutral-950 rounded-xl border border-neutral-800 shadow-inner">
                        <textarea 
                            value={customTemplate}
                            onChange={(e) => setCustomTemplate(e.target.value)}
                            placeholder="e.g. A {color} {target} doing {action} in {environment}, {style} style..."
                            className="w-full h-40 bg-transparent border-none text-base text-neutral-100 focus:ring-0 outline-none resize-none placeholder:text-neutral-700 font-mono leading-relaxed p-4"
                        />
                        <div className="flex flex-wrap gap-2 p-3 border-t border-neutral-800/50 bg-neutral-900/20 rounded-b-xl">
                            <span className="text-xs font-medium text-neutral-500 py-1.5 mr-2">Insert:</span>
                            {availableVariables.map(v => (
                                <button 
                                    key={v} 
                                    onClick={() => insertVariable(v)}
                                    className="px-3 py-1 rounded-md bg-neutral-800 text-neutral-300 hover:bg-indigo-500 hover:text-white transition-all text-xs font-mono border border-neutral-700 hover:border-indigo-400"
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                     </div>
                     
                     {/* Live Preview Box */}
                     <div className="p-4 rounded-lg bg-neutral-900/50 border border-neutral-800">
                        <div className="text-xs font-medium text-neutral-500 mb-2 uppercase tracking-wide">Live Preview (First Combo)</div>
                        <p className="text-sm text-neutral-300 italic">
                            "{getLivePreview()}"
                        </p>
                     </div>

                     <div className="flex items-start gap-3 p-4 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                        <div className="mt-0.5 min-w-4 w-4 h-4 rounded-full border border-indigo-500 flex items-center justify-center text-[10px] text-indigo-400 font-bold">i</div>
                        <p className="text-xs text-indigo-200/70 leading-relaxed">
                            Variables in your template (like <code className="text-indigo-400">{`{color}`}</code>) will be randomly replaced by the options you selected in the <strong>Variations</strong> tab.
                        </p>
                    </div>
                </div>
            ) : (
                 <div className="text-sm text-neutral-400 bg-neutral-950/50 p-8 rounded-xl border border-neutral-800/50 border-dashed text-center flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-600">
                        <Layers className="w-5 h-5" />
                    </div>
                    <p>Using <strong>Intelligent Auto-Template</strong>. <br/> We'll automatically arrange your variables for the best aesthetic results.</p>
                </div>
            )}
          </div>
        </section>
        )}

        {/* Floating Footer Actions */}
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-neutral-900/80 backdrop-blur-xl p-2 pl-2 pr-2 rounded-full border border-neutral-700 shadow-2xl ring-1 ring-white/10">
             
             {/* Back Button */}
             <Button 
                variant="ghost" 
                onClick={handleBack} 
                className={`rounded-full w-10 h-10 p-0 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all ${activeTab === 'config' ? 'opacity-0 pointer-events-none w-0 p-0 overflow-hidden' : 'opacity-100'}`}
             >
                <div className="flex items-center justify-center">←</div>
             </Button>

            <div className="h-4 w-px bg-neutral-800 mx-1" />

             <Button variant="ghost" onClick={generatePreview} disabled={isPreviewing || !targetSubject.trim()} className="rounded-full hover:bg-neutral-800 text-neutral-300 h-10 px-4">
                {isPreviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                Preview
            </Button>

            {/* Next / Generate Button */}
            {activeTab !== 'template' ? (
                 <Button onClick={handleNext} className="bg-white text-black hover:bg-neutral-200 rounded-full px-6 h-10 font-medium">
                    Next Step →
                </Button>
            ) : (
                 <Button onClick={createBatchJob} disabled={isLoading || !targetSubject.trim() || !category.trim()} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-full px-8 h-10 font-medium shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)]">
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                    Generate Batch
                </Button>
            )}
        </div>
        
        {/* Preview Modal/Overlay (if prompts exist) */}
        {previewPrompts.length > 0 && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setPreviewPrompts([])}>
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                         <h3 className="text-lg font-medium text-white">Preview Prompts</h3>
                         <Button variant="ghost" size="sm" onClick={() => setPreviewPrompts([])}>Close</Button>
                    </div>
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                        {previewPrompts.map((p, i) => (
                        <div key={i} className="text-sm text-neutral-300 p-4 bg-neutral-950 rounded-lg border border-neutral-800 leading-relaxed">
                            {p}
                        </div>
                        ))}
                    </div>
                     <div className="flex justify-end pt-2">
                        <Button onClick={() => { setPreviewPrompts([]); createBatchJob(); }} className="bg-indigo-600 hover:bg-indigo-500">
                            Looks Good, Generate!
                        </Button>
                    </div>
                </div>
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
