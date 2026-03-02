"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface PriceHistoryChartProps {
  productName: string;
}

interface HistoryPoint {
  date: string;
  lowestPrice: number;
  averagePrice: number;
}

interface PriceStats {
  allTimeLow: number;
  allTimeHigh: number;
  avgPrice: number;
  priceChange30d: number | null;
  trend: "rising" | "falling" | "stable";
}

export function PriceHistoryChart({ productName }: PriceHistoryChartProps) {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [stats, setStats] = useState<PriceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(90);

  useEffect(() => {
    async function fetchHistory() {
      setIsLoading(true);
      setError(null);
      try {
        const slug = productName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const res = await fetch(`/api/history?product=${encodeURIComponent(slug)}&days=${days}`);
        const data = await res.json();

        if (data.success && data.data) {
          setHistory(data.data.history);
          setStats(data.data.stats);
        } else {
          setError(data.error || "No history available");
        }
      } catch {
        setError("Failed to load price history");
      } finally {
        setIsLoading(false);
      }
    }

    if (productName) fetchHistory();
  }, [productName, days]);

  if (isLoading) {
    return (
      <div className="card space-y-4">
        <h3 className="font-semibold text-white">📈 Price History</h3>
        <div className="flex h-48 items-center justify-center text-gray-500">
          <span className="animate-pulse">Loading price history...</span>
        </div>
      </div>
    );
  }

  if (error || history.length === 0) {
    return (
      <div className="card space-y-4">
        <h3 className="font-semibold text-white">📈 Price History</h3>
        <div className="flex h-48 flex-col items-center justify-center text-gray-500">
          <p className="text-sm">No price history yet</p>
          <p className="mt-1 text-xs text-gray-600">
            Prices are tracked each time you search. Check back later!
          </p>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

  const trendColor =
    stats?.trend === "falling" ? "text-green-400" : stats?.trend === "rising" ? "text-red-400" : "text-gray-400";
  const trendIcon = stats?.trend === "falling" ? "↓" : stats?.trend === "rising" ? "↑" : "→";

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">📈 Price History</h3>
        <div className="flex gap-1">
          {[30, 60, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded px-2 py-1 text-xs transition-colors ${
                days === d
                  ? "bg-blue-600 text-white"
                  : "bg-[#1e1e2e] text-gray-400 hover:text-white"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-xs text-gray-500">All-Time Low</p>
            <p className="text-sm font-semibold text-green-400">{formatPrice(stats.allTimeLow)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">All-Time High</p>
            <p className="text-sm font-semibold text-red-400">{formatPrice(stats.allTimeHigh)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Average</p>
            <p className="text-sm font-semibold text-gray-300">{formatPrice(stats.avgPrice)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Trend</p>
            <p className={`text-sm font-semibold ${trendColor}`}>
              {trendIcon} {stats.priceChange30d !== null ? `${stats.priceChange30d}%` : "N/A"}
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `$${v}`}
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#12121a",
                border: "1px solid #2e2e3e",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelFormatter={formatDate}
              formatter={(value: number) => [formatPrice(value), ""]}
            />
            {stats && (
              <ReferenceLine
                y={stats.avgPrice}
                stroke="#3b82f6"
                strokeDasharray="5 5"
                strokeOpacity={0.5}
              />
            )}
            <Line
              type="monotone"
              dataKey="lowestPrice"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: "#22c55e", r: 3 }}
              activeDot={{ r: 5 }}
              name="Lowest Price"
            />
            <Line
              type="monotone"
              dataKey="averagePrice"
              stroke="#71717a"
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
              name="Average Price"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
