"use client";

import { useState, FormEvent } from "react";

interface OnboardingModalProps {
  onComplete: (income: number, savingsRate: number) => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [income, setIncome] = useState("");
  const [savingsRate, setSavingsRate] = useState("20");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!income || Number(income) <= 0) {
      setError("Please enter a valid monthly income");
      return;
    }

    setIsSaving(true);
    setError(null);

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
        onComplete(Number(income), Number(savingsRate) / 100);
      } else {
        setError(data.error || "Failed to save. Try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl border border-[#2e2e3e] bg-[#12121a] p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center space-y-3 mb-8">
          <span className="text-4xl">💰</span>
          <h2 className="text-2xl font-bold text-white">Welcome to PriceWise</h2>
          <p className="text-sm text-gray-400">
            To give you personalized buy-or-wait advice, we need to know a bit about your finances.
            This stays on your device — never shared.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
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
                autoFocus
                required
              />
            </div>
            <p className="mt-1 text-xs text-gray-600">Your take-home pay each month</p>
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
              <span>5% (casual)</span>
              <span>25% (moderate)</span>
              <span>50% (aggressive)</span>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              This means <span className="text-white font-medium">${income ? (Number(income) * Number(savingsRate) / 100).toFixed(0) : "0"}/mo</span> available for purchases
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={!income || isSaving}
            className="btn-primary w-full text-base py-3.5 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Get Started"}
          </button>
        </form>
      </div>
    </div>
  );
}
