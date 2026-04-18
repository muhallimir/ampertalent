import { NextResponse } from 'next/server'
import { AdvancedSearchService } from '@/lib/advanced-search'

export async function GET() {
    try {
        const popularTerms = await AdvancedSearchService.getPopularSearchTerms()
        return NextResponse.json({ terms: popularTerms })
    } catch (error) {
        console.error('Popular terms API error:', error)
        return NextResponse.json({ error: 'Failed to fetch popular search terms' }, { status: 500 })
    }
}
