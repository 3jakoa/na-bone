import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Na Bone 🍽️",
  description: "Najdi sošolca za kosilo ali večerjo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sl" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col pb-16">
        {children}
        <BottomNav />
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
