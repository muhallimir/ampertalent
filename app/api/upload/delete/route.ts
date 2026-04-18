import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'ampertalent-files'

function getSupabaseAdmin() {
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function DELETE(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)

        if (!currentUser?.clerkUser || !currentUser.profile) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const { fileUrl } = await request.json()

        if (!fileUrl) {
            return NextResponse.json({ error: 'Missing fileUrl parameter' }, { status: 400 })
        }

        let fileKey: string
        try {
            const url = new URL(fileUrl)
            const parts = url.pathname.split(`/object/public/${BUCKET_NAME}/`)
            fileKey = parts.length > 1 ? parts[1] : ''
            if (!fileKey) {
                const signedParts = url.pathname.split(`/object/sign/${BUCKET_NAME}/`)
                fileKey = signedParts.length > 1 ? signedParts[1].split('?')[0] : ''
            }
        } catch {
            return NextResponse.json({ error: 'Invalid file URL format' }, { status: 400 })
        }

        if (!fileKey) {
            return NextResponse.json({ error: 'Could not extract file key from URL' }, { status: 400 })
        }

        // Verify the file belongs to the current user
        const keyParts = fileKey.split('/')
        if (keyParts.length < 2 || keyParts[1] !== currentUser.profile.id) {
            return NextResponse.json({ error: 'Unauthorized to delete this file' }, { status: 403 })
        }

        const supabase = getSupabaseAdmin()
        const { error } = await supabase.storage.from(BUCKET_NAME).remove([fileKey])

        if (error) throw error

        return NextResponse.json({ success: true, message: 'File deleted successfully' })
    } catch (error) {
        console.error('Error deleting file:', error)
        return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
    }
}
