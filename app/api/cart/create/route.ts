import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/cart/create
 * Create a new cart for an employer with a main package
 */
export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request);

        if (!currentUser?.profile?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { packageType, packagePrice } = await request.json();

        // Validate package type
        const validPackageTypes = [
            "concierge_lite",
            "concierge_level_1",
            "concierge_level_2",
            "concierge_level_3",
        ];

        if (!validPackageTypes.includes(packageType)) {
            return NextResponse.json(
                { error: "Invalid package type" },
                { status: 400 }
            );
        }

        // Create cart using raw SQL
        const cartId = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await db.$executeRaw`
      INSERT INTO carts (id, "employerId", "mainPackageType", "mainPackagePrice", status, "totalPrice", "expiresAt", "createdAt", "updatedAt")
      VALUES (
        ${cartId}::uuid,
        ${currentUser.profile.id}::uuid,
        ${packageType},
        ${packagePrice},
        'active',
        ${packagePrice},
        ${expiresAt},
        NOW(),
        NOW()
      )
    `;

        return NextResponse.json({
            success: true,
            cartId: cartId,
            totalPrice: packagePrice,
        });
    } catch (error) {
        console.error("Error creating cart:", error);
        return NextResponse.json(
            { error: "Failed to create cart" },
            { status: 500 }
        );
    }
}
