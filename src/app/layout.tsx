import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import { Toaster } from "@/components/ui/sonner";

const openSans = Open_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "BoniBuddy",
  description: "Najdi sošolca za kosilo ali večerjo",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BoniBuddy",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sl" className={`${openSans.variable} h-full antialiased`}>
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js');
            });
          }
        `}} />
      </head>
      <body className="min-h-full flex flex-col pb-16">
        {children}
        <BottomNav />
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
