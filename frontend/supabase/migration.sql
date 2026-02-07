-- =============================================
-- MIGRATION: Add new columns and tables
-- Run this in Supabase SQL Editor
-- =============================================

-- Add new columns to profiles (ignore errors if they already exist)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS diagnosis_details text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false;

-- =============================================
-- MEDICATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.medications (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  dosage text,
  frequency text,
  start_date date,
  end_date date,
  is_current boolean default true,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for everyone (dev)" ON public.medications;
CREATE POLICY "Enable all for everyone (dev)" ON public.medications FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- DOCTORS/HEALTHCARE PROVIDERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.doctors (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  specialty text,
  hospital text,
  phone text,
  email text,
  address text,
  is_primary boolean default false,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for everyone (dev)" ON public.doctors;
CREATE POLICY "Enable all for everyone (dev)" ON public.doctors FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- APPOINTMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references public.profiles(id) on delete cascade not null,
  doctor_id uuid references public.doctors(id) on delete set null,
  title text not null,
  appointment_date date not null,
  appointment_time time,
  location text,
  is_recurring boolean default false,
  recurrence_pattern text,
  notes text,
  status text check (status in ('scheduled', 'completed', 'cancelled')) default 'scheduled',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for everyone (dev)" ON public.appointments;
CREATE POLICY "Enable all for everyone (dev)" ON public.appointments FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- EMERGENCY CONTACTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  relationship text,
  phone text not null,
  email text,
  is_primary boolean default false,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for everyone (dev)" ON public.emergency_contacts;
CREATE POLICY "Enable all for everyone (dev)" ON public.emergency_contacts FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- ALLOWED CAREGIVERS (Two-Way Linking)
-- =============================================
CREATE TABLE IF NOT EXISTS public.allowed_caregivers (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references public.profiles(id) on delete cascade not null,
  caregiver_code text not null,
  nickname text,
  approved_at timestamp with time zone default timezone('utc'::text, now()) not null,
  UNIQUE(patient_id, caregiver_code)
);

ALTER TABLE public.allowed_caregivers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for everyone (dev)" ON public.allowed_caregivers;
CREATE POLICY "Enable all for everyone (dev)" ON public.allowed_caregivers FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- UPDATE CAREGIVER_PATIENT_LINKS (Add two-way approval columns)
-- =============================================
ALTER TABLE public.caregiver_patient_links ADD COLUMN IF NOT EXISTS patient_approved boolean DEFAULT false;
ALTER TABLE public.caregiver_patient_links ADD COLUMN IF NOT EXISTS caregiver_approved boolean DEFAULT false;

-- Update status check constraint if needed (allow 'pending')
-- Note: This may error if constraint already exists - that's ok
DO $$
BEGIN
    ALTER TABLE public.caregiver_patient_links DROP CONSTRAINT IF EXISTS caregiver_patient_links_status_check;
    ALTER TABLE public.caregiver_patient_links ADD CONSTRAINT caregiver_patient_links_status_check 
        CHECK (status IN ('pending', 'active', 'inactive'));
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- =============================================
-- DONE! 
-- =============================================
SELECT 'Migration completed successfully!' as result;
