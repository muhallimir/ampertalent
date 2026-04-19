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

// Mock plan name mapping for tests
export const getPlanName = (planId: string): string => {
  const planNames: Record<string, string> = {
    'concierge_level_1': 'Concierge Level I',
    'concierge_level_2': 'Concierge Level II',
    'concierge_level_3': 'Concierge Level III',
    'concierge_lite': 'Concierge Lite',
    'standard': 'Standard Plan',
    'featured': 'Featured Plan',
    'email_blast': 'Email Blast Plan',
    'gold_plus': 'Gold Plus Plan',
  };

  return planNames[planId] || 'Unknown Plan';
};

// Mock page URL mapping for tests
export const getGoHighLevelPageUrl = (planId: string): string => {
  const pageUrls: Record<string, string> = {
    'concierge_level_1': 'https://pages.gohighlevel.com/concierge-level-1',
    'concierge_level_2': 'https://pages.gohighlevel.com/concierge-level-2',
    'concierge_level_3': 'https://pages.gohighlevel.com/concierge-level-3',
    'concierge_lite': 'https://pages.gohighlevel.com/concierge-lite',
    'standard': 'https://pages.gohighlevel.com/standard',
    'featured': 'https://pages.gohighlevel.com/featured',
    'email_blast': 'https://pages.gohighlevel.com/email-blast',
    'gold_plus': 'https://pages.gohighlevel.com/gold-plus',
  };

  return pageUrls[planId] || 'https://pages.gohighlevel.com/unknown-plan';
};
