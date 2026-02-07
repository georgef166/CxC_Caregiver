"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, HeartHandshake } from "lucide-react";
import { saveProfile } from "@/app/actions"; // Import the server action

export default function Onboarding({ user, initialRole }: { user: any, initialRole?: 'patient' | 'caregiver' }) {
    const router = useRouter();
    const [selectedRole, setSelectedRole] = useState<'patient' | 'caregiver' | null>(initialRole || null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (initialRole) {
            setSelectedRole(initialRole);
        }
    }, [initialRole]);

    const handleRoleSelection = async (role: 'patient' | 'caregiver') => {
        setSelectedRole(role);
    };

    const confirmRole = async () => {
        if (!selectedRole || isSubmitting) return;
        setIsSubmitting(true);

        try {
            // Use Server Action to securely save profile
            // This bypasses client-side RLS issues
            const result = await saveProfile({
                role: selectedRole,
                user: {
                    sub: user.sub,
                    email: user.email,
                    name: user.name,
                    picture: user.picture
                }
            });

            if (!result || !result.success) {
                console.error("Error creating profile:", result?.error);
                alert(`Failed to save: ${result?.error || "Unknown error"}`);
                setIsSubmitting(false);
                return;
            }

            // Redirect to respective dashboard
            router.push(`/dashboard/${selectedRole}`);
            router.refresh(); // Ensure layout updates
        } catch (err) {
            console.error("Unexpected error:", err);
            alert("An unexpected error occurred. Please try again.");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-2xl w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold text-zinc-900">Welcome to CareGlobe, {user.name.split(' ')[0]}!</h1>
                    <p className="text-zinc-500 text-lg">To get started, please tell us how you will use CareGlobe.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Patient Option */}
                    <button
                        onClick={() => handleRoleSelection('patient')}
                        className={`group relative p-8 rounded-2xl border-2 transition-all duration-300 text-left ${selectedRole === 'patient'
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 shadow-xl scale-[1.02]'
                            : 'border-zinc-200 bg-white hover:border-blue-300 hover:shadow-lg'
                            }`}
                    >
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-colors ${selectedRole === 'patient' ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600 group-hover:bg-blue-200'
                            }`}>
                            <User className="w-8 h-8" />
                        </div>
                        <h3 className={`text-xl font-bold mb-2 ${selectedRole === 'patient' ? 'text-blue-900' : 'text-zinc-900'}`}>I am a Patient</h3>
                        <p className={`text-sm ${selectedRole === 'patient' ? 'text-blue-700' : 'text-zinc-500'}`}>
                            I want to track my health and invite caregivers to help me.
                        </p>
                        {selectedRole === 'patient' && (
                            <div className="absolute top-4 right-4 text-blue-500 animate-in fade-in zoom-in">
                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                        )}
                    </button>

                    {/* Caregiver Option */}
                    <button
                        onClick={() => handleRoleSelection('caregiver')}
                        className={`group relative p-8 rounded-2xl border-2 transition-all duration-300 text-left ${selectedRole === 'caregiver'
                            ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 shadow-xl scale-[1.02]'
                            : 'border-zinc-200 bg-white hover:border-emerald-300 hover:shadow-lg'
                            }`}
                    >
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-colors ${selectedRole === 'caregiver' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200'
                            }`}>
                            <HeartHandshake className="w-8 h-8" />
                        </div>
                        <h3 className={`text-xl font-bold mb-2 ${selectedRole === 'caregiver' ? 'text-emerald-900' : 'text-zinc-900'}`}>I am a Caregiver</h3>
                        <p className={`text-sm ${selectedRole === 'caregiver' ? 'text-emerald-700' : 'text-zinc-500'}`}>
                            I want to link to a patient and help manage their care.
                        </p>
                        {selectedRole === 'caregiver' && (
                            <div className="absolute top-4 right-4 text-emerald-500 animate-in fade-in zoom-in">
                                <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                        )}
                    </button>
                </div>

                <div className="pt-8 border-t border-zinc-200">
                    <button
                        onClick={confirmRole}
                        disabled={!selectedRole || isSubmitting}
                        className={`w-full max-w-sm py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${!selectedRole
                            ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                            : selectedRole === 'patient'
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/30'
                            }`}
                    >
                        {isSubmitting ? 'Creating Profile...' : !selectedRole ? 'Select a Role to Continue' : `Continue as ${selectedRole === 'patient' ? 'Patient' : 'Caregiver'}`}
                    </button>
                    <p className="text-zinc-400 text-sm mt-4">
                        This choice is permanent for this account.
                    </p>
                </div>
            </div>
        </div>
    );
}
