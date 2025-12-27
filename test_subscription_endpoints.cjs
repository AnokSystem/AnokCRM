// Native fetch is available in Node.js 18+

async function testEndpoints() {
    const BASE_URL = 'http://localhost:3000/api/subscriptions';

    console.log('🔍 Testing Subscription API Endpoints...\n');

    try {
        // 1. Test Expiring (Tomorrow)
        console.log('Testing GET /expiring?days=1...');
        const resExpiring = await fetch(`${BASE_URL}/expiring?days=1`);
        const expiringData = await resExpiring.json();
        console.log('✅ Status:', resExpiring.status);
        if (expiringData.users && expiringData.users.length > 0) {
            console.log(`found ${expiringData.users.length} expiring users`);
        } else {
            console.log('user list is empty (expected if no one expires tomorrow)');
        }
        console.log('');

        // 2. Test Overdue
        console.log('Testing GET /overdue...');
        const resOverdue = await fetch(`${BASE_URL}/overdue`);
        const overdueData = await resOverdue.json();
        console.log('✅ Status:', resOverdue.status);
        console.log('Data:', JSON.stringify(overdueData, null, 2));
        console.log('');

    } catch (err) {
        console.error('❌ Test failed:', err.message);
    }
}

testEndpoints();
