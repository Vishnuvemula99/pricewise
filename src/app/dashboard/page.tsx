"use client";

import { useState, useEffect } from "react";
import { AlertsList } from "@/app/components/alerts/AlertsList";

interface TrendingData {
  recentSearches: { query: string; count: number }[];
  trackedProducts: {
    name: string;
    slug: string;
    category: string;
    latestLow: number | null;
    searchCount: number;
  }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<TrendingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/trending");
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch {
        // silently fail
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-gray-400">Track your products and price alerts</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left: Products + Searches */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tracked Products */}
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold text-white">📦 Tracked Products</h2>
            {isLoading ? (
              <p className="animate-pulse text-sm text-gray-500">Loading...</p>
            ) : data && data.trackedProducts.length > 0 ? (
              <div className="space-y-2">
                {data.trackedProducts.map((product) => (
                  <a
                    key={product.slug}
                    href={`/product/${product.slug}`}
                    className="flex items-center justify-between rounded-lg border border-[#1e1e2e] bg-[#0a0a0f] p-4 transition-colors hover:border-[#2e2e3e]"
                  >
                    <div>
                      <p className="font-medium text-white">{product.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                          {product.category}
                        </span>
                        <span className="text-xs text-gray-600">
                          Searched {product.searchCount} time{product.searchCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    {product.latestLow !== null && (
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-400">
                          ${product.latestLow.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">lowest</p>
                      </div>
                    )}
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">📦</p>
                <p className="text-gray-400 text-sm">No tracked products yet</p>
                <p className="text-gray-600 text-xs mt-1">
                  Search for products on the home page to start tracking
                </p>
              </div>
            )}
          </div>

          {/* Recent Searches */}
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold text-white">🔍 Recent Searches</h2>
            {isLoading ? (
              <p className="animate-pulse text-sm text-gray-500">Loading...</p>
            ) : data && data.recentSearches.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.recentSearches.map((search) => (
                  <a
                    key={search.query}
                    href={`/?q=${encodeURIComponent(search.query)}`}
                    className="inline-flex items-center gap-2 rounded-full border border-[#2e2e3e] bg-[#0a0a0f] px-4 py-2 text-sm text-gray-300 transition-colors hover:border-blue-500/30 hover:text-white"
                  >
                    {search.query}
                    <span className="rounded-full bg-[#1e1e2e] px-2 py-0.5 text-xs text-gray-500">
                      {search.count}
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No searches yet. Try searching for a product!</p>
            )}
          </div>
        </div>

        {/* Right Sidebar: Alerts */}
        <div>
          <AlertsList />
        </div>
      </div>
    </div>
  );
}
