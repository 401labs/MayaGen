'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, User, Calendar, Layers, Image as ImageIcon, Copy } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface ImageDetail {
  id: number;
  filename: string;
  url: string;
  prompt: string;
  width: number;
  height: number;
  model: string;
  provider: string;
  category: string;
  created_at: string;
  created_by: string;
}

export default function ImageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [image, setImage] = useState<ImageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchImage = async () => {
      try {
        const res = await api.get(`/api/images/${params.id}`);
        setImage(res.data);
      } catch (err) {
        console.error(err);
        setError('Failed to load image details');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchImage();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 h-screen flex items-center justify-center">
        <Skeleton className="w-[800px] h-[600px] rounded-xl" />
      </div>
    );
  }

  if (error || !image) {
    return (
      <div className="container mx-auto p-6 flex flex-col items-center justify-center h-screen text-center">
        <h1 className="text-2xl font-bold mb-4">Image Not Found</h1>
        <p className="text-muted-foreground mb-6">{error || "The image you are looking for doesn't exist."}</p>
        <Link href="/">
          <Button>Go Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <Button 
          variant="ghost" 
          className="mb-6 hover:bg-neutral-800 text-neutral-400 hover:text-white"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Gallery
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Image Area */}
          <div className="lg:col-span-2 flex justify-center bg-black/40 rounded-xl p-4 border border-white/5">
            <img 
              src={image.url} 
              alt={image.prompt} 
              className="max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
          </div>

          {/* Details Sidebar */}
          <div className="space-y-6">
            <Card className="bg-neutral-950 border-white/10 p-6 space-y-6">
              
              {/* Header */}
              <div>
                <h1 className="text-xl font-semibold text-white mb-2">Image Details</h1>
                <div className="flex items-center text-sm text-neutral-400 gap-2">
                   <User className="w-4 h-4" />
                   <span>Created by <span className="text-white font-medium">{image.created_by}</span></span>
                </div>
                <div className="flex items-center text-sm text-neutral-400 gap-2 mt-1">
                   <Calendar className="w-4 h-4" />
                   <span>{new Date(image.created_at).toLocaleDateString()} ({formatDistanceToNow(new Date(image.created_at))} ago)</span>
                </div>
              </div>

              <div className="h-px bg-white/10" />

              {/* Prompt */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-neutral-300">Prompt</h3>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-neutral-500 hover:text-white"
                    onClick={() => navigator.clipboard.writeText(image.prompt)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <div className="bg-neutral-900 p-3 rounded-md text-sm text-neutral-300 leading-relaxed border border-white/5 max-h-[300px] overflow-y-auto">
                  {image.prompt}
                </div>
              </div>

              {/* Specs */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <span className="text-xs text-neutral-500 uppercase tracking-wider">Model</span>
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium">{image.model}</span>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <span className="text-xs text-neutral-500 uppercase tracking-wider">Resolution</span>
                    <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium">{image.width} x {image.height}</span>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <span className="text-xs text-neutral-500 uppercase tracking-wider">Category</span>
                    <div>
                         <Badge variant="outline" className="border-white/10">{image.category}</Badge>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <span className="text-xs text-neutral-500 uppercase tracking-wider">Provider</span>
                     <span className="text-sm font-medium block capitalize text-neutral-300">{image.provider}</span>
                 </div>
              </div>

              <div className="h-px bg-white/10" />

              {/* Actions */}
              <div className="grid grid-cols-1 gap-3">
                 <Link href={image.url} target="_blank" download>
                    <Button className="w-full bg-white text-black hover:bg-neutral-200">
                      <Download className="w-4 h-4 mr-2" />
                      Download Original
                    </Button>
                 </Link>
              </div>

            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
