import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db/prisma";
import { ApiResponse } from "@/app/types";

interface PriceHistoryData {
  productName: string;
  history: {
    date: string;
    prices: { retailer: string; price: number }[];
    lowestPrice: number;
    averagePrice: number;
  }[];
  stats: {
    allTimeLow: number;
    allTimeHigh: number;
    avgPrice: number;
    priceChange30d: number | null;
    trend: "rising" | "falling" | "stable";
  };
}

export async function GET(request: NextRequest) {
  const productSlug = request.nextUrl.searchParams.get("product");
  const days = parseInt(request.nextUrl.searchParams.get("days") || "90");

  if (!productSlug) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Product parameter required", timestamp: new Date().toISOString() },
      { status: 400 }
    );
  }

  try {
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { slug: productSlug },
          { name: { contains: productSlug } },
        ],
      },
    });

    if (!product) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Product not found. Search for it first to start tracking.", timestamp: new Date().toISOString() },
        { status: 404 }
      );
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    const records = await prisma.priceRecord.findMany({
      where: {
        productId: product.id,
        fetchedAt: { gte: since },
      },
      orderBy: { fetchedAt: "asc" },
    });

    // Group by date
    const byDate = new Map<string, { retailer: string; price: number }[]>();
    for (const record of records) {
      const dateKey = record.fetchedAt.toISOString().split("T")[0];
      if (!byDate.has(dateKey)) byDate.set(dateKey, []);
      byDate.get(dateKey)!.push({ retailer: record.retailer, price: record.price });
    }

    const history = Array.from(byDate.entries()).map(([date, prices]) => {
      const priceValues = prices.map((p) => p.price);
      return {
        date,
        prices,
        lowestPrice: Math.min(...priceValues),
        averagePrice: Math.round((priceValues.reduce((a, b) => a + b, 0) / priceValues.length) * 100) / 100,
      };
    });

    // Calculate stats
    const allPrices = records.map((r) => r.price);
    const allTimeLow = allPrices.length > 0 ? Math.min(...allPrices) : 0;
    const allTimeHigh = allPrices.length > 0 ? Math.max(...allPrices) : 0;
    const avgPrice = allPrices.length > 0
      ? Math.round((allPrices.reduce((a, b) => a + b, 0) / allPrices.length) * 100) / 100
      : 0;

    // 30-day price change
    let priceChange30d: number | null = null;
    let trend: "rising" | "falling" | "stable" = "stable";
    if (history.length >= 2) {
      const recent = history[history.length - 1].lowestPrice;
      const older = history[0].lowestPrice;
      priceChange30d = Math.round(((recent - older) / older) * 100 * 10) / 10;
      trend = priceChange30d > 2 ? "rising" : priceChange30d < -2 ? "falling" : "stable";
    }

    return NextResponse.json<ApiResponse<PriceHistoryData>>({
      success: true,
      data: {
        productName: product.name,
        history,
        stats: { allTimeLow, allTimeHigh, avgPrice, priceChange30d, trend },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Price history error:", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch price history", timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

// POST: Save price snapshot (called after each search)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productName, category, prices } = body as {
      productName: string;
      category?: string;
      prices: { retailer: string; price: number; url?: string; inStock?: boolean }[];
    };

    if (!productName || !prices || prices.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "productName and prices required", timestamp: new Date().toISOString() },
        { status: 400 }
      );
    }

    const slug = productName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    // Upsert product
    let product = await prisma.product.findUnique({ where: { slug } });
    if (!product) {
      product = await prisma.product.create({
        data: {
          name: productName,
          slug,
          category: category || "general",
        },
      });
    }

    // Store price records
    const records = await prisma.priceRecord.createMany({
      data: prices.map((p) => ({
        productId: product!.id,
        retailer: p.retailer,
        price: p.price,
        url: p.url || null,
        inStock: p.inStock ?? true,
      })),
    });

    // Log the search
    await prisma.searchLog.create({
      data: { query: productName, productId: product.id },
    });

    return NextResponse.json<ApiResponse<{ saved: number }>>({
      success: true,
      data: { saved: records.count },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Save price history error:", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to save price data", timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
