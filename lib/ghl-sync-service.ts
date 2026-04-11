import axios, { AxiosInstance } from 'axios'
import { db } from '@/lib/db'

/**
 * GoHighLevel API v2 Service
 * Official GHL API integration for CRM Sync feature
 */

export interface GHLCustomField {
    id: string
    key: string
    name: string
    dataType: 'TEXT' | 'LARGE_TEXT' | 'NUMERICAL' | 'FLOAT' | 'PHONE' | 'MONETORY' | 'DATE' | 'CHECKBOX' | 'TEXTBOX_LIST' | 'MULTIPLE_OPTIONS' | 'SINGLE_OPTIONS'
    position?: number
    placeholder?: string
    picklistOptions?: string[]
}

export interface GHLContact {
    id?: string
    locationId: string
    email?: string
    phone?: string
    firstName?: string
    lastName?: string
    name?: string
    tags?: string[]
    customFields?: Array<{ id: string, field_value: any }> // GHL v2 format
    source?: string
    website?: string // For employer company website
    [key: string]: any // Allow additional fields from field mappings
}

export interface GHLContactUpsertResponse {
    contact: GHLContact
    message?: string
}

export interface GHLConnectionTestResult {
    success: boolean
    message: string
    error?: string
    locationName?: string
    responseTime?: number
}

export class GHLSyncService {
    private client: AxiosInstance
    private apiKey: string
    private locationId: string
    private baseURL = process.env.GOHIGHLEVEL_API_BASE_URL || process.env.NEXT_PUBLIC_GOHIGHLEVEL_API_BASE_URL || 'https://services.leadconnectorhq.com'

    constructor(apiKey: string, locationId: string) {
        this.apiKey = apiKey
        this.locationId = locationId

        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 30000,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Version': '2021-07-28'
            }
        })
    }

    /**
     * Test connection to GHL API
     */
    async testConnection(): Promise<GHLConnectionTestResult> {
        const startTime = Date.now()

        try {
            // Test by fetching location details
            const response = await this.client.get(`/locations/${this.locationId}`)
            const responseTime = Date.now() - startTime

            if (response.status === 200 && response.data) {
                return {
                    success: true,
                    message: 'Successfully connected to GoHighLevel',
                    locationName: response.data.location?.name || response.data.name,
                    responseTime
                }
            }

            return {
                success: false,
                message: 'Unexpected response from GHL API'
            }
        } catch (error: any) {
            console.error('GHL connection test failed:', error)

            if (error.response?.status === 401) {
                return {
                    success: false,
                    error: 'Invalid API key or unauthorized access',
                    message: 'Invalid API key or unauthorized access'
                }
            }

            if (error.response?.status === 403) {
                return {
                    success: false,
                    error: 'Forbidden - Invalid location ID or insufficient permissions',
                    message: 'Forbidden - Invalid location ID or insufficient permissions'
                }
            }

            if (error.response?.status === 400) {
                return {
                    success: false,
                    error: 'Invalid location ID or access denied',
                    message: 'Invalid location ID or access denied'
                }
            }

            if (error.response?.status === 404) {
                return {
                    success: false,
                    error: 'Location ID not found',
                    message: 'Location ID not found'
                }
            }

            if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                return {
                    success: false,
                    error: 'Connection timeout - GHL API is unreachable',
                    message: 'Connection timeout - GHL API is unreachable'
                }
            }

            return {
                success: false,
                message: error.message || 'Failed to connect to GoHighLevel'
            }
        }
    }

    /**
     * Fetch all custom fields for the location
     */
    async fetchCustomFields(): Promise<GHLCustomField[]> {
        try {
            console.log('  Fetching custom fields from GHL API...')
            const response = await this.client.get(`/locations/${this.locationId}/customFields`)

            if (response.data && Array.isArray(response.data.customFields)) {
                const fields = response.data.customFields.map((field: any) => ({
                    id: field.id,
                    key: field.fieldKey || field.key,
                    name: field.name,
                    dataType: field.dataType,
                    position: field.position,
                    placeholder: field.placeholder,
                    picklistOptions: field.options || field.picklistOptions
                }))
                console.log(`  ✓ Fetched ${fields.length} custom fields from GHL`)
                return fields
            }

            // Alternative response structure
            if (Array.isArray(response.data)) {
                const fields = response.data.map((field: any) => ({
                    id: field.id,
                    key: field.fieldKey || field.key,
                    name: field.name,
                    dataType: field.dataType,
                    position: field.position,
                    placeholder: field.placeholder,
                    picklistOptions: field.options || field.picklistOptions
                }))
                console.log(`  ✓ Fetched ${fields.length} custom fields from GHL (alternate format)`)
                return fields
            }

            console.warn('  ⚠ Unexpected GHL custom fields response structure:', response.data)
            return []
        } catch (error: any) {
            console.error(`  ❌ Failed to fetch GHL custom fields: ${error.message}`)

            if (error.response?.status === 401) {
                throw new Error('Unauthorized: Invalid API key')
            }

            if (error.response?.status === 404) {
                throw new Error('Location not found')
            }

            throw new Error(`Failed to fetch custom fields: ${error.message}`)
        }
    }

    /**
     * Fetch standard contact fields by querying a sample contact
     * This discovers available standard fields dynamically from GHL schema
     */
    async fetchStandardContactFields(): Promise<GHLCustomField[]> {
        try {
            // Fetch a sample contact to discover available standard fields
            const response = await this.client.get(`/contacts/`, {
                params: {
                    limit: 1
                }
            })

            // Define standard fields based on GHL Contact schema
            // These are the fields available on all contacts
            const standardFields: GHLCustomField[] = [
                {
                    id: 'standard_first_name',
                    key: 'first_name',
                    name: 'First Name',
                    dataType: 'TEXT'
                },
                {
                    id: 'standard_last_name',
                    key: 'last_name',
                    name: 'Last Name',
                    dataType: 'TEXT'
                },
                {
                    id: 'standard_email',
                    key: 'email',
                    name: 'Email',
                    dataType: 'TEXT'
                },
                {
                    id: 'standard_phone',
                    key: 'phone',
                    name: 'Phone',
                    dataType: 'TEXT'
                },
                {
                    id: 'standard_tags',
                    key: 'tags',
                    name: 'Tags',
                    dataType: 'MULTIPLE_OPTIONS'
                },
                {
                    id: 'standard_source',
                    key: 'source',
                    name: 'Source',
                    dataType: 'TEXT'
                },
                {
                    id: 'standard_name',
                    key: 'name',
                    name: 'Full Name',
                    dataType: 'TEXT'
                },
                {
                    id: 'standard_company_name',
                    key: 'companyName',
                    name: 'Company Name',
                    dataType: 'TEXT'
                },
                {
                    id: 'standard_website',
                    key: 'website',
                    name: 'Website',
                    dataType: 'TEXT'
                },
                {
                    id: 'standard_address',
                    key: 'address1',
                    name: 'Address',
                    dataType: 'TEXT'
                },
                {
                    id: 'standard_city',
                    key: 'city',
                    name: 'City',
                    dataType: 'TEXT'
                },
                {
                    id: 'standard_state',
                    key: 'state',
                    name: 'State',
                    dataType: 'TEXT'
                },
                {
                    id: 'standard_postal_code',
                    key: 'postalCode',
                    name: 'Postal Code',
                    dataType: 'TEXT'
                },
                {
                    id: 'standard_country',
                    key: 'country',
                    name: 'Country',
                    dataType: 'TEXT'
                },
                {
                    id: 'standard_date_of_birth',
                    key: 'dateOfBirth',
                    name: 'Date of Birth',
                    dataType: 'DATE'
                }
            ]

            return standardFields
        } catch (error: any) {
            console.error('Failed to fetch standard contact fields:', error)
            // Return standard fields even if API call fails - these are documented GHL fields
            return [
                {
                    id: 'standard_first_name',
                    key: 'first_name',
                    name: 'First Name',
                    dataType: 'TEXT'
                },
                {
                    id: 'standard_last_name',
                    key: 'last_name',
                    name: 'Last Name',
                    dataType: 'TEXT'
                },
                {
                    id: 'standard_email',
                    key: 'email',
                    name: 'Email',
                    dataType: 'TEXT'
                },
                {
                    id: 'standard_phone',
                    key: 'phone',
                    name: 'Phone',
                    dataType: 'TEXT'
                },
                {
                    id: 'standard_tags',
                    key: 'tags',
                    name: 'Tags',
                    dataType: 'MULTIPLE_OPTIONS'
                },
                {
                    id: 'standard_source',
                    key: 'source',
                    name: 'Source',
                    dataType: 'TEXT'
                }
            ]
        }
    }

    /**
     * Find contact by email
     * GHL API Note: Use GET /contacts/?locationId=X&query=email to search
     * The 'query' parameter searches across email, name, phone fields
     */
    async findContactByEmail(email: string): Promise<GHLContact | null> {
        try {
            console.log('[GHL] Searching for contact by email:', email)

            // GET /contacts with locationId and query parameters
            // The 'query' param searches across email, name, phone fields
            try {
                const searchResponse = await this.client.get(`/contacts/`, {
                    params: {
                        locationId: this.locationId,
                        query: email  // Search by email using query parameter
                    }
                })

                console.log('[GHL] Contacts GET response status:', searchResponse.status, 'contacts found:', searchResponse.data?.contacts?.length || 0)

                if (searchResponse.data?.contacts && Array.isArray(searchResponse.data.contacts)) {
                    // Find exact email match (query might return partial matches)
                    const exactMatch = searchResponse.data.contacts.find((c: any) =>
                        c.email && c.email.toLowerCase() === email.toLowerCase()
                    )

                    if (exactMatch) {
                        console.log('[GHL] Found contact:', exactMatch.id)
                        return exactMatch
                    }
                }
            } catch (getError: any) {
                console.log('[GHL] GET contacts failed with status:', getError.response?.status, getError.message)
                // Fall through to null return
            }

            console.log('[GHL] No contact found for:', email)
            return null
        } catch (error: any) {
            console.error('[GHL] Search error - Status:', error.response?.status, 'Message:', error.message)

            // For 404 (not found), return null
            if (error.response?.status === 404) {
                console.log('[GHL] Returning null for 404 (not found)')
                return null
            }

            // For authentication/server errors, throw
            if (error.response?.status === 401 || error.response?.status === 500) {
                throw new Error(`GHL API error: ${error.response?.status} - ${error.message}`)
            }

            // For 422 or other errors, log warning but return null (graceful degradation)
            console.warn('[GHL] Search failed with status', error.response?.status, '- returning null')
            return null
        }
    }

    /**
     * Upsert contact (create or update)
     * GHL API v2 behavior: POST /contacts returns 400 with "duplicated contacts" error if contact exists
     * Strategy: Try CREATE first. If duplicate error, SEARCH for existing contact and UPDATE it.
     */
    async upsertContact(contactData: GHLContact): Promise<GHLContactUpsertResponse> {
        try {
            // Ensure locationId is set
            const payload = {
                ...contactData,
                locationId: this.locationId
            }

            // Try to CREATE first
            try {
                console.log('[GHL] Creating new contact for:', contactData.email)
                const response = await this.client.post(`/contacts/`, payload)

                return {
                    contact: response.data.contact || response.data,
                    message: 'Contact created successfully'
                }
            } catch (createError: any) {
                // Check if this is a duplicate error
                if (createError.response?.status === 400) {
                    const errMsg = createError.response.data?.message || ''
                    const errorMeta = createError.response.data?.meta

                    if (errMsg.includes('duplicated') || errMsg.includes('duplicate')) {
                        console.log('[GHL] Contact already exists (duplicate), updating existing contact...')
                        console.log('[GHL] Error message:', errMsg)

                        // CRITICAL FIX: GHL duplicate error contains existing contact ID in meta.contactId
                        const existingContactId = errorMeta?.contactId

                        if (existingContactId) {
                            console.log('[GHL] Found existing contact ID from error:', existingContactId)

                            try {
                                // UPDATE the existing contact with new data
                                // CRITICAL: GHL PUT /contacts/:id does NOT accept locationId in payload
                                // Remove locationId to prevent 422 error
                                const { locationId, ...updatePayload } = payload

                                const updateResponse = await this.client.put(
                                    `/contacts/${existingContactId}`,
                                    updatePayload
                                )

                                return {
                                    contact: updateResponse.data.contact || updateResponse.data,
                                    message: 'Contact updated successfully (existing contact)'
                                }
                            } catch (updateError: any) {
                                console.error('[GHL] Failed to update existing contact:', updateError.message)
                                if (updateError.response?.data) {
                                    console.error('[GHL] Update error details:', updateError.response.data)
                                }
                                // Still return success with existing ID - contact exists in GHL
                                return {
                                    contact: {
                                        ...payload,
                                        id: existingContactId
                                    },
                                    message: 'Contact exists but update failed'
                                }
                            }
                        } else {
                            // Fallback: Try to find contact by email search
                            console.warn('[GHL] No contactId in error meta, falling back to search...')
                            try {
                                const existingContact = await this.findContactByEmail(contactData.email!)

                                if (existingContact) {
                                    console.log('[GHL] Found existing contact via search:', existingContact.id)

                                    const { locationId, ...updatePayload } = payload

                                    const updateResponse = await this.client.put(
                                        `/contacts/${existingContact.id}`,
                                        updatePayload
                                    )

                                    return {
                                        contact: updateResponse.data.contact || updateResponse.data,
                                        message: 'Contact updated successfully (existing contact)'
                                    }
                                } else {
                                    console.warn('[GHL] Could not find existing contact by email, treating as created')
                                    return {
                                        contact: {
                                            ...payload,
                                            id: 'unknown-id-from-duplicate-error'
                                        },
                                        message: 'Contact exists but could not be located for update'
                                    }
                                }
                            } catch (searchError: any) {
                                console.error('[GHL] Search failed:', searchError.message)
                                return {
                                    contact: {
                                        ...payload,
                                        id: 'unknown-id-from-search-error'
                                    },
                                    message: 'Contact exists but could not be located'
                                }
                            }
                        }
                    }

                    throw new Error(`Bad request: ${errMsg}`)
                }

                // Re-throw other errors
                throw createError
            }
        } catch (error: any) {
            console.error('[GHL] Failed to upsert contact:', error.message)

            if (error.response?.status === 401) {
                throw new Error('Unauthorized: Invalid API key')
            }

            if (error.response?.status === 422) {
                const messages = error.response.data?.message || []
                throw new Error(`Validation error: ${Array.isArray(messages) ? messages.join(', ') : JSON.stringify(messages)}`)
            }

            throw new Error(`Failed to upsert contact: ${error.message}`)
        }
    }

    /**
     * Update contact custom fields only
     */
    async updateContactCustomFields(contactId: string, customFields: Record<string, any>): Promise<boolean> {
        try {
            await this.client.put(`/contacts/${contactId}`, {
                customFields
            })

            return true
        } catch (error: any) {
            console.error('Failed to update contact custom fields:', error)
            throw new Error(`Failed to update custom fields: ${error.message}`)
        }
    }

    /**
     * Delete a contact by ID
     */
    async deleteContact(contactId: string): Promise<boolean> {
        try {
            await this.client.delete(`/contacts/${contactId}`)
            console.log('[GHL] Contact deleted successfully:', contactId)
            return true
        } catch (error: any) {
            console.error('[GHL] Failed to delete contact:', error.message)
            // Don't throw - deletion is best effort
            return false
        }
    }

    /**
     * Batch upsert contacts (for bulk sync)
     */
    async batchUpsertContacts(contacts: GHLContact[]): Promise<{
        success: number
        failed: number
        errors: string[]
    }> {
        let success = 0
        let failed = 0
        const errors: string[] = []

        for (const contact of contacts) {
            try {
                await this.upsertContact(contact)
                success++
            } catch (error: any) {
                failed++
                errors.push(`${contact.email || 'Unknown'}: ${error.message}`)
            }
        }

        return { success, failed, errors }
    }

    /**
     * Phase 2: Sync user to GHL (create or update contact)
     * @param userId - App user profile ID
     * @param eventType - 'create' or 'update'
     * @returns GHL contact ID if successful, null otherwise
     */
    async syncUserToGHL(userId: string, eventType: 'create' | 'update'): Promise<string | null> {
        const { db } = await import('@/lib/db')

        try {
            // Check if global sync is enabled
            const settings = await db.crmSyncSettings.findFirst()
            if (!settings || !settings.isGlobalSyncEnabled) {
                console.log('[GHL Sync] Global sync disabled, skipping')
                return null
            }

            // Check if sync is enabled for this event type
            if (eventType === 'create' && !settings.syncOnCreate) {
                console.log('[GHL Sync] Sync on create disabled, skipping')
                return null
            }
            if (eventType === 'update' && !settings.syncOnUpdate) {
                console.log('[GHL Sync] Sync on update disabled, skipping')
                return null
            }

            // Fetch user with all data needed for sync
            const user = await db.userProfile.findUnique({
                where: { id: userId },
                include: {
                    jobSeeker: {
                        include: {
                            subscriptions: {
                                where: {
                                    status: { in: ['active', 'past_due', 'canceled', 'unpaid'] }
                                },
                                orderBy: { createdAt: 'desc' },
                                take: 1
                            }
                        }
                    },
                    employer: {
                        include: {
                            packages: {
                                orderBy: { purchasedAt: 'desc' },
                                take: 1
                            }
                        }
                    }
                }
            })

            if (!user) {
                throw new Error(`User ${userId} not found`)
            }

            // DEBUG: Log the full user object to see what fields are available
            console.log('[GHL Sync] User data fetched:', {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                hasJobSeeker: !!user.jobSeeker,
                hasEmployer: !!user.employer
            })

            // Transform user data to GHL contact format
            const ghlContact = await this.transformUserToGHLContact(user)

            // Upsert contact in GHL
            console.log(`[GHL Sync] Syncing user ${userId} (${eventType}) to GHL...`)
            const upsertResult = await this.upsertContact(ghlContact)
            const contactId = upsertResult.contact.id

            console.log(`[GHL Sync] Contact upserted successfully with ID: ${contactId}`)

            // Update field mapping lastSyncedAt timestamps
            const mappings = await db.fieldMapping.findMany({
                where: {
                    isEnabled: true,
                    syncDirection: { in: ['app_to_ghl', 'bidirectional'] }
                }
            })

            const now = new Date()
            await Promise.all(
                mappings.map(mapping =>
                    db.fieldMapping.update({
                        where: { id: mapping.id },
                        data: {
                            lastSyncedAt: now,
                            lastSyncStatus: 'success'
                        }
                    })
                )
            )

            console.log(`[GHL Sync] User ${userId} synced successfully`)
            return contactId
        } catch (error: any) {
            console.error(`[GHL Sync] Failed to sync user ${userId}:`, error.message)

            // Update field mapping with error status
            const mappings = await db.fieldMapping.findMany({
                where: {
                    isEnabled: true,
                    syncDirection: { in: ['app_to_ghl', 'bidirectional'] }
                }
            })

            await Promise.all(
                mappings.map(mapping =>
                    db.fieldMapping.update({
                        where: { id: mapping.id },
                        data: {
                            lastSyncStatus: 'error',
                            lastSyncError: error.message
                        }
                    })
                )
            )

            // Don't throw - we don't want to break the user's flow
            return null
        }
    }

    /**
     * Phase 2: Add activity note to GHL contact
     * @param userId - App user profile ID
     * @param activityType - Type of activity (payment_success, cart_abandoned)
     * @param metadata - Additional context (amount, packageName, etc.)
     */
    async addActivityNote(
        userId: string,
        activityType: 'payment_success' | 'cart_abandoned',
        metadata: { amount?: number; packageName?: string;[key: string]: any }
    ): Promise<void> {
        const { db } = await import('@/lib/db')

        try {
            // Find user email to locate GHL contact
            const user = await db.userProfile.findUnique({
                where: { id: userId },
                select: { email: true }
            })

            if (!user || !user.email) {
                throw new Error(`User ${userId} not found or has no email`)
            }

            // Find contact by email
            const contact = await this.findContactByEmail(user.email)
            if (!contact) {
                console.warn(`[GHL Activity] Contact not found for user ${userId}`)
                return
            }

            // Format note based on activity type
            let noteBody = ''
            if (activityType === 'payment_success') {
                noteBody = `💳 Payment received: $${metadata.amount?.toFixed(2) || '0.00'} for ${metadata.packageName || 'unknown package'}`
            } else if (activityType === 'cart_abandoned') {
                noteBody = `🛒 Cart abandoned: $${metadata.amount?.toFixed(2) || '0.00'} for ${metadata.packageName || 'unknown package'}`
            }

            // Add note via GHL API
            console.log(`[GHL Activity] Adding note to contact ${contact.id}...`)

            // GHL API v2 Notes endpoint format: requires userId field
            // CRITICAL: Endpoint is /contacts/:id/notes (NO trailing slash)
            // Payload: { body: string, userId: contactId }
            await this.client.post(`/contacts/${contact.id}/notes`, {
                body: noteBody,
                userId: contact.id // Required: Contact ID as userId for note attribution
            })

            console.log(`[GHL Activity] Note added successfully`)
        } catch (error: any) {
            console.error(`[GHL Activity] Failed to add activity note:`, error.message)
            if (error.response?.data) {
                console.error(`[GHL Activity] Error details:`, error.response.data)
            }
            // Don't throw - activity notes are nice-to-have, not critical
        }
    }

    /**
     * Add purchase activity note to GHL contact (PURCHASE HISTORY TRACKING)
     * This creates a timeline entry for every purchase - never gets overwritten
     * @param userId - App user profile ID
     * @param purchaseType - Type of purchase
     * @param details - Purchase details
     * @param contactId - Optional GHL contact ID (if already known from sync operation)
     */
    async addPurchaseActivityNote(
        userId: string,
        purchaseType: 'initial_registration' | 'subscription_purchase' | 'subscription_upgrade' | 'subscription_downgrade' | 'subscription_cancel' | 'subscription_reactivate' | 'addon_purchase' | 'package_purchase' | 'plan_extension',
        details: {
            amount?: number;
            planName?: string;
            serviceName?: string;
            packageNames?: string[];
            addOnNames?: string[];
            paymentMethod?: string;
            duration?: string;
            action?: string;
        },
        contactId?: string
    ): Promise<void> {
        const { db } = await import('@/lib/db')

        try {
            let ghlContactId = contactId
            let userRole: string | undefined

            // If contactId not provided, find it by email (backward compatibility)
            if (!ghlContactId) {
                // Find user email to locate GHL contact
                const user = await db.userProfile.findUnique({
                    where: { id: userId },
                    select: { email: true, role: true }
                })

                if (!user || !user.email) {
                    console.warn(`[GHL Purchase Activity] User ${userId} not found or has no email`)
                    return
                }

                userRole = user.role

                // Find contact by email
                const contact = await this.findContactByEmail(user.email)
                if (!contact) {
                    console.warn(`[GHL Purchase Activity] Contact not found for user ${userId} (${user.email})`)
                    return
                }
                ghlContactId = contact.id
            } else {
                // ContactId provided - still need to fetch user role for note formatting
                const user = await db.userProfile.findUnique({
                    where: { id: userId },
                    select: { role: true }
                })

                if (!user) {
                    console.warn(`[GHL Purchase Activity] User ${userId} not found`)
                    return
                }

                userRole = user.role
            }

            // Format note based on purchase type
            let noteBody = ''
            const timestamp = new Date().toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            })

            switch (purchaseType) {
                case 'initial_registration':
                    noteBody = `🎉 NEW ${userRole.toUpperCase()} REGISTRATION\n`
                    noteBody += `💳 Payment: $${details.amount?.toFixed(2) || '0.00'}\n`
                    if (details.planName) noteBody += `📦 Plan: ${details.planName}\n`
                    if (details.packageNames?.length) noteBody += `📦 Packages: ${details.packageNames.join(', ')}\n`
                    if (details.addOnNames?.length) noteBody += `➕ Add-ons: ${details.addOnNames.join(', ')}\n`
                    if (details.paymentMethod) noteBody += `💳 Method: ${details.paymentMethod}`
                    break

                case 'subscription_purchase':
                    noteBody = `📦 SUBSCRIPTION PURCHASED\n`
                    noteBody += `💳 Amount: $${details.amount?.toFixed(2) || '0.00'}\n`
                    noteBody += `📋 Plan: ${details.planName || 'Unknown'}\n`
                    if (details.duration) noteBody += `⏱️ Duration: ${details.duration}`
                    break

                case 'subscription_upgrade':
                    noteBody = `⬆️ SUBSCRIPTION UPGRADED\n`
                    noteBody += `📋 New Plan: ${details.planName || 'Unknown'}\n`
                    if (details.amount) noteBody += `💳 Amount: $${details.amount.toFixed(2)}\n`
                    noteBody += `✅ Status: Active`
                    break

                case 'subscription_downgrade':
                    noteBody = `⬇️ SUBSCRIPTION DOWNGRADED\n`
                    noteBody += `📋 New Plan: ${details.planName || 'Unknown'}\n`
                    if (details.amount) noteBody += `💳 Amount: $${details.amount.toFixed(2)}\n`
                    noteBody += `✅ Status: Active`
                    break

                case 'subscription_cancel':
                    noteBody = `❌ SUBSCRIPTION CANCELED\n`
                    noteBody += `📋 Plan: ${details.planName || 'Unknown'}\n`
                    noteBody += `⚠️ Status: Cancelled`
                    break

                case 'subscription_reactivate':
                    noteBody = `✅ SUBSCRIPTION REACTIVATED\n`
                    noteBody += `📋 Plan: ${details.planName || 'Unknown'}\n`
                    noteBody += `✅ Status: Active`
                    break

                case 'addon_purchase':
                    noteBody = `➕ ADD-ON SERVICE PURCHASED\n`
                    noteBody += `💳 Amount: $${details.amount?.toFixed(2) || '0.00'}\n`
                    noteBody += `🛠️ Service: ${details.serviceName || 'Unknown'}`
                    break

                case 'package_purchase':
                    noteBody = `📦 PACKAGE PURCHASED\n`
                    noteBody += `💳 Amount: $${details.amount?.toFixed(2) || '0.00'}\n`
                    if (details.packageNames?.length) noteBody += `📦 Packages: ${details.packageNames.join(', ')}\n`
                    if (details.addOnNames?.length) noteBody += `➕ Add-ons: ${details.addOnNames.join(', ')}`
                    break

                case 'plan_extension':
                    noteBody = `📋 PLAN EXTENDED\n`
                    noteBody += `📦 ${details.planName || 'Unknown'}\n`
                    if (details.packageNames?.length) noteBody += `🏷️ Source: ${details.packageNames.join(', ')}\n`
                    if (details.duration) noteBody += `⏱️ New Total: ${details.duration}`
                    if (details.action) noteBody += `\n📝 ${details.action}`
                    break
            }

            // Add timestamp at the end
            noteBody += `\n\n🕒 ${timestamp}`

            // Add note via GHL API
            console.log(`[GHL Purchase Activity] Adding ${purchaseType} note to contact ${ghlContactId}...`)

            // GHL API v2 Notes endpoint format: requires userId field
            // CRITICAL: Endpoint is /contacts/:id/notes (NO trailing slash)
            // Payload: { body: string, userId: contactId }
            await this.client.post(`/contacts/${ghlContactId}/notes`, {
                body: noteBody,
                userId: ghlContactId // Required: Contact ID as userId for note attribution
            })

            console.log(`✅ [GHL Purchase Activity] ${purchaseType} note added successfully`)
        } catch (error: any) {
            console.error(`❌ [GHL Purchase Activity] Failed to add ${purchaseType} note:`, error.message)
            if (error.response?.data) {
                console.error(`❌ [GHL Purchase Activity] Error details:`, error.response.data)
            }
            // Don't throw - activity notes are nice-to-have, not critical
        }
    }

    /**
     * Phase 2: Transform user data to GHL contact format
     * Uses field mappings to map app fields to GHL fields
     * @private
     */
    private async transformUserToGHLContact(user: any): Promise<GHLContact> {
        const { db } = await import('@/lib/db')

        // Fetch active field mappings
        const mappings = await db.fieldMapping.findMany({
            where: {
                isEnabled: true,
                syncDirection: { in: ['app_to_ghl', 'bidirectional'] }
            },
            include: {
                appField: true,
                ghlField: true
            }
        })

        const ghlContact: GHLContact = {
            locationId: this.locationId
        }

        // CRITICAL: Always populate required standard fields first (regardless of mappings)
        // GHL requires at least email or phone - these should ALWAYS be synced
        if (user.email) {
            ghlContact.email = user.email
        }
        if (user.phone) {
            ghlContact.phone = user.phone
        }
        if (user.firstName) {
            ghlContact.firstName = user.firstName
        }
        if (user.lastName) {
            ghlContact.lastName = user.lastName
        }
        if (user.name) {
            ghlContact.name = user.name
        }

        console.log('[GHL Sync] Required fields populated:', {
            email: ghlContact.email,
            phone: ghlContact.phone,
            firstName: ghlContact.firstName,
            lastName: ghlContact.lastName,
            name: ghlContact.name
        })

        // Map each field according to field mappings (can override the above defaults)
        for (const mapping of mappings) {
            const appFieldKey = mapping.appField.fieldKey // e.g., "UserProfile.email"
            const ghlFieldKey = mapping.ghlField.ghlFieldKey // e.g., "email" or "customField.user_type"

            // Extract value from user object
            const [model, field] = appFieldKey.split('.')
            let value = null

            if (model === 'UserProfile') {
                value = user[field]
            } else if (model === 'JobSeeker' && user.jobSeeker) {
                value = user.jobSeeker[field]
            } else if (model === 'Employer' && user.employer) {
                value = user.employer[field]
            } else if (model === 'Subscription' && user.jobSeeker?.subscriptions?.[0]) {
                // Get value from most recent subscription (for seekers)
                value = user.jobSeeker.subscriptions[0][field]
            } else if (model === 'EmployerPackage' && user.employer?.packages?.[0]) {
                // Get value from most recent employer package (for employers)
                value = user.employer.packages[0][field]
            }

            // Skip null/undefined values
            if (value === null || value === undefined) {
                continue
            }

            // Log mapping for debugging
            if (appFieldKey.includes('website') || ghlFieldKey.includes('website')) {
                console.log('[GHL Sync] Website mapping found:', {
                    appFieldKey,
                    ghlFieldKey,
                    isSystemField: mapping.ghlField.isSystemField,
                    value
                })
            }

            // Map to GHL field
            if (!mapping.ghlField.isSystemField) {
                // Custom field - GHL expects array format: [{id: string, field_value: any}]
                // Use the actual GHL field ID (e.g., "MNDzezseaqGZ83W5E4mo"), NOT the field key
                const customFieldId = mapping.ghlField.ghlFieldId
                if (!ghlContact.customFields) {
                    ghlContact.customFields = []
                }
                // Check if this is an array (should be after we initialize it)
                if (Array.isArray(ghlContact.customFields)) {
                    ghlContact.customFields.push({
                        id: customFieldId,
                        field_value: value
                    })
                }
            } else {
                // Standard field - use field key (e.g., "email", "firstName")
                ; (ghlContact as any)[ghlFieldKey] = value
            }
        }

        // ADDON SYNC: Query most recent add-on purchase for addon_id field
        // This is separate from field mappings because add-ons are in a different table
        try {
            const latestAddon = await db.additionalServicePurchase.findFirst({
                where: {
                    userId: user.id,
                    status: { in: ['pending', 'completed'] }
                },
                orderBy: { createdAt: 'desc' },
                select: { serviceId: true }
            })

            // Find addon_id field mapping to get the GHL field ID
            // Match ANY variation: customField.addon_id, addon_id, contact.addon_id
            const addonFieldMapping = mappings.find(m => {
                const key = m.ghlField.ghlFieldKey.toLowerCase()
                return key.includes('addon_id') || key.endsWith('addon_id')
            })

            if (latestAddon && addonFieldMapping) {
                if (!ghlContact.customFields) {
                    ghlContact.customFields = []
                }
                if (Array.isArray(ghlContact.customFields)) {
                    ghlContact.customFields.push({
                        id: addonFieldMapping.ghlField.ghlFieldId,
                        field_value: latestAddon.serviceId
                    })
                }
                console.log(`[GHL Sync] Added latest addon: ${latestAddon.serviceId}`)
            }
        } catch (addonError: any) {
            console.warn('[GHL Sync] Failed to fetch latest addon:', addonError.message)
            // Don't throw - addon sync is optional
        }

        // EMPLOYER PACKAGE SYNC: For employers, sync packageType as plan_id
        // Employers don't have subscriptions like seekers, they have packages
        if (user.role === 'employer' && user.employer?.packages?.[0]) {
            const latestPackage = user.employer.packages[0]

            // Find plan_id field mapping
            const planIdFieldMapping = mappings.find(m => {
                const key = m.ghlField.ghlFieldKey.toLowerCase()
                return key.includes('plan_id') || key.endsWith('plan_id')
            })

            if (planIdFieldMapping) {
                if (!ghlContact.customFields) {
                    ghlContact.customFields = []
                }
                if (Array.isArray(ghlContact.customFields)) {
                    // Remove any existing plan_id entry to avoid duplicates
                    ghlContact.customFields = ghlContact.customFields.filter(
                        cf => cf.id !== planIdFieldMapping.ghlField.ghlFieldId
                    )
                    // Add employer's packageType as plan_id
                    ghlContact.customFields.push({
                        id: planIdFieldMapping.ghlField.ghlFieldId,
                        field_value: latestPackage.packageType
                    })
                }
                console.log(`[GHL Sync] Added employer packageType as plan_id: ${latestPackage.packageType}`)
            }

            // Employers always have "active" membership status (they don't have subscription status)
            const membershipStatusMapping = mappings.find(m => {
                const key = m.ghlField.ghlFieldKey.toLowerCase()
                return key.includes('membership_status') || key.includes('membership-status')
            })

            if (membershipStatusMapping) {
                if (!ghlContact.customFields) {
                    ghlContact.customFields = []
                }
                if (Array.isArray(ghlContact.customFields)) {
                    // Remove any existing membership_status entry
                    ghlContact.customFields = ghlContact.customFields.filter(
                        cf => cf.id !== membershipStatusMapping.ghlField.ghlFieldId
                    )
                    // Employers are "active" if they have a package
                    ghlContact.customFields.push({
                        id: membershipStatusMapping.ghlField.ghlFieldId,
                        field_value: 'active'
                    })
                }
                console.log('[GHL Sync] Set employer membership_status to: active')
            }
        }

        // Ensure 'name' field is set (GHL requirement)
        // If firstName and lastName are provided, combine them into name
        if (ghlContact.firstName && ghlContact.lastName) {
            ghlContact.name = `${ghlContact.firstName} ${ghlContact.lastName}`
        } else if (ghlContact.firstName) {
            ghlContact.name = ghlContact.firstName
        } else if (ghlContact.lastName) {
            ghlContact.name = ghlContact.lastName
        } else if (user.name) {
            // Fallback to user.name if no first/last name
            ghlContact.name = user.name
        }

        // Add tags based on user role (applies to ALL users: seekers, employers, admins)
        if (user.role) {
            ghlContact.tags = [user.role]
            console.log(`[GHL Sync] Added role tag: ${user.role}`)
        }

        // GHL requires at least email OR phone - validate before returning
        if (!ghlContact.email && !ghlContact.phone) {
            throw new Error('GHL contact requires at least email or phone number')
        }

        return ghlContact
    }

    /**
     * Handle rate limiting with exponential backoff
     */
    private async handleRateLimit(retryAfter: number = 60): Promise<void> {
        console.warn(`GHL rate limit hit, waiting ${retryAfter} seconds...`)
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
    }

    /**
     * Get GHL field data type as string for storage
     */
    static normalizeDataType(ghlDataType: string): string {
        const typeMap: Record<string, string> = {
            'TEXT': 'text',
            'LARGE_TEXT': 'text',
            'TEXTBOX_LIST': 'text',
            'NUMERICAL': 'number',
            'FLOAT': 'number',
            'MONETORY': 'number',
            'PHONE': 'text',
            'DATE': 'date',
            'CHECKBOX': 'boolean',
            'SINGLE_OPTIONS': 'picklist',
            'MULTIPLE_OPTIONS': 'picklist'
        }

        return typeMap[ghlDataType] || 'text'
    }
}

/**
 * Create GHL service instance from database settings, env vars, or provided credentials
 * Priority: 1) Provided params, 2) Database settings, 3) Environment variables
 */
export async function createGHLService(apiKey?: string, locationId?: string): Promise<GHLSyncService | null> {
    // Skip GHL sync in test mode to prevent polluting CRM with test data
    if (process.env.NODE_ENV === 'test') {
        console.log('[GHL Service] Test mode detected - skipping GHL service initialization')
        return null
    }

    // If credentials provided directly, use them
    if (apiKey && locationId) {
        return new GHLSyncService(apiKey, locationId)
    }

    // Try to get credentials from database settings first
    try {
        const settings = await db.crmSyncSettings.findFirst()
        if (settings?.ghlApiKey && settings?.ghlLocationId) {
            console.log('[GHL Service] Using credentials from database settings')
            return new GHLSyncService(settings.ghlApiKey, settings.ghlLocationId)
        }
    } catch (dbError) {
        console.warn('[GHL Service] Failed to fetch settings from database:', dbError)
    }

    // Fallback to environment variables
    const key = apiKey || process.env.GOHIGHLEVEL_API_KEY
    const location = locationId || process.env.GOHIGHLEVEL_LOCATION_ID

    if (!key || !location) {
        console.warn('[GHL Service] GHL credentials not found in database or environment - service unavailable')
        return null
    }

    console.log('[GHL Service] Using credentials from environment variables')
    return new GHLSyncService(key, location)
}

/**
 * Transform UserProfile to GHL Contact format
 * Extracts relevant fields and formats for GHL API
 * Used for bidirectional sync (TEST-D)
 */
export function transformUserToGHLContact(user: any): GHLContact {
    console.log(`[TEST-D] Transforming user to GHL contact: ${user.email}`)

    const contact: GHLContact = {
        locationId: '' // Will be set by sync service
    }

    // Standard fields
    if (user.email) contact.email = user.email
    if (user.phone) contact.phone = user.phone
    if (user.firstName) contact.firstName = user.firstName
    if (user.lastName) contact.lastName = user.lastName
    if (user.name) contact.name = user.name

    // For employers: company-related fields
    // Map UserProfile companyName to GHL name if present
    if (user.companyName) {
        contact.name = user.companyName // GHL uses 'name' for companies
        console.log(`[TEST-D]   Company: ${user.companyName}`)
    }

    // For employers: website field (TEST-C)
    if (user.companyWebsite) {
        contact.website = user.companyWebsite
        console.log(`[TEST-C]   Website: ${user.companyWebsite}`)
    }

    // Tags from role and status
    if (user.role) {
        contact.tags = [user.role]
        console.log(`[TEST-D]   Role/Tags: ${user.role}`)
    }

    console.log(`[TEST-D] ✓ Contact transformed: ${JSON.stringify({ email: contact.email, name: contact.name, tags: contact.tags })}`)


    return contact
}

