
const payload = {
    "data": {
        "product": {
            "name": "Produto test postback2"
        },
        "purchase": {
            "sckPaymentLink": "sckPaymentLinkTest",
            "price": { "value": 1500 },
            "payment": { "type": "CREDIT_CARD" }, // Note: User payload had CREDIT_CARD but status BILLET_PRINTED
            "transaction": "HP16015479281022",
            "status": "BILLET_PRINTED"
        },
        "buyer": {
            "name": "Teste Comprador",
            "email": "teste@example.com",
            "checkout_phone": "99999999900"
        }
    },
    "event": "PURCHASE_BILLET_PRINTED"
};

function processPayload(payload) {
    const data = payload.data || payload;
    const purchase = data.purchase || {};
    let status = purchase.status || data.status;

    console.log('Original Status:', status);
    console.log('Event:', payload.event);

    // Logic from webhook.js
    if (status === 'APPROVED' || status === 'COMPLETED') {
        status = 'Aprovado';
    } else if (payload.event === 'PURCHASE_OUT_OF_SHOPPING_CART') {
        status = 'Carrinho Abandonado';
    } else if (['BILLET_PRINTED', 'WAITING_PAYMENT'].includes(status) || payload.event === 'PURCHASE_BILLET_PRINTED') {
        console.log('--- Entered Status Mapping Block ---');
        status = 'Aguardando Pagamento';
    }

    console.log('Mapped Status:', status);

    let checkoutUrl = '';
    let boletoUrl = null;
    let paymentMethod = 'Outro';

    if (status === 'Aguardando Pagamento') {
        console.log('--- Entered Extraction Block ---');
        const payment = purchase.payment || {};

        if (payload.event === 'PURCHASE_BILLET_PRINTED' || status === 'BILLET_PRINTED' || payment.type === 'BILLET') {
            console.log('--- Identified as Boleto ---');
            paymentMethod = 'Boleto';
            boletoUrl = payment.billet_url || payment.url || purchase.sckPaymentLink;
        }
    }

    console.log('Checkout URL Source:', boletoUrl);

    return {
        status,
        checkout_url: checkoutUrl || boletoUrl
    };
}

const result = processPayload(payload);
console.log('Final Result:', result);
