
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.anok.com.br';
const serviceRoleKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const defaultPlans = [
    {
        name: 'Gratuito',
        description: 'Para começar a explorar',
        price: 0,
        features: ['live_chat', 'leads']
    },
    {
        name: 'Pro',
        description: 'Para profissionais e pequenas empresas',
        price: 97.00,
        features: ['live_chat', 'leads', 'flows', 'campaigns', 'products']
    },
    {
        name: 'Enterprise',
        description: 'Automação completa e sem limites',
        price: 297.00,
        features: ['live_chat', 'leads', 'flows', 'remarketing', 'campaigns', 'products', 'suppliers', 'orders', 'reports']
    }
];

async function seedPlans() {
    console.log('Seeding plans...');

    for (const plan of defaultPlans) {
        // Check if plan exists (by name)
        const { data: existing } = await supabase
            .from('plans')
            .select('id')
            .eq('name', plan.name)
            .maybeSingle();

        if (!existing) {
            const { error } = await supabase.from('plans').insert(plan);
            if (error) console.error(`Error creating ${plan.name}:`, error.message);
            else console.log(`Plan created: ${plan.name}`);
        } else {
            console.log(`Plan already exists: ${plan.name}`);
        }
    }
    console.log('Seeding complete!');
}

seedPlans();
