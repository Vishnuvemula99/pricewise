import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PriceWise — Smart Purchase Advisor",
  description:
    "Compare prices across retailers, track trends, and get AI-powered buy/wait recommendations based on your budget.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <nav className="sticky top-0 z-50 border-b border-[#1e1e2e] bg-[#0a0a0f]/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <a href="/" className="flex items-center gap-2">
              <span className="text-2xl">💰</span>
              <span className="text-xl font-bold gradient-text">PriceWise</span>
            </a>
            <div className="flex items-center gap-6">
              <a href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">
                Dashboard
              </a>
              <a href="/settings" className="text-sm text-gray-400 hover:text-white transition-colors">
                Settings
              </a>
            </div>
          </div>
        </nav>

        <main className="mx-auto max-w-6xl px-6 py-8">
          {children}
        </main>

        <footer className="border-t border-[#1e1e2e] py-6 text-center text-sm text-gray-500">
          PriceWise — Your smart purchase advisor
        </footer>
      </body>
    </html>
  );
}
