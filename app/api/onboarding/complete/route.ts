import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request);
        // For onboarding, allow users who are authenticated with Clerk but don't have a profile yet
        if (!currentUser?.clerkUser) {
            console.log("No Clerk user found in getCurrentUser()");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = currentUser.clerkUser;

        console.log("🎯 ONBOARDING COMPLETE: Starting for user:", user.id);
        console.log("👤 ONBOARDING COMPLETE: User has existing profile:", !!currentUser.profile);
        
        // Log who called this endpoint
        const requestUrl = request.url;
        const referer = request.headers.get('referer');
        const userAgent = request.headers.get('user-agent');
        console.log("📍 ONBOARDING COMPLETE: Request details:", {
          url: requestUrl,
          referer: referer,
          userAgent: userAgent?.substring(0, 100)
        });
        
        // Try to log a stack trace to identify the caller
        console.log("📍 ONBOARDING COMPLETE: Stack trace:", new Error().stack?.split('\n').slice(0, 5).join('\n'));

        const body = await request.json();
        const {
            role,
            firstName,
            lastName,
            location,
            experience,
            skills,
            companyName,
            goals,
            professionalSummary,
            isServiceOnly,
        } = body;

        console.log("📝 ONBOARDING COMPLETE: Data received:", {
            role,
            firstName,
            lastName,
            location,
            companyName,
            hasExperience: !!experience,
            hasSkills: !!skills,
            hasGoals: !!goals,
            hasProfessionalSummary: !!professionalSummary,
            isServiceOnly: !!isServiceOnly,
        });

        // Validate required fields
        if (!role || !firstName || !lastName || !location) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        let userProfile;

        // Special handling for team_member role
        if (role === "team_member") {
            console.log("👥 ONBOARDING COMPLETE: Team member role - minimal profile creation");
            // For team members, only create basic user profile
            userProfile = await db.userProfile.upsert({
                where: { clerkUserId: user.id },
                update: {
                    role: role as UserRole,
                    name: `${firstName} ${lastName}`,
                    firstName: firstName,
                    lastName: lastName,
                    email: user.emailAddresses?.[0]?.emailAddress || null,
                    updatedAt: new Date(),
                },
                create: {
                    clerkUserId: user.id,
                    role: role as UserRole,
                    name: `${firstName} ${lastName}`,
                    firstName: firstName,
                    lastName: lastName,
                    email: user.emailAddresses?.[0]?.emailAddress || null,
                    timezone: "America/Chicago",
                },
            });

            console.log("✅ ONBOARDING COMPLETE: Team member profile created:", {
                id: userProfile.id,
                role: userProfile.role,
                name: userProfile.name,
            });
        } else {
            // Create or update UserProfile for regular users
            console.log("💾 ONBOARDING COMPLETE: Creating/updating user profile...");
            userProfile = await db.userProfile.upsert({
                where: { clerkUserId: user.id },
                update: {
                    role: role as UserRole,
                    name: `${firstName} ${lastName}`,
                    firstName: firstName,
                    lastName: lastName,
                    email: user.emailAddresses?.[0]?.emailAddress || null,
                    updatedAt: new Date(),
                },
                create: {
                    clerkUserId: user.id,
                    role: role as UserRole,
                    name: `${firstName} ${lastName}`,
                    firstName: firstName,
                    lastName: lastName,
                    email: user.emailAddresses?.[0]?.emailAddress || null,
                    timezone: "America/Chicago",
                },
            });

            console.log("✅ ONBOARDING COMPLETE: User profile created/updated:", {
                id: userProfile.id,
                role: userProfile.role,
                name: userProfile.name,
                email: userProfile.email,
            });

            // Create role-specific profile
            if (role === "seeker") {
                console.log("👤 ONBOARDING COMPLETE: Creating job seeker profile...");

                // Prepare the update/create data
                const seekerData: any = {
                    headline: experience ? `${experience} years of experience` : null,
                    availability: location,
                    skills: skills || [],
                    updatedAt: new Date(),
                };

                // Service-only flow: Set membershipPlan to 'none' (no subscription required)
                if (isServiceOnly) {
                    seekerData.membershipPlan = "none";
                    console.log(
                        '📦 ONBOARDING COMPLETE: Service-only user - setting membershipPlan to "none"'
                    );
                }

                // Use professionalSummary (new field) or goals (legacy) for professionalSummary
                if (professionalSummary) {
                    seekerData.professionalSummary = professionalSummary;
                    console.log("✅ ONBOARDING COMPLETE: Setting professionalSummary:", {
                        length: professionalSummary.length,
                        preview: professionalSummary.substring(0, 100),
                    });
                } else if (goals) {
                    // Legacy support: if only goals is provided, use it as professionalSummary
                    seekerData.professionalSummary = goals;
                    console.log("⚠️ ONBOARDING COMPLETE: Using legacy goals as professionalSummary");
                } else {
                    console.log("⚠️ ONBOARDING COMPLETE: No professionalSummary or goals provided");
                }

                console.log("💾 ONBOARDING COMPLETE: Seeker data to save:", seekerData);

                try {
                    const savedSeeker = await db.jobSeeker.upsert({
                        where: { userId: userProfile.id },
                        update: seekerData,
                        create: {
                            userId: userProfile.id,
                            ...seekerData,
                        },
                    });
                    console.log("✅ ONBOARDING COMPLETE: Seeker saved to database:", {
                        userId: savedSeeker.userId,
                        hasProfessionalSummary:
                            "professionalSummary" in savedSeeker,
                    });
                } catch (upsertError: any) {
                    console.error("Error upserting seeker:", upsertError);
                    throw upsertError;
                }

                console.log("✅ ONBOARDING COMPLETE: Job seeker profile created/updated");
            } else if (role === "employer") {
                console.log("🏢 ONBOARDING COMPLETE: Creating employer profile...");

                await db.employer.upsert({
                    where: { userId: userProfile.id },
                    update: {
                        companyName: companyName || "",
                        updatedAt: new Date(),
                    },
                    create: {
                        userId: userProfile.id,
                        companyName: companyName || "",
                    },
                });

                console.log("✅ ONBOARDING COMPLETE: Employer profile created/updated");
            }
        }

        // Clean up draft pending signup if exists
        await db.pendingSignup.deleteMany({
            where: {
                clerkUserId: user.id,
                sessionToken: "DRAFT",
            },
        });

        return NextResponse.json({
            success: true,
            userId: userProfile.id,
            role: userProfile.role,
            redirectTo:
                userProfile.role === "employer"
                    ? "/employer/dashboard"
                    : "/seeker/dashboard",
        });
    } catch (error) {
        console.error("Error completing onboarding:", error);
        return NextResponse.json(
            { error: "Failed to complete onboarding" },
            { status: 500 }
        );
    }
}
