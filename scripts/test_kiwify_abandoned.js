
async function runTests() {
    const webhookUrl = 'http://localhost:3000/webhook/integration?id=cd1f1bf6-c9c9-4196-a005-e31c4456022d';

    const abandonedPayload = {
        "checkout_link": "IlBbEmO",
        "country": "br",
        "cnpj": "30604753593326",
        "created_at": "2025-12-19T23:15:33.912Z",
        "email": "johndoe@example.com",
        "id": "tmfqfz6dat62teo2na",
        "name": "John Doe",
        "offer_name": null,
        "phone": "(86) 5553-5904",
        "product_id": "fbc3d48c-ad90-4a0a-86b1-2a3487f1010c",
        "product_name": "Example product",
        "status": "abandoned",
        "store_id": "4VsDjcymApTuVL6",
        "subscription_plan": "Example subscription"
    };

    async function send(name, payload) {
        console.log(`Sending Kiwify ${name} Payload...`);
        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            console.log(`${name} Status:`, response.status);
            console.log(`${name} Body:`, await response.text());
        } catch (error) {
            console.error(`${name} Error:`, error);
        }
        console.log('-----------------------------------');
    }

    await send('Abandoned Cart', abandonedPayload);
}

runTests();
