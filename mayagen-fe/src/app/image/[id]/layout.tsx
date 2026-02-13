import { Metadata } from "next";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = params;

  try {
    // Fetch image details server-side for OG tags
    const response = await fetch(`${API_BASE_URL}/images/${id}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        title: "Image Not Found | MayaGen",
        description: "The requested image could not be found.",
      };
    }

    const data = await response.json();
    const image = data.data;

    // CRITICAL: OG images MUST be absolute URLs with full domain for social media crawlers
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mayagen.fun";
    
    // Construct absolute image URL
    let imageUrl: string;
    if (image.url && image.url.startsWith("http")) {
      // Already absolute URL
      imageUrl = image.url;
    } else {
      // Construct from backend outputs
      const safe_category = image.category?.replace(/\\/g, "/") || "uncategorized";
      imageUrl = `${baseUrl}/api/images/${safe_category}/${image.filename}`;
    }
    
    const title = image.prompt?.substring(0, 60) + "... | MayaGen" || "AI Generated Image | MayaGen";
    const description = image.prompt?.length > 160 
      ? `${image.prompt.substring(0, 157)}...` 
      : (image.prompt || "AI-generated image created with MayaGen");

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [
          {
            url: imageUrl,
            width: image.width || 512,
            height: image.height || 512,
            alt: image.prompt || "AI Generated Image",
          },
        ],
        type: "website",
        siteName: "MayaGen",
        url: `${baseUrl}/image/${id}`,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl],
      },
    };
  } catch (error) {
    console.error("Failed to generate metadata:", error);
    return {
      title: "MayaGen - AI Image Generation",
      description: "Create stunning AI-generated images",
    };
  }
}

export default function ImageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
