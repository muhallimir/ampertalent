import { NextRequest, NextResponse } from 'next/server'

// This endpoint has been deprecated and replaced with direct subscription management
// Redirect to the new subscription management system
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'This endpoint has been deprecated',
      message: 'Billing requests have been replaced with direct subscription management',
      redirect: '/admin/subscription-management'
    },
    { status: 410 } // Gone
  )
}

export async function PATCH(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'This endpoint has been deprecated',
      message: 'Billing requests have been replaced with direct subscription management',
      redirect: '/admin/subscription-management'
    },
    { status: 410 } // Gone
  )
}