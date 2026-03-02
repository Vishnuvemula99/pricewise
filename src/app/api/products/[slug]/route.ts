import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db/prisma";
import { ApiResponse } from "@/app/types";

interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  category: string;
  imageUrl: string | null;
  latestPrices: {
    retailer: string;
    price: number;
    url: string | null;
    inStock: boolean;
    fetchedAt: string;
  }[];
  priceStats: {
    currentLow: number;
    currentHigh: number;
    allTimeLow: number;
    allTimeHigh: number;
    avgPrice: number;
  };
  alertCount: number;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: params.slug },
      include: {
        prices: {
          orderBy: { fetchedAt: "desc" },
          take: 50,
        },
        alerts: {
          where: { isActive: true },
        },
      },
    });

    if (!product) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Product not found", timestamp: new Date().toISOString() },
        { status: 404 }
      );
    }

    // Get latest price per retailer
    const latestByRetailer = new Map<string, typeof product.prices[0]>();
    for (const price of product.prices) {
      if (!latestByRetailer.has(price.retailer)) {
        latestByRetailer.set(price.retailer, price);
      }
    }

    const latestPrices = Array.from(latestByRetailer.values())
      .map((p) => ({
        retailer: p.retailer,
        price: p.price,
        url: p.url,
        inStock: p.inStock,
        fetchedAt: p.fetchedAt.toISOString(),
      }))
      .sort((a, b) => a.price - b.price);

    const allPriceValues = product.prices.map((p) => p.price);
    const currentPrices = latestPrices.map((p) => p.price);

    const detail: ProductDetail = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      category: product.category,
      imageUrl: product.imageUrl,
      latestPrices,
      priceStats: {
        currentLow: currentPrices.length > 0 ? Math.min(...currentPrices) : 0,
        currentHigh: currentPrices.length > 0 ? Math.max(...currentPrices) : 0,
        allTimeLow: allPriceValues.length > 0 ? Math.min(...allPriceValues) : 0,
        allTimeHigh: allPriceValues.length > 0 ? Math.max(...allPriceValues) : 0,
        avgPrice: allPriceValues.length > 0
          ? Math.round((allPriceValues.reduce((a, b) => a + b, 0) / allPriceValues.length) * 100) / 100
          : 0,
      },
      alertCount: product.alerts.length,
    };

    return NextResponse.json<ApiResponse<ProductDetail>>({
      success: true,
      data: detail,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Product detail error:", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to load product", timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
