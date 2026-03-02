"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PriceHistoryChart } from "@/app/components/charts/PriceHistoryChart";

interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  category: string;
  imageUrl: string | null;
  latestPrices: {
    retailer: string;
    price: number;
    url: string | null;
    inStock: boolean;
    fetchedAt: string;
  }[];
  priceStats: {
    currentLow: number;
    currentHigh: number;
    allTimeLow: number;
    allTimeHigh: number;
    avgPrice: number;
  };
  alertCount: number;
}

const RETAILER_COLORS: Record<string, string> = {
  "Amazon": "text-orange-400",
  "Walmart": "text-blue-400",
  "Best Buy": "text-yellow-400",
  "Target": "text-red-400",
  "eBay": "text-green-400",
  "Newegg": "text-orange-300",
  "Costco": "text-red-300",
  "B&H Photo": "text-purple-400",
  "Apple": "text-gray-300",
};

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertPrice, setAlertPrice] = useState("");
  const [alertSaved, setAlertSaved] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`/api/products/${slug}`);
        const data = await res.json();
        if (data.success) {
          setProduct(data.data);
        } else {
          setError(data.error);
        }
      } catch {
        setError("Failed to load product");
      } finally {
        setIsLoading(false);
      }
    }
    fetchProduct();
  }, [slug]);

  async function handleSetAlert() {
    if (!alertPrice || !product) return;
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          targetPrice: Number(alertPrice),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAlertSaved(true);
        setTimeout(() => setAlertSaved(false), 3000);
        setAlertPrice("");
      }
    } catch {
      // silently fail
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="animate-pulse text-gray-400">Loading product...</span>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-gray-400">{error || "Product not found"}</p>
        <button onClick={() => router.push("/")} className="btn-primary text-sm">
          ← Back to Search
        </button>
      </div>
    );
  }

  const lowestPrice = product.latestPrices[0];

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-400 hover:text-white transition-colors"
      >
        ← Back to results
      </button>

      {/* Product Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <span className="inline-block rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-400">
            {product.category}
          </span>
          <h1 className="text-3xl font-bold text-white">{product.name}</h1>
          {lowestPrice && (
            <p className="text-lg text-gray-400">
              Best price: <span className="text-2xl font-bold text-green-400">${lowestPrice.price.toFixed(2)}</span>
              {" "}at {lowestPrice.retailer}
            </p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="card py-3 px-4 text-center">
            <p className="text-xs text-gray-500">Current Low</p>
            <p className="text-lg font-bold text-green-400">${product.priceStats.currentLow.toFixed(2)}</p>
          </div>
          <div className="card py-3 px-4 text-center">
            <p className="text-xs text-gray-500">Current High</p>
            <p className="text-lg font-bold text-red-400">${product.priceStats.currentHigh.toFixed(2)}</p>
          </div>
          <div className="card py-3 px-4 text-center">
            <p className="text-xs text-gray-500">All-Time Low</p>
            <p className="text-lg font-bold text-emerald-400">${product.priceStats.allTimeLow.toFixed(2)}</p>
          </div>
          <div className="card py-3 px-4 text-center">
            <p className="text-xs text-gray-500">Average</p>
            <p className="text-lg font-bold text-gray-300">${product.priceStats.avgPrice.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left: Prices + Chart */}
        <div className="lg:col-span-2 space-y-6">
          {/* All Retailer Prices */}
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold text-white">Current Prices</h2>
            <div className="space-y-2">
              {product.latestPrices.map((p, i) => {
                const color = RETAILER_COLORS[p.retailer] || "text-gray-300";
                const isLowest = i === 0;
                return (
                  <div
                    key={`${p.retailer}-${i}`}
                    className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                      isLowest
                        ? "border-green-500/30 bg-green-500/5"
                        : "border-[#1e1e2e] bg-[#0a0a0f] hover:border-[#2e2e3e]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-md bg-[#1e1e2e] text-sm font-bold ${color}`}>
                        {p.retailer[0]}
                      </div>
                      <div>
                        <p className={`font-medium ${color}`}>{p.retailer}</p>
                        <p className="text-xs text-gray-600">
                          {p.inStock ? "In Stock" : "Out of Stock"} · Updated {new Date(p.fetchedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xl font-bold ${isLowest ? "text-green-400" : "text-white"}`}>
                        ${p.price.toFixed(2)}
                      </span>
                      {p.url && (
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary py-1.5 px-3 text-xs"
                        >
                          Buy →
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Price History Chart */}
          <PriceHistoryChart productName={product.name} />
        </div>

        {/* Right Sidebar: Alerts */}
        <div className="space-y-6">
          {/* Price Alert */}
          <div className="card space-y-4">
            <h3 className="font-semibold text-white">🔔 Price Alert</h3>
            <p className="text-sm text-gray-400">
              Get notified when the price drops below your target.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={alertPrice}
                  onChange={(e) => setAlertPrice(e.target.value)}
                  placeholder={lowestPrice ? `${(lowestPrice.price * 0.9).toFixed(0)}` : "0"}
                  className="input-field pl-8 text-sm"
                  min="0"
                  step="1"
                />
              </div>
              <button
                onClick={handleSetAlert}
                disabled={!alertPrice}
                className="btn-primary px-4 text-sm disabled:opacity-50"
              >
                Set Alert
              </button>
            </div>
            {alertSaved && (
              <p className="text-xs text-green-400">✓ Alert saved! We'll check daily.</p>
            )}
            {product.alertCount > 0 && (
              <p className="text-xs text-gray-500">
                {product.alertCount} active alert{product.alertCount > 1 ? "s" : ""} for this product
              </p>
            )}
          </div>

          {/* Category Info */}
          <div className="card space-y-3">
            <h3 className="font-semibold text-white">💡 Category Insights</h3>
            <p className="text-sm text-gray-400">
              <span className="font-medium text-white">{product.category}</span> products typically see
              the best deals during:
            </p>
            <div className="space-y-2 text-sm text-gray-400">
              {getCategoryEvents(product.category).map((event) => (
                <div key={event.name} className="flex justify-between">
                  <span>{event.name}</span>
                  <span className="text-green-400">~{event.discount}% off</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getCategoryEvents(category: string): { name: string; discount: number }[] {
  const events: Record<string, { name: string; discount: number }[]> = {
    electronics: [
      { name: "Black Friday", discount: 30 },
      { name: "Prime Day", discount: 25 },
      { name: "Cyber Monday", discount: 28 },
    ],
    headphones: [
      { name: "Black Friday", discount: 25 },
      { name: "Prime Day", discount: 20 },
      { name: "Back to School", discount: 15 },
    ],
    laptops: [
      { name: "Black Friday", discount: 28 },
      { name: "Back to School", discount: 18 },
      { name: "Cyber Monday", discount: 25 },
    ],
    tvs: [
      { name: "Black Friday", discount: 35 },
      { name: "Super Bowl", discount: 20 },
      { name: "CES Season", discount: 15 },
    ],
    phones: [
      { name: "Black Friday", discount: 20 },
      { name: "Apple Event (old models)", discount: 10 },
      { name: "Prime Day", discount: 15 },
    ],
    appliances: [
      { name: "Black Friday", discount: 30 },
      { name: "Memorial Day", discount: 20 },
      { name: "Labor Day", discount: 20 },
    ],
  };
  return events[category] || events["electronics"] || [];
}
