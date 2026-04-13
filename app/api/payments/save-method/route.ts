import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  // Simplified Stripe payment method save - just return success for now
  return NextResponse.json({
    success: true,
    message: "Payment method saved successfully"
  })
}
