
"use client";

import { useEffect, useState } from "react";
import { api, API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import Image from "next/image";

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

  const fetchImages = async () => {
    try {
      const res = await api.get("/admin/images");
      if (res.data.success) {
        setImages(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch images", error);
      toast.error("Failed to load images");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  if (loading) {
    return <div className="text-white text-center py-20">Loading images...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
          Image Moderation
        </h1>
        <span className="text-zinc-500">{images.length} Images</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((img) => (
          <div key={img.id} className="relative aspect-square group bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800">
            <Image
              src={`${API_BASE_URL}/images/${img.output_path}`}
              alt={img.prompt}
              fill
              className="object-cover transition-opacity group-hover:opacity-75"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
              <p className="text-white text-xs truncate mb-1">User #{img.user_id}</p>
              <p className="text-zinc-300 text-xs line-clamp-2">{img.prompt}</p>
              <p className="text-zinc-500 text-[10px] mt-1">
                {format(new Date(img.created_at), "PPp")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
