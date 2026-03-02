import OpenAI from "openai";
import { BuyWaitAdvice, ProductSearchResult, AffordabilityResult } from "@/app/types";
import { formatSeasonalContext } from "@/app/lib/utils/seasonal";
import { calculateAffordability } from "@/app/lib/utils/budget";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * AI Advisor — Tool-Calling Agent with Conversation Memory
 *
 * The advisor uses GPT-4o-mini with:
 * 1. Full conversation history (messages[]) for multi-turn context
 * 2. Tool definitions for seasonal data and budget calculations
 * 3. Price data injected as system context so follow-ups work
 *
 * No LangChain needed — OpenAI's API natively supports multi-turn
 * by simply passing the full messages[] array each time.
 */

// ─── Tool Definitions ────────────────────────────────────────

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_seasonal_sales",
      description:
        "Get upcoming seasonal sale events for a product category. Use this to determine if the user should wait for a sale.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description:
              'Product category: "electronics", "laptops", "headphones", "tvs", "phones", "appliances", "general"',
          },
        },
        required: ["category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_affordability",
      description:
        "Calculate how long it will take the user to afford a product based on their income and savings rate.",
      parameters: {
        type: "object",
        properties: {
          product_name: { type: "string", description: "Name of the product" },
          price: { type: "number", description: "Price of the product in USD" },
          monthly_income: { type: "number", description: "User's monthly after-tax income in USD" },
          savings_rate: {
            type: "number",
            description: "Fraction of income dedicated to savings (0-1). Default 0.2",
          },
        },
        required: ["product_name", "price", "monthly_income"],
      },
    },
  },
];

// ─── Tool Executor ───────────────────────────────────────────

function executeTool(
  name: string,
  args: Record<string, unknown>
): string {
  switch (name) {
    case "get_seasonal_sales":
      return formatSeasonalContext(args.category as string);

    case "calculate_affordability": {
      const result = calculateAffordability({
        productName: args.product_name as string,
        price: args.price as number,
        monthlyIncome: args.monthly_income as number,
        savingsRate: (args.savings_rate as number) ?? 0.2,
      });
      return JSON.stringify(result, null, 2);
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// ─── System Prompt ───────────────────────────────────────────

const SYSTEM_PROMPT = `You are PriceWise Advisor, a smart purchase assistant. Your job is to help users decide whether to buy a product now or wait for a better deal.

You have access to:
1. Seasonal sale data — know when major sales happen and typical discounts
2. Affordability calculator — can assess how a purchase fits the user's budget
3. Price data from major retailers — injected into the conversation when available

IMPORTANT RULES:
- You remember the full conversation. If the user asks a follow-up (like "share the link", "which retailer?", "how much at Amazon?"), refer back to the price data from earlier in the conversation.
- When sharing retailer links, use the exact URLs from the price data provided — never make up URLs.
- If price data was provided for a product earlier, you don't need it fetched again — use what you have.
- Be specific with numbers, dates, retailer names, and links.
- If a major sale is within 60 days, recommend waiting.
- If the current price is near all-time lows, recommend buying.
- Always consider the user's budget if provided.
- Be concise but thorough — 2-4 sentences for the recommendation.
- Use a friendly, helpful tone.

Format your initial recommendation as:
**Recommendation: [BUY NOW / WAIT / STRONG WAIT / STRONG BUY]**
Then explain why in 2-4 sentences.

For follow-up questions, just answer naturally using the context you already have.`;

// ─── Types ───────────────────────────────────────────────────

/**
 * OpenAI message type — we accept the union of all message param types.
 * This is what gets stored in the conversation history on the client side.
 */
export type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export interface AdvisorInput {
  query: string;
  /** Full conversation history from the client (user + assistant messages) */
  conversationHistory?: ChatMessage[];
  /** Fresh price data — only fetched on first product mention */
  priceData?: ProductSearchResult;
  monthlyIncome?: number;
  savingsRate?: number;
}

export interface AdvisorOutput {
  answer: string;
  /** The updated conversation history to send back to the client */
  conversationHistory: ChatMessage[];
  recommendation?: BuyWaitAdvice;
  affordability?: AffordabilityResult;
}

// ─── Main Advisor Function ───────────────────────────────────

export async function getAdvisorRecommendation(
  input: AdvisorInput
): Promise<AdvisorOutput> {
  const { query, conversationHistory = [], priceData, monthlyIncome, savingsRate } = input;

  // ── Build the messages array ──

  // Start with system prompt — always first
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  // Inject price data as a system-level context message if available
  // This ensures the AI always has it, even in follow-up turns
  if (priceData && priceData.prices.length > 0) {
    const priceContext = buildPriceContext(priceData, monthlyIncome, savingsRate);
    messages.push({
      role: "system",
      content: priceContext,
    });
  }

  // Append the full conversation history from previous turns
  // (these are user + assistant messages only — no system messages)
  for (const msg of conversationHistory) {
    messages.push(msg);
  }

  // Add the current user message
  messages.push({ role: "user", content: query });

  // ── Call OpenAI with tool support ──

  let response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    tools,
    tool_choice: "auto",
    temperature: 0.3,
    max_tokens: 1000,
  });

  let message = response.choices[0]?.message;

  // Tool calling loop (max 3 iterations)
  let iterations = 0;
  while (message?.tool_calls && iterations < 3) {
    iterations++;

    messages.push(message);

    for (const toolCall of message.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments);
      const result = executeTool(toolCall.function.name, args);

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }

    response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.3,
      max_tokens: 1000,
    });

    message = response.choices[0]?.message;
  }

  const answer = message?.content || "Unable to generate a recommendation at this time.";

  // ── Build updated conversation history for the client ──
  // Only include user + assistant messages (no system, no tools)
  // This keeps the payload small and avoids leaking internal context
  const updatedHistory: ChatMessage[] = [];
  for (const msg of conversationHistory) {
    updatedHistory.push(msg);
  }
  // Add this turn
  updatedHistory.push({ role: "user", content: query });
  updatedHistory.push({ role: "assistant", content: answer });

  return {
    answer,
    conversationHistory: updatedHistory,
  };
}

// ─── Helpers ─────────────────────────────────────────────────

function buildPriceContext(
  priceData: ProductSearchResult,
  monthlyIncome?: number,
  savingsRate?: number
): string {
  const lines = [
    `[PRICE DATA] Current prices for "${priceData.name}" (category: ${priceData.category}):`,
    `Lowest: $${priceData.lowestPrice} | Highest: $${priceData.highestPrice} | Average: $${priceData.averagePrice}`,
    `Found at ${priceData.retailerCount} retailer(s):`,
  ];

  for (const p of priceData.prices) {
    const stockStatus = p.inStock ? "In Stock" : "Out of Stock";
    lines.push(`  - ${p.retailer}: $${p.price.toFixed(2)} (${stockStatus}) → ${p.url}`);
  }

  if (monthlyIncome) {
    lines.push(`\nUser's monthly after-tax income: $${monthlyIncome}`);
    if (savingsRate) lines.push(`Savings rate: ${(savingsRate * 100).toFixed(0)}%`);
  }

  return lines.join("\n");
}
