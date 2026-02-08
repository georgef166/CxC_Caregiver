"use server";

import { createClient } from "@supabase/supabase-js";
import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";

// Initialize Supervisor Client with Service Role Key
// This bypasses RLS policies, allowing us to perform secure operations server-side
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function saveProfile({
    role,
    user
}: {
    role: 'patient' | 'caregiver';
    user: any;
}) {
    if (!user || !user.sub) {
        return { success: false, error: "No authenticated user found." };
    }

    try {
        console.log(`Creating profile for ${user.email} as ${role}`);

        // 1. Check if profile already exists to update instead of erroring
        const { data: existing } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('auth0_id', user.sub)
            .single();

        let error;

        if (existing) {
            // Update existing profile (though typically onboarding is only for new users)
            const result = await supabaseAdmin
                .from('profiles')
                .update({
                    email: user.email,
                    full_name: user.name,
                    avatar_url: user.picture,
                    role: role
                })
                .eq('auth0_id', user.sub);
            error = result.error;
        } else {
            // Insert new profile
            const result = await supabaseAdmin
                .from('profiles')
                .insert({
                    auth0_id: user.sub,
                    email: user.email,
                    full_name: user.name,
                    avatar_url: user.picture,
                    role: role
                });
            error = result.error;
        }

        if (error) {
            console.error("Supabase Error:", error);
            // Return error details to client but sanitize slightly
            return { success: false, error: error.message || "Database error" };
        }

        return { success: true };
    } catch (err: any) {
        console.error("Server Action Error:", err);
        return { success: false, error: err.message || "Unknown server error" };
    }
}

export async function updatePatientProfile({
    user,
    data
}: {
    user: any;
    data: {
        full_name?: string;
        bio?: string;
        diagnosis_year?: number;
        invite_code?: string;
    };
}) {
    if (!user || !user.sub) {
        return { success: false, error: "No authenticated user found." };
    }

    try {
        console.log(`Updating profile for ${user.email}`, data);

        const { error } = await supabaseAdmin
            .from('profiles')
            .update(data)
            .eq('auth0_id', user.sub);

        if (error) {
            console.error("Supabase Error:", error);
            return { success: false, error: error.message || "Database error" };
        }

        return { success: true };
    } catch (err: any) {
        console.error("Server Action Error:", err);
        return { success: false, error: err.message || "Unknown server error" };
    }
}

export async function linkPatientToCaregiver(
    user: any,
    inviteCode: string
) {
    if (!user || !user.sub) return { success: false, error: "Not authenticated" };

    try {
        // 1. Get Caregiver ID
        const { data: caregiver } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('auth0_id', user.sub)
            .single();

        if (!caregiver) return { success: false, error: "Caregiver profile not found." };

        // 2. Find Patient by Invite Code
        const { data: patient } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, role, diagnosis_year')
            .eq('invite_code', inviteCode)
            .single();

        // 3. Validate Patient
        if (!patient) return { success: false, error: "Invalid invite code. Patient not found." };
        if (patient.role !== 'patient') return { success: false, error: "This code does not belong to a patient." };

        // 4. Check Existing Link
        const { data: existingLink } = await supabaseAdmin
            .from('caregiver_patient_links')
            .select('id')
            .eq('caregiver_id', caregiver.id)
            .eq('patient_id', patient.id)
            .single();

        if (existingLink) return { success: false, error: "You are already linked to this patient." };

        // 5. Create Link
        const { error: linkError } = await supabaseAdmin
            .from('caregiver_patient_links')
            .insert({
                caregiver_id: caregiver.id,
                patient_id: patient.id,
                status: 'active'
            });

        if (linkError) throw linkError;

        return {
            success: true,
            patient: {
                id: patient.id,
                name: patient.full_name,
                gender: 'neutral' // Customize later if needed
            }
        };

    } catch (err: any) {
        console.error("Link Error:", err);
        return { success: false, error: err.message || "Failed to link patient." };
    }
}

export async function findPatientByCode(inviteCode: string) {
    try {
        const { data: patient } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, role')
            .eq('invite_code', inviteCode.toLowerCase())
            .single();

        if (!patient) return { success: false, error: "Patient not found." };
        if (patient.role !== 'patient') return { success: false, error: "Invalid code." };

        return {
            success: true,
            patient: {
                id: patient.id,
                name: patient.full_name,
                gender: 'neutral' // You can improve this heuristic if gender is stored
            }
        };
    } catch (err: any) {
        return { success: false, error: "Search failed." };
    }
}

export async function getLinkedPatients(user: any) {
    if (!user || !user.sub) return { success: false, error: "Not authenticated" };

    try {
        // 1. Get Caregiver ID
        const { data: caregiver } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('auth0_id', user.sub)
            .single();

        if (!caregiver) return { success: false, error: "Caregiver not found" };

        // 2. Fetch linked patients
        const { data: links } = await supabaseAdmin
            .from('caregiver_patient_links')
            .select(`
                patient_id,
                patient:profiles!patient_id (
                    id,
                    full_name,
                    avatar_url,
                    diagnosis_year
                )
            `)
            .eq('caregiver_id', caregiver.id)
            .eq('status', 'active');

        if (!links) return { success: true, patients: [] };

        // 3. Format
        const patients = links.map((link: any) => ({
            id: link.patient.id,
            name: link.patient.full_name,
            avatar_url: link.patient.avatar_url,
            gender: 'neutral' // You can refine this if you add gender to schema
        }));

        return { success: true, patients };

    } catch (err: any) {
        console.error("Get Patients Error:", err);
        return { success: false, error: "Failed to load patients" };
    }
}

// =============================================
// COMPREHENSIVE PATIENT ONBOARDING
// =============================================
export async function completePatientOnboarding(user: any, data: {
    full_name: string;
    date_of_birth: string;
    phone: string;
    address: string;
    diagnosis_year: number | null;
    diagnosis_details: string;
    medications: Array<{ name: string; dosage: string; frequency: string; is_current: boolean }>;
    doctors: Array<{ name: string; specialty: string; phone: string; email?: string; is_primary: boolean }>;
    emergency_contacts: Array<{ name: string; relationship: string; phone: string }>;
    allowed_caregivers: Array<{ caregiver_code: string; nickname: string }>;
}) {
    if (!user || !user.sub) return { success: false, error: "Not authenticated" };

    try {
        // 1. Get or create patient profile
        let { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('auth0_id', user.sub)
            .single();

        if (!profile) {
            // Generate invite code for patient
            const namePart = (data.full_name || "patient").split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
            const randomPart = Math.floor(1000 + Math.random() * 9000);
            const inviteCode = `${namePart}-${randomPart}`;

            const { data: newProfile, error: insertError } = await supabaseAdmin
                .from('profiles')
                .insert({
                    auth0_id: user.sub,
                    email: user.email,
                    role: 'patient',
                    full_name: data.full_name,
                    avatar_url: user.picture,
                    invite_code: inviteCode,
                    date_of_birth: data.date_of_birth || null,
                    phone: data.phone || null,
                    address: data.address || null,
                    diagnosis_year: data.diagnosis_year,
                    diagnosis_details: data.diagnosis_details || null,
                    onboarding_complete: true,
                })
                .select('id')
                .single();

            if (insertError) throw insertError;
            profile = newProfile;
        } else {
            // Update existing profile
            const namePart = (data.full_name || "patient").split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
            const randomPart = Math.floor(1000 + Math.random() * 9000);

            await supabaseAdmin
                .from('profiles')
                .update({
                    full_name: data.full_name,
                    date_of_birth: data.date_of_birth || null,
                    phone: data.phone || null,
                    address: data.address || null,
                    diagnosis_year: data.diagnosis_year,
                    diagnosis_details: data.diagnosis_details || null,
                    onboarding_complete: true,
                })
                .eq('id', profile.id);
        }

        const patientId = profile!.id;

        // 2. Save medications
        if (data.medications.length > 0) {
            const medsToInsert = data.medications
                .filter(m => m.name.trim())
                .map(m => ({
                    patient_id: patientId,
                    name: m.name,
                    dosage: m.dosage,
                    frequency: m.frequency,
                    is_current: m.is_current,
                }));

            if (medsToInsert.length > 0) {
                await supabaseAdmin.from('medications').insert(medsToInsert);
            }
        }

        // 3. Save doctors
        if (data.doctors.length > 0) {
            const docsToInsert = data.doctors
                .filter(d => d.name.trim())
                .map(d => ({
                    patient_id: patientId,
                    name: d.name,
                    specialty: d.specialty,
                    phone: d.phone,
                    email: d.email || null,
                    is_primary: d.is_primary,
                }));

            if (docsToInsert.length > 0) {
                await supabaseAdmin.from('doctors').insert(docsToInsert);
            }
        }

        // 4. Save emergency contacts
        if (data.emergency_contacts.length > 0) {
            const contactsToInsert = data.emergency_contacts
                .filter(c => c.name.trim() && c.phone.trim())
                .map(c => ({
                    patient_id: patientId,
                    name: c.name,
                    relationship: c.relationship,
                    phone: c.phone,
                }));

            if (contactsToInsert.length > 0) {
                await supabaseAdmin.from('emergency_contacts').insert(contactsToInsert);
            }
        }

        // 5. Save allowed caregivers (for two-way linking)
        if (data.allowed_caregivers.length > 0) {
            const caregiversToInsert = data.allowed_caregivers
                .filter(c => c.caregiver_code.trim())
                .map(c => ({
                    patient_id: patientId,
                    caregiver_code: c.caregiver_code.trim().toLowerCase(),
                    nickname: c.nickname,
                }));

            if (caregiversToInsert.length > 0) {
                await supabaseAdmin.from('allowed_caregivers').insert(caregiversToInsert);
            }
        }

        console.log(`Completed onboarding for patient ${user.email}`);
        return { success: true };

    } catch (err: any) {
        console.error("Onboarding Error:", err);
        return { success: false, error: err.message || "Onboarding failed" };
    }
}

// =============================================
// CAREGIVER CODE GENERATION
// =============================================
export async function generateCaregiverCode(user: any) {
    if (!user || !user.sub) return { success: false, error: "Not authenticated" };

    try {
        // Get caregiver profile
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, invite_code')
            .eq('auth0_id', user.sub)
            .single();

        if (!profile) return { success: false, error: "Profile not found" };

        // If already has a code, return it
        if (profile.invite_code) {
            return { success: true, code: profile.invite_code };
        }

        // Generate new code
        const namePart = (profile.full_name || "caregiver").split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
        const randomPart = Math.floor(1000 + Math.random() * 9000);
        const newCode = `${namePart}-${randomPart}`;

        await supabaseAdmin
            .from('profiles')
            .update({ invite_code: newCode })
            .eq('id', profile.id);

        return { success: true, code: newCode };

    } catch (err: any) {
        console.error("Generate Code Error:", err);
        return { success: false, error: "Failed to generate code" };
    }
}

// =============================================
// TWO-WAY LINKING CHECK
// =============================================
export async function linkPatientToCaregiverTwoWay(
    user: any,
    patientInviteCode: string
) {
    if (!user || !user.sub) return { success: false, error: "Not authenticated" };

    try {
        // 1. Get Caregiver Profile (with their invite_code)
        const { data: caregiver } = await supabaseAdmin
            .from('profiles')
            .select('id, invite_code')
            .eq('auth0_id', user.sub)
            .single();

        if (!caregiver) return { success: false, error: "Caregiver profile not found" };
        if (!caregiver.invite_code) return { success: false, error: "Please generate your caregiver code first" };

        // 2. Find Patient by their invite code
        const { data: patient } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, role')
            .eq('invite_code', patientInviteCode.toLowerCase())
            .single();

        if (!patient) return { success: false, error: "Patient not found with that code" };
        if (patient.role !== 'patient') return { success: false, error: "This code doesn't belong to a patient" };

        // 3. Check if patient has pre-approved this caregiver's code
        const { data: approval } = await supabaseAdmin
            .from('allowed_caregivers')
            .select('id')
            .eq('patient_id', patient.id)
            .eq('caregiver_code', caregiver.invite_code.toLowerCase())
            .single();

        if (!approval) {
            return {
                success: false,
                error: "This patient hasn't approved your caregiver code yet. Ask them to add your code to their approved caregivers list."
            };
        }

        // 4. Check if link already exists
        const { data: existingLink } = await supabaseAdmin
            .from('caregiver_patient_links')
            .select('id')
            .eq('caregiver_id', caregiver.id)
            .eq('patient_id', patient.id)
            .single();

        if (existingLink) return { success: false, error: "You are already linked to this patient" };

        // 5. Create the link (both parties have approved)
        const { error: linkError } = await supabaseAdmin
            .from('caregiver_patient_links')
            .insert({
                caregiver_id: caregiver.id,
                patient_id: patient.id,
                patient_approved: true,
                caregiver_approved: true,
                status: 'active'
            });

        if (linkError) throw linkError;

        return {
            success: true,
            patient: {
                id: patient.id,
                name: patient.full_name,
                gender: 'neutral'
            }
        };

    } catch (err: any) {
        console.error("Two-Way Link Error:", err);
        return { success: false, error: err.message || "Failed to link" };
    }
}

