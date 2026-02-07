'use client';

import { useState, useEffect } from 'react';
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaginationControl } from "@/components/ui/pagination-control";
import { Loader2, Search, Filter, Grid, LayoutGrid, Image as ImageIcon, User, Calendar, Sparkles, FolderOpen, Clock, AlertCircle, RefreshCw } from "lucide-react";
import Link from 'next/link';
import { toast } from "sonner";
import { usePersistentFilters } from '@/hooks/usePersistentFilters';

interface GalleryImage {
  id: number;
  url: string;
  filename: string;
  category: string;
  created_by: string;
  is_public: boolean;
  status: string;
  width: number;
  height: number;
  prompt: string;
  model: string;
  created_at: string;
}

const MODEL_NAMES: Record<string, string> = {
  sd15: "DreamShaper 8",
  lcm: "SD 1.5 Base",
};

export default function GalleryPage() {
  const { user } = useAuth();
  const { filters, updateFilter, isInitialized, syncToUrl } = usePersistentFilters('gallery_filters');
  
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Local search state for input field (debounced update to filters)
  const [searchTerm, setSearchTerm] = useState('');

  // Sync local search term with filters when initialized
  useEffect(() => {
    if (isInitialized) {
      setSearchTerm(filters.searchQuery || '');
    }
  }, [isInitialized, filters.searchQuery]);


  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 24; // Images per page

  // Extract unique categories
  const categories = [...new Set(gallery.map(img => img.category))];

  // Debounce Search -> Update Filters
  useEffect(() => {
    if (!isInitialized) return;
    const timer = setTimeout(() => {
      if (searchTerm !== filters.searchQuery) {
        updateFilter({ searchQuery: searchTerm });
        setPage(1); // Reset to page 1 on search
        // syncToUrl({ ...filters, searchQuery: searchTerm }); // updateFilter does this implicitly via hook logic if we added it, 
        // but hook updateFilter does NOT sync URL in my implementation above? 
        // Wait, my hook implementation DOES update URL in updateFilter.
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, isInitialized, filters.searchQuery, updateFilter]);

  const fetchGallery = async (pageNum: number = 1) => {
    if (!isInitialized) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: LIMIT.toString(),
        sort_by: filters.sortBy
      });
      
      if (filters.searchQuery) params.append('search', filters.searchQuery);
      if (filters.categoryFilter !== 'all') params.append('category', filters.categoryFilter);
      if (filters.modelFilter !== 'all') params.append('model', filters.modelFilter);
      if (filters.statusFilter !== 'all') params.append('status', filters.statusFilter);

      const res = await api.get(`/images?${params.toString()}`);
      if (res.data.success) {
        setGallery(res.data.data.images);
        if (res.data.data.meta) {
          setTotalPages(res.data.data.meta.total_pages);
          setPage(res.data.data.meta.page);
        }
      }
    } catch (e) {
      console.error("Failed to fetch gallery", e);
      toast.error("Failed to load gallery");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch when filters change or page changes
  useEffect(() => {
    if (isInitialized) {
      fetchGallery(page);
    }
  }, [page, filters, isInitialized]); 
  // Note: 'filters' object changes identity on update, triggering fetch. 
  // 'page' changes trigger fetch.
  // If filters change, we often want to reset page to 1.
  // We handled page 1 reset in the search effect.
  // For other filters, we should wrap their setters.

  const handleFilterChange = (key: string, value: string) => {
      updateFilter({ [key]: value });
      setPage(1);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-24">
      {/* Header */}
      <header className="z-40 backdrop-blur-lg bg-neutral-950/80 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ImageIcon className="w-6 h-6 text-indigo-400" />
              <h1 className="text-xl font-bold">Gallery</h1>
              <Badge variant="secondary" className="bg-neutral-800 text-neutral-300 whitespace-nowrap">
                Page {page} of {totalPages}
              </Badge>
            </div>

            <div className="flex w-full md:w-auto items-center justify-between gap-4 md:gap-2">
              <Button variant="outline" size="sm" onClick={() => fetchGallery(page)} className="border-neutral-800 hover:bg-neutral-800 text-neutral-400">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Link href="/">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate New
                </Button>
              </Link>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            {/* Search */}
            <div className="relative w-full md:flex-1 min-w-[200px] md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <Input
                placeholder="Search prompt on this page..."
                className="pl-9 bg-neutral-900 border-neutral-800 focus:border-indigo-500 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Category Filter */}
            <Select value={filters.categoryFilter} onValueChange={(val) => handleFilterChange('categoryFilter', val)}>
              <SelectTrigger className="w-full md:w-[160px] bg-neutral-900 border-neutral-800">
                <div className="flex items-center truncate">
                  <FolderOpen className="w-4 h-4 mr-2 text-neutral-500 flex-shrink-0" />
                  <SelectValue placeholder="Category" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-neutral-700 text-neutral-200">
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Model Filter */}
            <Select value={filters.modelFilter} onValueChange={(val) => handleFilterChange('modelFilter', val)}>
              <SelectTrigger className="w-full md:w-[160px] bg-neutral-900 border-neutral-800">
                <div className="flex items-center truncate">
                  <Filter className="w-4 h-4 mr-2 text-neutral-500 flex-shrink-0" />
                  <SelectValue placeholder="Model" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-neutral-700 text-neutral-200">
                <SelectItem value="all">All Models</SelectItem>
                <SelectItem value="sd15">DreamShaper 8</SelectItem>
                <SelectItem value="lcm">SD 1.5 Base</SelectItem>

              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={filters.statusFilter} onValueChange={(val) => handleFilterChange('statusFilter', val)}>
              <SelectTrigger className="w-full md:w-[160px] bg-neutral-900 border-neutral-800">
                <div className="flex items-center truncate">
                  <AlertCircle className="w-4 h-4 mr-2 text-neutral-500 flex-shrink-0" />
                  <SelectValue placeholder="Status" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-neutral-700 text-neutral-200">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort By */}
            <Select value={filters.sortBy} onValueChange={(val) => handleFilterChange('sortBy', val)}>
                <SelectTrigger className="w-[140px] bg-neutral-900 border-neutral-800">
                  <div className="flex items-center truncate">
                    <Clock className="w-4 h-4 mr-2 text-neutral-500 flex-shrink-0" />
                    <SelectValue placeholder="Sort By" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-700 text-neutral-200">
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>

            {/* View Toggle */}
            <div className="hidden md:flex items-center gap-1 bg-neutral-900 rounded-lg p-1 border border-neutral-800 ml-auto md:ml-0">
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${filters.viewMode === 'masonry' ? 'bg-neutral-800' : ''}`}
                onClick={() => updateFilter({ viewMode: 'masonry' })}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${filters.viewMode === 'grid' ? 'bg-neutral-800' : ''}`}
                onClick={() => updateFilter({ viewMode: 'grid' })}
              >
                <Grid className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Gallery Grid */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-neutral-900 animate-pulse" />
            ))}
          </div>
        ) : gallery.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-neutral-500">
            <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg mb-2">No images found</p>
            <p className="text-sm opacity-50">
              {filters.searchQuery || filters.categoryFilter !== 'all' || filters.modelFilter !== 'all' || filters.statusFilter !== 'all'
                ? "Try adjusting your filters"
                : "No images on this page"}
            </p>
          </div>
        ) : (
          <>
            {filters.viewMode === 'masonry' ? (
              // Masonry Layout
              <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                {gallery.map((img) => (
                  <GalleryCard key={img.id} image={img} />
                ))}
              </div>
            ) : (
              // Grid Layout
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {gallery.map((img) => (
                  <GalleryCard key={img.id} image={img} isSquare />
                ))}
              </div>
            )}
          </>
        )}

        {/* Pagination Controls */}
        {!isLoading && gallery.length > 0 && (
          <PaginationControl
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}
      </main>
    </div>
  );
}

function GalleryCard({ image, isSquare }: { image: GalleryImage; isSquare?: boolean }) {
  // Case-insensitive status check
  const status = image.status?.toUpperCase();
  const isQueued = status === 'QUEUED';
  const isProcessing = status === 'PROCESSING';
  const isFailed = status === 'FAILED';
  const isCompleted = status === 'COMPLETED';

  // Calculate aspect ratio
  const aspectRatio = image.width && image.height ? image.width / image.height : 0.75; // Default to 3:4 if unknown

  return (
    <Link
      href={`/image/${image.id}`}
      style={!isSquare ? { aspectRatio: `${aspectRatio}` } : undefined}
      className={`relative group rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-indigo-500/50 transition-all duration-300 block ${isSquare ? 'aspect-square' : 'break-inside-avoid mb-4'}`}
    >
      {isQueued ? (
        /* Queued State */
        <div className="w-full h-full bg-neutral-900 flex flex-col items-center justify-center gap-2 relative">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Clock className="w-6 h-6 text-amber-500" />
          </div>
          <span className="text-xs font-medium text-amber-500">Queued</span>
          <p className="text-[10px] text-neutral-500 max-w-[120px] text-center line-clamp-2">{image.prompt}</p>
        </div>
      ) : isProcessing ? (
        /* Processing State - Skeleton Loading */
        <div className="w-full h-full relative overflow-hidden">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900" />

          {/* Shimmer effect */}
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />

          {/* Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-indigo-500/30 animate-ping" />
            </div>
            <div className="text-center">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">Generating</span>
              <p className="text-[10px] text-neutral-500 mt-1 line-clamp-2 max-w-[120px]">{image.prompt?.slice(0, 50)}...</p>
            </div>
          </div>
        </div>
      ) : isFailed ? (
        /* Failed State */
        <div className="w-full h-full bg-neutral-900 flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <span className="text-xs font-medium text-red-400">Failed</span>
          <p className="text-[10px] text-neutral-500 max-w-[120px] text-center line-clamp-2">{image.prompt}</p>
        </div>
      ) : !image.url ? (
        /* No URL fallback */
        <div className="w-full h-full bg-neutral-900 flex flex-col items-center justify-center gap-2">
          <ImageIcon className="w-10 h-10 text-neutral-700" />
          <span className="text-xs text-neutral-600">Loading Image...</span>
        </div>
      ) : (
        /* Completed Image */
        <img
          src={image.url}
          alt={image.filename}
          className={`w-full h-full object-cover block`}
          loading="lazy"
        />
      )}

      {/* Hover Overlay - Only for completed */}
      {isCompleted && image.url && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
          <p className="text-white text-sm line-clamp-2 mb-2 font-medium">{image.prompt}</p>
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <Badge className="bg-white/10 text-white border-none text-xs">
              {MODEL_NAMES[image.model] || image.model}
            </Badge>
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{image.created_by}</span>
            </div>
          </div>
        </div>
      )}

      {/* Status Badge (visible if not completed, or if completed and hovering? Actually usually hidden for completed to show clean image) */}
      {!isCompleted && (
        <div className="absolute top-2 right-2">
          <Badge className={`text-xs ${isFailed ? 'bg-red-900/80 text-red-300' :
            isProcessing ? 'bg-indigo-900/80 text-indigo-300 animate-pulse' :
              isQueued ? 'bg-amber-900/80 text-amber-300' :
                'bg-neutral-800 text-neutral-400'
            }`}>
            {status}
          </Badge>
        </div>
      )}
    </Link>
  );
}
