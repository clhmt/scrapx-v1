import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// SÜSLÜ PARANTEZLERİ KALDIRDIK - Doğru import şekli bu
import AuthProvider from "@/components/AuthProvider";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ScrapX - Global Recycling Marketplace",
  description: "Buy and sell plastic and metal scraps globally.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {/* Arama çubuğu hatasını (useSearchParams) tüm sitede çözer */}
          <Suspense fallback={<div className="p-20 text-center font-bold">Connecting...</div>}>
            {children}
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}