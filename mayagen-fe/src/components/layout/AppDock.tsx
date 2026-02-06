"use client";

import { FloatingDock } from "@/components/ui/floating-dock";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import {
  Home,
  Sparkles,
  Image as ImageIcon,
  User,
  LogIn,
  LogOut,
  Settings,
  Layers,
  History,
} from "lucide-react";

export function AppDock() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  // Don't show on login/register pages
  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  const baseItems = [
    {
      title: "Home",
      icon: <Home className="h-full w-full text-violet-400" />,
      href: "/",
    },
    {
      title: "Gallery",
      icon: <ImageIcon className="h-full w-full text-pink-400" />,
      href: "/gallery",
    },
    {
      title: "Bulk Generate",
      icon: <Sparkles className="h-full w-full text-amber-400" />,
      href: "/bulk",
    },
  ];

  const authItems = user
    ? [
        {
          title: "My Collections",
          icon: <Layers className="h-full w-full text-cyan-400" />,
          href: "/collections",
        },
        {
          title: "History",
          icon: <History className="h-full w-full text-orange-400" />,
          href: "/bulk/history",
        },
        {
          title: "Logout",
          icon: (
            <button onClick={() => logout()}>
              <LogOut className="h-full w-full text-rose-400" />
            </button>
          ),
          href: "#",
        },
      ]
    : [
        {
          title: "Login",
          icon: <LogIn className="h-full w-full text-emerald-400" />,
          href: "/login",
        },
      ];

  const items = [...baseItems, ...authItems];

  // On mobile, FloatingDock handles its own positioning via mobileClassName.
  // We only need the wrapper for desktop centering.
  // But wait, the wrapper is `fixed bottom-6 left-1/2`. This applies to ALL screens.
  // This likely conflicts with `mobileClassName="fixed bottom-4 right-4"`.
  // The wrapper forces center, the internal mobile component forces bottom-right.
  // We should hide the wrapper styles on mobile or ensure they don't apply.
  
  return (
    <div className="md:fixed md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:z-50 pointer-events-none">
       {/* pointer-events-none on wrapper so it doesn't block clicks, but children need events-auto */}
       <div className="pointer-events-auto">
        <FloatingDock
            items={items}
            desktopClassName=""
            mobileClassName="fixed bottom-4 right-4 z-50 translate-x-0" 
        />
      </div>
    </div>
  );
}

