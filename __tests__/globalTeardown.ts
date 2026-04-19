/**
 * Global Jest Teardown
 * 
 * This runs ONCE after ALL test suites complete.
 * Cleans up any test-related data that may have been left behind.
 * 
 * This provides a SAFETY NET for test data cleanup - individual tests
 * should clean up their own data in afterAll, but this ensures no
 * test data persists between test runs.
 */

import { db } from '../lib/db';

export default async function globalTeardown() {
    console.log('\n🧹 Global Teardown: Cleaning up test data...');

    try {
        // 1. Delete all test-related notifications using case-insensitive matching
        const deletedNotifications = await db.$executeRaw`
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

        console.log(`   ✅ Deleted ${deletedNotifications} test notifications`);

        // 2. Delete test user profiles (SAFETY NET - tests should clean up their own data)
        // Only delete profiles that contain test prefixes to avoid affecting real data
        const deletedUserProfiles = await db.$executeRaw`
            DELETE FROM user_profiles 
            WHERE 
                name ILIKE '%jest_%'
                OR name ILIKE '%test %'
                OR name ILIKE '%phase%'
                OR email ILIKE '%jest_%'
                OR email ILIKE '%test.com'
                OR clerk_user_id ILIKE '%jest_%'
                OR clerk_user_id ILIKE '%test_%'
        `;

        console.log(`   ✅ Deleted ${deletedUserProfiles} test user profiles`);

        // 3. Delete orphaned job seekers (whose user profiles were deleted above)
        const deletedJobSeekers = await db.$executeRaw`
            DELETE FROM job_seekers 
            WHERE user_id NOT IN (SELECT id FROM user_profiles)
        `;

        console.log(`   ✅ Deleted ${deletedJobSeekers} orphaned job seekers`);

        // 4. Delete orphaned employers (whose user profiles were deleted above)  
        const deletedEmployers = await db.$executeRaw`
            DELETE FROM employers 
            WHERE user_id NOT IN (SELECT id FROM user_profiles)
        `;

        console.log(`   ✅ Deleted ${deletedEmployers} orphaned employers`);

        // Disconnect Prisma
        await db.$disconnect();
        console.log('✅ Global Teardown: Complete\n');
    } catch (error) {
        console.error('❌ Global Teardown Error:', error);
        await db.$disconnect();
    }
}
