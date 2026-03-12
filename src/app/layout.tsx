import type { Metadata } from "next";
import localFont from "next/font/local";
import TimeThemeEffect from "@/components/TimeThemeEffect";
import "./globals.css";

const sfFontBody = localFont({
  src: "../fonts/Roboto-VariableFont_wdth,wght.ttf",
  variable: "--sf-font-body",
  display: "swap",
  weight: "100 900",
  style: "normal",
});

const sfFontDisplay = localFont({
  src: "../fonts/Rubik-VariableFont_wght.ttf",
  variable: "--sf-font-display",
  display: "swap",
  weight: "700",
  style: "normal",
});

export const metadata: Metadata = {
  title: "Szárnyfeszítő",
  description: "Útikalaúz szárnyaló kalandoroknak",
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
    <html lang="hu" className={`${sfFontBody.variable} ${sfFontDisplay.variable}`}>
      <body className="antialiased">
        <TimeThemeEffect />
        {children}
      </body>
    </html>
  );
}

