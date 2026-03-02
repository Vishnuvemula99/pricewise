"use client";

import { useState, useRef, useEffect, FormEvent } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

/**
 * Conversation history in OpenAI message format.
 * Stored client-side and passed with every request so the AI
 * remembers previous messages (no LangChain needed).
 */
type ConversationMessage = { role: "user" | "assistant"; content: string };

export function AdvisorChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // OpenAI-format conversation history — passed to API each turn
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  // Track whether we already fetched prices in this session
  const [hasPriceContext, setHasPriceContext] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const productName = extractProductName(userMessage);

      // Build the request body
      const requestBody: Record<string, unknown> = {
        query: userMessage,
        conversationHistory,
      };

      // Only ask server to fetch prices on the first product mention
      // After that, the conversation history already has the price data
      if (productName && !hasPriceContext) {
        requestBody.productName = productName;
      }

      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (data.success) {
        const assistantMessage = data.data.answer;

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: assistantMessage },
        ]);

        // Update conversation history from server response
        if (data.data.conversationHistory) {
          setConversationHistory(data.data.conversationHistory);
        }

        // Mark that we have price context now
        if (!hasPriceContext && data.data.sources && data.data.sources.length > 0) {
          setHasPriceContext(true);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I couldn't process that. Please try again.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleClearChat() {
    setMessages([]);
    setConversationHistory([]);
    setHasPriceContext(false);
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <h3 className="font-semibold text-white">PriceWise Advisor</h3>
          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
            AI
          </span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Clear chat
          </button>
        )}
      </div>
      <p className="text-sm text-gray-400">
        Ask me anything — &quot;Should I buy AirPods Pro now?&quot;, &quot;When
        do laptops go on sale?&quot;, &quot;Share me the link&quot; — I remember
        the full conversation.
      </p>

      {/* Messages */}
      {messages.length > 0 && (
        <div className="max-h-[500px] space-y-3 overflow-y-auto rounded-lg bg-[#0a0a0f] p-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-[#1e1e2e] text-gray-200"
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-[#1e1e2e] px-4 py-2.5 text-sm text-gray-400">
                <span className="animate-pulse">Analyzing prices and trends...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            messages.length > 0
              ? "Ask a follow-up question..."
              : "Ask the advisor..."
          }
          className="input-field flex-1 text-sm"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="btn-primary px-5 text-sm disabled:opacity-50"
        >
          Ask
        </button>
      </form>

      {/* Conversation context indicator */}
      {conversationHistory.length > 0 && (
        <p className="text-xs text-gray-600 text-center">
          {Math.floor(conversationHistory.length / 2)} message
          {conversationHistory.length > 2 ? "s" : ""} in this conversation
        </p>
      )}
    </div>
  );
}

/**
 * Extract a product name from a natural language query.
 * Returns undefined for follow-up questions so we don't re-fetch prices.
 */
function extractProductName(query: string): string | undefined {
  // If it's clearly a follow-up, don't extract a product name
  const followUpPatterns = [
    /^(share|send|give|show)\s+(me\s+)?(the\s+)?link/i,
    /^which\s+retailer/i,
    /^where\s+(should|can)/i,
    /^how\s+(much|long)/i,
    /^what\s+(about|if)/i,
    /^(yes|no|ok|thanks|thank)/i,
    /^(compare|difference)/i,
    /^why/i,
    /^(and|also|but|or)\s/i,
  ];

  if (followUpPatterns.some((p) => p.test(query))) {
    return undefined;
  }

  // Remove common question words and phrases
  const cleaned = query
    .replace(/should i (buy|get|purchase)/gi, "")
    .replace(/is .* (a good|the best) price for/gi, "")
    .replace(/when (do|does|will|should)/gi, "")
    .replace(/how much (is|does|will)/gi, "")
    .replace(/can i (buy|get)/gi, "")
    .replace(/(now|today|right now|currently)\??/gi, "")
    .replace(/\?/g, "")
    .trim();

  return cleaned.length > 2 ? cleaned : undefined;
}
