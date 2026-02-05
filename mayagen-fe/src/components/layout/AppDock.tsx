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
      icon: <Sparkles className="h-full w-full text-violet-400" />,
      href: "/",
    },
    {
      title: "Gallery",
      icon: <ImageIcon className="h-full w-full text-pink-400" />,
      href: "/gallery",
    },
    {
      title: "Bulk Generate",
      icon: <Layers className="h-full w-full text-amber-400" />,
      href: "/bulk",
    },
  ];

  const authItems = user
    ? [
        {
          title: user.username,
          icon: <User className="h-full w-full text-cyan-400" />,
          href: "/profile",
        },
        {
          title: "Settings",
          icon: <Settings className="h-full w-full text-slate-300" />,
          href: "/settings",
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

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <FloatingDock
        items={items}
        desktopClassName=""
        mobileClassName="fixed bottom-4 right-4"
      />
    </div>
  );
}

