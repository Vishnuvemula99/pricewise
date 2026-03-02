import { NextRequest, NextResponse } from "next/server";
import { createFetcherRegistry } from "@/app/lib/fetchers";
import { prisma } from "@/app/lib/db/prisma";
import { detectCategory } from "@/app/lib/utils/categories";
import { ApiResponse, ProductSearchResult } from "@/app/types";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");

  if (!query || query.trim().length === 0) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: "Query parameter 'q' is required",
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );
  }

  try {
    const registry = createFetcherRegistry();
    const trimmedQuery = query.trim();
    const result = await registry.searchAll(trimmedQuery);

    // Auto-detect category
    const category = detectCategory(trimmedQuery);
    result.category = category;

    // Generate product slug for linking to detail page
    const slug = trimmedQuery
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Save price history in background (don't block the response)
    if (result.prices.length > 0) {
      savePriceHistory(trimmedQuery, category, slug, result.prices).catch((err) =>
        console.warn("Failed to save price history:", err)
      );
    }

    return NextResponse.json<ApiResponse<ProductSearchResult & { slug: string }>>({
      success: true,
      data: { ...result, slug },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: "Failed to fetch prices. Please try again.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Save price data to the database for history tracking.
 * Runs in background -- failures don't affect search response.
 */
async function savePriceHistory(
  productName: string,
  category: string,
  slug: string,
  prices: { retailer: string; price: number; url: string; inStock: boolean }[]
) {
  // Upsert product
  let product = await prisma.product.findUnique({ where: { slug } });
  if (!product) {
    product = await prisma.product.create({
      data: { name: productName, slug, category },
    });
  }

  // Store price records
  await prisma.priceRecord.createMany({
    data: prices.map((p) => ({
      productId: product!.id,
      retailer: p.retailer,
      price: p.price,
      url: p.url,
      inStock: p.inStock,
    })),
  });

  // Log the search
  await prisma.searchLog.create({
    data: { query: productName, productId: product.id },
  });
}
