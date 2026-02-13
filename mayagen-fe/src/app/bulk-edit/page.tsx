'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Layers, Eye, Play, History, Globe, Lock, Check, X, Image as ImageIcon, Sparkles } from "lucide-react";
import Link from 'next/link';
import { toast } from "sonner";
import ImageUploader from '@/components/editor/ImageUploader';

const PRESETS = {
  styles: ["photorealistic", "cinematic", "artistic", "professional", "detailed", "studio lit", "vintage", "futuristic", "sketch", "oil painting"],
  lighting: ["natural", "studio", "golden hour", "dramatic", "soft", "backlit", "neon", "candlelight"],
  backgrounds: ["forest", "beach", "city street", "outer space", "underwater", "mountains", "desert", "luxury interior", "neon cyber-city"],
  actions: ["smiling", "running", "looking at camera", "jumping", "eating", "dancing", "sleeping", "working"],
  weather: ["sunny", "rainy", "snowy", "foggy", "stormy", "cloudy"]
};

export default function BulkEditWizardPage() {
  const { user, loading: authLoading } = useAuth();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'config' | 'variations' | 'template'>('config');

  // Step 1: Config State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('edits');
  const [totalVariations, setTotalVariations] = useState(10);
  const [model, setModel] = useState('FLUX.1-Kontext-pro');
  const [isPublic, setIsPublic] = useState(true);
  const [sourceImage, setSourceImage] = useState<{ id: number; url: string } | null>(null);

  // Step 2: Variations State
  const [selectedStyles, setSelectedStyles] = useState<string[]>(['photorealistic']);
  const [selectedLighting, setSelectedLighting] = useState<string[]>([]);
  const [selectedBackgrounds, setSelectedBackgrounds] = useState<string[]>([]);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [selectedWeather, setSelectedWeather] = useState<string[]>([]);
  
  // Step 3: Template State
  const [useCustomTemplate, setUseCustomTemplate] = useState(false);
  const [customTemplate, setCustomTemplate] = useState("");
  const [hasEditedTemplate, setHasEditedTemplate] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // UI State
  const [previewPrompts, setPreviewPrompts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  
  const buildVariations = () => ({ 
    style: selectedStyles, 
    lighting: selectedLighting, 
    background: selectedBackgrounds, 
    action: selectedActions, 
    weather: selectedWeather 
  });
  
  // Smart Template Logic
  useEffect(() => {
    if (activeTab === 'template' && (!hasEditedTemplate || !customTemplate.trim())) {
      let t = "Change the image to a";
      if (selectedStyles.length > 0) t += " {style} style";
      if (selectedActions.length > 0) t += " showing the subject {action}";
      if (selectedWeather.length > 0) t += " during {weather} weather";
      if (selectedBackgrounds.length > 0) t += " in a {background} environment";
      if (selectedLighting.length > 0) t += " with {lighting} lighting";
      
      setCustomTemplate(t);
    }
  }, [activeTab, selectedStyles, selectedLighting, selectedBackgrounds, selectedActions, selectedWeather]);
  
  const generatePreview = async () => {
    if (!sourceImage) { toast.error("Upload a source image first"); return; }
    setIsPreviewing(true);
    try {
      const res = await api.post('/batch/preview', {
        target_subject: "the subject", // Placeholder since it's an edit
        variations: buildVariations(),
        base_prompt_template: useCustomTemplate ? customTemplate : null,
        count: 5
      });
      if (res.data.success) {
        setPreviewPrompts(res.data.data.prompts);
        toast.info(`${res.data.data.max_unique_combinations} unique combinations possible`);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Preview failed");
    } finally {
      setIsPreviewing(false);
    }
  };
  
  const handleCreateBatch = async () => {
    if (!sourceImage) { toast.error("Upload a source image in Step 1"); setActiveTab('config'); return; }
    if (!category.trim()) { toast.error("Category is required"); setActiveTab('config'); return; }
    
    setIsLoading(true);
    try {
      const res = await api.post('/edit-batch', {
        name: name || `Edit Batch - ${new Date().toLocaleDateString()}`,
        original_image_id: sourceImage.id,
        variations: buildVariations(),
        base_prompt_template: useCustomTemplate ? customTemplate : null,
        total_variations: totalVariations,
        model,
        is_public: isPublic
      });
      if (res.data.success) {
        toast.success(`Bulk edit started!`);
        window.location.href = `/bulk-edit/view/${res.data.data.id}`;
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to start bulk edit");
    } finally {
      setIsLoading(false);
    }
  };

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  };
  
  const getLivePreview = () => {
    let preview = customTemplate;
    preview = preview.replace(/{style}/g, selectedStyles.length > 0 ? selectedStyles[0] : "[Style]");
    preview = preview.replace(/{lighting}/g, selectedLighting.length > 0 ? selectedLighting[0] : "[Lighting]");
    preview = preview.replace(/{background}/g, selectedBackgrounds.length > 0 ? selectedBackgrounds[0] : "[Background]");
    preview = preview.replace(/{action}/g, selectedActions.length > 0 ? selectedActions[0] : "[Action]");
    preview = preview.replace(/{weather}/g, selectedWeather.length > 0 ? selectedWeather[0] : "[Weather]");
    return preview;
  };

  const insertVariable = (variable: string) => {
    if (textareaRef.current) {
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = customTemplate;
        const newText = text.substring(0, start) + `{${variable}}` + text.substring(end);
        setCustomTemplate(newText);
        setHasEditedTemplate(true);
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(start + variable.length + 2, start + variable.length + 2);
            }
        }, 0);
    } else {
        setCustomTemplate(prev => prev + ` {${variable}}`);
        setHasEditedTemplate(true);
    }
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-48">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-neutral-950/80 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-indigo-400" />
              <h1 className="text-xl font-bold">Bulk Image Edit</h1>
            </div>
            
            <Link href="/bulk-edit/history">
              <Button variant="ghost" className="border border-neutral-700 bg-neutral-800/80 text-white hover:bg-neutral-700 hover:text-white h-10 px-6 text-sm transition-all duration-200 shadow-sm">
                <History className="w-4 h-4 mr-2 text-indigo-400" />
                <span className="hidden md:inline">Edit History</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-6">
        
        {/* Wizard Progress */}
        <div className="flex items-center justify-center mb-8">
            <div className="flex items-center bg-neutral-900/50 p-1 rounded-full border border-neutral-800">
                <button 
                    onClick={() => setActiveTab('config')}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'config' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                    1. Config
                </button>
                <div className="w-px h-4 bg-neutral-800 mx-1" />
                <button 
                    onClick={() => setActiveTab('variations')}
                    disabled={!sourceImage}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'variations' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300 disabled:opacity-30'}`}
                >
                    2. Variations
                </button>
                 <div className="w-px h-4 bg-neutral-800 mx-1" />
                <button 
                    onClick={() => setActiveTab('template')}
                    disabled={!sourceImage}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'template' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300 disabled:opacity-30'}`}
                >
                    3. Template
                </button>
            </div>
        </div>

        {/* Step 1: Config */}
        {activeTab === 'config' && (
        <section className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-neutral-900/30 p-8 rounded-3xl border border-neutral-800/50 shadow-sm">
            <div className="space-y-6">
               <div className="space-y-4">
                  <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-[0.2em] ml-1">Source Image</h3>
                  <ImageUploader 
                    onUploadSuccess={(id, url) => setSourceImage({ id, url })}
                    onClear={() => setSourceImage(null)}
                    currentImageId={sourceImage?.id}
                    currentImageUrl={sourceImage?.url}
                  />
               </div>
            </div>

            <div className="space-y-5">
               <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Project Name</label>
                <Input placeholder="e.g. Cat Portrait Series" value={name} onChange={(e) => setName(e.target.value)} className="bg-neutral-950 border-neutral-800 h-12 text-sm focus-visible:ring-indigo-500/50" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Total Edits</label>
                    <Input type="number" min={1} max={100} value={totalVariations} onChange={(e) => setTotalVariations(Number(e.target.value))} className="bg-neutral-950 border-neutral-800 h-12 text-sm focus-visible:ring-indigo-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Category</label>
                    <Input placeholder="edits" value={category} onChange={(e) => setCategory(e.target.value)} className="bg-neutral-950 border-neutral-800 h-12 text-sm focus-visible:ring-indigo-500/50" />
                  </div>
              </div>

               <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Model</label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="bg-neutral-950 border-neutral-800 h-12 text-sm focus-visible:ring-indigo-500/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-900 border-neutral-800 text-neutral-200">
                    <SelectItem value="FLUX.1-Kontext-pro">FLUX.1-Kontext-pro</SelectItem>
                    <SelectItem value="azure-foundry-flux">Azure Foundry FLUX</SelectItem>
                  </SelectContent>
                </Select>
              </div>

               <div className="pt-4 flex items-center justify-between p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
                  <div className="flex flex-col">
                      <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Public Project</span>
                      <span className="text-[10px] text-neutral-500">Visible in community feed</span>
                  </div>
                  <div className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${isPublic ? 'bg-indigo-600' : 'bg-neutral-800'}`} onClick={() => setIsPublic(!isPublic)}>
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
               </div>
            </div>
          </div>
        </section>
        )}

        {/* Step 2: Variations */}
        {activeTab === 'variations' && (
        <section className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bg-neutral-900/30 p-8 rounded-3xl border border-neutral-800/50">
             <div className="space-y-10">
                <ChipGroup title="Styles" options={PRESETS.styles} selected={selectedStyles} onToggle={(v) => toggle(selectedStyles, setSelectedStyles, v)} />
                <ChipGroup title="Backgrounds" options={PRESETS.backgrounds} selected={selectedBackgrounds} onToggle={(v) => toggle(selectedBackgrounds, setSelectedBackgrounds, v)} />
                <ChipGroup title="Actions" options={PRESETS.actions} selected={selectedActions} onToggle={(v) => toggle(selectedActions, setSelectedActions, v)} />
                <ChipGroup title="Lighting" options={PRESETS.lighting} selected={selectedLighting} onToggle={(v) => toggle(selectedLighting, setSelectedLighting, v)} />
                <ChipGroup title="Weather" options={PRESETS.weather} selected={selectedWeather} onToggle={(v) => toggle(selectedWeather, setSelectedWeather, v)} />
              </div>
          </div>
        </section>
        )}

        {/* Step 3: Template */}
        {activeTab === 'template' && (
        <section className="space-y-6 pb-20 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bg-neutral-900/30 p-8 rounded-3xl border border-neutral-800/50 space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-lg font-bold text-white">Edit Template</span>
                    <span className="text-sm text-neutral-500">Define how prompts are constructed.</span>
                </div>
                 <Button 
                    variant="ghost" 
                    onClick={() => { setUseCustomTemplate(!useCustomTemplate); setHasEditedTemplate(true); }}
                    className={`rounded-full px-5 border ${useCustomTemplate ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' : 'border-neutral-800 text-neutral-500'}`}
                >
                    {useCustomTemplate ? 'Custom Active' : 'Auto-Generate'}
                </Button>
            </div>

            <div className="space-y-6">
                <div className="relative group">
                    <textarea 
                        ref={textareaRef}
                        value={customTemplate}
                        readOnly={!useCustomTemplate}
                        onChange={(e) => { setCustomTemplate(e.target.value); setHasEditedTemplate(true); }}
                        placeholder="Define your edit template..."
                        className={`w-full h-40 bg-neutral-950 rounded-2xl border border-neutral-800 p-6 text-base text-neutral-200 focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none transition-all ${!useCustomTemplate ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                    {useCustomTemplate && (
                        <div className="flex flex-wrap gap-2 mt-4 p-4 bg-neutral-950 rounded-xl border border-neutral-800">
                            {['style', 'background', 'action', 'lighting', 'weather'].map(v => (
                                <button 
                                    key={v} 
                                    onClick={() => insertVariable(v)}
                                    className="px-4 py-1.5 rounded-full bg-neutral-800 text-neutral-400 hover:bg-indigo-500 hover:text-white transition-all text-xs font-bold border border-neutral-700 uppercase tracking-widest"
                                >
                                    {`{${v}}`}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-2">
                    <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em]">Sample Generated Prompt</div>
                    <p className="text-sm text-indigo-200 italic leading-relaxed">
                        "{getLivePreview()}"
                    </p>
                </div>
            </div>
          </div>
        </section>
        )}

        {/* Wizard Navigation */}
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-neutral-900/90 backdrop-blur-2xl p-3 px-4 rounded-full border border-neutral-700 shadow-2xl z-50">
             {activeTab !== 'config' && (
                <Button 
                    variant="ghost" 
                    onClick={() => setActiveTab(activeTab === 'template' ? 'variations' : 'config')} 
                    className="rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800"
                >
                    ← Back
                </Button>
             )}

             <Button variant="ghost" onClick={generatePreview} disabled={isPreviewing || !sourceImage} className="rounded-full hover:bg-neutral-800 text-neutral-300">
                {isPreviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                Preview
            </Button>

            <div className="w-px h-6 bg-neutral-800" />

            {activeTab !== 'template' ? (
                <Button 
                    onClick={() => setActiveTab(activeTab === 'config' ? 'variations' : 'template')} 
                    disabled={!sourceImage}
                    className="bg-white text-black hover:bg-neutral-200 rounded-full px-8 font-bold shadow-lg"
                >
                    Next Step
                </Button>
            ) : (
                <Button 
                    onClick={handleCreateBatch} 
                    disabled={isLoading || !sourceImage || !category.trim()} 
                    className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-full px-10 font-bold shadow-[0_0_30px_-5px_rgba(79,70,229,0.5)]"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                    Start Processing
                </Button>
            )}
        </div>
        
        {/* Preview Modal */}
        {previewPrompts.length > 0 && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setPreviewPrompts([])}>
                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-2xl w-full p-8 shadow-2xl space-y-6 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                         <h3 className="text-xl font-bold text-white tracking-tight">Preview Generations</h3>
                         <Button variant="ghost" size="sm" onClick={() => setPreviewPrompts([])} className="rounded-full">Close</Button>
                    </div>
                    <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar">
                        {previewPrompts.map((p, i) => (
                        <div key={i} className="text-sm text-neutral-400 p-5 bg-neutral-950 rounded-2xl border border-neutral-800 leading-relaxed italic">
                            "{p}"
                        </div>
                        ))}
                    </div>
                     <div className="pt-4">
                        <Button onClick={() => { setPreviewPrompts([]); handleCreateBatch(); }} className="w-full bg-indigo-600 h-12 text-base font-bold rounded-2xl hover:bg-indigo-500 shadow-xl">
                            Looks Perfect, Start Editing!
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
  title, options, selected, onToggle
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between ml-1">
        <span className="text-xs font-bold text-neutral-500 uppercase tracking-[0.2em]">{title}</span>
        <span className="text-[10px] text-neutral-600 uppercase tracking-widest">{selected.length} Selected</span>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <button
                key={opt}
                onClick={() => onToggle(opt)}
                className={`
                    px-5 py-2.5 text-xs font-bold rounded-2xl border transition-all duration-300 capitalize
                    ${isSelected 
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg ring-4 ring-indigo-500/10' 
                        : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:border-neutral-700 hover:text-neutral-300 hover:scale-[1.02]'}
                `}
            >
                {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
