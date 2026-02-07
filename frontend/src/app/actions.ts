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
