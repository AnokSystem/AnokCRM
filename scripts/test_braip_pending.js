// using native fetch

async function testBraipPending() {
    const webhookUrl = 'http://localhost:3000/webhook/integration?id=13d3c470-74dd-4cae-8cc7-784f15d4488a';

    const payloadPix = {
        "type": "STATUS_ALTERADO",
        "basic_authentication": "3f5a41bf607b074c2331a3ff9d1acc637aac3ad6",
        "currency": "BRL",
        "plan_name": "Plano Exemplo",
        "plan_key": "plan276869",
        "plan_amount": 1942,
        "product_name": "Produto Exemplo",
        "product_key": "pro389358",
        "product_type": 1,
        "trans_createdate": "2025-12-22 16:41:42",
        "trans_updatedate": "2025-12-22 16:41:42",
        "trans_key": "ven719279",
        "trans_payment_link_checkout": "https://example.com/checkout",
        "trans_status": "Aguardando Pagamento",
        "trans_status_code": 1,
        "trans_value": 696,
        "trans_total_value": 279,
        "trans_discount_value": 69,
        "trans_freight": 1,
        "trans_freight_type": "PAC",
        "trans_payment": 5,
        "trans_payment_line": null,
        "trans_payment_bar_code": null,
        "trans_payment_url": "https://example.com/payment",
        "trans_payment_date": "2025-12-22 16:41:42",
        "trans_installments": 3,
        "trans_qrcode_pix": "qrcode-falso-aqui",
        "trans_url_pix": "https://fakecheckout.com/pix",
        "trans_pay_on_delivery": null,
        "trans_cash_on_delivery": null,
        "parent_sale": "ven173311",
        "is_upsell": false,
        "client_name": "Carlos Santos Pix",
        "client_email": "cliente.pix@example.com",
        "client_cel": "55 904485392",
        "client_documment": "22785547236",
        "client_zip_code": "64162946",
        "client_address": "Rua Exemplo",
        "client_address_number": 449,
        "client_city": "Cidade Exemplo",
        "client_state": "SP"
    };

    const payloadBoleto = {
        "type": "STATUS_ALTERADO",
        "basic_authentication": "2c48228fb63548ea01b5990a1ca94e1250d6da18",
        "currency": "BRL",
        "plan_name": "Plano Exemplo",
        "plan_key": "plan323864",
        "plan_amount": 3173,
        "product_name": "Produto Exemplo",
        "product_key": "pro685202",
        "product_type": 1,
        "trans_createdate": "2025-12-22 16:43:42",
        "trans_updatedate": "2025-12-22 16:43:42",
        "trans_key": "ven806867",
        "trans_payment_link_checkout": "https://example.com/checkout",
        "trans_status": "Aguardando Pagamento",
        "trans_status_code": 1,
        "trans_value": 999,
        "trans_total_value": 675,
        "trans_discount_value": 98,
        "trans_freight": 1,
        "trans_freight_type": "PAC",
        "trans_payment": 1,
        "trans_payment_line": "1234567890123456789012345678901234567890123400",
        "trans_payment_bar_code": "12345678901234567890123456789012345678901234",
        "trans_payment_url": "https://fakecheckout.com/boleto",
        "trans_payment_date": "2025-12-22 16:43:42",
        "trans_installments": 3,
        "trans_qrcode_pix": null,
        "trans_url_pix": null,
        "trans_pay_on_delivery": null,
        "trans_cash_on_delivery": null,
        "parent_sale": "ven822583",
        "is_upsell": true,
        "client_name": "Carlos Santos Boleto",
        "client_email": "cliente.boleto@example.com",
        "client_cel": "55 914807043",
        "client_documment": "39528294943",
        "client_zip_code": "18216879",
        "client_address": "Rua Exemplo",
        "client_address_number": 3523,
        "client_city": "Cidade Exemplo",
        "client_state": "SP"
    };

    console.log('--- Sending Braip PIX Payload ---');
    try {
        const resPix = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadPix)
        });
        console.log('Pix Status:', resPix.status);
        console.log('Pix Body:', await resPix.text());
    } catch (e) { console.error(e); }

    console.log('\n--- Sending Braip BOLETO Payload ---');
    try {
        const resBoleto = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadBoleto)
        });
        console.log('Boleto Status:', resBoleto.status);
        console.log('Boleto Body:', await resBoleto.text());
    } catch (e) { console.error(e); }
}

testBraipPending();
