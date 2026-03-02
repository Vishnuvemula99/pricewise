"use client";

import { useState, useEffect } from "react";

interface Alert {
  id: string;
  productName: string;
  targetPrice: number;
  currentPrice: number | null;
  isActive: boolean;
  isTriggered: boolean;
  triggeredAt: string | null;
  createdAt: string;
}

export function AlertsList() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  async function fetchAlerts() {
    try {
      const res = await fetch("/api/alerts");
      const data = await res.json();
      if (data.success) {
        setAlerts(data.data);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(alertId: string) {
    try {
      await fetch(`/api/alerts?id=${alertId}`, { method: "DELETE" });
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch {
      // silently fail
    }
  }

  if (isLoading) {
    return (
      <div className="card">
        <p className="animate-pulse text-gray-500 text-sm">Loading alerts...</p>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-3xl mb-2">🔔</p>
        <p className="text-gray-400 text-sm">No price alerts yet</p>
        <p className="text-gray-600 text-xs mt-1">
          Search for a product and set a target price to get notified
        </p>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">🔔 Your Price Alerts</h3>
        <span className="text-xs text-gray-500">{alerts.length} alert{alerts.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => {
          const isPriceBelow = alert.currentPrice !== null && alert.currentPrice <= alert.targetPrice;
          return (
            <div
              key={alert.id}
              className={`flex items-center justify-between rounded-lg border p-4 ${
                alert.isTriggered
                  ? "border-green-500/30 bg-green-500/5"
                  : isPriceBelow
                  ? "border-yellow-500/30 bg-yellow-500/5"
                  : "border-[#1e1e2e] bg-[#0a0a0f]"
              }`}
            >
              <div className="space-y-1">
                <p className="font-medium text-white text-sm">{alert.productName}</p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-gray-500">
                    Target: <span className="text-green-400 font-medium">${alert.targetPrice.toFixed(2)}</span>
                  </span>
                  {alert.currentPrice !== null && (
                    <span className="text-gray-500">
                      Current: <span className={`font-medium ${isPriceBelow ? "text-green-400" : "text-white"}`}>
                        ${alert.currentPrice.toFixed(2)}
                      </span>
                    </span>
                  )}
                </div>
                {alert.isTriggered && (
                  <p className="text-xs text-green-400">
                    ✓ Triggered on {new Date(alert.triggeredAt!).toLocaleDateString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleDelete(alert.id)}
                className="text-gray-600 hover:text-red-400 transition-colors text-sm px-2"
                title="Delete alert"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
