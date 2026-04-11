import { PrismaClient } from '@prisma/client'

/**
 * Schema Introspector
 * Discovers available fields from Prisma models for CRM Sync mapping
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
    'stackUserId'
]

/**
 * Fields marked as system but still mappable (with caution)
 */
const SYSTEM_FIELDS = [
    ...PROTECTED_SYSTEM_FIELDS,
    'email',
    'role',
    'phoneNumber',
    'stripeCustomerId'
]

/**
 * Priority 1 fields based on CRM_SYNC_IMPLEMENTATION_PLAN_CORRECTED.md
 */
const P1_FIELDS = [
    'role', // user_type in GHL
    'membershipPlan', // plan_id in GHL
    'membershipStatus',
    'subscriptionRenewalDate',
    'packageType', // for employers
    'firstName',
    'lastName',
    'email',
    'phoneNumber'
]

export class SchemaIntrospector {
    private prisma: PrismaClient

    constructor(prisma: PrismaClient) {
        this.prisma = prisma
    }

    /**
     * Get mappable fields from UserProfile model
     */
    async getUserProfileFields(): Promise<AppFieldMetadata[]> {
        const fields: AppFieldMetadata[] = [
            {
                fieldKey: 'email',
                fieldLabel: 'Email Address',
                dataType: 'text',
                modelName: 'UserProfile',
                isRequired: true,
                isSystemField: true,
                isRelation: false,
                description: 'User email address (unique identifier)'
            },
            {
                fieldKey: 'firstName',
                fieldLabel: 'First Name',
                dataType: 'text',
                modelName: 'UserProfile',
                isRequired: false,
                isSystemField: false,
                isRelation: false,
                description: 'User first name'
            },
            {
                fieldKey: 'lastName',
                fieldLabel: 'Last Name',
                dataType: 'text',
                modelName: 'UserProfile',
                isRequired: false,
                isSystemField: false,
                isRelation: false,
                description: 'User last name'
            },
            {
                fieldKey: 'role',
                fieldLabel: 'User Role',
                dataType: 'picklist',
                modelName: 'UserProfile',
                isRequired: true,
                isSystemField: true,
                isRelation: false,
                description: 'User role type',
                picklistValues: ['seeker', 'employer', 'admin', 'team_member', 'super_admin']
            },
            {
                fieldKey: 'phoneNumber',
                fieldLabel: 'Phone Number',
                dataType: 'text',
                modelName: 'UserProfile',
                isRequired: false,
                isSystemField: false,
                isRelation: false,
                description: 'User phone number'
            },
            {
                fieldKey: 'location',
                fieldLabel: 'Location',
                dataType: 'text',
                modelName: 'UserProfile',
                isRequired: false,
                isSystemField: false,
                isRelation: false,
                description: 'User location/address'
            },
            {
                fieldKey: 'bio',
                fieldLabel: 'Bio',
                dataType: 'text',
                modelName: 'UserProfile',
                isRequired: false,
                isSystemField: false,
                isRelation: false,
                description: 'User bio or description'
            },
            {
                fieldKey: 'profilePictureUrl',
                fieldLabel: 'Profile Picture URL',
                dataType: 'text',
                modelName: 'UserProfile',
                isRequired: false,
                isSystemField: false,
                isRelation: false,
                description: 'URL to user profile picture'
            },
            {
                fieldKey: 'stripeCustomerId',
                fieldLabel: 'Stripe Customer ID',
                dataType: 'text',
                modelName: 'UserProfile',
                isRequired: false,
                isSystemField: true,
                isRelation: false,
                description: 'Stripe customer identifier'
            }
        ]

        return fields
    }

    /**
     * Get mappable fields from JobSeeker model
     */
    async getJobSeekerFields(): Promise<AppFieldMetadata[]> {
        const fields: AppFieldMetadata[] = [
            {
                fieldKey: 'membershipPlan',
                fieldLabel: 'Membership Plan',
                dataType: 'picklist',
                modelName: 'JobSeeker',
                isRequired: false,
                isSystemField: false,
                isRelation: false,
                description: 'Current membership plan',
                picklistValues: ['free', 'basic', 'premium', 'enterprise']
            },
            {
                fieldKey: 'membershipStatus',
                fieldLabel: 'Membership Status',
                dataType: 'picklist',
                modelName: 'JobSeeker',
                isRequired: false,
                isSystemField: false,
                isRelation: false,
                description: 'Current membership status',
                picklistValues: ['active', 'inactive', 'cancelled', 'expired']
            },
            {
                fieldKey: 'subscriptionRenewalDate',
                fieldLabel: 'Subscription Renewal Date',
                dataType: 'date',
                modelName: 'JobSeeker',
                isRequired: false,
                isSystemField: false,
                isRelation: false,
                description: 'Date when subscription renews'
            },
            {
                fieldKey: 'skills',
                fieldLabel: 'Skills',
                dataType: 'json',
                modelName: 'JobSeeker',
                isRequired: false,
                isSystemField: false,
                isRelation: false,
                description: 'Job seeker skills list'
            },
            {
                fieldKey: 'experience',
                fieldLabel: 'Years of Experience',
                dataType: 'number',
                modelName: 'JobSeeker',
                isRequired: false,
                isSystemField: false,
                isRelation: false,
                description: 'Total years of work experience'
            },
            {
                fieldKey: 'availability',
                fieldLabel: 'Availability',
                dataType: 'text',
                modelName: 'JobSeeker',
                isRequired: false,
                isSystemField: false,
                isRelation: false,
                description: 'Job seeker availability status'
            },
            {
                fieldKey: 'resumeUrl',
                fieldLabel: 'Resume URL',
                dataType: 'text',
                modelName: 'JobSeeker',
                isRequired: false,
                isSystemField: false,
                isRelation: false,
                description: 'URL to uploaded resume'
            }
        ]

        return fields
    }

    /**
     * Get mappable fields from Employer model
     */
    async getEmployerFields(): Promise<AppFieldMetadata[]> {
        const fields: AppFieldMetadata[] = [
            {
                fieldKey: 'companyName',
                fieldLabel: 'Company Name',
                dataType: 'text',
                modelName: 'Employer',
                isRequired: false,
                isSystemField: false,
                isRelation: false,
                description: 'Employer company name'
            },
            {
                fieldKey: 'industry',
                fieldLabel: 'Industry',
                dataType: 'text',
                modelName: 'Employer',
                isRequired: false,
                isSystemField: false,
                isRelation: false,
                description: 'Company industry'
            },
            {
                fieldKey: 'companySize',
                fieldLabel: 'Company Size',
                dataType: 'text',
                modelName: 'Employer',
                isRequired: false,
                isSystemField: false,
                isRelation: false,
                description: 'Number of employees'
            },
            {
                fieldKey: 'packageType',
                fieldLabel: 'Package Type',
                dataType: 'picklist',
                modelName: 'Employer',
                isRequired: false,
                isSystemField: false,
                isRelation: false,
                description: 'Employer job posting package',
                picklistValues: ['single', 'package_3', 'package_5', 'unlimited']
            },
            {
                fieldKey: 'jobPostingsRemaining',
                fieldLabel: 'Job Postings Remaining',
                dataType: 'number',
                modelName: 'Employer',
                isRequired: false,
                isSystemField: false,
                isRelation: false,
                description: 'Number of job posts left in package'
            },
            {
                fieldKey: 'website',
                fieldLabel: 'Company Website',
                dataType: 'text',
                modelName: 'Employer',
                isRequired: false,
                isSystemField: false,
                isRelation: false,
                description: 'Company website URL'
            },
            {
                fieldKey: 'description',
                fieldLabel: 'Company Description',
                dataType: 'text',
                modelName: 'Employer',
                isRequired: false,
                isSystemField: false,
                isRelation: false,
                description: 'Company description or bio'
            }
        ]

        return fields
    }

    /**
     * Get all mappable fields across all models
     */
    async getAllMappableFields(): Promise<ModelFieldsResult[]> {
        const results: ModelFieldsResult[] = []

        try {
            const userProfileFields = await this.getUserProfileFields()
            results.push({
                modelName: 'UserProfile',
                fields: userProfileFields
            })

            const jobSeekerFields = await this.getJobSeekerFields()
            results.push({
                modelName: 'JobSeeker',
                fields: jobSeekerFields
            })

            const employerFields = await this.getEmployerFields()
            results.push({
                modelName: 'Employer',
                fields: employerFields
            })

            return results
        } catch (error) {
            console.error('Failed to introspect schema:', error)
            throw error
        }
    }

    /**
     * Check if field is protected system field
     */
    static isProtectedField(fieldKey: string): boolean {
        return PROTECTED_SYSTEM_FIELDS.includes(fieldKey)
    }

    /**
     * Check if field is system field
     */
    static isSystemField(fieldKey: string): boolean {
        return SYSTEM_FIELDS.includes(fieldKey)
    }

    /**
     * Check if field is P1 priority
     */
    static isP1Field(fieldKey: string): boolean {
        return P1_FIELDS.includes(fieldKey)
    }

    /**
     * Check data type compatibility
     */
    static isCompatibleDataType(appDataType: string, ghlDataType: string): boolean {
        const compatibilityMatrix: Record<string, string[]> = {
            'text': ['TEXT', 'LARGE_TEXT', 'TEXTBOX_LIST', 'PHONE'],
            'number': ['NUMERICAL', 'FLOAT', 'MONETORY'],
            'boolean': ['CHECKBOX'],
            'date': ['DATE'],
            'picklist': ['SINGLE_OPTIONS', 'MULTIPLE_OPTIONS', 'TEXT'], // TEXT for fallback
            'json': ['LARGE_TEXT', 'TEXTBOX_LIST'] // Store as JSON string
        }

        return compatibilityMatrix[appDataType]?.includes(ghlDataType) || false
    }

    /**
     * Transform app field value to GHL format
     */
    static transformValueForGHL(value: any, appDataType: string): any {
        if (value === null || value === undefined) {
            return null
        }

        switch (appDataType) {
            case 'json':
                return typeof value === 'string' ? value : JSON.stringify(value)

            case 'date':
                // GHL expects ISO 8601 format
                return value instanceof Date ? value.toISOString() : value

            case 'boolean':
                return Boolean(value)

            case 'number':
                return Number(value)

            case 'text':
            case 'picklist':
            default:
                return String(value)
        }
    }
}

/**
 * Create schema introspector instance
 */
export function createSchemaIntrospector(prisma: PrismaClient): SchemaIntrospector {
    return new SchemaIntrospector(prisma)
}
