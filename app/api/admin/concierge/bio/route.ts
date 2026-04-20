import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { S3Service } from '@/lib/s3';

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'ampertalent-files';

export async function GET(request: NextRequest) {
  try {
    // Get current authenticated user
    const currentUser = await getCurrentUser(request);
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is an admin
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const userId = currentUser.profile.id;

    // Get concierge profile
    const userProfile = await db.userProfile.findUnique({
      where: { id: userId },
      select: {
        conciergeBio: true,
        conciergeTitle: true,
        conciergeSpecialties: true,
        conciergeExperience: true,
        isActiveConcierge: true,
        name: true,
        email: true,
        profilePictureUrl: true
      }
    });

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Generate presigned URL for profile picture if it exists
    let profilePicturePresignedUrl = userProfile.profilePictureUrl;
    if (userProfile.profilePictureUrl) {
      try {
        // Check if it's an S3 URL that needs a presigned URL
        if (userProfile.profilePictureUrl.includes('ampertalent-files.s3.') ||
          userProfile.profilePictureUrl.includes('.amazonaws.com')) {

          // Extract S3 key from URL
          let s3Key = userProfile.profilePictureUrl;
          if (userProfile.profilePictureUrl.includes('ampertalent-files.s3.')) {
            const urlParts = userProfile.profilePictureUrl.split('ampertalent-files.s3.amazonaws.com/');
            if (urlParts.length > 1) {
              s3Key = urlParts[1].split('?')[0]; // Remove any existing query parameters
            }
          } else if (userProfile.profilePictureUrl.includes('.amazonaws.com/')) {
            const urlParts = userProfile.profilePictureUrl.split('.amazonaws.com/');
            if (urlParts.length > 1) {
              s3Key = urlParts[1].split('?')[0]; // Remove any existing query parameters
            }
          }

          // Generate presigned URL
          profilePicturePresignedUrl = await S3Service.generatePresignedDownloadUrl(
            BUCKET_NAME,
            s3Key,
            3600 // 1 hour
          );
        }
      } catch (error) {
        console.error('Error generating presigned URL for profile picture:', error);
        // Fall back to original URL
        profilePicturePresignedUrl = userProfile.profilePictureUrl;
      }
    }

    return NextResponse.json({
      profile: {
        id: userId,
        conciergeBio: userProfile.conciergeBio || '',
        conciergeTitle: userProfile.conciergeTitle || '',
        conciergeSpecialties: userProfile.conciergeSpecialties || [],
        conciergeExperience: userProfile.conciergeExperience || 0,
        isActiveConcierge: userProfile.isActiveConcierge || false,
        name: userProfile.name,
        email: userProfile.email || '',
        profilePictureUrl: profilePicturePresignedUrl
      }
    });
  } catch (error) {
    console.error('Error getting concierge bio:', error);
    return NextResponse.json(
      { error: 'Failed to get concierge bio' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get current authenticated user
    const currentUser = await getCurrentUser(request);
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is an admin
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const {
      conciergeBio,
      conciergeTitle,
      conciergeSpecialties,
      conciergeExperience,
      isActiveConcierge
    } = body;

    const userId = currentUser.profile.id;

    // Validate input
    if (typeof conciergeBio !== 'string' || conciergeBio.length > 2000) {
      return NextResponse.json(
        { error: 'Bio must be a string with maximum 2000 characters' },
        { status: 400 }
      );
    }

    if (typeof conciergeTitle !== 'string' || conciergeTitle.length > 200) {
      return NextResponse.json(
        { error: 'Title must be a string with maximum 200 characters' },
        { status: 400 }
      );
    }

    if (!Array.isArray(conciergeSpecialties)) {
      return NextResponse.json(
        { error: 'Specialties must be an array' },
        { status: 400 }
      );
    }

    if (conciergeSpecialties.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 specialties allowed' },
        { status: 400 }
      );
    }

    if (typeof conciergeExperience !== 'number' || conciergeExperience < 0 || conciergeExperience > 50) {
      return NextResponse.json(
        { error: 'Experience must be a number between 0 and 50' },
        { status: 400 }
      );
    }

    if (typeof isActiveConcierge !== 'boolean') {
      return NextResponse.json(
        { error: 'isActiveConcierge must be a boolean' },
        { status: 400 }
      );
    }

    // Update concierge profile
    await db.userProfile.update({
      where: { id: userId },
      data: {
        conciergeBio,
        conciergeTitle,
        conciergeSpecialties,
        conciergeExperience,
        isActiveConcierge
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Concierge profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating concierge bio:', error);
    return NextResponse.json(
      { error: 'Failed to update concierge bio' },
      { status: 500 }
    );
  }
}