
-- Setup Database V4 - Fix Infinite Recursion

-- 1. Create a secure function to check admin status
-- This function runs with the privileges of the creator (postgres/superuser), 
-- effectively bypassing RLS to check the role table.
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
    and role = 'admin'
  );
end;
$$;

-- 2. Reset user_roles policies
drop policy if exists "Users can read own roles" on public.user_roles;
drop policy if exists "Admins can read all roles" on public.user_roles;
drop policy if exists "Admins can manage roles" on public.user_roles;

alter table public.user_roles enable row level security;

-- Policy 1: Users can ALWAYS read their own role. 
-- This is non-recursive because it only checks ID match.
create policy "Users can read own roles"
  on public.user_roles for select
  using ( auth.uid() = user_id );

-- Policy 2: Admins can read/manage ALL roles.
-- This uses the function, which bypasses RLS, preventing recursion.
create policy "Admins can manage roles"
  on public.user_roles for all
  using ( public.is_admin() );


-- 3. Reset Profile policies to use the new function too (cleaner)
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Admins can delete profiles" on public.profiles;

create policy "Admins can view all profiles"
  on public.profiles for select
  using ( public.is_admin() );

create policy "Admins can delete profiles"
  on public.profiles for delete
  using ( public.is_admin() );
