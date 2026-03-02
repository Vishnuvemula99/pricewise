"use client";

import { useState, FormEvent } from "react";
import { AffordabilityResult } from "@/app/types";

interface BudgetPanelProps {
  productName: string;
  price: number;
  onCalculate: (result: AffordabilityResult) => void;
}

export function BudgetPanel({ productName, price, onCalculate }: BudgetPanelProps) {
  const [income, setIncome] = useState("");
  const [savingsRate, setSavingsRate] = useState("20");
  const [isCalculating, setIsCalculating] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!income || isCalculating) return;

    setIsCalculating(true);
    try {
      const res = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          price,
          monthlyIncome: Number(income),
          savingsRate: Number(savingsRate) / 100,
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        onCalculate(data.data);
      }
    } catch (error) {
      console.error("Budget calculation failed:", error);
    } finally {
      setIsCalculating(false);
    }
  }

  return (
    <div className="card space-y-4">
      <h3 className="font-semibold text-white">📊 Can I Afford This?</h3>
      <p className="text-sm text-gray-400">
        Enter your monthly after-tax income to see how long it takes to save for this.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Monthly Income (after tax)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="5,000"
              className="input-field pl-8 text-sm"
              min="0"
              step="100"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">
            Savings Rate: {savingsRate}%
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
          <div className="flex justify-between text-xs text-gray-600">
            <span>5%</span>
            <span>50%</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={!income || isCalculating}
          className="btn-primary w-full text-sm disabled:opacity-50"
        >
          {isCalculating ? "Calculating..." : "Calculate"}
        </button>
      </form>
    </div>
  );
}
