
-- Create a custom type for roles
create type user_role as enum ('patient', 'caregiver');

-- Create a table for users (profiles)
-- This table extends the Auth0 user data, linking via auth0_id
create table public.profiles (
  id uuid default uuid_generate_v4() primary key,
  auth0_id text unique not null,
  email text not null,
  role user_role not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies for profiles
create policy "Users can view their own profile" on public.profiles
  for select using (auth0_id = current_setting('request.jwt.claim.sub', true));

create policy "Users can update their own profile" on public.profiles
  for update using (auth0_id = current_setting('request.jwt.claim.sub', true));

-- Create a table for patient-caregiver relationships (invites and active links)
create table public.caregiver_invites (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references public.profiles(id) not null,
  caregiver_nickname text not null, -- The name the patient calls the caregiver (e.g. "Mom", "Sarah")
  invite_code text unique default encode(gen_random_bytes(6), 'hex'), -- Simple unique code
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table for established links
create table public.caregiver_patient_links (
  id uuid default uuid_generate_v4() primary key,
  caregiver_id uuid references public.profiles(id) not null,
  patient_id uuid references public.profiles(id) not null,
  status text check (status in ('active', 'inactive')) default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(caregiver_id, patient_id)
);

-- RLS for invites
alter table public.caregiver_invites enable row level security;

-- Only the patient who created the invite can see it
create policy "Patients can view their invites" on public.caregiver_invites
  for select using (patient_id in (
    select id from public.profiles where auth0_id = current_setting('request.jwt.claim.sub', true)
  ));

-- RLS for links
alter table public.caregiver_patient_links enable row level security;

-- Patients can see who is linked to them
create policy "Patients can view their caregivers" on public.caregiver_patient_links
  for select using (patient_id in (
    select id from public.profiles where auth0_id = current_setting('request.jwt.claim.sub', true)
  ));

-- Caregivers can see who they are linked to
create policy "Caregivers can view their patients" on public.caregiver_patient_links
  for select using (caregiver_id in (
    select id from public.profiles where auth0_id = current_setting('request.jwt.claim.sub', true)
  ));

-- Allow users to insert their own profile
-- This is necessary for the onboarding flow
create policy "Enable insert for authenticated users only" on public.profiles
  for insert with check (auth0_id = current_setting('request.jwt.claim.sub', true));

-- Fallback policy for development/hackathon if Auth0 integration isn't perfectly syncing tokens yet
-- This allows anyone to insert a profile (be careful in production!)
create policy "Enable insert for everyone (dev)" on public.profiles
  for insert with check (true);

-- Allow updates for everyone (dev fallback)
create policy "Enable update for everyone (dev)" on public.profiles
  for update using (true);

-- Allow select for everyone (dev fallback) - solves duplicate key errors by letting us see existing rows
create policy "Enable select for everyone (dev)" on public.profiles
  for select using (true);
