
async function runTests() {
    const webhookUrl = 'http://localhost:3000/webhook/integration?id=12721fa1-cff4-4dfc-82ff-044b28dc07be';

    const boletoPayload = {
        "order_id": "7ac64426-c0d3-499b-86a0-59523ac71615",
        "order_ref": "sCSSDdb",
        "order_status": "waiting_payment",
        "product_type": "event",
        "payment_method": "boleto",
        "boleto_URL": "https://pagar.me",
        "boleto_barcode": "23791.22928 60005.510098 74000.046909 4 83110000300000",
        "boleto_expiry_date": "26/12/2025",
        "pix_code": null,
        "Product": {
            "product_name": "Example product"
        },
        "Customer": {
            "full_name": "John Doe",
            "email": "johndoe@example.com",
            "mobile": "+5511999999999",
            "CPF": "27000061676"
        },
        "Commissions": {
            "charge_amount": 6798
        }
    };

    const pixPayload = {
        "order_id": "d02832fe-828b-4ce5-9983-2585668b335e",
        "order_ref": "WicIpfw",
        "order_status": "waiting_payment",
        "payment_method": "pix",
        "pix_code": "00020101021226840014br.gov.bcb.pix2562pix-h.stone.com.br/pix/v2/ee77b9e9-67fb-4b62-829b-b6537068aa7b5204000053039865406970.005802BR5924Pagar.me Pagamentos S.A.6014RIO DE JANEIRO622905253b6997c1ef2f4b2597b6e11de6304ED77",
        "pix_expiration": "26/12/2025 22:00",
        "Product": {
            "product_name": "Example product"
        },
        "Customer": {
            "full_name": "Jane Doe",
            "email": "janedoe@example.com",
            "mobile": "+5511988888888",
            "CPF": "42462929756"
        },
        "Commissions": {
            "charge_amount": 5668
        }
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

    await send('Boleto', boletoPayload);
    await send('Pix', pixPayload);
}

runTests();
