"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/discover", icon: Flame, label: "Iskanje" },
  { href: "/matches", icon: Heart, label: "Matchi" },
  { href: "/profile", icon: User, label: "Profil" },
];

export default function BottomNav() {
  const pathname = usePathname();

  const isAuthPage = pathname.startsWith("/auth") || pathname === "/" || pathname === "/onboarding";
  if (isAuthPage) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 safe-area-pb">
      <div className="max-w-lg mx-auto flex">
        {links.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link key={href} href={href} className="flex-1 flex flex-col items-center py-2 gap-0.5">
              <Icon
                className={cn("w-6 h-6 transition-colors", active ? "text-orange-500" : "text-gray-400")}
                strokeWidth={active ? 2.5 : 1.5}
              />
              <span className={cn("text-xs", active ? "text-orange-500 font-medium" : "text-gray-400")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
