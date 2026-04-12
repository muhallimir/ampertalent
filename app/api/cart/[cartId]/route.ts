import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

interface GetCartParams {
    params: Promise<{ cartId: string }>;
}

/**
 * GET /api/cart/[cartId]
 * Get cart details including items
 */
export async function GET(
    request: NextRequest,
    { params }: GetCartParams
) {
    try {
        const currentUser = await getCurrentUser(request);

        if (!currentUser?.profile?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { cartId } = await params;

        // Get cart using raw SQL
        const cartData = await db.$queryRaw<Array<{
            id: string;
            employerId: string;
            mainPackageType: string;
            mainPackagePrice: number;
            totalPrice: number;
            status: string;
            expiresAt: Date;
            itemId: string | null;
            addOnId: string | null;
            addOnName: string | null;
            addOnPrice: number | null;
        }>>`
      SELECT
        c.id,
        c."employerId",
        c."mainPackageType",
        c."mainPackagePrice",
        c."totalPrice",
        c.status,
        c."expiresAt",
        ci.id as "itemId",
        pa.id as "addOnId",
        pa.name as "addOnName",
        pa.price as "addOnPrice"
      FROM carts c
      LEFT JOIN cart_items ci ON c.id = ci."cartId"
      LEFT JOIN product_add_ons pa ON ci."addOnId" = pa.id
      WHERE c.id = ${cartId}::uuid
    `;

        if (!cartData || cartData.length === 0) {
            return NextResponse.json(
                { error: "Cart not found" },
                { status: 404 }
            );
        }

        // Verify ownership
        if (cartData[0].employerId !== currentUser.profile.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 }
            );
        }

        const cartInfo = cartData[0];
        const cartItems = cartData
            .filter((row) => row.itemId !== null)
            .map((row) => ({
                id: row.itemId,
                addOnId: row.addOnId,
                addOn: {
                    id: row.addOnId,
                    name: row.addOnName,
                    price: row.addOnPrice,
                },
            }));

        return NextResponse.json({
            success: true,
            cart: {
                id: cartInfo.id,
                mainPackageType: cartInfo.mainPackageType,
                mainPackagePrice: cartInfo.mainPackagePrice,
                items: cartItems,
                totalPrice: cartInfo.totalPrice,
                status: cartInfo.status,
                expiresAt: cartInfo.expiresAt,
            },
        });
    } catch (error) {
        console.error("Error fetching cart:", error);
        return NextResponse.json(
            { error: "Failed to fetch cart" },
            { status: 500 }
        );
    }
}
