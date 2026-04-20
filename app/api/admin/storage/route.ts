import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { S3Service } from '@/lib/s3'

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'ampertalent-files'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    // Verify admin access
    if (!currentUser?.profile || (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'uploadedAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const fileType = searchParams.get('fileType') || 'all'
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Build file data from database records
    const files: any[] = []

    // Get resume files from job seekers
    const resumeQuery = {
      where: {
        resumeUrl: { not: null },
        ...(search && {
          OR: [
            { user: { name: { contains: search, mode: 'insensitive' as const } } },
            { user: { email: { contains: search, mode: 'insensitive' as const } } }
          ]
        }),
        ...(dateFrom && { resumeLastUploaded: { gte: new Date(dateFrom) } }),
        ...(dateTo && { resumeLastUploaded: { lte: new Date(dateTo) } })
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    }

    // Get logo files from employers
    const logoQuery = {
      where: {
        companyLogoUrl: { not: null },
        ...(search && {
          OR: [
            { user: { name: { contains: search, mode: 'insensitive' as const } } },
            { user: { email: { contains: search, mode: 'insensitive' as const } } },
            { companyName: { contains: search, mode: 'insensitive' as const } }
          ]
        })
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    }

    if (fileType === 'all' || fileType === 'avatar') {
      // Get profile pictures from user profiles
      const userProfiles = await db.userProfile.findMany({
        where: {
          profilePictureUrl: { not: null },
          ...(search && {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } }
            ]
          }),
          ...(dateFrom && { updatedAt: { gte: new Date(dateFrom) } }),
          ...(dateTo && { updatedAt: { lte: new Date(dateTo) } })
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          profilePictureUrl: true,
          updatedAt: true
        }
      })

      for (const userProfile of userProfiles) {
        if (userProfile.profilePictureUrl) {
          const fileKey = userProfile.profilePictureUrl.split('/').slice(-3).join('/')
          let fileSize = 0
          let lastModified = userProfile.updatedAt

          try {
            const metadata = await S3Service.getFileMetadata(BUCKET_NAME, fileKey)
            fileSize = metadata.size || 0
            lastModified = metadata.lastModified || lastModified
          } catch (error) {
            console.warn(`Could not get metadata for avatar file: ${fileKey}`, error)
          }

          files.push({
            id: `avatar_${userProfile.id}`,
            fileName: fileKey.split('/').pop() || 'avatar.jpg',
            fileType: 'avatar',
            fileSize,
            uploadedAt: lastModified,
            fileUrl: userProfile.profilePictureUrl,
            s3Key: fileKey,
            owner: {
              id: userProfile.id,
              name: userProfile.name,
              email: userProfile.email || '',
              type: userProfile.role === 'employer' ? 'employer' : 'seeker'
            }
          })
        }
      }
    }

    if (fileType === 'all' || fileType === 'resume') {
      const seekers = await db.jobSeeker.findMany(resumeQuery)

      for (const seeker of seekers) {
        if (seeker.resumeUrl) {
          const fileKey = seeker.resumeUrl.split('/').slice(-3).join('/')
          let fileSize = 0
          let lastModified = seeker.resumeLastUploaded || seeker.updatedAt

          try {
            const metadata = await S3Service.getFileMetadata(BUCKET_NAME, fileKey)
            fileSize = metadata.size || 0
            lastModified = metadata.lastModified || lastModified
          } catch (error) {
            console.warn(`Could not get metadata for file: ${fileKey}`, error)
          }

          files.push({
            id: `resume_${seeker.userId}`,
            fileName: fileKey.split('/').pop() || 'resume.pdf',
            fileType: 'resume',
            fileSize,
            uploadedAt: lastModified,
            fileUrl: seeker.resumeUrl,
            s3Key: fileKey,
            owner: {
              id: seeker.user.id,
              name: seeker.user.name,
              email: seeker.user.email,
              type: 'seeker'
            }
          })
        }
      }
    }

    if (fileType === 'all' || fileType === 'logo') {
      const employers = await db.employer.findMany(logoQuery)

      for (const employer of employers) {
        if (employer.companyLogoUrl) {
          const fileKey = employer.companyLogoUrl.split('/').slice(-3).join('/')
          let fileSize = 0
          let lastModified = employer.updatedAt

          try {
            const metadata = await S3Service.getFileMetadata(BUCKET_NAME, fileKey)
            fileSize = metadata.size || 0
            lastModified = metadata.lastModified || lastModified
          } catch (error) {
            console.warn(`Could not get metadata for file: ${fileKey}`, error)
          }

          files.push({
            id: `logo_${employer.userId}`,
            fileName: fileKey.split('/').pop() || 'logo.png',
            fileType: 'logo',
            fileSize,
            uploadedAt: lastModified,
            fileUrl: employer.companyLogoUrl,
            s3Key: fileKey,
            owner: {
              id: employer.user.id,
              name: employer.user.name,
              email: employer.user.email,
              type: 'employer',
              companyName: employer.companyName
            }
          })
        }
      }
    }

    // Sort files
    files.sort((a, b) => {
      let aValue = a[sortBy as keyof typeof a]
      let bValue = b[sortBy as keyof typeof b]

      if (sortBy === 'uploadedAt') {
        aValue = new Date(aValue as string).getTime()
        bValue = new Date(bValue as string).getTime()
      }

      if (sortBy === 'fileSize') {
        aValue = Number(aValue) || 0
        bValue = Number(bValue) || 0
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (sortOrder === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      }
    })

    // Paginate
    const totalFiles = files.length
    const paginatedFiles = files.slice(offset, offset + limit)

    // Calculate storage stats
    const totalSize = files.reduce((sum, file) => sum + (file.fileSize || 0), 0)
    const resumeCount = files.filter(f => f.fileType === 'resume').length
    const logoCount = files.filter(f => f.fileType === 'logo').length
    const avatarCount = files.filter(f => f.fileType === 'avatar').length

    return NextResponse.json({
      files: paginatedFiles,
      pagination: {
        page,
        limit,
        total: totalFiles,
        totalPages: Math.ceil(totalFiles / limit)
      },
      stats: {
        totalFiles,
        totalSize,
        resumeCount,
        logoCount,
        avatarCount,
        averageFileSize: totalFiles > 0 ? Math.round(totalSize / totalFiles) : 0
      }
    })

  } catch (error) {
    console.error('Error fetching storage data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch storage data' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    // Verify admin access
    if (!currentUser?.profile || (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { fileIds, bulkAction } = body

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: 'No files selected for deletion' }, { status: 400 })
    }

    const results = {
      deleted: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const fileId of fileIds) {
      try {
        const [fileType, userId] = fileId.split('_')

        if (fileType === 'resume') {
          const seeker = await db.jobSeeker.findUnique({
            where: { userId },
            select: { resumeUrl: true }
          })

          if (seeker?.resumeUrl) {
            const fileKey = seeker.resumeUrl.split('/').slice(-3).join('/')

            // Delete from S3
            await S3Service.deleteFile(BUCKET_NAME, fileKey)

            // Update database
            await db.jobSeeker.update({
              where: { userId },
              data: {
                resumeUrl: null,
                resumeLastUploaded: null
              }
            })

            results.deleted++
          }
        } else if (fileType === 'logo') {
          const employer = await db.employer.findUnique({
            where: { userId },
            select: { companyLogoUrl: true }
          })

          if (employer?.companyLogoUrl) {
            const fileKey = employer.companyLogoUrl.split('/').slice(-3).join('/')

            // Delete from S3
            await S3Service.deleteFile(BUCKET_NAME, fileKey)

            // Update database
            await db.employer.update({
              where: { userId },
              data: { companyLogoUrl: null }
            })

            results.deleted++
          }
        } else if (fileType === 'avatar') {
          // Handle avatar file deletion
          const userProfile = await db.userProfile.findUnique({
            where: { id: userId },
            select: { profilePictureUrl: true }
          })

          if (userProfile?.profilePictureUrl) {
            const fileKey = userProfile.profilePictureUrl.split('/').slice(-3).join('/')

            try {
              // Delete from S3
              await S3Service.deleteFile(BUCKET_NAME, fileKey)

              // Update user profile to remove avatar URL
              await db.userProfile.update({
                where: { id: userId },
                data: { profilePictureUrl: null }
              })

              results.deleted++
            } catch (error) {
              console.warn(`Could not delete avatar file: ${fileKey}`, error)
              results.failed++
              results.errors.push(`Failed to delete avatar for user ${userId}`)
            }
          }
        }
      } catch (error) {
        console.error(`Error deleting file ${fileId}:`, error)
        results.failed++
        results.errors.push(`Failed to delete ${fileId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Log admin action
    await db.adminActionLog.create({
      data: {
        adminId: currentUser.profile.id,
        actionType: 'BULK_FILE_DELETE',
        targetEntity: 'files',
        targetId: 'bulk',
        details: {
          fileIds,
          bulkAction,
          results
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Deleted ${results.deleted} files successfully`,
      results
    })

  } catch (error) {
    console.error('Error deleting files:', error)
    return NextResponse.json(
      { error: 'Failed to delete files' },
      { status: 500 }
    )
  }
}