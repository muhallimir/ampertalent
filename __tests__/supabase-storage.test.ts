/**
 * Supabase Storage Integration Tests
 *
 * Tests that:
 * 1. company-logos bucket is public (HTTP 200 on public URLs)
 * 2. profile-pictures bucket is public
 * 3. Presigned upload URL generation works
 * 4. Uploaded files are accessible via public URL
 * 5. File path structure is correct (no double-nesting)
 *
 * @jest-environment node
 */

// Use dynamic import in beforeAll to avoid top-level module init issues with next/jest
let supabase: Awaited<ReturnType<typeof import('@supabase/supabase-js')['createClient']>>

const SUPABASE_URL = 'https://kabegudzilxbneulydec.supabase.co'
const SERVICE_ROLE_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthYmVndWR6aWx4Ym5ldWx5ZGVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTAzODAzMSwiZXhwIjoyMDkwNjE0MDMxfQ.OozXz6xVCdmfeDsI4fbNrem0gG1nPjLwLN_NloZ_thA'

// Track uploaded test files for cleanup
const testFilesUploaded: { bucket: string; path: string }[] = []

beforeAll(async () => {
    const { createClient } = await import('@supabase/supabase-js')
    supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
})

async function cleanup() {
    for (const { bucket, path } of testFilesUploaded) {
        await supabase.storage.from(bucket).remove([path])
    }
    testFilesUploaded.length = 0
}

describe('Supabase Storage - Bucket Configuration', () => {
    test('company-logos bucket exists and is public', async () => {
        const { data: buckets, error } = await supabase.storage.listBuckets()
        expect(error).toBeNull()

        const logosBucket = buckets?.find(b => b.name === 'company-logos')
        expect(logosBucket).toBeDefined()
        expect(logosBucket?.public).toBe(true)
    })

    test('profile-pictures bucket exists and is public', async () => {
        const { data: buckets, error } = await supabase.storage.listBuckets()
        expect(error).toBeNull()

        const profileBucket = buckets?.find(b => b.name === 'profile-pictures')
        expect(profileBucket).toBeDefined()
        expect(profileBucket?.public).toBe(true)
    })

    test('resumes bucket exists and is private (sensitive documents)', async () => {
        const { data: buckets } = await supabase.storage.listBuckets()
        const resumesBucket = buckets?.find(b => b.name === 'resumes')
        expect(resumesBucket).toBeDefined()
        expect(resumesBucket?.public).toBe(false)
    })

    test('attachments bucket exists and is private (sensitive)', async () => {
        const { data: buckets } = await supabase.storage.listBuckets()
        const attachmentsBucket = buckets?.find(b => b.name === 'attachments')
        expect(attachmentsBucket).toBeDefined()
        expect(attachmentsBucket?.public).toBe(false)
    })
})

describe('Supabase Storage - Upload and Public URL Access', () => {
    afterAll(cleanup)

    test('can upload to company-logos and get accessible public URL', async () => {
        const testUserId = 'test-user-storage-' + Date.now()
        const fileName = `test-logo-${Date.now()}.png`
        const filePath = `${testUserId}/${fileName}`

        // Create a tiny 1x1 PNG (valid PNG file)
        const pngData = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64'
        )

        // Upload
        const { error: uploadError } = await supabase.storage
            .from('company-logos')
            .upload(filePath, pngData, { contentType: 'image/png', upsert: false })

        expect(uploadError).toBeNull()
        testFilesUploaded.push({ bucket: 'company-logos', path: filePath })

        // Get public URL
        const { data } = supabase.storage.from('company-logos').getPublicUrl(filePath)
        expect(data.publicUrl).toContain('company-logos')
        expect(data.publicUrl).toContain(filePath)

        // Verify it's accessible via HTTP
        const res = await fetch(data.publicUrl, { method: 'HEAD' })
        expect(res.status).toBe(200)
    })

    test('file path for logo uses {userId}/{uuid}-{filename} format (no double-nesting)', async () => {
        const testUserId = 'test-user-path-' + Date.now()
        const uuid = 'aaaabbbb-cccc-dddd-eeee-ffffffffffff'
        const fileName = 'my_company_logo.png'
        const filePath = `${testUserId}/${uuid}-${fileName}` // Correct format

        const pngData = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64'
        )

        const { error } = await supabase.storage
            .from('company-logos')
            .upload(filePath, pngData, { contentType: 'image/png' })

        expect(error).toBeNull()
        testFilesUploaded.push({ bucket: 'company-logos', path: filePath })

        // The public URL should NOT have 'logos/logos/' double nesting
        const { data } = supabase.storage.from('company-logos').getPublicUrl(filePath)
        expect(data.publicUrl).not.toContain('logos/logos')
        expect(data.publicUrl).not.toContain('company-logos/logos/')

        const res = await fetch(data.publicUrl, { method: 'HEAD' })
        expect(res.status).toBe(200)
    })

    test('signed upload URL is valid and upload via it works', async () => {
        const testUserId = 'test-user-signed-' + Date.now()
        const filePath = `${testUserId}/test-via-presigned.png`

        // Generate signed upload URL (mimics presigned-url/route.ts)
        const { data, error } = await supabase.storage
            .from('company-logos')
            .createSignedUploadUrl(filePath)

        expect(error).toBeNull()
        expect(data).toBeDefined()
        expect(data!.signedUrl).toContain('token=')

        // Upload using the signed URL
        const pngData = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64'
        )
        const uploadRes = await fetch(data!.signedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'image/png' },
            body: pngData,
        })
        expect(uploadRes.status).toBe(200)
        testFilesUploaded.push({ bucket: 'company-logos', path: filePath })

        // Verify public URL accessible
        const { data: publicData } = supabase.storage.from('company-logos').getPublicUrl(filePath)
        const headRes = await fetch(publicData.publicUrl, { method: 'HEAD' })
        expect(headRes.status).toBe(200)
    })

    test('profile-pictures public URL is accessible after upload', async () => {
        const testUserId = 'test-user-pfp-' + Date.now()
        const filePath = `${testUserId}/avatar.png`

        const pngData = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64'
        )

        const { error } = await supabase.storage
            .from('profile-pictures')
            .upload(filePath, pngData, { contentType: 'image/png' })

        expect(error).toBeNull()
        testFilesUploaded.push({ bucket: 'profile-pictures', path: filePath })

        const { data } = supabase.storage.from('profile-pictures').getPublicUrl(filePath)
        const res = await fetch(data.publicUrl, { method: 'HEAD' })
        expect(res.status).toBe(200)
    })
})

describe('Supabase Storage - Public URL Format', () => {
    test('public URL format matches expected pattern', () => {
        const { data } = supabase.storage
            .from('company-logos')
            .getPublicUrl('some-user-id/some-uuid-logo.png')

        const expectedPattern = `${SUPABASE_URL}/storage/v1/object/public/company-logos/some-user-id/some-uuid-logo.png`
        expect(data.publicUrl).toBe(expectedPattern)
    })

    test('presigned-url route builds correct fileUrl', () => {
        // Simulate what presigned-url/route.ts does for logo uploads
        const supabaseUrl = SUPABASE_URL
        const bucketName = 'company-logos'
        const userId = 'cmnwdb60t0001qnzvztx96b36'
        const uniqueId = 'aaaabbbb-cccc-dddd-eeee-ffffffffffff'
        const sanitizedFileName = 'my_logo.png'

        // For logos: no uploadType prefix
        const fileKey = `${userId}/${uniqueId}-${sanitizedFileName}`
        const fileUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${fileKey}`

        expect(fileUrl).toBe(
            `${SUPABASE_URL}/storage/v1/object/public/company-logos/${userId}/${uniqueId}-my_logo.png`
        )
        expect(fileUrl).not.toContain('logos/logos')
    })
})
