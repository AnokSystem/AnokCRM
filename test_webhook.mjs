const response = await fetch('http://localhost:3000/webhook/n8n/access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        secret: 'anok_secret_key_123',
        email: 'test456@example.com',
        plan: 'performance',
        phone: '11987654321',
        name: 'TestUser'
    })
});

const data = await response.json();
console.log('Status:', response.status);
console.log('Response:', JSON.stringify(data, null, 2));
