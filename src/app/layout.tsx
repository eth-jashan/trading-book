import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "HyperTrade - Advanced Crypto Trading Platform",
  description: "Professional cryptocurrency trading interface with real-time market data, advanced charting, and portfolio management powered by Hyperliquid.",
  keywords: "cryptocurrency, trading, DeFi, Hyperliquid, real-time data, charts, portfolio",
  authors: [{ name: "HyperTrade" }],
  openGraph: {
    title: "HyperTrade - Advanced Crypto Trading Platform",
    description: "Professional cryptocurrency trading interface with real-time market data",
    type: "website",
  },
  viewport: "width=device-width, initial-scale=1",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.variable} font-sans antialiased h-full overflow-hidden`}>
        {children}
      </body>
    </html>
  );
}
