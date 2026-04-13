import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 16
    const { id: employerId } = await params

    if (!employerId) {
      console.log('❌ Employer ID is required');
      return NextResponse.json({ error: 'Employer ID is required' }, { status: 400 });
    }

    console.log('🔍 Querying database for employer with userId:', employerId);

    // Find the employer
    const employer = await db.employer.findUnique({
      where: { userId: employerId },
      select: {
        companyName: true,
        companyDescription: true,
        companyLogoUrl: true,
        companyWebsite: true
      }
    });

    console.log('📋 Database query result:', employer);

    if (!employer) {
      console.log('❌ Employer not found for userId:', employerId);
      return NextResponse.json({ error: 'Employer not found' }, { status: 404 });
    }

    console.log('✅ Returning employer info for:', employer.companyName);
    return NextResponse.json({
      success: true,
      companyName: employer.companyName,
      companyDescription: employer.companyDescription,
      companyLogoUrl: employer.companyLogoUrl,
      companyWebsite: employer.companyWebsite
    });

  } catch (error) {
    console.error('🚨 Error fetching employer info:', error);
    console.error('🚨 Error details:', {
      message: error.message,
    });
    return NextResponse.json(
      { error: 'Internal server error: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}
