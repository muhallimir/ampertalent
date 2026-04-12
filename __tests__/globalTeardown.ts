/**
 * Global Jest Teardown
 * 
 * This runs ONCE after ALL test suites complete.
 * Cleans up any test-related notifications that may have been created.
 */

import { db } from '../lib/db';

export default async function globalTeardown() {
    console.log('\n🧹 Global Teardown: Cleaning up test notifications...');

    try {
        // Delete all test-related notifications using case-insensitive matching
        const result = await db.$executeRaw`
            DELETE FROM notifications 
            WHERE 
                message ILIKE '%jest_%'
                OR message ILIKE '%test company%'
                OR message ILIKE '%test seeker%'
                OR message ILIKE '%test user%'
                OR message ILIKE '%test employer%'
                OR message ILIKE '%notify_c1%'
                OR message ILIKE '%notify_c2%'
                OR message ILIKE '%TEST_TXN_%'
                OR message ILIKE '%test22 seeker%'
                OR message ILIKE '%test companiesssy%'
                OR (type = 'exclusive_plan_admin_alert' AND message ILIKE '%test%')
        `;

        console.log(`   ✅ Deleted ${result} test notifications`);

        // Disconnect Prisma
        await db.$disconnect();
        console.log('✅ Global Teardown: Complete\n');
    } catch (error) {
        console.error('❌ Global Teardown Error:', error);
        await db.$disconnect();
    }
}
