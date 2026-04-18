import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser || !currentUser?.profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let contacts: any[] = []

        if (currentUser.profile?.role === 'employer') {
            const seekers = await db.userProfile.findMany({
                where: { role: 'seeker', allowDirectMessages: true, jobSeeker: { isNot: null } },
                select: {
                    id: true, name: true, firstName: true, lastName: true, profilePictureUrl: true,
                    jobSeeker: { select: { userId: true } },
                },
                take: 100,
            })

            contacts = seekers.map(seeker => ({
                userId: seeker.id,
                name: seeker.name,
                firstName: seeker.firstName,
                lastName: seeker.lastName,
                profilePictureUrl: seeker.profilePictureUrl,
                role: 'seeker',
            }))
        } else if (currentUser.profile?.role === 'seeker') {
            const applications = await db.application.findMany({
                where: { seekerId: currentUser.profile.jobSeeker?.userId },
                select: { id: true, jobId: true, job: { select: { id: true, title: true, employerId: true } } },
                distinct: ['jobId'],
            })

            if (applications.length > 0) {
                const uniqueEmployerIds = [...new Set(applications.map(app => app.job.employerId))]

                const employers = await db.employer.findMany({
                    where: { userId: { in: uniqueEmployerIds } },
                    select: {
                        userId: true, companyName: true,
                        user: { select: { id: true, name: true, firstName: true, lastName: true, profilePictureUrl: true, allowDirectMessages: true } },
                    },
                })

                const employerMap = new Map(employers.map(emp => [emp.userId, emp]))

                contacts = applications.map(app => {
                    const employer = employerMap.get(app.job.employerId)
                    if (!employer || !employer.user.allowDirectMessages) return null
                    return {
                        userId: employer.user.id,
                        name: employer.user.name,
                        firstName: employer.user.firstName,
                        lastName: employer.user.lastName,
                        profilePictureUrl: employer.user.profilePictureUrl,
                        role: 'employer' as const,
                        companyName: employer.companyName,
                        context: { type: 'application' as const, jobId: app.job.id, jobTitle: app.job.title, applicationId: app.id },
                    }
                }).filter(Boolean) as any[]
            }
        }

        const uniqueContacts = contacts.filter((contact, index, self) =>
            index === self.findIndex(c => c.userId === contact.userId)
        )

        return NextResponse.json({ success: true, contacts: uniqueContacts })
    } catch (error) {
        console.error('Error fetching contacts:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
