"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { saveProfile, completePatientOnboarding } from "@/app/actions";
import PatientOnboarding from "./patient-onboarding";

// CareLink Logo Component
function CareLinkLogo() {
    return (
        <div className="flex flex-col items-center gap-2">
            <img src="/carelinkLogo.jpeg" alt="CareLink" className="w-14 h-14 rounded-lg" />
            <span className="text-2xl font-bold italic text-teal-600">CareLink</span>
        </div>
    );
}


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
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center p-6 pb-20">
                {/* Logo */}
                <div className="mb-8">
                    <CareLinkLogo />
                </div>

                {/* Title */}
                <div className="text-center mb-10 max-w-lg">
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">
                        Select Your Role
                    </h1>
                    <p className="text-slate-600 font-medium">
                        Choose how you'll be using CareLink
                    </p>
                    <p className="text-slate-400 text-sm">
                        This selection is permanent and cannot be changed
                    </p>
                </div>

                {/* Role Cards */}
                <div className="grid md:grid-cols-2 gap-6 max-w-4xl w-full mb-8">
                    {/* Patient Card */}
                    <div
                        onClick={() => handleRoleSelection('patient')}
                        className={`bg-white rounded-2xl p-8 border-2 cursor-pointer transition-all ${selectedRole === 'patient'
                            ? 'border-teal-500 shadow-lg'
                            : 'border-gray-100 hover:border-gray-200 hover:shadow-md'
                            }`}
                    >
                        <h3 className="text-xl font-bold text-slate-800 mb-3">I'm a Patient</h3>
                        <p className="text-slate-500 text-sm mb-6">
                            Manage your health information, medications, appointments, and connect with caregivers who can help support your care.
                        </p>
                        <ul className="space-y-2 mb-6">
                            <li className="flex items-center gap-2 text-sm text-slate-600">
                                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span>
                                Organize medications and appointments
                            </li>
                            <li className="flex items-center gap-2 text-sm text-slate-600">
                                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span>
                                Store emergency contact information
                            </li>
                            <li className="flex items-center gap-2 text-sm text-slate-600">
                                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span>
                                Approve and manage caregiver access
                            </li>
                            <li className="flex items-center gap-2 text-sm text-slate-600">
                                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span>
                                Control who views your health data
                            </li>
                        </ul>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRoleSelection('patient');
                                confirmRole();
                            }}
                            className="text-teal-600 font-semibold flex items-center gap-2 hover:gap-3 transition-all"
                        >
                            Continue as Patient <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Caregiver Card */}
                    <div
                        onClick={() => handleRoleSelection('caregiver')}
                        className={`bg-white rounded-2xl p-8 border-2 cursor-pointer transition-all ${selectedRole === 'caregiver'
                            ? 'border-teal-500 shadow-lg'
                            : 'border-gray-100 hover:border-gray-200 hover:shadow-md'
                            }`}
                    >
                        <h3 className="text-xl font-bold text-slate-800 mb-3">I'm a Caregiver</h3>
                        <p className="text-slate-500 text-sm mb-6">
                            Support your loved ones or patients by accessing their health information, logging symptoms, and coordinating their care.
                        </p>
                        <ul className="space-y-2 mb-6">
                            <li className="flex items-center gap-2 text-sm text-slate-600">
                                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span>
                                View patient medications and schedules
                            </li>
                            <li className="flex items-center gap-2 text-sm text-slate-600">
                                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span>
                                Log symptoms and health updates
                            </li>
                            <li className="flex items-center gap-2 text-sm text-slate-600">
                                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span>
                                Access emergency contact information
                            </li>
                            <li className="flex items-center gap-2 text-sm text-slate-600">
                                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span>
                                Coordinate care across multiple patients
                            </li>
                        </ul>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRoleSelection('caregiver');
                                setTimeout(confirmRole, 100);
                            }}
                            className="text-teal-600 font-semibold flex items-center gap-2 hover:gap-3 transition-all"
                        >
                            Continue as Caregiver <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-6 px-6 flex items-center justify-between border-t border-gray-100">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 text-teal-600">
                        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M24 8C20 8 17 11 17 15C17 19 20 22 24 22C28 22 31 19 31 15C31 11 28 8 24 8Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                            <path d="M24 22V28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                            <path d="M16 28C16 28 14 30 14 33C14 36 16 38 19 38C22 38 24 36 24 33" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                            <path d="M32 28C32 28 34 30 34 33C34 36 32 38 29 38C26 38 24 36 24 33" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                            <circle cx="24" cy="33" r="4" fill="currentColor" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold italic text-teal-600">CareLink</span>
                </div>
                <span className="text-sm text-gray-400">©2026 CareLink</span>
            </footer>
        </div>
    );
}
