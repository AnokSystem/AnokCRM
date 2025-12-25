-- Create flows table
create table if not exists flows (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  description text,
  nodes jsonb default '[]'::jsonb,
  edges jsonb default '[]'::jsonb,
  nodes_count integer default 0,
  status text default 'rascunho' check (status in ('ativo', 'inativo', 'rascunho')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table flows enable row level security;

-- Create policies
create policy "Users can view their own flows"
  on flows for select
  using (auth.uid() = user_id);

create policy "Users can insert their own flows"
  on flows for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own flows"
  on flows for update
  using (auth.uid() = user_id);

create policy "Users can delete their own flows"
  on flows for delete
  using (auth.uid() = user_id);

-- Create updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

create trigger update_flows_updated_at
    before update on flows
    for each row
    execute procedure update_updated_at_column();
