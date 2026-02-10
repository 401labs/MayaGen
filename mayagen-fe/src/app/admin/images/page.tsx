
"use client";

import { useEffect, useState } from "react";
import { api, API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { PaginationControl } from "@/components/ui/pagination-control";
import { Image as ImageIcon, Download, Trash2, ExternalLink, User } from "lucide-react";
import Link from "next/link";

interface Image {
  id: number;
  user_id: number;
  prompt: string;
  output_path: string;
  created_at: string;
}


export default function ImagesAdminPage() {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 20;

  const fetchImages = async (page: number) => {
    setLoading(true);
    try {
      const skip = (page - 1) * LIMIT;
      const res = await api.get(`/admin/images?skip=${skip}&limit=${LIMIT}`);
      
      if (res.data.success) {
         // Backend returns { items: [...], total: N }
        setImages(res.data.data.items);
        setTotalPages(Math.ceil(res.data.data.total / LIMIT));
      }
    } catch (error) {
      console.error("Failed to fetch images", error);
      toast.error("Failed to load images");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages(currentPage);
  }, [currentPage]);

  // TODO: Implement Delete when backend supports it
  const handleDelete = (id: number) => {
    toast.info("Delete functionality coming soon via Admin API");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-rose-500 bg-clip-text text-transparent">
            Image Moderation
          </h1>
          <p className="text-neutral-500 text-sm mt-1">Review and moderate user-generated content</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="aspect-square bg-neutral-900/50 rounded-xl animate-pulse border border-neutral-800"></div>
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-neutral-500 bg-neutral-900/30 rounded-xl border border-neutral-800 border-dashed">
          <ImageIcon className="w-12 h-12 mb-4 opacity-50" />
          <p>No images found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((img) => (
            <div key={img.id} className="group relative aspect-square bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 hover:border-pink-500/50 transition-all shadow-sm hover:shadow-lg hover:shadow-pink-500/10">
              {/* Image */}
              <img
                src={`${API_BASE_URL}/images/${img.output_path}`}
                alt={img.prompt}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                 <div className="space-y-1">
                    <p className="text-xs text-white font-medium line-clamp-2 leading-tight">
                       {img.prompt}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-2">
                       <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                          <User className="w-3 h-3" /> #{img.user_id}
                       </span>
                       <span className="text-[10px] text-neutral-500">
                          {format(new Date(img.created_at), "MMM d")}
                       </span>
                    </div>
                    
                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                       <a 
                          href={`${API_BASE_URL}/images/${img.output_path}`} 
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center h-8 bg-white/10 hover:bg-white/20 rounded text-white transition-colors"
                          title="Open Original"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                       </a>
                       <button 
                          onClick={() => handleDelete(img.id)}
                          className="flex items-center justify-center h-8 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
                          title="Delete (Coming Soon)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                       </button>
                    </div>
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && (
        <PaginationControl
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          isLoading={loading}
        />
      )}
    </div>
  );
}
