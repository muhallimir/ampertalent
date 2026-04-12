import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

interface RemoveItemParams {
    params: Promise<{ cartId: string }>;
}

/**
 * POST /api/cart/[cartId]/remove-item
 * Remove an add-on from the cart
 */
export async function POST(
    request: NextRequest,
    { params }: RemoveItemParams
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
        const { addOnId } = await request.json();

        if (!addOnId) {
            return NextResponse.json(
                { error: "addOnId is required" },
                { status: 400 }
            );
        }

        // Verify cart ownership
        const cartResult = await db.$queryRaw<Array<{ employerId: string; totalPrice: number; mainPackagePrice: number }>>`
      SELECT "employerId", "totalPrice", "mainPackagePrice" FROM carts WHERE id = ${cartId}::uuid
    `;

        if (!cartResult || cartResult.length === 0) {
            return NextResponse.json(
                { error: "Cart not found" },
                { status: 404 }
            );
        }

        if (cartResult[0].employerId !== currentUser.profile.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 }
            );
        }

        // Find the item to remove
        const cartItemResult = await db.$queryRaw<Array<{ id: string; price: number }>>`
      SELECT id, price FROM cart_items WHERE "cartId" = ${cartId}::uuid AND "addOnId" = ${addOnId}::uuid
    `;

        if (!cartItemResult || cartItemResult.length === 0) {
            return NextResponse.json(
                { error: "Item not found in cart" },
                { status: 404 }
            );
        }

        const cartItem = cartItemResult[0];

        // Delete the item
        await db.$executeRaw`
      DELETE FROM cart_items WHERE id = ${cartItem.id}::uuid
    `;

        // Update cart total
        const newTotal = Math.max(cartResult[0].totalPrice - cartItem.price, cartResult[0].mainPackagePrice);
        await db.$executeRaw`
      UPDATE carts
      SET "totalPrice" = ${newTotal}, "updatedAt" = NOW()
      WHERE id = ${cartId}::uuid
    `;

        return NextResponse.json({
            success: true,
            totalPrice: newTotal,
        });
    } catch (error) {
        console.error("Error removing item from cart:", error);
        return NextResponse.json(
            { error: "Failed to remove item from cart" },
            { status: 500 }
        );
    }
}
