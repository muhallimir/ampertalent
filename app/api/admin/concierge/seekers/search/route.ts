import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { S3Service } from '@/lib/s3';

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'hire-my-mom-files';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('q') || '';
    const membershipFilter = searchParams.get('membership') || 'all';
    const experienceFilter = searchParams.get('experience') || 'all';
    const skillsFilter = searchParams.get('skills') || '';
    const locationFilter = searchParams.get('location') || '';

    // Build the search query
    const whereClause: any = {
      role: 'seeker'
    };

    // Build OR conditions for text search
    const orConditions = [];

    if (searchQuery) {
      orConditions.push(
        { firstName: { contains: searchQuery, mode: 'insensitive' } },
        { lastName: { contains: searchQuery, mode: 'insensitive' } },
        { email: { contains: searchQuery, mode: 'insensitive' } },
        {
          jobSeeker: {
            headline: { contains: searchQuery, mode: 'insensitive' }
          }
        },
        {
          jobSeeker: {
            skills: { has: searchQuery }
          }
        }
      );
    }

    // Add skills filter
    if (skillsFilter) {
      orConditions.push({
        jobSeeker: {
          skills: { has: skillsFilter }
        }
      });
    }

    if (orConditions.length > 0) {
      whereClause.OR = orConditions;
    }

    // Execute the search
    const seekers = await db.userProfile.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profilePictureUrl: true,
        tags: true,
        createdAt: true,
        jobSeeker: {
          select: {
            headline: true,
            skills: true,
            aboutMe: true,
            resumeUrl: true,
            membershipPlan: true,
            availability: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100 // Limit results for performance
    });

    // Get concierge invitation history for all seekers
    const seekerIds = seekers.map(seeker => seeker.id);
    const invitationHistory = await db.adminActionLog.findMany({
      where: {
        actionType: 'concierge_seeker_selection',
        targetId: {
          in: seekerIds
        }
      },
      select: {
        targetId: true,
        createdAt: true,
        details: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Create a map of seeker invitations
    const invitationMap = new Map();
    invitationHistory.forEach(invitation => {
      if (!invitationMap.has(invitation.targetId)) {
        invitationMap.set(invitation.targetId, {
          lastInvited: invitation.createdAt,
          jobCount: 1,
          jobs: [invitation.details]
        });
      } else {
        const existing = invitationMap.get(invitation.targetId);
        existing.jobCount++;
        existing.jobs.push(invitation.details);
      }
    });

    // Transform the data for the frontend with presigned URLs
    const transformedSeekers = await Promise.all(seekers.map(async (seeker: any) => {
      const invitationInfo = invitationMap.get(seeker.id);

      let profilePictureUrl = null;

      // Generate presigned URL if profile picture exists
      if (seeker.profilePictureUrl) {
        try {
          if (seeker.profilePictureUrl.startsWith('http')) {
            // Extract S3 key from the signed URL
            const url = new URL(seeker.profilePictureUrl);
            const s3Key = url.pathname.substring(1); // Remove leading slash
            profilePictureUrl = await S3Service.generatePresignedDownloadUrl(
              BUCKET_NAME,
              s3Key,
              24 * 60 * 60 // 24 hours
            );
          } else {
            // Generate presigned URL for S3 key
            profilePictureUrl = await S3Service.generatePresignedDownloadUrl(
              BUCKET_NAME,
              seeker.profilePictureUrl,
              24 * 60 * 60 // 24 hours
            );
          }
        } catch (error) {
          console.error('Error generating presigned URL for seeker profile picture:', error);
          // Continue without profile picture
        }
      }

      return {
        id: seeker.id,
        firstName: seeker.firstName || '',
        lastName: seeker.lastName || '',
        email: seeker.email,
        profilePictureUrl,
        headline: seeker.jobSeeker?.headline,
        skills: Array.isArray(seeker.jobSeeker?.skills) ? seeker.jobSeeker.skills : [],
        membershipPlan: seeker.jobSeeker?.membershipPlan || 'none',
        experience: null, // Would need to be added to jobSeeker schema
        availability: seeker.jobSeeker?.availability,
        location: null, // Would need to be added to jobSeeker schema
        resumeUrl: seeker.jobSeeker?.resumeUrl,
        applicationCount: 0, // Would need to count applications separately
        hasApplied: false, // This would need to be checked against a specific job
        tags: Array.isArray(seeker.tags) ? seeker.tags : [],
        lastInvited: invitationInfo?.lastInvited || null,
        conciergeJobCount: invitationInfo?.jobCount || 0,
        conciergeJobs: invitationInfo?.jobs || []
      };
    }));

    return NextResponse.json({
      seekers: transformedSeekers,
      total: transformedSeekers.length
    });

  } catch (error) {
    console.error('Error searching seekers:', error);
    return NextResponse.json(
      { error: 'Failed to search seekers' },
      { status: 500 }
    );
  }
}