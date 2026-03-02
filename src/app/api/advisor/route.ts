import { NextRequest, NextResponse } from "next/server";
import { getAdvisorRecommendation, ChatMessage } from "@/app/lib/ai/advisor";
import { createFetcherRegistry } from "@/app/lib/fetchers";
import { ApiResponse } from "@/app/types";

interface AdvisorApiResponse {
  answer: string;
  conversationHistory: ChatMessage[];
  sources: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      query,
      productName,
      monthlyIncome,
      savingsRate,
      conversationHistory = [],
      priceContext,
    } = body;

    if (!query) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "Missing required field: query",
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Only fetch prices if:
    // 1. A product name was extracted AND
    // 2. We don't already have price context from a previous turn
    let priceData = priceContext || undefined;
    if (productName && !priceData) {
      try {
        const registry = createFetcherRegistry();
        priceData = await registry.searchAll(productName);
      } catch (error) {
        console.warn("Price fetch failed, continuing without price data:", error);
      }
    }

    const result = await getAdvisorRecommendation({
      query,
      conversationHistory: conversationHistory as ChatMessage[],
      priceData,
      monthlyIncome: monthlyIncome ? Number(monthlyIncome) : undefined,
      savingsRate: savingsRate ? Number(savingsRate) : undefined,
    });

    return NextResponse.json<ApiResponse<AdvisorApiResponse>>({
      success: true,
      data: {
        answer: result.answer,
        conversationHistory: result.conversationHistory,
        sources: priceData?.prices?.map(
          (p: { retailer: string; url: string }) => `${p.retailer}: ${p.url}`
        ) || [],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Advisor error:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: "Advisor is unavailable. Please try again.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
