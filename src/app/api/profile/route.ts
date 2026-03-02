import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db/prisma";
import { ApiResponse } from "@/app/types";

interface UserProfile {
  id: string;
  monthlyIncome: number;
  monthlySavingsRate: number;
  currency: string;
}

export async function GET() {
  try {
    const profile = await prisma.budgetProfile.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!profile) {
      return NextResponse.json<ApiResponse<null>>({
        success: true,
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json<ApiResponse<UserProfile>>({
      success: true,
      data: {
        id: profile.id,
        monthlyIncome: profile.monthlyIncome,
        monthlySavingsRate: profile.monthlySavingsRate,
        currency: profile.currency,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to load profile", timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { monthlyIncome, monthlySavingsRate } = body;

    if (!monthlyIncome || monthlyIncome <= 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Monthly income is required and must be positive", timestamp: new Date().toISOString() },
        { status: 400 }
      );
    }

    const savingsRate = monthlySavingsRate != null ? Number(monthlySavingsRate) : 0.2;
    if (savingsRate < 0.01 || savingsRate > 0.9) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Savings rate must be between 1% and 90%", timestamp: new Date().toISOString() },
        { status: 400 }
      );
    }

    // Upsert: update existing or create new
    const existing = await prisma.budgetProfile.findFirst({
      orderBy: { createdAt: "desc" },
    });

    let profile;
    if (existing) {
      profile = await prisma.budgetProfile.update({
        where: { id: existing.id },
        data: {
          monthlyIncome: Number(monthlyIncome),
          monthlySavingsRate: savingsRate,
        },
      });
    } else {
      profile = await prisma.budgetProfile.create({
        data: {
          monthlyIncome: Number(monthlyIncome),
          monthlySavingsRate: savingsRate,
        },
      });
    }

    return NextResponse.json<ApiResponse<UserProfile>>({
      success: true,
      data: {
        id: profile.id,
        monthlyIncome: profile.monthlyIncome,
        monthlySavingsRate: profile.monthlySavingsRate,
        currency: profile.currency,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to save profile", timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
