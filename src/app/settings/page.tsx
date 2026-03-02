"use client";

import { useState, useEffect, FormEvent } from "react";

export default function SettingsPage() {
  const [income, setIncome] = useState("");
  const [savingsRate, setSavingsRate] = useState("20");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        if (data.success && data.data) {
          setIncome(String(data.data.monthlyIncome));
          setSavingsRate(String(Math.round(data.data.monthlySavingsRate * 100)));
        }
      } catch {
        // Profile doesn't exist yet, that's fine
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!income) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyIncome: Number(income),
          monthlySavingsRate: Number(savingsRate) / 100,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Profile updated successfully!" });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="animate-pulse text-gray-400">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="mt-2 text-gray-400">
          Update your financial profile. This is used to calculate how long it
          takes to afford products.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div>
          <label className="text-sm font-medium text-gray-300 mb-2 block">
            Monthly After-Tax Income
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
            <input
              type="number"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="5,000"
              className="input-field pl-10 text-lg"
              min="1"
              step="any"
              required
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-300 mb-2 block">
            Savings Rate: <span className="text-blue-400">{savingsRate}%</span>
          </label>
          <input
            type="range"
            value={savingsRate}
            onChange={(e) => setSavingsRate(e.target.value)}
            min="5"
            max="50"
            step="5"
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>5%</span>
            <span>50%</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Monthly savings: <span className="text-white font-medium">${income ? (Number(income) * Number(savingsRate) / 100).toFixed(0) : "0"}</span>
          </p>
        </div>

        {message && (
          <p className={`text-sm text-center ${message.type === "success" ? "text-green-400" : "text-red-400"}`}>
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={!income || isSaving}
          className="btn-primary w-full text-sm disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </form>

      <div className="card space-y-3">
        <h3 className="font-semibold text-white">About Your Data</h3>
        <p className="text-sm text-gray-400">
          All your data is stored locally in a SQLite database on your machine.
          Nothing is sent to any server except Serper.dev for price lookups and
          OpenAI for AI recommendations.
        </p>
      </div>
    </div>
  );
}
