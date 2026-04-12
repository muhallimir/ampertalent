import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

interface AddItemParams {
    params: Promise<{ cartId: string }>;
}

/**
 * POST /api/cart/[cartId]/add-item
 * Add an add-on to the cart
 */
export async function POST(
    request: NextRequest,
    { params }: AddItemParams
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

        // Check if add-on exists
        const addOnResult = await db.$queryRaw<Array<{ id: string; name: string; price: number }>>`
      SELECT id, name, price FROM product_add_ons WHERE id = ${addOnId}::uuid
    `;

        if (!addOnResult || addOnResult.length === 0) {
            return NextResponse.json(
                { error: "Add-on not found" },
                { status: 404 }
            );
        }

        const addOn = addOnResult[0];

        // Check if already in cart
        const existingItem = await db.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM cart_items WHERE "cartId" = ${cartId}::uuid AND "addOnId" = ${addOnId}::uuid
    `;

        if (existingItem && existingItem.length > 0) {
            return NextResponse.json(
                { error: "Add-on already in cart" },
                { status: 400 }
            );
        }

        // Add item to cart
        const cartItemId = crypto.randomUUID();
        await db.$executeRaw`
      INSERT INTO cart_items (id, "cartId", "addOnId", price, "createdAt", "updatedAt")
      VALUES (
        ${cartItemId}::uuid,
        ${cartId}::uuid,
        ${addOnId}::uuid,
        ${addOn.price},
        NOW(),
        NOW()
      )
    `;

        // Update cart total
        const newTotal = cartResult[0].totalPrice + addOn.price;
        await db.$executeRaw`
      UPDATE carts
      SET "totalPrice" = ${newTotal}, "updatedAt" = NOW()
      WHERE id = ${cartId}::uuid
    `;

        return NextResponse.json({
            success: true,
            totalPrice: newTotal,
            addOnName: addOn.name,
            addOnPrice: addOn.price,
        });
    } catch (error) {
        console.error("Error adding item to cart:", error);
        return NextResponse.json(
            { error: "Failed to add item to cart" },
            { status: 500 }
        );
    }
}
