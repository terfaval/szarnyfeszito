import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import TimeThemeEffect from "@/components/TimeThemeEffect";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Szárnyfeszítő Admin",
  description: "Admin surface for Szárnyfeszítő AI story pipeline",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TimeThemeEffect />
        {children}
      </body>
    </html>
  );
}
