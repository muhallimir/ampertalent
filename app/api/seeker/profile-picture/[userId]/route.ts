import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { S3Service } from '@/lib/s3';
import { presignedUrlCache } from '@/lib/presigned-url-cache';

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'ampertalent-files';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Await params for Next.js 16
    const { userId } = await params

    console.log('Profile picture request for userId:', userId);

    const currentUser = await getCurrentUser(request);

    if (!currentUser?.clerkUser || !currentUser.profile) {
      console.log('No authenticated user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role or the user is accessing their own profile
    const userProfile = await db.userProfile.findUnique({
      where: { clerkUserId: currentUser.clerkUser.id },
      select: { role: true, id: true }
    });

    if (!userProfile) {
      console.log('User profile not found for clerkUserId:', currentUser.clerkUser.id);
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Allow access if user is admin or accessing their own profile
    const isAdmin = (userProfile.role as UserRole) === 'admin' || (userProfile.role as UserRole) === 'super_admin';
    const isOwnProfile = userProfile.id === userId;

    console.log('Access check:', { isAdmin, isOwnProfile, requestedUserId: userId, currentUserId: userProfile.id });

    if (!isAdmin && !isOwnProfile) {
      console.log('Access denied - not admin and not own profile');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get seeker profile
    const seekerProfile = await db.userProfile.findUnique({
      where: {
        id: userId,
        role: 'seeker'
      },
      select: {
        profilePictureUrl: true,
        firstName: true,
        lastName: true
      }
    });

    console.log('Seeker profile found:', {
      userId,
      hasProfile: !!seekerProfile,
      hasProfilePicture: !!seekerProfile?.profilePictureUrl,
      profilePictureUrl: seekerProfile?.profilePictureUrl
    });

    if (!seekerProfile) {
      console.log('Seeker profile not found for userId:', userId);
      return NextResponse.json({ error: 'Seeker not found' }, { status: 404 });
    }

    if (!seekerProfile.profilePictureUrl) {
      console.log('No profile picture URL found for seeker');
      return NextResponse.json({ error: 'Profile picture not found' }, { status: 404 });
    }

    // Generate presigned URL for the S3 key
    let s3Key = seekerProfile.profilePictureUrl;
    if (seekerProfile.profilePictureUrl.startsWith('http')) {
      // Extract S3 key from the signed URL
      const url = new URL(seekerProfile.profilePictureUrl);
      s3Key = url.pathname.substring(1); // Remove leading slash
    }

    console.log('Generating presigned URL for S3 key:', s3Key);

    // Check shared cache with LRU eviction
    let presignedUrl = presignedUrlCache.get(s3Key);

    if (!presignedUrl) {
      presignedUrl = await S3Service.generatePresignedDownloadUrl(
        BUCKET_NAME,
        s3Key,
        24 * 60 * 60 // 24 hours
      );

      // Cache for 23 hours with automatic LRU eviction
      presignedUrlCache.set(s3Key, presignedUrl, 23 * 60 * 60);
    }

    console.log('Redirecting to presigned profile picture URL');
    return NextResponse.redirect(presignedUrl);

  } catch (error) {
    console.error('Error accessing profile picture:', error);
    return NextResponse.json(
      { error: 'Failed to access profile picture', fallbackUrl: '/images/default-avatar.png' },
      { status: 500 }
    );
  }
}