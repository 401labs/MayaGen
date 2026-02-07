'use client';

import { useState, useEffect } from 'react';
import { X, Monitor } from 'lucide-react';

export function MobileWarning() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if we've already shown the warning this session
    const hasSeenWarning = sessionStorage.getItem('hasSeenMobileWarning');
    if (!hasSeenWarning) {
      setIsVisible(true);
    }
  }, []);

  const dismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('hasSeenMobileWarning', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="md:hidden fixed inset-x-4 top-24 z-[60] animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 rounded-2xl p-4 shadow-2xl flex items-start gap-4 ring-1 ring-white/10">
        <div className="bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20 shrink-0">
            <Monitor className="w-5 h-5 text-indigo-400" />
        </div>
        <div className="flex-1 space-y-1 pt-0.5">
            <h3 className="text-sm font-medium text-white">Better on Desktop</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
                For the best experience with complex workflows like Bulk Generate, we recommend using a larger screen.
            </p>
        </div>
        <button 
            onClick={dismiss}
            className="text-neutral-500 hover:text-white transition-colors p-1 -mr-1 -mt-1"
        >
            <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
