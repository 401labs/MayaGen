import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export interface FilterState {
  searchQuery: string;
  categoryFilter: string;
  modelFilter: string;
  statusFilter: string;
  sortBy: string;
  viewMode: 'grid' | 'masonry';
}


const DEFAULT_FILTERS: FilterState = {
  searchQuery: '',
  categoryFilter: 'all',
  modelFilter: 'all',
  statusFilter: 'all',
  sortBy: 'newest',
  viewMode: 'grid',
};

export function usePersistentFilters(key: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [isInitialized, setIsInitialized] = useState(false);

  // 1. Initialize from URL or SessionStorage on mount
  useEffect(() => {
    // Check URL params first
    const urlParams: Partial<FilterState> = {};
    let hasUrlParams = false;

    if (searchParams.has('search')) { urlParams.searchQuery = searchParams.get('search')!; hasUrlParams = true; }
    if (searchParams.has('category')) { urlParams.categoryFilter = searchParams.get('category')!; hasUrlParams = true; }
    if (searchParams.has('model')) { urlParams.modelFilter = searchParams.get('model')!; hasUrlParams = true; }
    if (searchParams.has('status')) { urlParams.statusFilter = searchParams.get('status')!; hasUrlParams = true; }
    if (searchParams.has('sort')) { urlParams.sortBy = searchParams.get('sort')!; hasUrlParams = true; }
    if (searchParams.has('view')) { urlParams.viewMode = searchParams.get('view') as 'grid' | 'masonry'; hasUrlParams = true; }

    if (hasUrlParams) {
      setFilters(prev => ({ ...prev, ...urlParams }));
      // Sync to storage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(key, JSON.stringify({ ...DEFAULT_FILTERS, ...urlParams }));
      }
    } else {
      // Fallback to SessionStorage
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem(key);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setFilters(prev => ({ ...prev, ...parsed }));
            // We could sync to URL here, but let's avoid auto-replace on mount if URL is clean.
            // Wait, if user comes from another page to /collections, URL is clean.
            // We WANT to restore state to URL so they can share it if they want? 
            // Or just keep it internal? 
            // If we don't sync to URL, then reloading page might lose it if logic relies on URL? 
            // No, logic relies on `filters` state. 
            // But if they share the link, it won't have the params.
            // Let's silently update URL if it's empty but we have stored state?
            // router.replace(`?${new URLSearchParams(parsed).toString()}`, { scroll: false });
          } catch (e) {
            console.error("Failed to parse stored filters", e);
          }
        }
      }
    }
    setIsInitialized(true);
  }, [key, searchParams]);

  // 2. Update URL and Storage when filters change
  const updateFilter = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => {
      const next = { ...prev, ...newFilters };
      
      // Update Storage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(key, JSON.stringify(next));
      }

      // Update URL
      const params = new URLSearchParams(searchParams.toString()); // Keep existing params? No, we own the filter params. 
      // But maybe pagination? Pagination is separate. 
      // Let's rebuild params from state to be safe.
      
      if (next.searchQuery) params.set('search', next.searchQuery); else params.delete('search');
      if (next.categoryFilter !== 'all') params.set('category', next.categoryFilter); else params.delete('category');
      if (next.modelFilter !== 'all') params.set('model', next.modelFilter); else params.delete('model');
      if (next.statusFilter !== 'all') params.set('status', next.statusFilter); else params.delete('status');
      if (next.sortBy !== 'newest') params.set('sort', next.sortBy); else params.delete('sort');
      if (next.viewMode !== 'masonry') params.set('view', next.viewMode); else params.delete('view');

      // Update URL
      router.replace(`?${params.toString()}`, { scroll: false });
      
      return next;
    });
  }, [key, router, searchParams]);

  // Sync to URL helper (optional if updateFilter does it)
  const syncToUrl = useCallback((currentFilters: FilterState) => {
      // ... logic embedded in updateFilter now
  }, []);

  return { filters, updateFilter, isInitialized };
}
