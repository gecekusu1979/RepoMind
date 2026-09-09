import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RepoMind — GitHub Repository Intelligence",
  description:
    "Heuristic analysis and AI-powered explanations of any public GitHub repository. Understand architecture, code health, and documentation quality in seconds.",
  keywords: ["github", "repository", "analysis", "ai", "code quality", "architecture"],
  openGraph: {
    title: "RepoMind — GitHub Repository Intelligence",
    description: "Understand any GitHub repo in seconds with heuristic analysis and AI insights.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
