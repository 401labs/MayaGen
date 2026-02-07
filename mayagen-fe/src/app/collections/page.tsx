'use client';

import { useState, useEffect } from 'react';
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Filter, Grid, LayoutGrid, Image as ImageIcon, FolderOpen, Clock, AlertCircle, RefreshCw, Lock, Globe, SortAsc, SortDesc, Circle } from "lucide-react";
import Link from 'next/link';
import { toast } from "sonner";
import { useRouter } from 'next/navigation';
import { PaginationControl } from "@/components/ui/pagination-control";

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

export default function CollectionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const { filters, updateFilter, isInitialized } = usePersistentFilters('collection_filters', { 
    sortBy: 'newest', 
    statusFilter: 'completed' 
  });
  
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Local search state
  const [searchTerm, setSearchTerm] = useState('');

  // Sync local search term
  useEffect(() => {
    if (isInitialized) {
      setSearchTerm(filters.searchQuery || '');
    }
  }, [isInitialized, filters.searchQuery]);


  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 24;

  // Debounce Search
  useEffect(() => {
    if (!isInitialized) return;
    const timer = setTimeout(() => {
      if (searchTerm !== filters.searchQuery) {
        updateFilter({ searchQuery: searchTerm });
        setPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, isInitialized, filters.searchQuery, updateFilter]);

  // Extract unique categories
  const categories = [...new Set(gallery.map(img => img.category))];

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchCollection = async (pageNum: number = 1) => {
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

      const res = await api.get(`/images/me?${params.toString()}`);
      if (res.data.success) {
        setGallery(res.data.data.images);
        if (res.data.data.meta) {
          setTotalPages(res.data.data.meta.total_pages);
          setPage(res.data.data.meta.page);
          setTotal(res.data.data.meta.total);
        }
      }
    } catch (e: any) {
      console.error("Failed to fetch collection", e);
      toast.error("Failed to load your collection");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && isInitialized) {
      fetchCollection(page);
    }
  }, [
    user, 
    page, 
    isInitialized,
    filters.searchQuery, 
    filters.categoryFilter, 
    filters.modelFilter, 
    filters.statusFilter, 
    filters.sortBy
  ]);

  const handleFilterChange = (key: string, value: string) => {
      updateFilter({ [key]: value });
      setPage(1);
  };



  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-neutral-950/80 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <FolderOpen className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold">My Collections</h1>
                <p className="text-xs text-neutral-500 text-left">Your personal gallery ({total} items)</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => fetchCollection(page)} className="border-neutral-800 hover:bg-neutral-800 text-neutral-400">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Link href="/">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                  Generate New
                </Button>
              </Link>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <Input
                placeholder="Search your generations..."
                className="pl-9 bg-neutral-900 border-neutral-800 focus:border-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Category Filter */}
            <Select value={filters.categoryFilter} onValueChange={(val) => handleFilterChange('categoryFilter', val)}>
              <SelectTrigger className="w-[160px] bg-neutral-900 border-neutral-800">
                <FolderOpen className="w-4 h-4 mr-2 text-neutral-500" />
                <SelectValue placeholder="Category" />
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
              <SelectTrigger className="w-[160px] bg-neutral-900 border-neutral-800">
                <Filter className="w-4 h-4 mr-2 text-neutral-500" />
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-neutral-700 text-neutral-200">
                <SelectItem value="all">All Models</SelectItem>
                <SelectItem value="sd15">DreamShaper 8</SelectItem>
                <SelectItem value="lcm">SD 1.5 Base</SelectItem>

              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={filters.statusFilter} onValueChange={(val) => handleFilterChange('statusFilter', val)}>
              <SelectTrigger className="w-[140px] bg-neutral-900 border-neutral-800">
                <Circle className="w-4 h-4 mr-2 text-neutral-500" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-neutral-700 text-neutral-200">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Order */}
            <Select value={filters.sortBy} onValueChange={(val) => handleFilterChange('sortBy', val)}>
              <SelectTrigger className="w-[140px] bg-neutral-900 border-neutral-800">
                {filters.sortBy === 'newest' ? (
                  <SortDesc className="w-4 h-4 mr-2 text-neutral-500" />
                ) : (
                  <SortAsc className="w-4 h-4 mr-2 text-neutral-500" />
                )}
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-neutral-700 text-neutral-200">
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-neutral-900 rounded-lg p-1 border border-neutral-800">
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
      <main className="max-w-7xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-neutral-900 animate-pulse" />
            ))}
          </div>
        ) : gallery.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-neutral-500">
            <FolderOpen className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg mb-2">Your collection is empty</p>
            <p className="text-sm opacity-50">
              Start generating images to build your personal gallery
            </p>
          </div>
        ) : filters.viewMode === 'masonry' ? (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {gallery.map((img) => (
              <CollectionCard key={img.id} image={img} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {gallery.map((img) => (
              <CollectionCard key={img.id} image={img} isSquare />
            ))}
          </div>
        )}
      </main>

      {/* Pagination Controls */}
      {!isLoading && gallery.length > 0 && (
        <PaginationControl
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

function CollectionCard({ image, isSquare }: { image: GalleryImage; isSquare?: boolean }) {
  const status = image.status?.toUpperCase();
  const isQueued = status === 'QUEUED';
  const isProcessing = status === 'PROCESSING';
  const isFailed = status === 'FAILED';
  const isCompleted = status === 'COMPLETED';
  const isCancelled = status === 'CANCELLED';
  
  const aspectRatio = image.width && image.height ? image.width / image.height : 0.75;

  return (
    <Link
      href={`/image/${image.id}`}
      style={!isSquare ? { aspectRatio: `${aspectRatio}` } : undefined}
      className={`relative group rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-indigo-500/50 transition-all duration-300 block ${isSquare ? 'aspect-square' : 'break-inside-avoid mb-4'}`}
    >
      {/* Visibility Badge (Only visible on hover or if private?) */}
      <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
         {image.is_public ? (
            <Badge className="bg-neutral-900/80 backdrop-blur text-neutral-400 border border-neutral-800 text-[10px] px-1.5 h-5 gap-1">
               <Globe className="w-3 h-3" /> Public
            </Badge>
         ) : (
            <Badge className="bg-neutral-900/80 backdrop-blur text-amber-500 border border-amber-500/20 text-[10px] px-1.5 h-5 gap-1">
               <Lock className="w-3 h-3" /> Private
            </Badge>
         )}
      </div>

      {isQueued || isCancelled ? (
        <div className="w-full h-full bg-neutral-900 flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center">
            <Clock className={`w-6 h-6 ${isCancelled ? 'text-neutral-500' : 'text-amber-500'}`} />
          </div>
          <span className={`text-xs font-medium ${isCancelled ? 'text-neutral-500' : 'text-amber-500'}`}>
             {isCancelled ? 'Cancelled' : 'Queued'}
          </span>
          <p className="text-[10px] text-neutral-500 max-w-[120px] text-center line-clamp-2">{image.prompt}</p>
        </div>
      ) : isProcessing ? (
        <div className="w-full h-full relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900" />
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-indigo-500/30 animate-ping" />
            </div>
          </div>
        </div>
      ) : isFailed ? (
        <div className="w-full h-full bg-neutral-900 flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <span className="text-xs font-medium text-red-400">Failed</span>
        </div>
      ) : !image.url ? (
        <div className="w-full h-full bg-neutral-900 flex flex-col items-center justify-center gap-2">
          <ImageIcon className="w-10 h-10 text-neutral-700" />
        </div>
      ) : (
        <img
          src={image.url}
          alt={image.filename}
          className={`w-full h-full object-cover block`}
          loading="lazy"
        />
      )}

      {/* Hover Overlay */}
      {isCompleted && image.url && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
          <p className="text-white text-sm line-clamp-2 mb-2 font-medium">{image.prompt}</p>
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <Badge className="bg-white/10 text-white border-none text-xs">
              {MODEL_NAMES[image.model] || image.model}
            </Badge>
          </div>
        </div>
      )}
    </Link>
  );
}
