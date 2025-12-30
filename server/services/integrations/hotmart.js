export async function handleHotmart(payload, integration) {
    const leadData = {
        name: '',
        email: '',
        phone: '',
        is_person: true,
        cpf: null,
        cnpj: null,
        address: {
            zip: null,
            street: null,
            number: null,
            district: null,
            city: null,
            state: null
        },
        custom_fields: {}
    };

    // Support for Hotmart Fire (2.0) and Legacy
    const data = payload.data || payload; // 2.0 wraps in 'data'
    const buyer = data.buyer || payload.buyer || {};
    const purchase = data.purchase || payload.purchase || {};
    const product = data.product || payload.product || {};
    const address = buyer.address || payload.address || {};

    // 1. Basic Info
    leadData.name = buyer.name || payload.first_name || 'Cliente Hotmart';
    leadData.email = buyer.email || payload.email;
    leadData.phone = buyer.checkout_phone || payload.phone_checkout_number;

    // 2. Document
    const doc = buyer.document || '';
    const cleanDoc = doc.replace(/\D/g, '');
    if (cleanDoc.length > 11) {
        leadData.is_person = false;
        leadData.cnpj = cleanDoc;
    } else {
        leadData.is_person = true;
        leadData.cpf = cleanDoc;
    }

    // 3. Address
    leadData.address = {
        zip: address.zipcode || address.zip_code,
        street: address.address,
        number: address.number,
        district: address.neighborhood,
        city: address.city,
        state: address.state
    };

    // 4. Custom Fields
    leadData.custom_fields = {
        product: product.name || payload.product?.name,
        price: purchase.price?.value || payload.price?.value,
        status: purchase.status || payload.status,
        transaction: purchase.transaction || payload.transaction
    };

    return leadData;
}
