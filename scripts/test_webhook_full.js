
const fetch = require('node-fetch');

const INTEGRATION_ID = '13d3c470-74dd-467e-8cc7-784f15d4488a'; // Braip ID fetched earlier

const payload = {
    // Braip Standard Fields
    client_name: 'Teste Completo Silva',
    client_email: 'teste.completo@example.com',
    client_cel: '11999887766',

    // Document
    client_cpf: '123.456.789-00',

    // Address
    client_zip_code: '01001-000',
    client_address: 'Praça da Sé',
    client_number: '100',
    client_neighborhood: 'Centro',
    client_city: 'São Paulo',
    client_state: 'SP',

    // Product & Value
    product_name: 'Curso Mestre do Webhook',
    status_name: 'PAGAMENTO APROVADO',
    value_cents: 19790, // R$ 197,90

    transaction: 'TR-123456'
};

async function test() {
    console.log('Sending Webhook...');
    try {
        const res = await fetch(`http://localhost:3000/webhook/integration?id=${INTEGRATION_ID}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log('Status:', res.status);
        console.log('Response:', await res.text());

    } catch (e) {
        console.error('Error:', e);
    }
}

test();
