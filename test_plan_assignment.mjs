const response = await fetch('http://localhost:3000/webhook/n8n/access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        secret: 'anok_secret_key_123',
        email: 'teste-plano@example.com',
        plan: 'pro',
        phone: '11988776655',
        name: 'Teste Plano Pro'
    })
});

const data = await response.json();
console.log('Status:', response.status);
console.log('Response:', JSON.stringify(data, null, 2));
