import { NextRequest, NextResponse } from 'next/server'
import { searchJobs } from '@/lib/advanced-search'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        const seekerId = currentUser?.profile?.id || undefined

        const searchParams = request.nextUrl.searchParams

        const filters = {
            query: searchParams.get('query') || '',
            category: searchParams.get('category') || '',
            type: searchParams.getAll('type'),
            location: searchParams.get('location') || '',
            payMin: searchParams.get('payMin') ? parseInt(searchParams.get('payMin')!) : undefined,
            payMax: searchParams.get('payMax') ? parseInt(searchParams.get('payMax')!) : undefined,
            skills: searchParams.getAll('skills'),
            skillsMatchType: (searchParams.get('skillsMatchType') as 'any' | 'all') || 'any',
            isRemote: searchParams.get('isRemote') === 'true',
            isFlexibleHours: searchParams.get('isFlexibleHours') === 'true',
            hoursPerWeekMin: searchParams.get('hoursPerWeekMin')
                ? parseInt(searchParams.get('hoursPerWeekMin')!)
                : undefined,
            hoursPerWeekMax: searchParams.get('hoursPerWeekMax')
                ? parseInt(searchParams.get('hoursPerWeekMax')!)
                : undefined,
            postedSince: searchParams.get('postedSince')
                ? new Date(Date.now() - parseInt(searchParams.get('postedSince')!) * 24 * 60 * 60 * 1000)
                : undefined,
            sortBy: (searchParams.get('sortBy') as 'relevance' | 'date' | 'pay' | 'company') || 'relevance',
            sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
            page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
            limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
            availableOnly: searchParams.get('availableOnly') === 'true',
            seekerId,
        }

        const results = await searchJobs(filters)

        return NextResponse.json(results)
    } catch (error) {
        console.error('Search API error:', error)
        return NextResponse.json({ error: 'Failed to search jobs' }, { status: 500 })
    }
}
