
const http = require('http');

const data = JSON.stringify({
    client_name: 'Teste Nativo Silva',
    client_email: 'teste.nativo@example.com',
    client_cel: '11977665544',
    client_cpf: '999.888.777-66',
    client_zip_code: '04001-001',
    client_address: 'Av Paulista',
    client_number: '1000',
    client_city: 'São Paulo',
    client_state: 'SP',
    product_name: 'Curso Node Nativo',
    status_name: 'PAGAMENTO APROVADO',
    value_cents: 29990
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/webhook/integration?id=13d3c470-74dd-467e-8cc7-784f15d4488a',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
