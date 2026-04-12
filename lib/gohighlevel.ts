// Stub GoHighLevel - Phase 10 will use HubSpot instead
// This is a placeholder to allow the build to succeed

export const goHighLevelService = {
  testConnection: async () => ({ success: false, reason: 'GoHighLevel disabled - will use HubSpot in Phase 10' }),
  getLocationInfo: async () => ({ locationId: '', name: '' }),
  createContact: async () => ({ success: false }),
  updateContact: async () => ({ success: false }),
  syncUser: async () => ({ success: false }),
};

export interface GoHighLevelContact {
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  phone?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
  source?: string;
  locationId: string;
}
