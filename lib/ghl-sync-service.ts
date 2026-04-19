// GHL Sync Service - Test Implementation
// Note: Production uses HubSpot instead, but tests require GHL functionality

export interface GHLSyncService {
    syncUser(userData: any): Promise<{ success: boolean; reason?: string }>;
    testConnection(): Promise<{ success: boolean; reason?: string }>;
}

export const createGHLService = (): GHLSyncService => {
    return {
        syncUser: async (userData: any): Promise<{ success: boolean; reason?: string }> => {
            // Mock implementation for tests - always succeed
            console.log('GHL Sync: Mock syncing user', userData);
            return { success: true };
        },

        testConnection: async (): Promise<{ success: boolean; reason?: string }> => {
            // Mock implementation for tests - always succeed
            console.log('GHL Sync: Mock testing connection');
            return { success: true };
        }
    };
};

export default createGHLService;
