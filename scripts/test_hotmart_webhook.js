// using native fetch

async function testHotmartWebhook() {
    // Valid Hotmart integration ID
    const webhookUrl = 'http://localhost:3000/webhook/integration?id=e6baeb29-a988-4583-a1ec-606c61b2ed4a';

    const payload = {
        "data": {
            "offer": {
                "code": "n82b9jqz"
            },
            "product": {
                "name": "Produto test postback2 com ç e á",
                "id": 123456
            },
            "checkout_country": {
                "iso": "BR",
                "name": "Brasil"
            },
            "buyer_ip": "127.0.0.1",
            "affiliate": false,
            "buyer": {
                "phone": "999999999", // With DDI 55
                "name": "Postback2 teste",
                "email": "teste@hotmart.com.br"
            }
        },
        "id": "b2ac014c-06e7-4047-af8e-99715ef5976f",
        "creation_date": 1766435185165,
        "event": "PURCHASE_OUT_OF_SHOPPING_CART",
        "version": "2.0.0"
    };

    console.log('Sending Hotmart Payload...');

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        console.log('Response Status:', response.status);
        console.log('Response Body:', text);
    } catch (error) {
        console.error('Error sending webhook:', error);
    }
}

testHotmartWebhook();
