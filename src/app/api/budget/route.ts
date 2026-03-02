import { NextRequest, NextResponse } from "next/server";
import { calculateAffordability } from "@/app/lib/utils/budget";
import { ApiResponse, AffordabilityResult } from "@/app/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productName, price, monthlyIncome, savingsRate } = body;

    if (!productName || !price || !monthlyIncome) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "Missing required fields: productName, price, monthlyIncome",
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const result = calculateAffordability({
      productName,
      price: Number(price),
      monthlyIncome: Number(monthlyIncome),
      savingsRate: savingsRate ? Number(savingsRate) : undefined,
    });

    return NextResponse.json<ApiResponse<AffordabilityResult>>({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Budget calculation error:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: (error as Error).message || "Failed to calculate affordability",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
