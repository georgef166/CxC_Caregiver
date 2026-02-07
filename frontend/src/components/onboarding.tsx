"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, HeartHandshake } from "lucide-react";
import { saveProfile, completePatientOnboarding } from "@/app/actions";
import PatientOnboarding from "./patient-onboarding";

export default function Onboarding({ user, initialRole }: { user: any, initialRole?: 'patient' | 'caregiver' }) {
    const router = useRouter();
    const [selectedRole, setSelectedRole] = useState<'patient' | 'caregiver' | null>(initialRole || null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPatientOnboarding, setShowPatientOnboarding] = useState(false);

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

        if (selectedRole === 'patient') {
            setShowPatientOnboarding(true);
            return;
        }

        setIsSubmitting(true);

        try {
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

            router.push(`/dashboard/${selectedRole}`);
            router.refresh();
        } catch (err) {
            console.error("Unexpected error:", err);
            alert("An unexpected error occurred. Please try again.");
            setIsSubmitting(false);
        }
    };

    const handlePatientOnboardingComplete = async (data: any) => {
        try {
            const result = await completePatientOnboarding(
                { sub: user.sub, email: user.email, picture: user.picture },
                data
            );

            if (!result.success) {
                console.error("Onboarding error:", result.error);
                alert(`Failed to complete setup: ${result.error}`);
                return;
            }

            router.push('/dashboard/patient');
            router.refresh();
        } catch (err) {
            console.error("Unexpected error:", err);
            alert("An unexpected error occurred. Please try again.");
        }
    };

    if (showPatientOnboarding) {
        return <PatientOnboarding user={user} onComplete={handlePatientOnboardingComplete} />;
    }

    return (
        <div className="min-h-screen bg-blue-50 flex flex-col">
            {/* Header */}
            <header className="px-6 py-6 flex justify-between items-center max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-2 font-bold text-2xl text-zinc-900 tracking-tight">
                    <img src="/caregivelogo.png" alt="CareGlobe" className="w-9 h-9 rounded-lg shadow-sm" />
                    CareGlobe
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-6 pb-20">
                <div className="max-w-2xl w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="space-y-3">
                        <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 tracking-tight">
                            Welcome, {user.name?.split(' ')[0]}!
                        </h1>
                        <p className="text-zinc-500 text-lg">
                            To get started, please tell us how you will use CareGlobe.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Patient Option */}
                        <button
                            onClick={() => handleRoleSelection('patient')}
                            className={`group relative p-8 rounded-3xl border-2 transition-all duration-300 text-left backdrop-blur-sm ${selectedRole === 'patient'
                                ? 'border-blue-500 bg-white ring-4 ring-blue-100 shadow-xl scale-[1.02]'
                                : 'border-white/50 bg-white/60 hover:border-blue-200 hover:bg-white hover:shadow-lg'
                                }`}
                        >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 ${selectedRole === 'patient'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                : 'bg-blue-100 text-blue-600 group-hover:bg-blue-200'
                                }`}>
                                <User className="w-7 h-7" />
                            </div>
                            <h3 className={`text-xl font-bold mb-2 ${selectedRole === 'patient' ? 'text-blue-900' : 'text-zinc-900'}`}>
                                I am a Patient
                            </h3>
                            <p className={`text-sm ${selectedRole === 'patient' ? 'text-blue-700' : 'text-zinc-500'}`}>
                                I want to track my health and invite caregivers to help me.
                            </p>
                            {selectedRole === 'patient' && (
                                <div className="absolute top-5 right-5 animate-in fade-in zoom-in">
                                    <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
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
                            className={`group relative p-8 rounded-3xl border-2 transition-all duration-300 text-left backdrop-blur-sm ${selectedRole === 'caregiver'
                                ? 'border-emerald-500 bg-white ring-4 ring-emerald-100 shadow-xl scale-[1.02]'
                                : 'border-white/50 bg-white/60 hover:border-emerald-200 hover:bg-white hover:shadow-lg'
                                }`}
                        >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 ${selectedRole === 'caregiver'
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                                : 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200'
                                }`}>
                                <HeartHandshake className="w-7 h-7" />
                            </div>
                            <h3 className={`text-xl font-bold mb-2 ${selectedRole === 'caregiver' ? 'text-emerald-900' : 'text-zinc-900'}`}>
                                I am a Caregiver
                            </h3>
                            <p className={`text-sm ${selectedRole === 'caregiver' ? 'text-emerald-700' : 'text-zinc-500'}`}>
                                I want to link to a patient and help manage their care.
                            </p>
                            {selectedRole === 'caregiver' && (
                                <div className="absolute top-5 right-5 animate-in fade-in zoom-in">
                                    <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                </div>
                            )}
                        </button>
                    </div>

                    <div className="pt-8">
                        <button
                            onClick={confirmRole}
                            disabled={!selectedRole || isSubmitting}
                            className={`w-full max-w-sm py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-xl ${!selectedRole
                                ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none'
                                : selectedRole === 'patient'
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-0.5'
                                }`}
                        >
                            {isSubmitting
                                ? 'Creating Profile...'
                                : !selectedRole
                                    ? 'Select a Role to Continue'
                                    : `Continue as ${selectedRole === 'patient' ? 'Patient' : 'Caregiver'}`
                            }
                        </button>
                        <p className="text-zinc-400 text-sm mt-4">
                            This choice is permanent for this account.
                        </p>
                    </div>
                </div>
            </main>

            <footer className="text-center py-6 text-zinc-400 text-sm">
                &copy; 2026 CareGlobe Inc. &bull; Secure Health Data
            </footer>
        </div>
    );
}
