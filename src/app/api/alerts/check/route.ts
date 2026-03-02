import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db/prisma";
import { ApiResponse } from "@/app/types";

interface CheckResult {
  checked: number;
  triggered: { productName: string; targetPrice: number; currentPrice: number }[];
}

// POST: Check all active alerts
export async function POST() {
  try {
    const activeAlerts = await prisma.priceAlert.findMany({
      where: { isActive: true, triggeredAt: null },
      include: {
        product: {
          include: {
            prices: {
              orderBy: { fetchedAt: "desc" },
              take: 10,
            },
          },
        },
      },
    });

    const triggered: CheckResult["triggered"] = [];

    for (const alert of activeAlerts) {
      // Get the lowest recent price for this product
      const lowestRecentPrice = alert.product.prices.length > 0
        ? Math.min(...alert.product.prices.map((p) => p.price))
        : null;

      if (lowestRecentPrice !== null && lowestRecentPrice <= alert.targetPrice) {
        // Trigger the alert
        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: { triggeredAt: new Date() },
        });

        triggered.push({
          productName: alert.product.name,
          targetPrice: alert.targetPrice,
          currentPrice: lowestRecentPrice,
        });
      }
    }

    return NextResponse.json<ApiResponse<CheckResult>>({
      success: true,
      data: { checked: activeAlerts.length, triggered },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Check alerts error:", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to check alerts", timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
