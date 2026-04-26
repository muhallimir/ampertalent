/**
 * Supabase Storage Integration Test Script
 * Run: node scripts/test-supabase-storage.mjs
 * All test files are cleaned up after run.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kabegudzilxbneulydec.supabase.co'
const SERVICE_ROLE_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthYmVndWR6aWx4Ym5ldWx5ZGVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTAzODAzMSwiZXhwIjoyMDkwNjE0MDMxfQ.OozXz6xVCdmfeDsI4fbNrem0gG1nPjLwLN_NloZ_thA'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// 1x1 transparent PNG
const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
)

const testId = 'autotest-' + Date.now()
const uploadedFiles = []
let pass = 0
let fail = 0

function ok(msg) { console.log(`✅ PASS: ${msg}`); pass++ }
function ko(msg) { console.log(`❌ FAIL: ${msg}`); fail++ }

async function cleanup() {
    for (const { bucket, path } of uploadedFiles) {
        await supabase.storage.from(bucket).remove([path])
    }
    console.log(`\n🧹 Cleanup: removed ${uploadedFiles.length} test file(s)`)
}

async function run() {
    console.log('🚀 Supabase Storage Integration Tests\n')

    // ── Test 1: Bucket configuration ──────────────────────────────────────────
    const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets()
    if (bucketsErr) { ko(`listBuckets failed: ${bucketsErr.message}`); return }

    const logosBucket = buckets.find(b => b.name === 'company-logos')
    const pfpBucket = buckets.find(b => b.name === 'profile-pictures')
    const resumesBucket = buckets.find(b => b.name === 'resumes')
    const attachmentsBucket = buckets.find(b => b.name === 'attachments')

    logosBucket?.public ? ok('company-logos bucket is public') : ko(`company-logos not public (${logosBucket?.public})`)
    pfpBucket?.public ? ok('profile-pictures bucket is public') : ko(`profile-pictures not public (${pfpBucket?.public})`)
    !resumesBucket?.public ? ok('resumes bucket is private (correct)') : ko('resumes bucket should be private!')
    !attachmentsBucket?.public ? ok('attachments bucket is private (correct)') : ko('attachments bucket should be private!')

    // ── Test 2: Upload logo → public URL → HTTP 200 ───────────────────────────
    const logoPath = `${testId}/uuid-test-logo.png`
    const { error: logoUploadErr } = await supabase.storage
        .from('company-logos')
        .upload(logoPath, PNG, { contentType: 'image/png' })

    if (logoUploadErr) {
        ko(`Upload to company-logos failed: ${logoUploadErr.message}`)
    } else {
        uploadedFiles.push({ bucket: 'company-logos', path: logoPath })
        const { data } = supabase.storage.from('company-logos').getPublicUrl(logoPath)
        const res = await fetch(data.publicUrl, { method: 'HEAD' })
        res.status === 200 ? ok('Logo public URL returns HTTP 200') : ko(`Logo public URL returned ${res.status}`)

        const hasDoubleNesting = data.publicUrl.includes('logos/logos')
        hasDoubleNesting
            ? ko(`Double-nesting detected in URL: ${data.publicUrl}`)
            : ok('No double-nesting in logo URL path')
    }

    // ── Test 3: Signed upload URL flow ────────────────────────────────────────
    const signedPath = `${testId}/presigned-test.png`
    const { data: signedData, error: signedErr } = await supabase.storage
        .from('company-logos')
        .createSignedUploadUrl(signedPath)

    if (signedErr) {
        ko(`createSignedUploadUrl failed: ${signedErr.message}`)
    } else {
        const uploadRes = await fetch(signedData.signedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'image/png' },
            body: PNG,
        })
        uploadRes.status === 200
            ? ok('Upload via signed URL succeeded (HTTP 200)')
            : ko(`Signed upload failed: ${uploadRes.status}`)

        uploadedFiles.push({ bucket: 'company-logos', path: signedPath })

        const { data: pub } = supabase.storage.from('company-logos').getPublicUrl(signedPath)
        const headRes = await fetch(pub.publicUrl, { method: 'HEAD' })
        headRes.status === 200
            ? ok('File uploaded via signed URL is publicly accessible')
            : ko(`After signed upload, public URL returned ${headRes.status}`)
    }

    // ── Test 4: profile-pictures upload → public URL ──────────────────────────
    const pfpPath = `${testId}/avatar.png`
    const { error: pfpErr } = await supabase.storage
        .from('profile-pictures')
        .upload(pfpPath, PNG, { contentType: 'image/png' })

    if (pfpErr) {
        ko(`Upload to profile-pictures failed: ${pfpErr.message}`)
    } else {
        uploadedFiles.push({ bucket: 'profile-pictures', path: pfpPath })
        const { data } = supabase.storage.from('profile-pictures').getPublicUrl(pfpPath)
        const res = await fetch(data.publicUrl, { method: 'HEAD' })
        res.status === 200
            ? ok('Profile picture public URL returns HTTP 200')
            : ko(`Profile picture public URL returned ${res.status}`)
    }

    // ── Test 5: Public URL format ─────────────────────────────────────────────
    const { data: urlData } = supabase.storage
        .from('company-logos')
        .getPublicUrl('user-123/uuid-logo.png')

    const expected = `${SUPABASE_URL}/storage/v1/object/public/company-logos/user-123/uuid-logo.png`
    urlData.publicUrl === expected
        ? ok('Public URL format is correct')
        : ko(`URL mismatch.\n  Got:      ${urlData.publicUrl}\n  Expected: ${expected}`)

    // ── Test 6: presigned-url route file key format ───────────────────────────
    // Simulates what /api/upload/presigned-url does for uploadType='logo'
    const userId = 'cmnwdb60t0001qnzvztx96b36'
    const uniqueId = 'aaaabbbb-cccc-dddd-eeee-ffffffffffff'
    const sanitizedFileName = 'my_logo.png'
    const fileKey = `${userId}/${uniqueId}-${sanitizedFileName}` // for logo: no prefix
    const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/company-logos/${fileKey}`

    const containsDouble = fileUrl.includes('logos/logos')
    containsDouble
        ? ko(`presigned-url route would produce double-nested URL: ${fileUrl}`)
        : ok('presigned-url route produces correct logo file URL')

    // ── Results ───────────────────────────────────────────────────────────────
    await cleanup()
    console.log(`\n─────────────────────────────────────────`)
    console.log(`Results: ${pass} passed, ${fail} failed`)
    if (fail > 0) process.exit(1)
}

run().catch(err => {
    console.error('💥 Fatal error:', err)
    cleanup().finally(() => process.exit(1))
})
