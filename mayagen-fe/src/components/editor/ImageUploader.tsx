'use client';

import { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface ImageUploaderProps {
  onUploadSuccess: (imageId: number, imageUrl: string) => void;
  onClear: () => void;
  currentImageId?: number;
  currentImageUrl?: string;
}

export default function ImageUploader({ 
  onUploadSuccess, 
  onClear, 
  currentImageId, 
  currentImageUrl 
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'bulk-edit-source');

    try {
      const res = await api.post('/images/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data.success) {
        onUploadSuccess(res.data.data.id, res.data.data.url);
        toast.success('Image uploaded successfully');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-4">
      {!currentImageUrl ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative group cursor-pointer border-2 border-dashed rounded-2xl p-12 
            flex flex-col items-center justify-center gap-3 transition-all duration-300
            ${isDragging ? 'border-indigo-500 bg-indigo-500/5 scale-[0.99]' : 'border-neutral-800 bg-neutral-900/30 hover:border-neutral-700 hover:bg-neutral-900/50'}
            ${isUploading ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            accept="image/*"
            className="hidden"
          />
          
          <div className="w-16 h-16 rounded-full bg-neutral-800/50 flex items-center justify-center group-hover:scale-110 group-hover:bg-neutral-800 transition-all duration-300 shadow-sm">
            {isUploading ? (
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-neutral-400 group-hover:text-indigo-400" />
            )}
          </div>
          
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-neutral-200 uppercase tracking-wide">
              {isUploading ? 'Uploading...' : 'Upload Base Image'}
            </p>
            <p className="text-xs text-neutral-500 lowercase">
              Drag & Drop or Click to browse
            </p>
          </div>
          
          {/* Decorative Corner Borders */}
          <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-neutral-800 group-hover:border-indigo-500/30 transition-colors" />
          <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-neutral-800 group-hover:border-indigo-500/30 transition-colors" />
          <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-neutral-800 group-hover:border-indigo-500/30 transition-colors" />
          <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-neutral-800 group-hover:border-indigo-500/30 transition-colors" />
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden border border-neutral-800 group shadow-lg ring-1 ring-white/5 animate-in zoom-in-95 duration-300">
          <img 
            src={currentImageUrl} 
            alt="Source" 
            className="w-full aspect-square object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-[2px]">
            <Button 
                variant="destructive" 
                size="sm" 
                onClick={(e) => { e.stopPropagation(); onClear(); }}
                className="rounded-full h-10 w-10 p-0 shadow-lg"
            >
              <X className="w-5 h-5" />
            </Button>
            <Button 
                variant="secondary" 
                size="sm" 
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="rounded-full px-4 h-10 font-medium shadow-lg"
            >
              Change Image
            </Button>
            <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                accept="image/*"
                className="hidden"
            />
          </div>
          <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white tracking-widest uppercase">
            Base Image
          </div>
        </div>
      )}
    </div>
  );
}

// Minimal Button internal component to avoid missing imports in this specific file if needed, 
// though we usually import from UI. Let's use a standard template or just import what's needed.
import { Button } from '@/components/ui/button';
