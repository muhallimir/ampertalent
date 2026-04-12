// Stub GHL Sync Service - Phase 10 will use HubSpot instead
// This is a placeholder to allow the build to succeed

export const createGHLService = () => ({
  syncUser: async () => ({ success: false, reason: 'GoHighLevel disabled - will use HubSpot in Phase 10' }),
  testConnection: async () => ({ success: false, reason: 'GoHighLevel disabled - will use HubSpot in Phase 10' }),
});

export default createGHLService;
