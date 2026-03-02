"use client";

import { PriceResult } from "@/app/types";

interface PriceCardProps {
  price: PriceResult;
  isLowest: boolean;
}

const RETAILER_COLORS: Record<string, string> = {
  "Amazon": "text-orange-400",
  "Walmart": "text-blue-400",
  "Best Buy": "text-yellow-400",
  "Target": "text-red-400",
  "eBay": "text-green-400",
  "Newegg": "text-orange-300",
  "Costco": "text-red-300",
  "Home Depot": "text-orange-500",
  "B&H Photo": "text-purple-400",
  "Apple": "text-gray-300",
  "Samsung": "text-blue-300",
  "Dell": "text-blue-500",
  "Lenovo": "text-red-500",
  "Nike": "text-orange-400",
  "Adidas": "text-white",
  "Lowe's": "text-blue-600",
  "Macy's": "text-red-400",
  "GameStop": "text-red-300",
};

export function PriceCard({ price, isLowest }: PriceCardProps) {
  const color = RETAILER_COLORS[price.retailer] || "text-gray-300";

  return (
    <div
      className={`card flex items-center justify-between transition-all hover:border-[#2e2e3e] ${
        isLowest ? "border-green-500/30 bg-green-500/5" : ""
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg bg-[#1e1e2e] text-lg font-bold ${color}`}
        >
          {price.retailer[0]}
        </div>
        <div>
          <p className={`font-medium ${color}`}>{price.retailer}</p>
          <p className="text-xs text-gray-500">
            {price.inStock ? "✓ In Stock" : "✗ Out of Stock"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className={`text-2xl font-bold ${isLowest ? "text-green-400" : "text-white"}`}>
            ${price.price.toFixed(2)}
          </p>
          {isLowest && (
            <p className="text-xs font-medium text-green-400">Best Price ✓</p>
          )}
        </div>

        <a
          href={price.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary py-2 px-4 text-sm"
        >
          View →
        </a>
      </div>
    </div>
  );
}
