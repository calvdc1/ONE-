import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import RouteTransition from "@/components/RouteTransition";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";

export const metadata: Metadata = {
  title: "ONE - MSU Community",
  description: "Persistent social platform for ONEMSU",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-800 text-gray-100`}
      >
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-[44rem] h-[44rem] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(220,38,38,0.2),transparent_60%)] animate-float-slow" />
          <div className="absolute top-1/5 -right-32 w-[38rem] h-[38rem] rounded-full bg-[radial-gradient(circle_at_70%_30%,rgba(16,185,129,0.18),transparent_60%)] animate-float-medium" />
          <div className="absolute -bottom-28 left-1/3 w-[50rem] h-[50rem] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(234,179,8,0.14),transparent_70%)] animate-float" />
        </div>
        <AuthProvider>
          <ToastProvider>
            <div className="min-h-screen pb-16 md:pb-0 lg:pt-16">
              <Suspense fallback={null}>
                <RouteTransition>
                  {children}
                </RouteTransition>
              </Suspense>
              <Navbar />
            </div>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
