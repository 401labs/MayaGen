'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link2, Copy, Trash2, RefreshCw, Globe, Check, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface ShareBatchDialogProps {
  batchId: number;
  batchName: string;
  initialShareToken?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (token: string | null) => void;
}

export function ShareBatchDialog({ 
  batchId, 
  batchName, 
  initialShareToken, 
  isOpen, 
  onClose,
  onUpdate 
}: ShareBatchDialogProps) {
  const [token, setToken] = useState<string | null>(initialShareToken || null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setToken(initialShareToken || null);
  }, [initialShareToken, isOpen]);

  const shareUrl = token ? `${window.location.origin}/share/${token}` : '';

  const generateToken = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/batch/${batchId}/share`);
      if (res.data.success) {
        setToken(res.data.data.share_token);
        onUpdate(res.data.data.share_token);
        toast.success("Share link created!");
      }
    } catch (e: any) {
      toast.error("Failed to create share link");
    } finally {
      setLoading(false);
    }
  };

  const revokeToken = async () => {
    setLoading(true);
    try {
      await api.delete(`/batch/${batchId}/share`);
      setToken(null);
      onUpdate(null);
      toast.success("Share link revoked");
    } catch (e: any) {
      toast.error("Failed to revoke link");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-2">
           <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-full">
              <Globe className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
                <h3 className="text-lg font-semibold text-white">Share Batch</h3>
                <p className="text-xs text-neutral-400 line-clamp-1 max-w-[200px]">{batchName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-500 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="px-6 py-2 pb-6">
            <p className="text-sm text-neutral-400 mb-6">
                Create a unique link to share this collection. Anyone with the link can view the images.
            </p>

          {!token ? (
            <div className="text-center py-8 bg-neutral-950/50 rounded-lg border border-neutral-800 border-dashed">
              <p className="text-sm text-neutral-400 mb-4">No active share link for this batch.</p>
              <Button 
                onClick={generateToken} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={loading}
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
                Create Public Link
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-neutral-500 uppercase font-semibold">Public Link</Label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input 
                      readOnly 
                      value={shareUrl} 
                      className="bg-neutral-950 border-neutral-800 text-neutral-300 pr-10 font-mono text-sm h-10"
                    />
                  </div>
                  <Button 
                    onClick={copyToClipboard} 
                    className={`h-10 min-w-[100px] ${copied ? 'bg-green-600 hover:bg-green-700' : 'bg-neutral-800 hover:bg-neutral-700'}`}
                  >
                    {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3 text-xs text-amber-500/80">
                <p>⚠️ Anyone with this link can view these images.</p>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={generateToken}
                  disabled={loading}
                  className="text-neutral-500 hover:text-white hover:bg-neutral-800 h-8 font-normal transition-colors"
                >
                  <RefreshCw className="w-3 h-3 mr-2" />
                  Regenerate Link
                </Button>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={revokeToken}
                  disabled={loading}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 font-normal"
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  Stop Sharing
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
