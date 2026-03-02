import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db/prisma";
import { ApiResponse } from "@/app/types";

interface AlertData {
  id: string;
  productId: string;
  productName: string;
  targetPrice: number;
  currentPrice: number | null;
  isActive: boolean;
  isTriggered: boolean;
  triggeredAt: string | null;
  createdAt: string;
}

// GET: List all alerts
export async function GET() {
  try {
    const alerts = await prisma.priceAlert.findMany({
      include: {
        product: {
          include: {
            prices: {
              orderBy: { fetchedAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data: AlertData[] = alerts.map((alert) => {
      const latestPrice = alert.product.prices[0];
      return {
        id: alert.id,
        productId: alert.productId,
        productName: alert.product.name,
        targetPrice: alert.targetPrice,
        currentPrice: latestPrice?.price ?? null,
        isActive: alert.isActive,
        isTriggered: alert.triggeredAt !== null,
        triggeredAt: alert.triggeredAt?.toISOString() ?? null,
        createdAt: alert.createdAt.toISOString(),
      };
    });

    return NextResponse.json<ApiResponse<AlertData[]>>({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get alerts error:", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch alerts", timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

// POST: Create a new alert
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, targetPrice } = body;

    if (!productId || !targetPrice) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "productId and targetPrice required", timestamp: new Date().toISOString() },
        { status: 400 }
      );
    }

    // Verify product exists
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Product not found", timestamp: new Date().toISOString() },
        { status: 404 }
      );
    }

    const alert = await prisma.priceAlert.create({
      data: {
        productId,
        targetPrice: Number(targetPrice),
      },
    });

    return NextResponse.json<ApiResponse<{ id: string; message: string }>>({
      success: true,
      data: { id: alert.id, message: `Alert set for ${product.name} at $${targetPrice}` },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Create alert error:", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create alert", timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

// DELETE: Remove an alert
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get("id");

    if (!alertId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Alert ID required", timestamp: new Date().toISOString() },
        { status: 400 }
      );
    }

    await prisma.priceAlert.delete({ where: { id: alertId } });

    return NextResponse.json<ApiResponse<{ message: string }>>({
      success: true,
      data: { message: "Alert deleted" },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Delete alert error:", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete alert", timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
