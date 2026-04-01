import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { OfflineBanner } from "@/components/ui/OfflineBanner";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sanas Clinic",
  description: "CRM de conversão automática integrado ao WhatsApp e Facebook Ads",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${geist.variable} antialiased font-sans`}>
        <OfflineBanner />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
