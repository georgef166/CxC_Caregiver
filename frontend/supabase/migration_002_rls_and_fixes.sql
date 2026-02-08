-- =============================================
-- MIGRATION 002: Fix RLS policies & add missing columns
-- Run this in Supabase SQL Editor AFTER migration.sql
-- =============================================

-- =============================================
-- 1. Add missing doctor_name column to appointments
-- (used by schedule-manager for display without joins)
-- =============================================
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS doctor_name text;

-- =============================================
-- 2. CREATE HELPER FUNCTION
-- Returns the patient_ids that the current user
-- is linked to as a caregiver (active links only)
-- =============================================
CREATE OR REPLACE FUNCTION get_linked_patient_ids(user_auth0_id text)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT cpl.patient_id
  FROM caregiver_patient_links cpl
  JOIN profiles p ON p.id = cpl.caregiver_id
  WHERE p.auth0_id = user_auth0_id
    AND cpl.status = 'active';
$$;

-- =============================================
-- 3. REPLACE DEV RLS POLICIES WITH PROPER ONES
-- =============================================

-- ---------- PROFILES ----------
-- Drop all dev policies
DROP POLICY IF EXISTS "Enable all for everyone (dev)" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for everyone (dev)" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for everyone (dev)" ON public.profiles;
DROP POLICY IF EXISTS "Enable select for everyone (dev)" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Profiles: anyone can insert (onboarding creates profile)
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Profiles: users can view own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth0_id = current_setting('request.jwt.claim.sub', true));

-- Profiles: caregivers can view linked patients
CREATE POLICY "profiles_select_linked" ON public.profiles
  FOR SELECT USING (
    id IN (SELECT get_linked_patient_ids(current_setting('request.jwt.claim.sub', true)))
  );

-- Profiles: users can update own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth0_id = current_setting('request.jwt.claim.sub', true));

-- Profiles: service role bypass (for server actions)
CREATE POLICY "profiles_service_role" ON public.profiles
  FOR ALL USING (current_setting('role', true) = 'service_role')
  WITH CHECK (current_setting('role', true) = 'service_role');


-- ---------- MEDICATIONS ----------
DROP POLICY IF EXISTS "Enable all for everyone (dev)" ON public.medications;

-- Patients can manage own medications
CREATE POLICY "medications_patient_all" ON public.medications
  FOR ALL USING (
    patient_id IN (SELECT id FROM profiles WHERE auth0_id = current_setting('request.jwt.claim.sub', true))
  ) WITH CHECK (
    patient_id IN (SELECT id FROM profiles WHERE auth0_id = current_setting('request.jwt.claim.sub', true))
  );

-- Caregivers can view linked patient medications
CREATE POLICY "medications_caregiver_select" ON public.medications
  FOR SELECT USING (
    patient_id IN (SELECT get_linked_patient_ids(current_setting('request.jwt.claim.sub', true)))
  );

-- Service role bypass
CREATE POLICY "medications_service_role" ON public.medications
  FOR ALL USING (current_setting('role', true) = 'service_role')
  WITH CHECK (current_setting('role', true) = 'service_role');


-- ---------- DOCTORS ----------
DROP POLICY IF EXISTS "Enable all for everyone (dev)" ON public.doctors;

CREATE POLICY "doctors_patient_all" ON public.doctors
  FOR ALL USING (
    patient_id IN (SELECT id FROM profiles WHERE auth0_id = current_setting('request.jwt.claim.sub', true))
  ) WITH CHECK (
    patient_id IN (SELECT id FROM profiles WHERE auth0_id = current_setting('request.jwt.claim.sub', true))
  );

CREATE POLICY "doctors_caregiver_select" ON public.doctors
  FOR SELECT USING (
    patient_id IN (SELECT get_linked_patient_ids(current_setting('request.jwt.claim.sub', true)))
  );

CREATE POLICY "doctors_service_role" ON public.doctors
  FOR ALL USING (current_setting('role', true) = 'service_role')
  WITH CHECK (current_setting('role', true) = 'service_role');


-- ---------- APPOINTMENTS ----------
DROP POLICY IF EXISTS "Enable all for everyone (dev)" ON public.appointments;

CREATE POLICY "appointments_patient_all" ON public.appointments
  FOR ALL USING (
    patient_id IN (SELECT id FROM profiles WHERE auth0_id = current_setting('request.jwt.claim.sub', true))
  ) WITH CHECK (
    patient_id IN (SELECT id FROM profiles WHERE auth0_id = current_setting('request.jwt.claim.sub', true))
  );

-- Caregivers can view AND create appointments for linked patients
CREATE POLICY "appointments_caregiver_manage" ON public.appointments
  FOR ALL USING (
    patient_id IN (SELECT get_linked_patient_ids(current_setting('request.jwt.claim.sub', true)))
  ) WITH CHECK (
    patient_id IN (SELECT get_linked_patient_ids(current_setting('request.jwt.claim.sub', true)))
  );

CREATE POLICY "appointments_service_role" ON public.appointments
  FOR ALL USING (current_setting('role', true) = 'service_role')
  WITH CHECK (current_setting('role', true) = 'service_role');


-- ---------- EMERGENCY CONTACTS ----------
DROP POLICY IF EXISTS "Enable all for everyone (dev)" ON public.emergency_contacts;

CREATE POLICY "emergency_contacts_patient_all" ON public.emergency_contacts
  FOR ALL USING (
    patient_id IN (SELECT id FROM profiles WHERE auth0_id = current_setting('request.jwt.claim.sub', true))
  ) WITH CHECK (
    patient_id IN (SELECT id FROM profiles WHERE auth0_id = current_setting('request.jwt.claim.sub', true))
  );

CREATE POLICY "emergency_contacts_caregiver_select" ON public.emergency_contacts
  FOR SELECT USING (
    patient_id IN (SELECT get_linked_patient_ids(current_setting('request.jwt.claim.sub', true)))
  );

CREATE POLICY "emergency_contacts_service_role" ON public.emergency_contacts
  FOR ALL USING (current_setting('role', true) = 'service_role')
  WITH CHECK (current_setting('role', true) = 'service_role');


-- ---------- ALLOWED CAREGIVERS ----------
DROP POLICY IF EXISTS "Enable all for everyone (dev)" ON public.allowed_caregivers;

-- Patients manage their own approved caregivers
CREATE POLICY "allowed_caregivers_patient_all" ON public.allowed_caregivers
  FOR ALL USING (
    patient_id IN (SELECT id FROM profiles WHERE auth0_id = current_setting('request.jwt.claim.sub', true))
  ) WITH CHECK (
    patient_id IN (SELECT id FROM profiles WHERE auth0_id = current_setting('request.jwt.claim.sub', true))
  );

CREATE POLICY "allowed_caregivers_service_role" ON public.allowed_caregivers
  FOR ALL USING (current_setting('role', true) = 'service_role')
  WITH CHECK (current_setting('role', true) = 'service_role');


-- ---------- CAREGIVER PATIENT LINKS ----------
DROP POLICY IF EXISTS "Enable all for everyone (dev)" ON public.caregiver_patient_links;

-- Both parties can view their own links
CREATE POLICY "links_select_own" ON public.caregiver_patient_links
  FOR SELECT USING (
    caregiver_id IN (SELECT id FROM profiles WHERE auth0_id = current_setting('request.jwt.claim.sub', true))
    OR
    patient_id IN (SELECT id FROM profiles WHERE auth0_id = current_setting('request.jwt.claim.sub', true))
  );

CREATE POLICY "links_service_role" ON public.caregiver_patient_links
  FOR ALL USING (current_setting('role', true) = 'service_role')
  WITH CHECK (current_setting('role', true) = 'service_role');


-- ---------- SYMPTOM LOGS ----------
DROP POLICY IF EXISTS "Enable all for everyone (dev)" ON public.symptom_logs;

-- Caregivers can manage symptom logs for linked patients
CREATE POLICY "symptom_logs_caregiver_all" ON public.symptom_logs
  FOR ALL USING (
    patient_id IN (SELECT get_linked_patient_ids(current_setting('request.jwt.claim.sub', true)))
  ) WITH CHECK (
    patient_id IN (SELECT get_linked_patient_ids(current_setting('request.jwt.claim.sub', true)))
  );

-- Patients can view their own logs
CREATE POLICY "symptom_logs_patient_select" ON public.symptom_logs
  FOR SELECT USING (
    patient_id IN (SELECT id FROM profiles WHERE auth0_id = current_setting('request.jwt.claim.sub', true))
  );

CREATE POLICY "symptom_logs_service_role" ON public.symptom_logs
  FOR ALL USING (current_setting('role', true) = 'service_role')
  WITH CHECK (current_setting('role', true) = 'service_role');


-- =============================================
-- DONE!
-- =============================================
SELECT 'Migration 002 completed: RLS policies hardened, doctor_name column added.' as result;
