const response = await fetch('https://supabase.anok.com.br/auth/v1/admin/users', {
    method: 'GET',
    headers: {
        'apikey': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA',
        'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA'
    }
});

const usersData = await response.json();
const testUser = usersData.users?.find(u => u.email === 'final-test@example.com');

if (testUser) {
    console.log('✅ User found!');
    console.log('\n📋 User Metadata:');
    console.log(JSON.stringify(testUser.user_metadata, null, 2));
    console.log('\n📊 Plan info:');
    console.log('- Plan:', testUser.user_metadata?.plan || 'NOT SET');
    console.log('- Status:', testUser.user_metadata?.subscription_status || 'NOT SET');
    console.log('- Phone:', testUser.user_metadata?.phone || 'NOT SET');
} else {
    console.log('❌ User not found');
}
