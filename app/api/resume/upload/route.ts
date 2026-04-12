import { NextRequest, NextResponse } from 'next/server'
import { S3Service, FILE_CONFIGS } from '@/lib/s3'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const seekerId = formData.get('seekerId') as string
    const userId = formData.get('userId') as string

    if (!file || !seekerId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, seekerId, userId' },
        { status: 400 }
      )
    }

    // Validate file
    const { isValid, errors } = S3Service.validateFile(
      file,
      FILE_CONFIGS.resume.allowedTypes,
      FILE_CONFIGS.resume.maxSize
    )

    if (!isValid) {
      return NextResponse.json(
        { error: `Invalid file: ${errors.join(', ')}` },
        { status: 400 }
      )
    }

    // Ensure JobSeeker record exists
    try {
      const jobSeeker = await db.jobSeeker.findUnique({
        where: { userId: seekerId }
      });
      
      if (!jobSeeker) {
        // Create JobSeeker record if it doesn't exist
        await db.jobSeeker.create({
          data: {
            userId: seekerId
          }
        });
        console.log(`Created missing JobSeeker record for userId: ${seekerId}`);
      }
    } catch (seekerError) {
      console.error('Error ensuring JobSeeker exists:', seekerError);
      // Continue anyway as the foreign key constraint will catch any remaining issues
    }

    // Check if this is the first resume for this seeker and if there's no primary resume
    let isPrimary = false;
    try {
      // More robust check: find if there are any existing resumes for this seeker
      const existingResumes = await db.resume.findMany({
        where: { seekerId },
        select: { id: true, isPrimary: true }
      });
      
      // If no resumes exist at all, this is the first one
      const isFirstResume = existingResumes.length === 0;
      
      // Check if any existing resume is already marked as primary
      const hasExistingPrimary = existingResumes.some(resume => resume.isPrimary);
      
      // If this is the first resume and no primary resume exists, make this one primary
      if (isFirstResume && !hasExistingPrimary) {
        isPrimary = true;
        console.log(`First resume upload for seeker ${seekerId}, setting as primary`);
      }
    } catch (checkError) {
      console.error('Error checking existing resumes:', checkError);
      // Default to not primary if there's an error
      isPrimary = false;
    }

    // Generate unique file key
    const fileKey = S3Service.generateFileKey(userId, 'resume', file.name)
    
    // Upload file to S3
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    const uploadResult = await S3Service.uploadFile(
      FILE_CONFIGS.resume.bucket,
      fileKey,
      buffer,
      file.type
    )

    // Generate the S3 URL
    const s3Url = `https://${FILE_CONFIGS.resume.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

    // Store resume reference in database
    const resume = await db.resume.create({
      data: {
        seekerId,
        filename: file.name,
        fileUrl: s3Url,
        fileSize: file.size,
        isPrimary, // Will be set to true when selected as primary, or if it's the first resume
        uploadedAt: new Date()
      }
    })

    // Always update the job_seeker's resume_url field for backward compatibility
    try {
      await db.jobSeeker.update({
        where: { userId: seekerId },
        data: {
          resumeUrl: s3Url,
          resumeLastUploaded: new Date()
        }
      });
      console.log(`Updated job_seeker.resume_url for seeker ${seekerId}`);
    } catch (updateError) {
      console.error('Error updating job_seeker.resume_url:', updateError);
      // Don't fail the whole request if updating the job_seeker fails
    }

    return NextResponse.json({
      key: uploadResult.key,
      url: uploadResult.url,
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type,
      isPrimary // Return whether this resume was set as primary
    })
  } catch (error) {
    console.error('Error uploading resume:', error)
    return NextResponse.json(
      { error: `Failed to upload resume: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}