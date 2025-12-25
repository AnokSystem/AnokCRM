
-- Setup Database V6 - Auto Confirm Users (Bypass SMTP)

-- This script creates a trigger to automatically confirm new users' emails.
-- This is useful for self-hosted instances without SMTP configured.

-- 1. Create the function that sets the confirmed timestamp
create or replace function public.auto_confirm_user()
returns trigger
language plpgsql
security definer
as $$
begin
  new.email_confirmed_at = now();
  return new;
end;
$$;

-- 2. Create the trigger on the auth.users table
-- We drop it first to ensure idempotency
drop trigger if exists on_auth_user_created_auto_confirm on auth.users;

create trigger on_auth_user_created_auto_confirm
before insert on auth.users
for each row execute procedure public.auto_confirm_user();

-- Note: This requires privileges on the auth schema, which the default connection usually has.
