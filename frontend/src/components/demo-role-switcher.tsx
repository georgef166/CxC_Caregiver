"use client";

import { useState } from "react";
import PatientDashboard from "./patient-dashboard";
import CaregiverDashboard from "./caregiver-dashboard";

export default function DemoRoleSwitcher({ session }: { session: any }) {
    const [role, setRole] = useState<'patient' | 'caregiver'>('patient');

    return (
        <div className="space-y-6">
            <div className="flex justify-center mb-8">
                <div className="bg-zinc-100 p-1 rounded-lg inline-flex">
                    <button
                        onClick={() => setRole('patient')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${role === 'patient'
                            ? 'bg-white text-teal-600 shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-900'
                            }`}
                    >
                        I am a Patient
                    </button>
                    <button
                        onClick={() => setRole('caregiver')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${role === 'caregiver'
                            ? 'bg-white text-emerald-600 shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-900'
                            }`}
                    >
                        I am a Caregiver
                    </button>
                </div>
            </div>

            {role === 'patient' ? (
                <PatientDashboard user={session.user} />
            ) : (
                <CaregiverDashboard user={session.user} />
            )}
        </div>
    );
}
