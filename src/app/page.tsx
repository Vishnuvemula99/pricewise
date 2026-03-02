"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { PriceCard } from "@/app/components/price/PriceCard";
import { PriceHistoryChart } from "@/app/components/charts/PriceHistoryChart";
import { OnboardingModal } from "@/app/components/onboarding/OnboardingModal";
import { ProductSearchResult, AffordabilityResult } from "@/app/types";

interface UserProfile {
  monthlyIncome: number;
  monthlySavingsRate: number;
}

interface SearchResultWithSlug extends ProductSearchResult {
  slug?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type ConversationMessage = { role: "user" | "assistant"; content: string };

export default function Home() {
  // Core state
  const [searchResult, setSearchResult] = useState<SearchResultWithSlug | null>(null);
  const [affordability, setAffordability] = useState<AffordabilityResult | null>(null);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [lastQuery, setLastQuery] = useState("");

  // User profile
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Follow-up chat (inline within the AI card)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [followUpInput, setFollowUpInput] = useState("");
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Load profile on mount
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        if (data.success && data.data) {
          setProfile({
            monthlyIncome: data.data.monthlyIncome,
            monthlySavingsRate: data.data.monthlySavingsRate,
          });
        } else {
          setShowOnboarding(true);
        }
      } catch {
        setShowOnboarding(true);
      } finally {
        setProfileLoading(false);
      }
    }
    loadProfile();
  }, []);

  function handleOnboardingComplete(income: number, savingsRate: number) {
    setProfile({ monthlyIncome: income, monthlySavingsRate: savingsRate });
    setShowOnboarding(false);
  }

  /**
   * UNIFIED HANDLER: Every query does the same thing:
   * 1. Extract product name → fetch prices
   * 2. Calculate affordability with saved profile
   * 3. Get AI recommendation
   * All shown together in one view.
   */
  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const query = input.trim();
    if (!query || isLoading) return;

    setInput("");
    setIsLoading(true);
    setError(null);
    setSearchResult(null);
    setAffordability(null);
    setAiAdvice(null);
    setChatMessages([]);
    setConversationHistory([]);
    setLastQuery(query);

    const productName = extractProductName(query) || query;

    try {
      // Step 1: Fetch prices
      setLoadingStep("Comparing prices across retailers...");
      const searchRes = await fetch(`/api/search?q=${encodeURIComponent(productName)}`);
      const searchData = await searchRes.json();

      if (searchData.success && searchData.data) {
        setSearchResult(searchData.data);

        // Step 2: Calculate affordability
        if (profile && searchData.data.lowestPrice > 0) {
          setLoadingStep("Calculating affordability...");
          const budgetRes = await fetch("/api/budget", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productName: searchData.data.name,
              price: searchData.data.lowestPrice,
              monthlyIncome: profile.monthlyIncome,
              savingsRate: profile.monthlySavingsRate,
            }),
          });
          const budgetData = await budgetRes.json();
          if (budgetData.success && budgetData.data) {
            setAffordability(budgetData.data);
          }
        }
      }

      // Step 3: Get AI recommendation
      setLoadingStep("Getting AI recommendation...");
      const advisorRes = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          productName,
          conversationHistory: [],
        }),
      });
      const advisorData = await advisorRes.json();

      if (advisorData.success && advisorData.data) {
        setAiAdvice(advisorData.data.answer);
        if (advisorData.data.conversationHistory) {
          setConversationHistory(advisorData.data.conversationHistory);
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  }

  /**
   * Follow-up questions inside the AI card
   */
  async function handleFollowUp(e: FormEvent) {
    e.preventDefault();
    const query = followUpInput.trim();
    if (!query || isFollowUpLoading) return;

    setFollowUpInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: query }]);
    setIsFollowUpLoading(true);

    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          conversationHistory,
        }),
      });
      const data = await res.json();

      if (data.success && data.data) {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.data.answer },
        ]);
        if (data.data.conversationHistory) {
          setConversationHistory(data.data.conversationHistory);
        }
      } else {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry, couldn't process that." },
        ]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error. Try again." },
      ]);
    } finally {
      setIsFollowUpLoading(false);
    }
  }

  function handleNewSearch() {
    setSearchResult(null);
    setAffordability(null);
    setAiAdvice(null);
    setChatMessages([]);
    setConversationHistory([]);
    setError(null);
    setLastQuery("");
  }

  if (profileLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="animate-pulse text-gray-400">Loading PriceWise...</span>
      </div>
    );
  }

  const hasResults = searchResult || aiAdvice;

  return (
    <div className="space-y-8">
      {showOnboarding && (
        <OnboardingModal onComplete={handleOnboardingComplete} />
      )}

      {/* Hero + Search */}
      <section className={`text-center ${hasResults ? "py-6" : "py-12"}`}>
        {!hasResults && (
          <>
            <h1 className="text-5xl font-bold tracking-tight">
              Find the <span className="gradient-text">best price</span>,
              <br />
              at the <span className="gradient-text">right time</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400">
              Search any product — get prices, affordability, and AI buy/wait
              advice all at once.
            </p>
          </>
        )}

        <form onSubmit={handleSearch} className={`mx-auto relative ${hasResults ? "max-w-3xl" : "max-w-2xl mt-8"}`}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='AirPods Pro, MacBook Air, "Should I buy a PS5 now?"'
            className="input-field pr-28 text-lg"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary py-2 px-5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Working
              </span>
            ) : (
              "Go"
            )}
          </button>
        </form>

        {/* Profile + hints when idle */}
        {!hasResults && (
          <>
            {profile && (
              <p className="mt-3 text-xs text-gray-600">
                Budget: ${profile.monthlyIncome.toLocaleString()}/mo · {Math.round(profile.monthlySavingsRate * 100)}% savings ·{" "}
                <a href="/settings" className="text-blue-400 hover:underline">Edit</a>
              </p>
            )}
            <p className="mt-2 text-xs text-gray-600">
              Every search shows prices + affordability + AI recommendation
            </p>
          </>
        )}
      </section>

      {/* Loading indicator */}
      {isLoading && (
        <div className="card text-center">
          <div className="flex items-center justify-center gap-3">
            <svg className="animate-spin h-5 w-5 text-blue-400" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-gray-400 animate-pulse">{loadingStep}</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card border-red-500/20 bg-red-500/5 text-center text-red-400">
          {error}
        </div>
      )}

      {/* ═══════════════ UNIFIED RESULTS VIEW ═══════════════ */}
      {hasResults && !isLoading && (
        <div className="space-y-6">
          {/* Result header with back button */}
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={handleNewSearch}
                className="text-xs text-gray-500 hover:text-white transition-colors mb-2"
              >
                ← New search
              </button>
              <h2 className="text-2xl font-bold">
                {searchResult?.name || lastQuery}
              </h2>
              <div className="mt-1 flex items-center gap-2">
                {searchResult?.category && searchResult.category !== "unknown" && (
                  <span className="rounded-full bg-blue-500/10 px-3 py-0.5 text-xs text-blue-400">
                    {searchResult.category}
                  </span>
                )}
                {searchResult && (
                  <span className="text-sm text-gray-500">
                    {searchResult.retailerCount} retailer{searchResult.retailerCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
            {searchResult && (
              <div className="flex items-center gap-3">
                <span className="price-low">Low: ${searchResult.lowestPrice}</span>
                <span className="price-high">High: ${searchResult.highestPrice}</span>
                {searchResult.slug && (
                  <a href={`/product/${searchResult.slug}`} className="btn-secondary py-1.5 px-3 text-xs">
                    Details →
                  </a>
                )}
              </div>
            )}
          </div>

          {/* ── AI Recommendation Card ── */}
          {aiAdvice && (
            <div className="card border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-purple-500/5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <h3 className="font-semibold text-white">AI Recommendation</h3>
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">AI</span>
              </div>

              <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                {aiAdvice}
              </p>

              {/* Follow-up chat messages */}
              {chatMessages.length > 0 && (
                <div className="max-h-[300px] space-y-2.5 overflow-y-auto rounded-lg bg-[#0a0a0f] p-3 mt-3">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                          msg.role === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-[#1e1e2e] text-gray-200"
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {isFollowUpLoading && (
                    <div className="flex justify-start">
                      <div className="rounded-lg bg-[#1e1e2e] px-3 py-2 text-sm text-gray-400">
                        <span className="animate-pulse">Thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}

              {/* Inline follow-up input */}
              <form onSubmit={handleFollowUp} className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={followUpInput}
                  onChange={(e) => setFollowUpInput(e.target.value)}
                  placeholder="Ask a follow-up... (e.g., share the link, which store?)"
                  className="input-field flex-1 text-sm py-2"
                  disabled={isFollowUpLoading}
                />
                <button
                  type="submit"
                  disabled={!followUpInput.trim() || isFollowUpLoading}
                  className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
                >
                  Ask
                </button>
              </form>
            </div>
          )}

          {/* ── Affordability + Prices side by side ── */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Price Cards — left 2/3 */}
            <div className="lg:col-span-2 space-y-3">
              {searchResult && searchResult.prices.length > 0 ? (
                searchResult.prices.map((price, i) => (
                  <PriceCard
                    key={`${price.retailer}-${i}`}
                    price={price}
                    isLowest={price.price === searchResult.lowestPrice}
                  />
                ))
              ) : (
                <div className="card text-center text-gray-500 py-8">
                  No prices found from major retailers for this product.
                </div>
              )}
            </div>

            {/* Budget sidebar — right 1/3 */}
            <div className="space-y-4">
              {affordability && (
                <div
                  className={`card space-y-4 border-l-4 ${
                    affordability.affordabilityTier === "easy"
                      ? "border-l-green-500"
                      : affordability.affordabilityTier === "moderate"
                      ? "border-l-yellow-500"
                      : affordability.affordabilityTier === "stretch"
                      ? "border-l-orange-500"
                      : "border-l-red-500"
                  }`}
                >
                  <h3 className="font-semibold text-white">💰 Work-Time Cost</h3>

                  <div className="space-y-3">
                    {/* Primary: work time in human-readable form */}
                    <div className="text-center py-2">
                      <span className="text-2xl font-bold text-white">
                        {affordability.workTimeDisplay}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Your Rate</span>
                      <span className="text-sm font-bold text-white">
                        ${affordability.hourlyRate}/hr
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">% of Income</span>
                      <span className="text-sm font-bold text-white">
                        {affordability.percentOfMonthlyIncome}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Verdict</span>
                      <span
                        className={`text-sm font-bold ${
                          affordability.affordabilityTier === "easy"
                            ? "text-green-400"
                            : affordability.affordabilityTier === "moderate"
                            ? "text-yellow-400"
                            : affordability.affordabilityTier === "stretch"
                            ? "text-orange-400"
                            : "text-red-400"
                        }`}
                      >
                        {affordability.affordabilityTier === "easy"
                          ? "Easy Buy ✅"
                          : affordability.affordabilityTier === "moderate"
                          ? "Think It Over 🤔"
                          : affordability.affordabilityTier === "stretch"
                          ? "Stretch Purchase ⚠️"
                          : "Major Purchase 🔴"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Save Time</span>
                      <span className="text-xs font-medium text-gray-300">
                        {affordability.weeksToAfford < 4
                          ? `~${affordability.weeksToAfford} wk${affordability.weeksToAfford !== 1 ? "s" : ""} to save`
                          : `~${affordability.monthsToAfford} mo to save`}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 pt-2 border-t border-[#1e1e2e]">
                    {affordability.suggestion}
                  </p>

                  <a href="/settings" className="text-xs text-blue-400 hover:underline">
                    Update income →
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* ── Price History Chart ── */}
          {searchResult && searchResult.prices.length > 0 && (
            <PriceHistoryChart productName={searchResult.name} />
          )}
        </div>
      )}

      {/* Feature Cards — only when idle */}
      {!hasResults && !isLoading && (
        <section className="grid gap-6 md:grid-cols-3 pt-4">
          <div className="card text-center">
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="font-semibold text-white mb-2">Price Comparison</h3>
            <p className="text-sm text-gray-400">
              Compare prices across Amazon, Walmart, Best Buy, Target, and more.
            </p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="font-semibold text-white mb-2">AI Buy/Wait Advice</h3>
            <p className="text-sm text-gray-400">
              Get smart recommendations based on seasonal sales and price trends.
            </p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-3">💰</div>
            <h3 className="font-semibold text-white mb-2">Affordability</h3>
            <p className="text-sm text-gray-400">
              Instantly see how long it takes to save for any product.
            </p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-semibold text-white mb-2">Price History</h3>
            <p className="text-sm text-gray-400">
              Track price trends over time with interactive charts.
            </p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-3">🔔</div>
            <h3 className="font-semibold text-white mb-2">Price Alerts</h3>
            <p className="text-sm text-gray-400">
              Set target prices and get notified when products drop.
            </p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-3">📈</div>
            <h3 className="font-semibold text-white mb-2">Dashboard</h3>
            <p className="text-sm text-gray-400">
              Track all your products, alerts, and searches in one place.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Extract product name from any query (product search or question).
 */
function extractProductName(query: string): string | undefined {
  const cleaned = query
    .replace(/should i (buy|get|purchase)/gi, "")
    .replace(/can i (buy|get)/gi, "")
    .replace(/is .* (a good|the best) price for/gi, "")
    .replace(/when (do|does|will|should)/gi, "")
    .replace(/how (much|long)/gi, "")
    .replace(/\b(now|today|right now|currently|still|really)\b/gi, "")
    .replace(/\?/g, "")
    .trim();

  return cleaned.length > 2 ? cleaned : undefined;
}
