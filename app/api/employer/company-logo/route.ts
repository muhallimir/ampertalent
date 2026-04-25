import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Uses Supabase Storage — bucket 'company-logos' is public.
// No S3 / AWS dependencies.
const BUCKET = 'company-logos';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (currentUser.isImpersonating) {
      console.log('🎭 IMPERSONATION: Company logo GET called', {
        adminId: (currentUser as any).adminProfile?.id,
        impersonatedUserId: currentUser.profile?.id,
      });
    }

    if (
      !currentUser.profile ||
      currentUser.profile.role !== 'employer' ||
      !currentUser.profile.employer
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const employer = currentUser.profile.employer;

    if (!employer.companyLogoUrl || employer.companyLogoUrl.trim() === '') {
      return NextResponse.json({ error: 'No company logo found' }, { status: 404 });
    }

    // Supabase public bucket — stored URL is directly accessible, no presigned URL needed.
    return NextResponse.json({ companyLogoUrl: employer.companyLogoUrl });
  } catch (error) {
    console.error('Error fetching company logo:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!currentUser.profile || currentUser.profile.role !== 'employer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const form = await request.formData();
    const file = form.get('logo') as unknown as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided. Expected form field "logo".' }, { status: 400 });
    }

    const contentType = file.type || 'application/octet-stream';
    const fileSize = file.size || 0;

    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid file type. Please upload an image.' }, { status: 400 });
    }

    const MAX_SIZE_BYTES = 5 * 1024 * 1024;
    if (fileSize > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File too large. Please upload an image smaller than 5MB.' }, { status: 400 });
    }

    const originalFilename = (file as any).name || 'logo.png';
    const ext = originalFilename.split('.').pop() || 'png';
    const key = `logos/${currentUser.profile.id}/${randomUUID()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const supabase = getSupabaseAdmin();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(key, fileBuffer, { contentType, upsert: true });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const logoUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${key}`;

    return NextResponse.json({ logoUrl }, { status: 200 });
  } catch (error) {
    console.error('Error uploading company logo:', error);
    return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 });
  }
}
