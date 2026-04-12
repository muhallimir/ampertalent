import { NextRequest, NextResponse } from "next/server";
import { getAddOnsByPackageType } from "@/lib/addons-config";

/**
 * GET /api/add-ons/for-package?packageType=concierge_lite
 * Fetch all add-ons eligible for a specific package type
 * Now uses hardcoded configuration instead of database
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const packageType = searchParams.get("packageType");

        if (!packageType) {
            return NextResponse.json(
                { error: "packageType is required" },
                { status: 400 }
            );
        }

        // Validate package type
        const validPackageTypes = ["concierge_lite", "concierge_level_1", "concierge_level_2", "concierge_level_3"];
        if (!validPackageTypes.includes(packageType)) {
            return NextResponse.json(
                { error: "Invalid package type" },
                { status: 400 }
            );
        }

        // Get add-ons from hardcoded config
        const configAddOns = getAddOnsByPackageType(packageType);

        // Format for response
        const addOns = configAddOns.map(addon => ({
            id: addon.id,
            name: addon.name,
            shortDescription: addon.shortDescription,
            description: addon.description,
            price: addon.price,
            features: addon.features,
            icon: addon.icon,
        }));

        console.log(`✅ ADD-ONS API: Loaded ${addOns.length} active add-ons for package type: ${packageType}`);

        return NextResponse.json({
            success: true,
            packageType,
            addOns,
            count: addOns.length,
        });
    } catch (error) {
        console.error("Error fetching add-ons for package:", error);
        return NextResponse.json(
            { error: "Failed to fetch add-ons" },
            { status: 500 }
        );
    }
}
