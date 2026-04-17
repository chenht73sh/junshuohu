import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "君说乎 — 都市人的精神自留地",
  description: "学而时习之，不亦说乎？一个温暖的社群数字家园，在这里真诚链接、同频成长。",
  keywords: ["君说乎", "社群", "数字家园", "学习", "交流", "成长"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="min-h-full flex flex-col bg-bg text-text-primary">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
