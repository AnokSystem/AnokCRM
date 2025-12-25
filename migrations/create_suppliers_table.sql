
create table if not exists suppliers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  razao_social text not null,
  nome_fantasia text,
  cnpj text,
  endereco text,
  cidade text,
  estado text,
  cep text,
  telefone text,
  email text,
  website text,
  whatsapp text,
  social_media text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table suppliers enable row level security;

-- Create policies
create policy "Users can view their own suppliers"
  on suppliers for select
  using (auth.uid() = user_id);

create policy "Users can insert their own suppliers"
  on suppliers for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own suppliers"
  on suppliers for update
  using (auth.uid() = user_id);

create policy "Users can delete their own suppliers"
  on suppliers for delete
  using (auth.uid() = user_id);
