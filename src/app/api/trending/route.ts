import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db/prisma";
import { ApiResponse } from "@/app/types";

interface TrendingData {
  recentSearches: { query: string; count: number }[];
  trackedProducts: {
    name: string;
    slug: string;
    category: string;
    latestLow: number | null;
    searchCount: number;
  }[];
}

export async function GET() {
  try {
    // Get recent searches grouped by query
    const searches = await prisma.searchLog.groupBy({
      by: ["query"],
      _count: { query: true },
      orderBy: { _count: { query: "desc" } },
      take: 10,
    });

    const recentSearches = searches.map((s) => ({
      query: s.query,
      count: s._count.query,
    }));

    // Get tracked products with latest prices
    const products = await prisma.product.findMany({
      include: {
        prices: {
          orderBy: { fetchedAt: "desc" },
          take: 5,
        },
        _count: { select: { searches: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    const trackedProducts = products.map((p) => ({
      name: p.name,
      slug: p.slug,
      category: p.category,
      latestLow: p.prices.length > 0 ? Math.min(...p.prices.map((pr) => pr.price)) : null,
      searchCount: p._count.searches,
    }));

    return NextResponse.json<ApiResponse<TrendingData>>({
      success: true,
      data: { recentSearches, trackedProducts },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Trending error:", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch trending data", timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
