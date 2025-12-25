// using native fetch

async function testBraipWebhook() {
    const webhookUrl = 'http://localhost:3000/webhook/integration?id=13d3c470-74dd-4cae-8cc7-784f15d4488a';

    const payload = {
        "type": "ABANDONO",
        "basic_authentication": "028868356fdde1a7ed743c4e83a0284afd44afcd",
        "plan_name": "Plano 69",
        "plan_key": "plan138236",
        "product_name": "Produto 1",
        "product_key": "pro164031",
        "trans_createdate": "2025-10-08 16:23:36",
        "trans_updatedate": "2025-12-05 16:23:36",
        "client_name": "Carlos Santos",
        "client_email": "cliente@example.com",
        "client_cel": "55 994368425",
        "client_documment": "40669230817",
        "client_address": "Rua Exemplo",
        "client_address_city": "Cidade Exemplo",
        "client_address_comp": "apt 101",
        "client_address_district": "Bairro Exemplo",
        "client_address_number": 6125,
        "client_address_state": "SP",
        "client_address_country": "BR",
        "client_zip_code": "77122023",
        "abandonment_key": "aban66021",
        "checkout_url": "https://checkout.exemplo.com/3124",
        "affiliate_name": "João Silva",
        "affiliate_email": "afiliado71@teste.com"
    };

    console.log('Sending Braip Payload...');

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

testBraipWebhook();
