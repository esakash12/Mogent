import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mogent - Enterprise AI Customer Support & Sales Automation",
  description: "Automate Facebook Messenger & Web Chat with Mogent AI Engine & High-Speed Queue Architecture",
};

import { AuthProvider } from "@/lib/auth-context";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#F8FAFC] text-[#0F172A] antialiased selection:bg-[#F59E0B]/20`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
