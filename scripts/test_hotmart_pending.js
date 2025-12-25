
async function testHotmartPending() {
    // Valid Hotmart integration ID (from previous tests)
    const webhookUrl = 'http://localhost:3000/webhook/integration?id=e6baeb29-a988-4583-a1ec-606c61b2ed4a';

    const payload = {
        "data": {
            "product": {
                "support_email": "support@hotmart.com.br",
                "has_co_production": false,
                "name": "Produto test postback2",
                "warranty_date": "2017-12-27T00:00:00Z",
                "is_physical_product": false,
                "id": 0,
                "ucode": "fb056612-bcc6-4217-9e6d-2a5d1110ac2f",
                "content": {
                    "has_physical_products": true,
                    "products": [
                        {
                            "name": "How to Make Clear Ice",
                            "is_physical_product": false,
                            "id": 4774438,
                            "ucode": "559fef42-3406-4d82-b775-d09bd33936b1"
                        },
                        {
                            "name": "Organizador de Poeira",
                            "is_physical_product": true,
                            "id": 4999597,
                            "ucode": "099e7644-b7d1-43d6-82a9-ec6be0118a4b"
                        }
                    ]
                }
            },
            "commissions": [
                {
                    "currency_value": "BRL",
                    "source": "MARKETPLACE",
                    "value": 149.5
                },
                {
                    "currency_value": "BRL",
                    "source": "PRODUCER",
                    "value": 1350.5
                }
            ],
            "purchase": {
                "original_offer_price": {
                    "currency_value": "BRL",
                    "value": 1500
                },
                "checkout_country": {
                    "iso": "BR",
                    "name": "Brasil"
                },
                "sckPaymentLink": "sckPaymentLinkTest",
                "order_bump": {
                    "parent_purchase_transaction": "HP02316330308193",
                    "is_order_bump": true
                },
                "approved_date": 1511783346000,
                "offer": {
                    "code": "test",
                    "coupon_code": "SHHUHA"
                },
                "is_funnel": false,
                "event_tickets": {
                    "amount": 1766437935368
                },
                "order_date": 1511783344000,
                "price": {
                    "currency_value": "BRL",
                    "value": 1500
                },
                "payment": {
                    "installments_number": 12,
                    "type": "CREDIT_CARD"
                },
                "full_price": {
                    "currency_value": "BRL",
                    "value": 1500
                },
                "business_model": "I",
                "transaction": "HP16015479281022",
                "status": "BILLET_PRINTED"
            },
            "affiliates": [
                {
                    "affiliate_code": "Q58388177J",
                    "name": "Affiliate name"
                }
            ],
            "producer": {
                "legal_nature": "Pessoa Física",
                "document": "12345678965",
                "name": "Producer Test Name"
            },
            "subscription": {
                "subscriber": {
                    "code": "I9OT62C3"
                },
                "plan": {
                    "name": "plano de teste",
                    "id": 123
                },
                "status": "ACTIVE"
            },
            "buyer": {
                "checkout_phone_code": "999999999",
                "address": {
                    "zipcode": "38400123",
                    "country": "Brasil",
                    "number": "10",
                    "address": "Avenida Francisco Galassi",
                    "city": "Uberlândia",
                    "state": "Minas Gerais",
                    "neighborhood": "Tubalina",
                    "complement": "Perto do shopping",
                    "country_iso": "BR"
                },
                "document": "69526128664",
                "name": "Teste Comprador",
                "last_name": "Comprador",
                "checkout_phone": "99999999900",
                "first_name": "Teste",
                "email": "testeComprador271101postman15@example.com",
                "document_type": "CPF"
            }
        },
        "id": "2524bdf3-aacd-40c1-9651-dad16070bdcc",
        "creation_date": 1766437935407,
        "event": "PURCHASE_BILLET_PRINTED",
        "version": "2.0.0"
    };

    console.log('Sending Hotmart Pending (Billet) Payload...');

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

testHotmartPending();
