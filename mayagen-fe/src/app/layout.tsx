import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "MayaGen - AI-Powered Synthetic Data Generation",
    template: "%s | MayaGen"
  },
  description: "Generate high-quality synthetic image datasets for ML training. Create stunning AI-generated images with MayaGen's advanced ComfyUI-powered pipeline. Perfect for research, prototyping, and production datasets.",
  keywords: ["AI image generation", "synthetic data", "machine learning", "dataset generation", "ComfyUI", "stable diffusion", "text to image", "AI art", "ML training data"],
  authors: [{ name: "MayaGen Team" }],
  creator: "MayaGen",
  publisher: "MayaGen",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://mayagen.app",
    siteName: "MayaGen",
    title: "MayaGen - AI-Powered Synthetic Data Generation",
    description: "Generate high-quality synthetic image datasets for ML training. Create stunning AI-generated images with advanced AI models.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MayaGen - AI Image Generation Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MayaGen - AI-Powered Synthetic Data Generation",
    description: "Generate high-quality synthetic image datasets for ML training with advanced AI models.",
    images: ["/og-image.png"],
    creator: "@mayagen",
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://mayagen.app"),
};

import { MobileWarning } from "@/components/ui/mobile-warning";
import { AuthProvider } from "@/context/AuthContext";
import { AppDock } from "@/components/layout/AppDock";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-neutral-950 text-neutral-100 overflow-x-hidden`}
      >
        <AuthProvider>
          {children}
          <MobileWarning />
          <AppDock />
          <Toaster theme="dark" position="bottom-right" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
