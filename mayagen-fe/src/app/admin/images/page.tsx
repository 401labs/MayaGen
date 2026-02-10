
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { PaginationControl } from "@/components/ui/pagination-control";
import { Image as ImageIcon, Download, Trash2, ExternalLink, User } from "lucide-react";
import Link from "next/link";

interface Image {
  id: number;
  user_id: number;
  prompt: string;
  url: string;
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

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<Image | null>(null);

  const fetchImages = async (page: number) => {
    setLoading(true);
    try {
      const skip = (page - 1) * LIMIT;
      const res = await api.get(`/admin/images?skip=${skip}&limit=${LIMIT}`);
      
      if (res.data.success) {
         // Backend returns { items: [...], total: N }
        console.log("Images loaded:", res.data.data.items.length);
        if (res.data.data.items.length > 0) {
          console.log("Sample image URL:", res.data.data.items[0].url);
        }
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

  const handleDelete = (img: Image) => {
    setImageToDelete(img);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!imageToDelete) return;

    try {
      const res = await api.delete(`/admin/images/${imageToDelete.id}`);
      
      if (res.data.success) {
        toast.success("Image deleted successfully");
        setDeleteModalOpen(false);
        setImageToDelete(null);
        // Refresh the current page
        fetchImages(currentPage);
      }
    } catch (error: any) {
      console.error("Failed to delete image", error);
      const errorMsg = error.response?.data?.message || "Failed to delete image";
      toast.error(errorMsg);
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error("Image failed to load:", e.currentTarget.src);
    e.currentTarget.style.display = "none";
    // Show alt text instead
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
                src={img.url}
                alt={img.prompt}
                loading="lazy"
                onError={handleImageError}
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
                          href={img.url} 
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center h-8 bg-white/10 hover:bg-white/20 rounded text-white transition-colors"
                          title="Open Original"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                       </a>
                       <button 
                          onClick={() => handleDelete(img)}
                          className="flex items-center justify-center h-8 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
                          title="Delete Image"
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

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && imageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setDeleteModalOpen(false)}>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-500/10 rounded-lg">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Delete Image?</h3>
                <p className="text-sm text-neutral-400 mb-4">
                  Are you sure you want to delete this image? This action cannot be undone.
                </p>
                <div className="bg-neutral-800/50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-neutral-500 mb-1">Prompt:</p>
                  <p className="text-sm text-neutral-300 line-clamp-2">{imageToDelete.prompt}</p>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setDeleteModalOpen(false)}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
