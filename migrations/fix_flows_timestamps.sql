-- Add updated_at and created_at if they don't exist
alter table flows add column if not exists created_at timestamp with time zone default timezone('utc'::text, now()) not null;
alter table flows add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

-- Re-create trigger just in case
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

drop trigger if exists update_flows_updated_at on flows;
create trigger update_flows_updated_at
    before update on flows
    for each row
    execute procedure update_updated_at_column();
