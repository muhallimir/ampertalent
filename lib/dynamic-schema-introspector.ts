import { Prisma, PrismaClient } from '@prisma/client'

/**
 * Dynamic Schema Introspector using Prisma DMMF
 * Discovers available fields from ALL Prisma models for CRM Sync mapping
 * NO HARDCODING - reads schema at runtime
 */

export interface AppFieldMetadata {
    fieldKey: string
    fieldLabel: string
    dataType: 'text' | 'number' | 'boolean' | 'date' | 'picklist' | 'json'
    modelName: string
    isRequired: boolean
    isSystemField: boolean
    isRelation: boolean
    description?: string
    picklistValues?: string[]
}

export interface ModelFieldsResult {
    modelName: string
    fields: AppFieldMetadata[]
}

/**
 * System fields that should never be mapped (read-only or critical)
 */
const PROTECTED_SYSTEM_FIELDS = [
    'id',
    'createdAt',
    'updatedAt',
    'clerkUserId',
    'stackUserId',
    'password',
    'passwordHash',
    'salt'
]

/**
 * Fields marked as system but still mappable (with caution)
 */
const SYSTEM_FIELDS = [
    ...PROTECTED_SYSTEM_FIELDS,
    'email',
    'role',
    'phoneNumber',
    'stripeCustomerId',
    'userId',
    'employerId',
    'jobSeekerId',
    'jobId',
    'applicationId'
]

/**
 * Models to exclude from field generation (internal/system tables)
 */
const EXCLUDED_MODELS = [
    'migration_state',
    'CrmSyncChangeLog',
    'CrmSyncSettings',
    'CrmSyncLog',
    'GhlField',
    'AppField',
    'FieldGroup',
    'FieldMapping',
    'AdminActionLog',
    'ServiceRequestAudit'
]

export class DynamicSchemaIntrospector {
    private prisma: PrismaClient

    constructor(prisma: PrismaClient) {
        this.prisma = prisma
    }

    /**
     * Map Prisma field type to CRM data type
     */
    private mapPrismaTypeToDataType(prismaType: string): 'text' | 'number' | 'boolean' | 'date' | 'picklist' | 'json' {
        const typeMap: Record<string, 'text' | 'number' | 'boolean' | 'date' | 'picklist' | 'json'> = {
            'String': 'text',
            'Int': 'number',
            'Float': 'number',
            'Decimal': 'number',
            'Boolean': 'boolean',
            'DateTime': 'date',
            'Json': 'json'
        }

        return typeMap[prismaType] || 'text'
    }

    /**
     * Format field name to human-readable label
     */
    private formatFieldName(fieldName: string): string {
        // Convert camelCase to Title Case
        return fieldName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim()
    }

    /**
     * Check if field is protected system field
     */
    private isProtectedField(fieldName: string): boolean {
        return PROTECTED_SYSTEM_FIELDS.includes(fieldName)
    }

    /**
     * Check if field is system field
     */
    private isSystemField(fieldName: string): boolean {
        return SYSTEM_FIELDS.includes(fieldName)
    }

    /**
     * Get all mappable fields across ALL Prisma models dynamically
     */
    async getAllMappableFields(): Promise<ModelFieldsResult[]> {
        const results: ModelFieldsResult[] = []

        try {
            // Access Prisma DMMF (Data Model Meta Format)
            const dmmf = Prisma.dmmf

            if (!dmmf || !dmmf.datamodel || !dmmf.datamodel.models) {
                throw new Error('Prisma DMMF not available')
            }

            // Iterate through all models
            for (const model of dmmf.datamodel.models) {
                // Skip excluded models
                if (EXCLUDED_MODELS.includes(model.name)) {
                    continue
                }

                const fields: AppFieldMetadata[] = []

                // Iterate through model fields
                for (const field of model.fields) {
                    // Skip relation fields
                    if (field.relationName) {
                        continue
                    }

                    // Skip protected fields
                    if (this.isProtectedField(field.name)) {
                        continue
                    }

                    // Skip array fields (not supported in simple mappings)
                    if (field.isList) {
                        continue
                    }

                    const fieldKey = `${model.name}.${field.name}`
                    const fieldLabel = this.formatFieldName(field.name)
                    const dataType = this.mapPrismaTypeToDataType(field.type)

                    fields.push({
                        fieldKey,
                        fieldLabel,
                        dataType,
                        modelName: model.name,
                        isRequired: field.isRequired,
                        isSystemField: this.isSystemField(field.name),
                        isRelation: false,
                        description: field.documentation || undefined
                    })
                }

                // Only include models with at least one mappable field
                if (fields.length > 0) {
                    results.push({
                        modelName: model.name,
                        fields
                    })
                }
            }

            console.log(`✓ Dynamically discovered ${results.length} models with mappable fields`)
            return results

        } catch (error) {
            console.error('Failed to introspect schema dynamically:', error)
            throw error
        }
    }

    /**
     * Get fields for a specific model
     */
    async getModelFields(modelName: string): Promise<AppFieldMetadata[]> {
        const allFields = await this.getAllMappableFields()
        const modelResult = allFields.find(m => m.modelName === modelName)
        return modelResult?.fields || []
    }

    /**
     * Check if a model exists in the schema
     */
    async modelExists(modelName: string): Promise<boolean> {
        try {
            const dmmf = Prisma.dmmf
            return dmmf.datamodel.models.some(m => m.name === modelName)
        } catch {
            return false
        }
    }

    /**
     * Get list of all available model names
     */
    async getAllModelNames(): Promise<string[]> {
        try {
            const dmmf = Prisma.dmmf
            return dmmf.datamodel.models
                .filter(m => !EXCLUDED_MODELS.includes(m.name))
                .map(m => m.name)
        } catch (error) {
            console.error('Failed to get model names:', error)
            return []
        }
    }

    /**
     * Check if field is protected system field (static)
     */
    static isProtectedField(fieldKey: string): boolean {
        const fieldName = fieldKey.split('.').pop() || ''
        return PROTECTED_SYSTEM_FIELDS.includes(fieldName)
    }

    /**
     * Check if field is system field (static)
     */
    static isSystemField(fieldKey: string): boolean {
        const fieldName = fieldKey.split('.').pop() || ''
        return SYSTEM_FIELDS.includes(fieldName)
    }
}

/**
 * Create dynamic schema introspector instance
 */
export function createSchemaIntrospector(prisma: PrismaClient): DynamicSchemaIntrospector {
    return new DynamicSchemaIntrospector(prisma)
}
