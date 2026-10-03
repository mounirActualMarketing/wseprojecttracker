import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Shell } from "@/components/Shell";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WSE Strategy System",
  description: "Plan tracker for the Wall Street English Saudi Arabia growth programme",
  icons: { icon: "/brands/wall-street-english.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-[14px]">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
