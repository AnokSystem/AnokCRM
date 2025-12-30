export async function handleKiwify(payload, integration) {
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

    const customer = payload.Customer || payload.customer || {};
    const address = customer.Address || customer.address || {};
    const product = payload.Product || payload.product || {};

    // 1. Basic Info
    leadData.name = customer.full_name || customer.name || 'Cliente Kiwify';
    leadData.email = customer.email;
    leadData.phone = customer.mobile || customer.phone;

    // 2. Document
    if (customer.CNPJ) {
        leadData.is_person = false;
        leadData.cnpj = customer.CNPJ.replace(/\D/g, '');
    } else {
        leadData.is_person = true;
        leadData.cpf = (customer.CPF || customer.cpf || '').replace(/\D/g, '');
    }

    // 3. Address
    leadData.address = {
        zip: address.ZipCode || address.zipcode,
        street: address.Street || address.street,
        number: address.Number || address.number,
        district: address.Neighborhood || address.neighborhood,
        city: address.City || address.city,
        state: address.State || address.state
    };

    // 4. Custom Fields
    leadData.custom_fields = {
        product: product.name,
        status: payload.order_status,
        value: payload.order_total_amount ? parseFloat(payload.order_total_amount) : 0,
        payment_method: payload.payment_method
    };

    return leadData;
}
