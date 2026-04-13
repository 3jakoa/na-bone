"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Utensils, UserCheck, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/discover", icon: Search, label: "Išči" },
  { href: "/feed", icon: Globe, label: "Feed" },
  { href: "/matches", icon: Utensils, label: "Buddies" },
  { href: "/profile", icon: UserCheck, label: "Account" },
];

export default function BottomNav() {
  const pathname = usePathname();

  const isAuthPage = pathname.startsWith("/auth") || pathname === "/" || pathname === "/onboarding";
  if (isAuthPage) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-lg safe-area-pb">
      <div className="max-w-lg mx-auto flex">
        {links.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link key={href} href={href} className="flex-1 flex flex-col items-center py-2 gap-0.5 relative">
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-brand" />
              )}
              <Icon
                className={cn("w-6 h-6 transition-colors", active ? "text-brand" : "text-gray-400")}
                strokeWidth={active ? 2.5 : 1.5}
              />
              <span className={cn("text-xs", active ? "text-brand font-semibold" : "text-gray-400")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
