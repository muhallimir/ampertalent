import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/add-ons
 * Fetch all add-ons (admin only)
 */
export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request);

        if (!currentUser?.profile?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Check if user is admin (you may need to adjust this check based on your auth setup)
        // For now, this is a placeholder - implement proper admin role check
        const isAdmin = currentUser.profile.role === "admin" || currentUser.profile.isAdmin;

        if (!isAdmin) {
            return NextResponse.json(
                { error: "Forbidden - admin access required" },
                { status: 403 }
            );
        }

        const addOns = await db.$queryRaw<Array<any>>`
      SELECT * FROM product_add_ons
      ORDER BY "displayOrder" ASC
    `;

        return NextResponse.json({
            success: true,
            count: (addOns || []).length,
            addOns: addOns || [],
        });
    } catch (error) {
        console.error("Error fetching add-ons:", error);
        return NextResponse.json(
            { error: "Failed to fetch add-ons" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/add-ons
 * Create a new add-on (admin only)
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

        const isAdmin = currentUser.profile.role === "admin" || currentUser.profile.isAdmin;

        if (!isAdmin) {
            return NextResponse.json(
                { error: "Forbidden - admin access required" },
                { status: 403 }
            );
        }

        const { name, description, price, icon, triggerPackageTypes, displayOrder } = await request.json();

        if (!name || !price || !triggerPackageTypes) {
            return NextResponse.json(
                { error: "name, price, and triggerPackageTypes are required" },
                { status: 400 }
            );
        }

        const addOnId = crypto.randomUUID();
        await db.$executeRaw`
      INSERT INTO product_add_ons (id, name, description, price, icon, "triggerPackageTypes", "displayOrder", "createdAt", "updatedAt")
      VALUES (
        ${addOnId}::uuid,
        ${name},
        ${description},
        ${parseFloat(price)},
        ${icon},
        ${JSON.stringify(triggerPackageTypes)}::jsonb,
        ${displayOrder || 999},
        NOW(),
        NOW()
      )
    `;

        return NextResponse.json(
            {
                success: true,
                addOn: {
                    id: addOnId,
                    name,
                    description,
                    price: parseFloat(price),
                    icon,
                    triggerPackageTypes,
                    displayOrder: displayOrder || 999,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error creating add-on:", error);
        return NextResponse.json(
            { error: "Failed to create add-on" },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/add-ons/[id]
 * Update an existing add-on (admin only)
 */
export async function PUT(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request);

        if (!currentUser?.profile?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const isAdmin = currentUser.profile.role === "admin" || currentUser.profile.isAdmin;

        if (!isAdmin) {
            return NextResponse.json(
                { error: "Forbidden - admin access required" },
                { status: 403 }
            );
        }

        const url = new URL(request.url);
        const addOnId = url.pathname.split("/").pop();

        if (!addOnId) {
            return NextResponse.json(
                { error: "addOnId is required" },
                { status: 400 }
            );
        }

        const { name, description, price, icon, triggerPackageTypes, displayOrder } = await request.json();

        // Build dynamic update query
        const updates: Array<string> = [];
        const params: any[] = [];

        if (name) {
            updates.push(`name = $${updates.length + 1}`);
            params.push(name);
        }
        if (description !== undefined) {
            updates.push(`description = $${updates.length + 1}`);
            params.push(description);
        }
        if (price) {
            updates.push(`price = $${updates.length + 1}`);
            params.push(parseFloat(price));
        }
        if (icon) {
            updates.push(`icon = $${updates.length + 1}`);
            params.push(icon);
        }
        if (triggerPackageTypes) {
            updates.push(`"triggerPackageTypes" = $${updates.length + 1}::jsonb`);
            params.push(JSON.stringify(triggerPackageTypes));
        }
        if (displayOrder !== undefined) {
            updates.push(`"displayOrder" = $${updates.length + 1}`);
            params.push(displayOrder);
        }

        updates.push(`"updatedAt" = NOW()`);

        if (updates.length === 1) {
            // Only updatedAt was set
            return NextResponse.json(
                { error: "No fields to update" },
                { status: 400 }
            );
        }

        await db.$executeRawUnsafe(`
      UPDATE "ProductAddOn"
      SET ${updates.join(", ")}
      WHERE id = $${params.length + 1}::uuid
    `, ...params, addOnId);

        // Fetch updated record
        const result = await db.$queryRaw<Array<any>>`
      SELECT * FROM product_add_ons WHERE id = ${addOnId}::uuid
    `;

        return NextResponse.json({
            success: true,
            addOn: result[0],
        });
    } catch (error) {
        console.error("Error updating add-on:", error);
        return NextResponse.json(
            { error: "Failed to update add-on" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/add-ons/[id]
 * Delete an add-on (admin only)
 */
export async function DELETE(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request);

        if (!currentUser?.profile?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const isAdmin = currentUser.profile.role === "admin" || currentUser.profile.isAdmin;

        if (!isAdmin) {
            return NextResponse.json(
                { error: "Forbidden - admin access required" },
                { status: 403 }
            );
        }

        const url = new URL(request.url);
        const addOnId = url.pathname.split("/").pop();

        if (!addOnId) {
            return NextResponse.json(
                { error: "addOnId is required" },
                { status: 400 }
            );
        }

        await db.$executeRaw`
      DELETE FROM product_add_ons WHERE id = ${addOnId}::uuid
    `;

        return NextResponse.json({
            success: true,
            message: "Add-on deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting add-on:", error);
        return NextResponse.json(
            { error: "Failed to delete add-on" },
            { status: 500 }
        );
    }
}
