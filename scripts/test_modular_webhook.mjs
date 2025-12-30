
const INTEGRATION_ID = '13d3c470-74dd-4cae-8cc7-784f15d4488a'; // Provided ID
const BASE_URL = 'http://localhost:3000/webhook/integration';

async function sendWebhook(platform, payload) {
    console.log(`\n--- Sending ${platform} Webhook ---`);
    try {
        const res = await fetch(`${BASE_URL}?id=${INTEGRATION_ID}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const text = await res.text();
        console.log(`Status: ${res.status}`);
        console.log(`Response: ${text}`);
    } catch (err) {
        console.error('Error:', err.message);
    }
}

// 1. BRAIP Payload (Simulating issue fixes)
const braipPayload = {
    type: 's',
    trans_cod: 'BP-12345',
    trans_value: '19700', // String representation of cents or value? New logic checks cents.
    value_cents: 19700, // Explicit cents
    trans_status: '3',
    status_name: 'Venda Aprovada',
    product_name: 'Produto Teste Braip',
    payment_method: 'credit_card',
    client_name: 'Teste Braip Modular',
    client_email: 'braip.modular@test.com',
    client_cel: '5511999990001',
    client_cpf: '123.456.789-00',
    client_address: 'Rua Braip',
    client_number: '100',
    client_city: 'Sao Paulo',
    client_state: 'SP',
    client_zip_code: '01000-000'
};

// 2. Hotmart Payload
const hotmartPayload = {
    event: 'PURCHASE_APPROVED',
    data: {
        product: { name: 'Curso Hotmart' },
        purchase: {
            transaction: 'HP-12345',
            status: 'APPROVED',
            price: { value: 297.00 }
        },
        buyer: {
            name: 'Teste Hotmart Modular',
            email: 'hotmart.modular@test.com',
            checkout_phone: '5511999990002',
            address: {
                zipcode: '02000-000',
                address: 'Rua Hotmart',
                number: '200'
            }
        }
    }
};

// 3. Kiwify Payload
const kiwifyPayload = {
    order_id: 'kw-12345',
    order_status: 'paid',
    order_total_amount: '97.00',
    payment_method: 'pix',
    Product: { name: 'Ebook Kiwify' },
    Customer: {
        full_name: 'Teste Kiwify Modular',
        email: 'kiwify.modular@test.com',
        mobile: '5511999990003'
    }
};

async function run() {
    // Note: This will only work if the INTEGRATION_ID matches the platform in the DB.
    // However, the user asked to fix Braip, so likely the ID is for Braip or they want to test Braip.
    // If the ID is a generic "Test" integration or if I need to swap IDs, I'd need to know.
    // For now, I'll send Braip first.
    await sendWebhook('BRAIP', braipPayload);
    // await sendWebhook('HOTMART', hotmartPayload);
    // await sendWebhook('KIWIFY', kiwifyPayload);
}

run();
