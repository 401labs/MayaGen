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

    const imageUrl = image.url || `${API_BASE_URL.replace("/api/v1", "")}/outputs/${image.category}/${image.filename}`;
    const title = `${image.prompt.substring(0, 60)}... | MayaGen`;
    const description = image.prompt.length > 160 
      ? `${image.prompt.substring(0, 157)}...` 
      : image.prompt;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [
          {
            url: imageUrl,
            width: image.width,
            height: image.height,
            alt: image.prompt,
          },
        ],
        type: "website",
        siteName: "MayaGen",
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
