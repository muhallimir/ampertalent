/**
 * Auto-Generation Service for CRM Sync Field Mappings
 * 
 * Provides deterministic, idempotent auto-generation of Phase 2 field mappings
 * with comprehensive validation and safety guarantees.
 */

import { db } from '@/lib/db'
import { GHLSyncService } from '@/lib/ghl-sync-service'

export interface AutoGenerationResult {
    success: boolean
    message: string
    groupId?: string
    groupName?: string
    mappingsCreated: number
    mappingsSkipped: number
    mappingsTotal: number
    details: Array<{
        appField: string
        ghlField: string
        status: 'created' | 'exists' | 'error'
        mappingId?: string
        error?: string
    }>
    errors?: string[]
}

interface Phase2FieldDefinition {
    appFieldKey: string
    appFieldName: string
    appDataType: string
    appModelName: string
    ghlFieldId: string
    ghlFieldKey: string
    ghlFieldName: string
    ghlDataType: string
    isRequired: boolean
    isSystemField: boolean // NEW: Indicates if this is a standard GHL field (not custom)
}

/**
 * Phase 2 Required Field Mappings (Validated via GHL API)
 * 
 * STANDARD FIELDS (isSystemField=true):
 * These are built-in GHL fields that don't require custom field creation.
 * They ensure GHL API validation passes and all test scenarios work.
 * 
 * CUSTOM FIELDS (isSystemField=false):
 * These require GHL custom field creation and use field IDs from GHL API.
 */
const PHASE2_FIELD_DEFINITIONS: Phase2FieldDefinition[] = [
    // ===== STANDARD FIELDS (Required by GHL API) =====
    {
        appFieldKey: 'UserProfile.email',
        appFieldName: 'Email Address',
        appDataType: 'String',
        appModelName: 'UserProfile',
        ghlFieldId: '', // Standard fields don't have custom field IDs
        ghlFieldKey: 'email',
        ghlFieldName: 'Email',
        ghlDataType: 'TEXT',
        isRequired: true,
        isSystemField: true
    },
    {
        appFieldKey: 'UserProfile.firstName',
        appFieldName: 'First Name',
        appDataType: 'String',
        appModelName: 'UserProfile',
        ghlFieldId: '',
        ghlFieldKey: 'firstName',
        ghlFieldName: 'First Name',
        ghlDataType: 'TEXT',
        isRequired: false,
        isSystemField: true
    },
    {
        appFieldKey: 'UserProfile.lastName',
        appFieldName: 'Last Name',
        appDataType: 'String',
        appModelName: 'UserProfile',
        ghlFieldId: '',
        ghlFieldKey: 'lastName',
        ghlFieldName: 'Last Name',
        ghlDataType: 'TEXT',
        isRequired: false,
        isSystemField: true
    },
    {
        appFieldKey: 'UserProfile.phone',
        appFieldName: 'Phone Number',
        appDataType: 'String',
        appModelName: 'UserProfile',
        ghlFieldId: '',
        ghlFieldKey: 'phone',
        ghlFieldName: 'Phone',
        ghlDataType: 'PHONE',
        isRequired: false,
        isSystemField: true
    },
    {
        appFieldKey: 'UserProfile.name',
        appFieldName: 'Full Name',
        appDataType: 'String',
        appModelName: 'UserProfile',
        ghlFieldId: '',
        ghlFieldKey: 'name',
        ghlFieldName: 'Name',
        ghlDataType: 'TEXT',
        isRequired: false,
        isSystemField: true
    },
    {
        appFieldKey: 'Employer.companyName',
        appFieldName: 'Company Name',
        appDataType: 'String',
        appModelName: 'Employer',
        ghlFieldId: '',
        ghlFieldKey: 'companyName',
        ghlFieldName: 'Company Name',
        ghlDataType: 'TEXT',
        isRequired: false,
        isSystemField: true
    },
    {
        appFieldKey: 'Employer.companyWebsite',
        appFieldName: 'Company Website',
        appDataType: 'String',
        appModelName: 'Employer',
        ghlFieldId: '',
        ghlFieldKey: 'website',
        ghlFieldName: 'Website',
        ghlDataType: 'TEXT',
        isRequired: false,
        isSystemField: true
    },
    // ===== CUSTOM FIELDS (Phase 2 Marketing Segmentation) =====
    {
        appFieldKey: 'UserProfile.role',
        appFieldName: 'User Role',
        appDataType: 'UserRole',
        appModelName: 'UserProfile',
        ghlFieldId: 'MNDzezseaqGZ83W5E4mo',
        ghlFieldKey: 'contact.user_type',
        ghlFieldName: 'user_type',
        ghlDataType: 'SINGLE_OPTIONS',
        isRequired: true,
        isSystemField: false
    },
    {
        appFieldKey: 'JobSeeker.membershipPlan',
        appFieldName: 'Membership Plan',
        appDataType: 'MembershipPlan',
        appModelName: 'JobSeeker',
        ghlFieldId: 'Ii50YmqZYaUGRPhIeXe4',
        ghlFieldKey: 'contact.plan_id',
        ghlFieldName: 'plan_id',
        ghlDataType: 'MULTIPLE_OPTIONS',
        isRequired: true,
        isSystemField: false
    },
    {
        appFieldKey: 'Subscription.status',
        appFieldName: 'Subscription Status',
        appDataType: 'SubscriptionStatus',
        appModelName: 'Subscription',
        ghlFieldId: '5XHR0JVSRAeRXrcAmB3O',
        ghlFieldKey: 'contact.membership_status',
        ghlFieldName: 'Membership Status',
        ghlDataType: 'SINGLE_OPTIONS',
        isRequired: true,
        isSystemField: false
    },
    {
        appFieldKey: 'AdditionalServicePurchase.serviceId',
        appFieldName: 'Latest Add-on Service ID',
        appDataType: 'String',
        appModelName: 'AdditionalServicePurchase',
        ghlFieldId: 'u9XeqxFVeslIFEqFygBT',
        ghlFieldKey: 'contact.addon_id',
        ghlFieldName: 'addon_id',
        ghlDataType: 'TEXT',
        isRequired: false,
        isSystemField: false
    }
]

const SYSTEM_GROUP_NAME = 'System Generated Mappings'
const SYSTEM_GROUP_DESCRIPTION = 'Automatically generated field mappings connecting app data with GoHighLevel for streamlined synchronization. Essential standard fields (email, name, phone) ensure reliable contact sync. Custom fields enable targeted marketing campaigns and lead management. Disable at your own risk.'

export class AutoGenerationService {
    private ghlService: GHLSyncService

    constructor(apiKey: string, locationId: string) {
        this.ghlService = new GHLSyncService(apiKey, locationId)
    }

    /**
     * Verify GHL configuration before auto-generation
     * Only validates CUSTOM fields (isSystemField=false) against GHL API
     * Standard fields (isSystemField=true) are built-in and don't need validation
     */
    async verifyGHLConfiguration(): Promise<{ valid: boolean; errors: string[] }> {
        const errors: string[] = []

        try {
            // Fetch GHL custom fields
            const ghlFields = await this.ghlService.fetchCustomFields()

            // Filter to only custom fields that need validation
            const customFieldDefinitions = PHASE2_FIELD_DEFINITIONS.filter(def => !def.isSystemField)

            console.log(`[AutoGen] Validating ${customFieldDefinitions.length} custom fields against GHL API`)
            console.log(`[AutoGen] Skipping ${PHASE2_FIELD_DEFINITIONS.length - customFieldDefinitions.length} standard fields (built-in)`)

            // Validate each custom field exists with correct ID and type
            for (const definition of customFieldDefinitions) {
                const ghlField = ghlFields.find(f => f.id === definition.ghlFieldId)

                if (!ghlField) {
                    errors.push(`GHL custom field not found: ${definition.ghlFieldName} (ID: ${definition.ghlFieldId})`)
                    continue
                }

                if (ghlField.dataType !== definition.ghlDataType) {
                    errors.push(
                        `GHL field type mismatch for ${definition.ghlFieldName}: ` +
                        `Expected ${definition.ghlDataType}, Got ${ghlField.dataType}`
                    )
                }

                if (ghlField.key !== definition.ghlFieldKey) {
                    errors.push(
                        `GHL field key mismatch for ${definition.ghlFieldName}: ` +
                        `Expected ${definition.ghlFieldKey}, Got ${ghlField.key}`
                    )
                }
            }

            return { valid: errors.length === 0, errors }
        } catch (error: any) {
            errors.push(`Failed to fetch GHL custom fields: ${error.message}`)
            return { valid: false, errors }
        }
    }

    /**
     * Get or create the system-generated mappings group (idempotent)
     */
    async ensureSystemGroup(createdBy: string): Promise<{ id: string; name: string; created: boolean }> {
        // Check if group already exists
        const existingGroup = await db.fieldGroup.findFirst({
            where: { name: SYSTEM_GROUP_NAME }
        })

        if (existingGroup) {
            return { id: existingGroup.id, name: existingGroup.name, created: false }
        }

        // Create new group
        const newGroup = await db.fieldGroup.create({
            data: {
                name: SYSTEM_GROUP_NAME,
                description: SYSTEM_GROUP_DESCRIPTION,
                sortOrder: 0
            }
        })

        console.log(`[AutoGen] Created system group: ${newGroup.id}`)
        return { id: newGroup.id, name: newGroup.name, created: true }
    }

    /**
     * Ensure app fields exist in database (idempotent)
     */
    async ensureAppFields(fieldDefinitions?: Phase2FieldDefinition[]): Promise<Map<string, string>> {
        const fieldMap = new Map<string, string>() // fieldKey -> fieldId
        const definitionsToProcess = fieldDefinitions || PHASE2_FIELD_DEFINITIONS

        for (const definition of definitionsToProcess) {
            let appField = await db.appField.findUnique({
                where: { fieldKey: definition.appFieldKey }
            })

            if (!appField) {
                appField = await db.appField.create({
                    data: {
                        fieldKey: definition.appFieldKey,
                        name: definition.appFieldName,
                        dataType: definition.appDataType,
                        modelName: definition.appModelName,
                        isRequired: definition.isRequired,
                        isSystemField: false
                    }
                })
                console.log(`[AutoGen] Created app field: ${appField.fieldKey}`)
            }

            fieldMap.set(definition.appFieldKey, appField.id)
        }

        return fieldMap
    }

    /**
     * Ensure GHL fields exist in database (idempotent)
     * Standard fields (isSystemField=true) are created in DB but not via GHL API
     * Custom fields (isSystemField=false) require GHL API validation
     */
    async ensureGHLFields(fieldDefinitions?: Phase2FieldDefinition[]): Promise<Map<string, string>> {
        const fieldMap = new Map<string, string>() // ghlFieldKey -> dbFieldId
        const definitionsToProcess = fieldDefinitions || PHASE2_FIELD_DEFINITIONS

        for (const definition of definitionsToProcess) {
            // Always check by ghlFieldKey first to avoid duplicate constraint violations
            let ghlField = await db.ghlField.findFirst({
                where: { ghlFieldKey: definition.ghlFieldKey }
            })

            if (!ghlField) {
                // Create field in database
                ghlField = await db.ghlField.create({
                    data: {
                        ghlFieldId: definition.ghlFieldId || definition.ghlFieldKey, // Standard fields use key as ID
                        ghlFieldKey: definition.ghlFieldKey,
                        name: definition.ghlFieldName,
                        dataType: definition.ghlDataType,
                        isSystemField: definition.isSystemField
                    }
                })
                console.log(`[AutoGen] Created ${definition.isSystemField ? 'standard' : 'custom'} GHL field: ${ghlField.ghlFieldKey}`)
            } else {
                console.log(`[AutoGen] ${definition.isSystemField ? 'Standard' : 'Custom'} field already exists: ${ghlField.ghlFieldKey}`)
            }

            fieldMap.set(definition.ghlFieldKey, ghlField.id)
        }

        return fieldMap
    }

    /**
     * Get all available field definitions (hardcoded + dynamic from GHL API)
     * This includes standard fields + all GHL custom fields
     */
    private async getAllAvailableFieldDefinitions(): Promise<Phase2FieldDefinition[]> {
        const definitions = [...PHASE2_FIELD_DEFINITIONS] // Start with hardcoded definitions

        console.log(`\n[AutoGen] Starting with ${PHASE2_FIELD_DEFINITIONS.length} hardcoded definitions`)
        console.log(`[AutoGen] Hardcoded GHL field IDs:`, PHASE2_FIELD_DEFINITIONS.map(d => ({ id: d.ghlFieldId, key: d.ghlFieldKey, name: d.ghlFieldName })))

        try {
            // Fetch all GHL custom fields
            const ghlCustomFields = await this.ghlService.fetchCustomFields()
            console.log(`\n[AutoGen] Fetched ${ghlCustomFields.length} custom fields from GHL API`)

            // Deduplicate GHL fields by key (GHL API sometimes returns duplicate keys with different IDs)
            const seenKeys = new Set<string>()
            const deduplicatedGHLFields: typeof ghlCustomFields = []

            for (const field of ghlCustomFields) {
                if (!seenKeys.has(field.key)) {
                    seenKeys.add(field.key)
                    deduplicatedGHLFields.push(field)
                } else {
                    console.log(`[AutoGen] Skipping duplicate GHL field key: "${field.name}" (${field.key})`)
                }
            }

            console.log(`[AutoGen] After deduplication: ${deduplicatedGHLFields.length} unique GHL fields`)
            console.log(`[AutoGen] GHL API field IDs:`, deduplicatedGHLFields.map(f => ({ id: f.id, key: f.key, name: f.name })))

            let skippedCount = 0
            let addedCount = 0

            // For each unique GHL custom field, create a dynamic app field definition if not already covered
            for (const ghlField of deduplicatedGHLFields) {
                // Check if this GHL field is already in PHASE2_FIELD_DEFINITIONS
                // Match by ID (exact) or by key (with or without 'contact.' prefix)
                const alreadyDefined = PHASE2_FIELD_DEFINITIONS.some(def => {
                    const idMatch = def.ghlFieldId === ghlField.id
                    const keyMatch = def.ghlFieldKey === ghlField.key ||
                        def.ghlFieldKey === `contact.${ghlField.key}` ||
                        `contact.${def.ghlFieldKey}` === ghlField.key

                    if (idMatch || keyMatch) {
                        console.log(`[AutoGen] Skipping GHL field "${ghlField.name}" (already defined): ID match=${idMatch}, Key match=${keyMatch}`)
                        return true
                    }
                    return false
                })

                if (alreadyDefined) {
                    skippedCount++
                    continue
                }

                // Create dynamic definition for this GHL field
                // These will be mapped to app fields like "GHL.<ghlFieldKey>"
                const dynamicDefinition: Phase2FieldDefinition = {
                    appFieldKey: `GHL.${ghlField.key}`, // Dynamic app field key
                    appFieldName: ghlField.name,
                    appDataType: ghlField.dataType,
                    appModelName: 'GHL', // Indicates this is a GHL-synced field
                    ghlFieldId: ghlField.id,
                    ghlFieldKey: ghlField.key,
                    ghlFieldName: ghlField.name,
                    ghlDataType: ghlField.dataType,
                    isRequired: false,
                    isSystemField: false // These are custom fields from GHL
                }

                definitions.push(dynamicDefinition)
                addedCount++
                console.log(`[AutoGen] ✓ Added dynamic field definition: "${ghlField.name}" (${ghlField.key})`)
            }

            console.log(`\n[AutoGen] Summary:`)
            console.log(`  - Hardcoded definitions: ${PHASE2_FIELD_DEFINITIONS.length}`)
            console.log(`  - GHL custom fields fetched: ${ghlCustomFields.length}`)
            console.log(`  - GHL fields after deduplication: ${deduplicatedGHLFields.length}`)
            console.log(`  - Skipped (already defined): ${skippedCount}`)
            console.log(`  - Added as dynamic: ${addedCount}`)
            console.log(`  - Total definitions: ${definitions.length}`)

            return definitions
        } catch (error: any) {
            console.warn(`[AutoGen] Failed to fetch GHL custom fields for dynamic definitions:`, error.message)
            // Fallback to just hardcoded definitions
            return definitions
        }
    }

    /**
     * Auto-generate all Phase 2 field mappings (idempotent)
     */
    async autoGenerateMappings(
        createdBy: string
    ): Promise<AutoGenerationResult> {
        // Get all available field definitions (hardcoded + dynamic from GHL API)
        const allFieldDefinitions = await this.getAllAvailableFieldDefinitions()

        const result: AutoGenerationResult = {
            success: false,
            message: '',
            mappingsCreated: 0,
            mappingsSkipped: 0,
            mappingsTotal: allFieldDefinitions.length,
            details: [],
            errors: []
        }

        try {
            console.log(`\n${'='.repeat(80)}`)
            console.log('  AUTO-GENERATE 39 FIELD MAPPINGS')
            console.log('='.repeat(80))
            console.log(`📊 Processing ${allFieldDefinitions.length} field definitions...`)

            // Step 1: Verify GHL configuration
            console.log('\n  Step 1/5: Verifying GHL configuration...')
            const verification = await this.verifyGHLConfiguration()
            if (!verification.valid) {
                console.error(`  ❌ GHL config validation failed: ${verification.errors.join(', ')}`)
                result.success = false
                result.message = 'GHL configuration validation failed'
                result.errors = verification.errors
                return result
            }
            console.log('  ✓ GHL configuration verified')

            // Step 2: Ensure system group exists
            console.log('\n  Step 2/5: Ensuring system group exists...')
            const group = await this.ensureSystemGroup(createdBy)
            console.log(`  ✓ System group: "${group.name}" (ID: ${group.id}) ${group.created ? '[CREATED]' : '[EXISTS]'}`)
            result.groupId = group.id
            result.groupName = group.name

            // Step 3: Ensure app fields exist
            console.log('\n  Step 3/5: Ensuring app fields exist...')
            const appFieldMap = await this.ensureAppFields(allFieldDefinitions)
            console.log(`  ✓ App fields ready: ${appFieldMap.size} fields`)

            // Step 4: Ensure GHL fields exist
            console.log('\n  Step 4/5: Ensuring GHL fields exist...')
            const ghlFieldMap = await this.ensureGHLFields(allFieldDefinitions)
            console.log(`  ✓ GHL fields ready: ${ghlFieldMap.size} fields`)

            // Step 5: Create or update mappings
            console.log('\n  Step 5/5: Creating/updating field mappings...')
            let mappingIndex = 0
            for (const definition of allFieldDefinitions) {
                mappingIndex++
                const appFieldId = appFieldMap.get(definition.appFieldKey)
                const ghlFieldDbId = ghlFieldMap.get(definition.ghlFieldKey) // Use ghlFieldKey to match ensureGHLFields() map

                if (!appFieldId || !ghlFieldDbId) {
                    console.error(`  ❌ Mapping ${mappingIndex}/${allFieldDefinitions.length}: Missing IDs - ${definition.appFieldKey} → ${definition.ghlFieldName}`)
                    result.details.push({
                        appField: definition.appFieldKey,
                        ghlField: definition.ghlFieldName,
                        status: 'error',
                        error: `Missing field IDs in database (appFieldId: ${appFieldId}, ghlFieldDbId: ${ghlFieldDbId})`
                    })
                    continue
                }

                // Check if mapping already exists
                const existingMapping = await db.fieldMapping.findFirst({
                    where: {
                        appFieldId,
                        ghlFieldId: ghlFieldDbId
                    }
                })

                if (existingMapping) {
                    // Update group assignment if needed
                    if (existingMapping.groupId !== group.id) {
                        await db.fieldMapping.update({
                            where: { id: existingMapping.id },
                            data: { groupId: group.id }
                        })
                        console.log(`  🔄 Mapping ${mappingIndex}/${allFieldDefinitions.length}: Updated group - ${definition.appFieldKey} → ${definition.ghlFieldName}`)
                    } else {
                        console.log(`  ⊘ Mapping ${mappingIndex}/${allFieldDefinitions.length}: Exists - ${definition.appFieldKey} → ${definition.ghlFieldName}`)
                    }

                    result.mappingsSkipped++
                    result.details.push({
                        appField: definition.appFieldKey,
                        ghlField: definition.ghlFieldName,
                        status: 'exists',
                        mappingId: existingMapping.id
                    })
                } else {
                    // Create new mapping
                    const newMapping = await db.fieldMapping.create({
                        data: {
                            appFieldId,
                            ghlFieldId: ghlFieldDbId,
                            syncDirection: 'app_to_ghl',
                            isEnabled: true,
                            groupId: group.id,
                            createdBy,
                            displayLabel: `${definition.appFieldName} → ${definition.ghlFieldName}`,
                            isAutoGenerated: true
                        }
                    } as any)

                    result.mappingsCreated++
                    result.details.push({
                        appField: definition.appFieldKey,
                        ghlField: definition.ghlFieldName,
                        status: 'created',
                        mappingId: newMapping.id
                    })
                    console.log(`  ✓ Mapping ${mappingIndex}/${allFieldDefinitions.length}: CREATED - ${definition.appFieldKey} → ${definition.ghlFieldName}`)
                }
            }

            // Log to change log
            await db.crmSyncChangeLog.create({
                data: {
                    superAdminId: createdBy,
                    superAdminName: 'System',
                    actionType: 'AUTO_GENERATE_MAPPINGS',
                    actionDetails: {
                        created: result.mappingsCreated,
                        skipped: result.mappingsSkipped,
                        groupId: group.id,
                        groupName: group.name
                    },
                    newValue: JSON.stringify(result.details),
                    entityType: 'FieldMapping',
                    entityId: group.id
                }
            })

            result.success = true
            result.message = `Successfully generated ${result.mappingsCreated} new mappings, ${result.mappingsSkipped} already existed`

            console.log(`\n  ✅ AUTO-GENERATION COMPLETE`)
            console.log(`  Created: ${result.mappingsCreated} | Skipped: ${result.mappingsSkipped} | Total: ${result.mappingsTotal}`)
            console.log(`  System Group: "${result.groupName}" (${result.groupId})`)
            console.log('='.repeat(80))

            console.log(`[AutoGen] ✅ Complete: ${result.message}`)
            return result

        } catch (error: any) {
            console.error('[AutoGen] ❌ Error:', error)
            result.success = false
            result.message = 'Auto-generation failed'
            result.errors = [error.message]
            return result
        }
    }
}
