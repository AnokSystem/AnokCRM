export async function handleBraip(payload, integration) {
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

    // 1. Basic Info
    leadData.name = payload.client_name || payload.name || 'Cliente Braip';
    leadData.email = payload.client_email || payload.email;
    leadData.phone = payload.client_cel || payload.phone_number || payload.phone;

    // 2. Document (CPF/CNPJ)
    const doc = payload.client_cnpj || payload.client_cpf || '';
    const cleanDoc = doc.replace(/\D/g, '');

    if (payload.client_cnpj || cleanDoc.length > 11) {
        leadData.is_person = false;
        leadData.cnpj = cleanDoc;
    } else {
        leadData.is_person = true;
        leadData.cpf = cleanDoc;
    }

    // 3. Address
    leadData.address = {
        zip: payload.client_zip_code,
        street: payload.client_address,
        number: payload.client_number,
        district: payload.client_neighborhood || payload.client_district,
        city: payload.client_city,
        state: payload.client_state
    };

    // 4. Value / Product Mapping (Robust)
    // Braip sends values in cents (integer) or float depending on version/context.
    // We try to find ANY value field.
    let rawValue = payload.value_cents || payload.trans_total_value || payload.trans_value || payload.total_value || 0;

    // Normalize to float
    let finalValue = parseFloat(rawValue);

    // Heuristic: If value is an integer and seems high (e.g. > 100), it's likely cents.
    // But safely, Braip documentation says value_cents is cents. others might be float.
    if (payload.value_cents !== undefined) {
        finalValue = finalValue / 100;
    } else if (Number.isInteger(finalValue) && finalValue > 999) {
        // Fallback heuristic if field name isn't explicit but looks like cents
        // (Risky, but better than 100x price) - keeping it safe: strict check on field name preferred.
        // Let's stick to known fields.
    }

    // Status Mapping
    const status = payload.status_name || payload.status || 'Desconhecido';

    leadData.custom_fields = {
        product: payload.product_name || payload.product_key,
        status: status,
        value: finalValue,
        transaction: payload.trans_cod || payload.code,
        payment_method: payload.payment_method || payload.type_payment
    };

    return leadData;
}
