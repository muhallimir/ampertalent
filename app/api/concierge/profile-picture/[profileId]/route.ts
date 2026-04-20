import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { S3Service } from '@/lib/s3';

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'ampertalent-files';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ profileId: string }> }
) {
    try {
        // Await params for Next.js 16
        const { profileId } = await params

        const currentUser = await getCurrentUser(request);

        if (!currentUser?.clerkUser || !currentUser.profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('🔍 Concierge profile picture request:', {
            requesterId: currentUser.profile.id,
            requesterRole: currentUser.profile.role,
            targetProfileId: profileId
        });

        // Get the target profile (concierge/admin)
        const targetProfile = await db.userProfile.findUnique({
            where: { id: profileId },
            select: {
                id: true,
                role: true,
                profilePictureUrl: true,
                isActiveConcierge: true
            }
        });

        if (!targetProfile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        if (!targetProfile.profilePictureUrl) {
            return NextResponse.json({ error: 'No profile picture available' }, { status: 404 });
        }

        // Authorization logic
        let isAuthorized = false;

        if (currentUser.profile.role === 'admin' || currentUser.profile.role === 'super_admin') {
            // Admins can access any profile picture
            isAuthorized = true;
        } else if (currentUser.profile.role === 'seeker' && targetProfile.role === 'admin' && targetProfile.isActiveConcierge) {
            // Seekers can access concierge profile pictures if they have an active concierge chat
            const hasActiveChat = await db.seekerConciergeChat.findFirst({
                where: {
                    seekerId: currentUser.profile.id,
                    adminId: targetProfile.id
                }
            });

            isAuthorized = !!hasActiveChat;

            console.log('🔍 Seeker concierge access check:', {
                seekerId: currentUser.profile.id,
                conciergeId: targetProfile.id,
                hasActiveChat: !!hasActiveChat,
                isAuthorized
            });
        } else if (currentUser.profile.role === 'employer' && targetProfile.role === 'admin' && targetProfile.isActiveConcierge) {
            // Employers can access concierge profile pictures if they have an active concierge chat
            const hasActiveChat = await db.conciergeChat.findFirst({
                where: {
                    employerId: currentUser.profile.id,
                    adminId: targetProfile.id,
                    status: 'active'
                }
            });

            isAuthorized = !!hasActiveChat;

            console.log('🔍 Employer concierge access check:', {
                employerId: currentUser.profile.id,
                conciergeId: targetProfile.id,
                hasActiveChat: !!hasActiveChat,
                isAuthorized
            });
        }

        if (!isAuthorized) {
            console.error('❌ UNAUTHORIZED CONCIERGE PROFILE PICTURE ACCESS:', {
                requesterId: currentUser.profile.id,
                requesterRole: currentUser.profile.role,
                targetId: profileId,
                targetRole: targetProfile.role,
                isActiveConcierge: targetProfile.isActiveConcierge
            });
            return NextResponse.json(
                { error: 'Unauthorized access to profile picture' },
                { status: 403 }
            );
        }

        // Extract the S3 key from the profile picture URL
        const url = new URL(targetProfile.profilePictureUrl);
        const pathParts = url.pathname.split('/').filter(Boolean);
        const fileKey = pathParts.slice(-3).join('/'); // Get avatars/userId/filename

        console.log('🔍 S3 file key extracted:', {
            fileKey,
            targetProfileId: targetProfile.id,
            urlPath: url.pathname
        });

        // Generate presigned URL for viewing (24 hour expiry)
        const presignedUrl = await S3Service.generatePresignedDownloadUrl(
            BUCKET_NAME,
            fileKey,
            24 * 60 * 60 // 24 hours
        );

        console.log('✅ Concierge profile picture access granted:', {
            requesterId: currentUser.profile.id,
            targetId: profileId,
            hasPresignedUrl: !!presignedUrl
        });

        return NextResponse.json({
            profilePictureUrl: presignedUrl
        });

    } catch (error) {
        console.error('Error getting concierge profile picture:', error);
        return NextResponse.json(
            { error: 'Failed to get profile picture' },
            { status: 500 }
        );
    }
}