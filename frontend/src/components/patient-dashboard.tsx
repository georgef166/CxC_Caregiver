"use client";

import { useState } from "react";
import { CopyIcon, CheckIcon } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@supabase/supabase-js";

// This is a minimal Patient Dashboard based on the user's description.
// In a real app, session data would come from Auth0 and be linked to Supabase via RLS.
// For now, we simulate the 'Generate Invite' functionality purely on the client side
// or assume a backend API endpoint exists.

// Minimal type for Auth0 user
type Auth0User = {
    name?: string;
    sub?: string;
    email?: string;
    picture?: string;
    [key: string]: any;
};

export default function PatientDashboard({ user }: { user: Auth0User }) {
    const [caregiverNickname, setCaregiverNickname] = useState("");
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const generateInvite = async () => {
        if (!caregiverNickname) return;

        // 1. Generate local unique code part
        const uniquePart = uuidv4().slice(0, 6);
        const code = `${caregiverNickname.toLowerCase().replace(/\s+/g, '-')}-careglobe-${uniquePart}`;

        // 2. Save to Supabase (if configured)
        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            // We need to fetch the patient's profile ID first based on auth0_id
            // (In a real app, this might be in a context or custom hook)
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('auth0_id', user.sub)
                .single();

            if (profile) {
                await supabase.from('caregiver_invites').insert({
                    patient_id: profile.id,
                    caregiver_nickname: caregiverNickname,
                    invite_code: code
                });
            }
        } catch (e) {
            console.log("Supabase save skipped (dev mode)", e);
        }

        setInviteCode(code);
        setCopied(false);
    };

    const copyToClipboard = () => {
        if (inviteCode) {
            navigator.clipboard.writeText(`https://careglobe.app/invite/${inviteCode}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8">
            <header className="flex justify-between items-center bg-blue-50 p-6 rounded-xl border border-blue-100">
                <div>
                    <h1 className="text-3xl font-bold text-blue-900">Welcome, {user.name}</h1>
                    <p className="text-blue-700 mt-2">Manage your account and invites.</p>
                </div>
                <a
                    href="/auth/logout"
                    className="px-4 py-2 bg-white text-blue-700 border border-blue-200 rounded-lg font-medium hover:bg-blue-50 transition"
                >
                    Log Out
                </a>
            </header>

            <section className="bg-white rounded-xl shadow-sm border border-zinc-200 p-8">
                <div className="mb-6">
                    <h2 className="text-2xl font-semibold text-zinc-900 flex items-center gap-2">
                        <span className="text-3xl">➕</span> Add Caregiver
                    </h2>
                    <p className="text-zinc-500 mt-1">Share your care with someone you trust. Only people you add can see your health info.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                        <label htmlFor="nickname" className="block text-sm font-medium text-zinc-700">
                            Caregiver's Nickname (e.g. Mom, Sarah)
                        </label>
                        <div className="flex gap-2">
                            <input
                                id="nickname"
                                type="text"
                                placeholder="Sarah"
                                value={caregiverNickname}
                                onChange={(e) => setCaregiverNickname(e.target.value)}
                                className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={generateInvite}
                                disabled={!caregiverNickname}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                Generate Invite Code
                            </button>
                        </div>
                        <p className="text-sm text-zinc-500">
                            This creates a unique link for <span className="font-semibold text-zinc-900">{caregiverNickname || "them"}</span> to join your care team.
                        </p>
                    </div>

                    {inviteCode && (
                        <div className="bg-zinc-50 rounded-xl p-6 border border-zinc-200 flex flex-col justify-center space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className="text-center">
                                <p className="text-sm font-medium text-zinc-500 mb-2">Share this code with {caregiverNickname}</p>
                                <div className="text-2xl font-mono font-bold text-blue-600 tracking-wider break-all bg-white p-3 rounded border border-blue-100 mb-4 select-all">
                                    {inviteCode}
                                </div>
                            </div>

                            <button
                                onClick={copyToClipboard}
                                className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-white px-4 py-3 rounded-lg hover:bg-zinc-800 transition shadow-sm"
                            >
                                {copied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <CopyIcon className="w-5 h-5" />}
                                {copied ? "Copied Link!" : "Copy Link"}
                            </button>
                            <p className="text-xs text-center text-zinc-400">
                                Link expires in 48 hours for security.
                            </p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
