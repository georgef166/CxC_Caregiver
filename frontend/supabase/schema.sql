
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
  invite_code text unique, -- Unique code for linking (used by both patients and caregivers)
  date_of_birth date,
  diagnosis_year int,
  diagnosis_details text, -- More detailed diagnosis info
  bio text,
  phone text,
  address text,
  onboarding_complete boolean default false, -- Track if user completed full onboarding
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- =============================================
-- MEDICATIONS TABLE
-- =============================================
create table public.medications (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  dosage text, -- e.g., "50mg"
  frequency text, -- e.g., "Twice daily"
  start_date date,
  end_date date, -- null if ongoing
  is_current boolean default true,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.medications enable row level security;
create policy "Enable all for everyone (dev)" on public.medications for all using (true) with check (true);

-- =============================================
-- DOCTORS/HEALTHCARE PROVIDERS TABLE
-- =============================================
create table public.doctors (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  specialty text, -- e.g., "Neurologist", "Primary Care"
  hospital text,
  phone text,
  email text,
  address text,
  is_primary boolean default false, -- Primary care doctor
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.doctors enable row level security;
create policy "Enable all for everyone (dev)" on public.doctors for all using (true) with check (true);

-- =============================================
-- APPOINTMENTS TABLE
-- =============================================
create table public.appointments (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references public.profiles(id) on delete cascade not null,
  doctor_id uuid references public.doctors(id) on delete set null,
  title text not null,
  appointment_date date not null,
  appointment_time time,
  location text,
  is_recurring boolean default false,
  recurrence_pattern text, -- e.g., "weekly", "monthly"
  notes text,
  status text check (status in ('scheduled', 'completed', 'cancelled')) default 'scheduled',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.appointments enable row level security;
create policy "Enable all for everyone (dev)" on public.appointments for all using (true) with check (true);

-- =============================================
-- EMERGENCY CONTACTS TABLE
-- =============================================
create table public.emergency_contacts (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  relationship text, -- e.g., "Spouse", "Child", "Friend"
  phone text not null,
  email text,
  is_primary boolean default false,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.emergency_contacts enable row level security;
create policy "Enable all for everyone (dev)" on public.emergency_contacts for all using (true) with check (true);

-- =============================================
-- CAREGIVER LINKING (TWO-WAY APPROVAL SYSTEM)
-- =============================================

-- Allowed caregivers: Patient pre-approves caregiver codes that can link to them
create table public.allowed_caregivers (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references public.profiles(id) on delete cascade not null,
  caregiver_code text not null, -- The caregiver's invite_code that patient approves
  nickname text, -- What patient calls this caregiver, e.g., "Mom"
  approved_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(patient_id, caregiver_code)
);

alter table public.allowed_caregivers enable row level security;
create policy "Enable all for everyone (dev)" on public.allowed_caregivers for all using (true) with check (true);

-- Table for established links (now requires two-way approval)
create table public.caregiver_patient_links (
  id uuid default uuid_generate_v4() primary key,
  caregiver_id uuid references public.profiles(id) not null,
  patient_id uuid references public.profiles(id) not null,
  patient_approved boolean default false, -- Patient added caregiver's code
  caregiver_approved boolean default false, -- Caregiver added patient's code
  status text check (status in ('pending', 'active', 'inactive')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(caregiver_id, patient_id)
);

alter table public.caregiver_patient_links enable row level security;
create policy "Enable all for everyone (dev)" on public.caregiver_patient_links for all using (true) with check (true);

-- =============================================
-- PROFILE POLICIES
-- =============================================
create policy "Users can view their own profile" on public.profiles
  for select using (auth0_id = current_setting('request.jwt.claim.sub', true));

create policy "Users can update their own profile" on public.profiles
  for update using (auth0_id = current_setting('request.jwt.claim.sub', true));

create policy "Enable insert for everyone (dev)" on public.profiles
  for insert with check (true);

create policy "Enable update for everyone (dev)" on public.profiles
  for update using (true);

create policy "Enable select for everyone (dev)" on public.profiles
  for select using (true);

-- =============================================
-- SYMPTOM LOGS TABLE (for AI Agent)
-- =============================================
create table public.symptom_logs (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references public.profiles(id) on delete cascade not null,
  caregiver_id uuid references public.profiles(id) on delete set null,
  symptom text not null,
  severity text check (severity in ('mild', 'moderate', 'severe')) default 'moderate',
  notes text,
  logged_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.symptom_logs enable row level security;
create policy "Enable all for everyone (dev)" on public.symptom_logs for all using (true) with check (true);
