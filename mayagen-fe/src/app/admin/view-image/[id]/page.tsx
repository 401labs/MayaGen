"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Image as ImageIcon, 
  Trash2, 
  Eye, 
  EyeOff,
  ExternalLink,
  Download,
  Settings
} from "lucide-react";
import Link from "next/link";

interface ImageDetail {
  id: number;
  user_id: number;
  filename: string;
  category: string;
  url: string;
  prompt: string;
  negative_prompt?: string;
  model: string;
  provider: string;
  width: number;
  height: number;
  status: string;
  is_public: boolean;
  settings?: any;
  created_at: string;
}

export default function AdminImageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const imageId = params?.id as string;

  const [image, setImage] = useState<ImageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const fetchImageDetail = async () => {
    setLoading(true);
    try {
      // Fetch from admin images endpoint and find the specific image
      const res = await api.get(`/admin/images?skip=0&limit=1000`);
      
      if (res.data.success) {
        const foundImage = res.data.data.items.find(
          (img: ImageDetail) => img.id === parseInt(imageId)
        );
        
        if (foundImage) {
          setImage(foundImage);
        } else {
          toast.error("Image not found");
          router.push("/admin/images");
        }
      }
    } catch (error) {
      console.error("Failed to fetch image", error);
      toast.error("Failed to load image details");
      router.push("/admin/images");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (imageId) {
      fetchImageDetail();
    }
  }, [imageId]);

  const handleDelete = async () => {
    if (!image) return;

    try {
      const res = await api.delete(`/admin/images/${image.id}`);
      
      if (res.data.success) {
        toast.success("Image deleted successfully");
        router.push("/admin/images");
      }
    } catch (error: any) {
      console.error("Failed to delete image", error);
      const errorMsg = error.response?.data?.message || "Failed to delete image";
      toast.error(errorMsg);
    }
  };

  const toggleVisibility = async () => {
    if (!image) return;

    try {
      // TODO: Implement toggle visibility endpoint
      toast.info("Visibility toggle coming soon");
    } catch (error) {
      toast.error("Failed to update visibility");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (!image) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/images"
          className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Images</span>
        </Link>
        
        <div className="flex gap-2">
          <button
            onClick={toggleVisibility}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors flex items-center gap-2"
          >
            {image.is_public ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {image.is_public ? "Public" : "Private"}
          </button>
          <button
            onClick={() => setDeleteModalOpen(true)}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Image Display */}
        <div className="lg:col-span-2">
          <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-xl overflow-hidden">
            <img
              src={image.url}
              alt={image.prompt}
              className="w-full h-auto"
            />
          </div>
        </div>

        {/* Metadata Panel */}
        <div className="space-y-4">
          {/* Basic Info */}
          <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-pink-400" />
              Image Details
            </h3>
            
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-neutral-500">ID</p>
                <p className="text-neutral-200 font-mono">#{image.id}</p>
              </div>
              
              <div>
                <p className="text-neutral-500">Filename</p>
                <p className="text-neutral-200 font-mono text-xs break-all">{image.filename}</p>
              </div>
              
              <div>
                <p className="text-neutral-500">Category</p>
                <p className="text-neutral-200">{image.category}</p>
              </div>
              
              <div>
                <p className="text-neutral-500">Dimensions</p>
                <p className="text-neutral-200">{image.width} × {image.height}</p>
              </div>
              
              <div>
                <p className="text-neutral-500">Model</p>
                <p className="text-neutral-200">{image.model}</p>
              </div>
              
              <div>
                <p className="text-neutral-500">Provider</p>
                <p className="text-neutral-200">{image.provider}</p>
              </div>
              
              <div>
                <p className="text-neutral-500">Status</p>
                <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                  image.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                }`}>
                  {image.status}
                </span>
              </div>

              <div>
                <p className="text-neutral-500 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Created
                </p>
                <p className="text-neutral-200">{format(new Date(image.created_at), "MMM d, yyyy 'at' HH:mm")}</p>
              </div>

              <div>
                <a
                  href={image.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-pink-400 hover:text-pink-300 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Original
                </a>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" />
              User Information
            </h3>
            
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-neutral-500">User ID</p>
                <Link 
                  href={`/admin/users`}
                  className="text-blue-400 hover:text-blue-300 transition-colors font-mono"
                >
                  #{image.user_id}
                </Link>
              </div>
              
              <Link
                href={`/admin/activity?user_id=${image.user_id}`}
                className="block text-sm text-neutral-400 hover:text-white transition-colors"
              >
                View user activity →
              </Link>
            </div>
          </div>

          {/* Prompt */}
          <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Prompt</h3>
            <p className="text-sm text-neutral-300 leading-relaxed">{image.prompt}</p>
            
            {image.negative_prompt && (
              <>
                <h3 className="text-lg font-semibold text-white mb-2 mt-4">Negative Prompt</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">{image.negative_prompt}</p>
              </>
            )}
          </div>

          {/* Settings */}
          {image.settings && (
            <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                Generation Settings
              </h3>
              <pre className="text-xs text-neutral-400 bg-neutral-800/50 rounded p-3 overflow-x-auto">
                {JSON.stringify(image.settings, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
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
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setDeleteModalOpen(false)}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
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
