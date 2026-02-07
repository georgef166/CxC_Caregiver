"use client";

import { useState } from "react";
import { User, Link as LinkIcon, Stethoscope, Tablets, Plus, Users, ArrowLeft, UserCircle2, User as UserIcon } from "lucide-react";

type Patient = {
    id: string;
    name: string;
    avatar_url?: string;
    gender: 'male' | 'female' | 'neutral';
};

export default function CaregiverDashboard({ user }: { user: any }) {
    // Mock initial state or empty
    const [patients, setPatients] = useState<Patient[]>([]);
    const [view, setView] = useState<'list' | 'add' | 'detail'>('list');
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

    // Add Patient Flow State
    const [inviteCode, setInviteCode] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [foundPatient, setFoundPatient] = useState<Patient | null>(null);
    const [error, setError] = useState("");

    // Helper to determine gender/icon based on name (simple demo heuristic)
    const getGenderFromName = (name: string): 'male' | 'female' | 'neutral' => {
        const lowerName = name.toLowerCase();
        const femaleNames = ['mary', 'sarah', 'mom', 'grandma', 'lisa', 'jessica', 'emily', 'anna'];
        const maleNames = ['john', 'dad', 'grandpa', 'bob', 'mike', 'david', 'james'];

        if (femaleNames.some(n => lowerName.includes(n))) return 'female';
        if (maleNames.some(n => lowerName.includes(n))) return 'male';
        return 'neutral';
    };

    const verifyInviteCode = async () => {
        setIsSearching(true);
        setError("");

        await new Promise(resolve => setTimeout(resolve, 800));

        if (inviteCode.includes("invalid")) {
            setError("Invalid or expired invite code.");
            setFoundPatient(null);
        } else {
            // Extract name from code: "sarah-careglobe-xyz" -> "Sarah"
            // Fallback to "Unknown" if format doesn't match
            let extractedName = "Patient";
            try {
                const parts = inviteCode.split("-careglobe-");
                if (parts.length > 0) {
                    // formatting: "sarah-jane" -> "Sarah Jane"
                    extractedName = parts[0].split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
                }
            } catch (e) {
                console.error(e);
            }

            const gender = getGenderFromName(extractedName);

            setFoundPatient({
                id: inviteCode, // use code as mock id
                name: extractedName,
                gender: gender
            });
        }
        setIsSearching(false);
    };

    const addPatientToList = async () => {
        if (foundPatient) {
            setPatients([...patients, foundPatient]);
            setFoundPatient(null);
            setInviteCode("");
            setView('list');
        }
    };

    const renderPatientIcon = (gender: string, size: string = "w-10 h-10") => {
        if (gender === 'female') return <div className={`${size} bg-pink-100 text-pink-600 rounded-full flex items-center justify-center border-2 border-white shadow-sm`}><UserCircle2 className="w-2/3 h-2/3" /></div>;
        if (gender === 'male') return <div className={`${size} bg-blue-100 text-blue-600 rounded-full flex items-center justify-center border-2 border-white shadow-sm`}><UserIcon className="w-2/3 h-2/3" /></div>;
        return <div className={`${size} bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center border-2 border-white shadow-sm`}><User className="w-2/3 h-2/3" /></div>;
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8">
            <header className="flex justify-between items-center bg-emerald-50 p-6 rounded-xl border border-emerald-100">
                <div>
                    <h1 className="text-3xl font-bold text-emerald-900">Welcome, {user.name}</h1>
                    <p className="text-emerald-700 mt-2">Caregiver Dashboard</p>
                </div>
                <a
                    href="/auth/logout"
                    className="px-4 py-2 bg-white text-emerald-700 border border-emerald-200 rounded-lg font-medium hover:bg-emerald-50 transition"
                >
                    Log Out
                </a>
            </header>

            {/* VIEW: PATIENT LIST */}
            {view === 'list' && (
                <section>
                    <div className="flex justify-between items-end mb-6">
                        <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
                            <Users className="w-6 h-6" /> Your Patients
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Add New Card */}
                        <button
                            onClick={() => setView('add')}
                            className="flex flex-col items-center justify-center p-8 bg-zinc-50 border-2 border-dashed border-zinc-300 rounded-xl hover:bg-zinc-100 hover:border-emerald-400 transition group h-64"
                        >
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                <Plus className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h3 className="font-bold text-zinc-700">Add New Patient</h3>
                        </button>

                        {/* Patient Cards */}
                        {patients.map(patient => (
                            <button
                                key={patient.id}
                                onClick={() => { setSelectedPatient(patient); setView('detail'); }}
                                className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200 hover:shadow-md hover:border-emerald-200 transition text-left h-64 flex flex-col items-center justify-center space-y-4"
                            >
                                {renderPatientIcon(patient.gender, "w-20 h-20")}
                                <div className="text-center">
                                    <h3 className="text-xl font-bold text-zinc-900">{patient.name}</h3>
                                    <p className="text-zinc-500 text-sm">Tap to manage care</p>
                                </div>
                                <div className="w-full mt-4 flex gap-2 justify-center">
                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full font-medium">Active</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* VIEW: ADD PATIENT */}
            {view === 'add' && (
                <section className="bg-white rounded-xl shadow-sm border border-zinc-200 p-8 animate-in fade-in slide-in-from-bottom-4">
                    <button onClick={() => { setView('list'); setInviteCode(""); setFoundPatient(null); }} className="text-sm text-zinc-500 hover:text-emerald-600 flex items-center gap-1 mb-6">
                        <ArrowLeft className="w-4 h-4" /> Back to List
                    </button>

                    <div className="mb-6">
                        <h2 className="text-2xl font-semibold text-zinc-900 flex items-center gap-2">
                            <span className="text-3xl">🔗</span> Link a New Patient
                        </h2>
                        <p className="text-zinc-500 mt-1">
                            Enter the invite code from your patient to add them to your dashboard.
                        </p>
                    </div>

                    <div className="max-w-xl mx-auto space-y-6">
                        {!foundPatient ? (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 mb-2">
                                        Invite Code
                                    </label>
                                    <div className="relative">
                                        <LinkIcon className="absolute left-3 top-3 text-zinc-400 w-5 h-5" />
                                        <input
                                            type="text"
                                            placeholder="e.g. sarah-careglobe-xyz123"
                                            value={inviteCode}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                // Clean input if full URL pasted
                                                const code = val.includes('/invite/') ? val.split('/invite/')[1] : val;
                                                setInviteCode(code);
                                                setError("");
                                            }}
                                            className="w-full rounded-lg border border-zinc-300 pl-10 pr-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-lg"
                                        />
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-2">
                                        The name in the dashboard will be automatically detected from this code.
                                    </p>
                                </div>

                                {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

                                <button
                                    onClick={verifyInviteCode}
                                    disabled={!inviteCode || isSearching}
                                    className="w-full bg-emerald-600 text-white font-medium py-3 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                                >
                                    {isSearching ? "Verifying..." : "Find Patient"}
                                </button>
                            </div>
                        ) : (
                            <div className="bg-emerald-50/50 p-8 rounded-xl border border-emerald-100 flex flex-col items-center justify-center space-y-6 animate-in zoom-in-95">
                                {renderPatientIcon(foundPatient.gender, "w-24 h-24")}
                                <div className="text-center">
                                    <h3 className="text-2xl font-bold text-zinc-800">Found {foundPatient.name}!</h3>
                                    <p className="text-zinc-600">Ready to link to your account.</p>
                                </div>
                                <div className="flex w-full gap-4">
                                    <button
                                        onClick={() => setFoundPatient(null)}
                                        className="flex-1 bg-white text-zinc-600 font-medium py-3 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={addPatientToList}
                                        className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 shadow-md transform active:scale-[0.99] transition"
                                    >
                                        Confirm Link
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* VIEW: PATIENT DETAIL */}
            {view === 'detail' && selectedPatient && (
                <section className="animate-in fade-in slide-in-from-right-4">
                    <button onClick={() => setView('list')} className="text-sm text-zinc-500 hover:text-emerald-600 flex items-center gap-1 mb-6">
                        <ArrowLeft className="w-4 h-4" /> Back to All Patients
                    </button>

                    <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-8">
                        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-zinc-100">
                            {renderPatientIcon(selectedPatient.gender, "w-20 h-20")}
                            <div>
                                <h2 className="text-3xl font-bold text-zinc-900">{selectedPatient.name}</h2>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wide">Linked Patient</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <button className="flex flex-col items-center justify-center p-8 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 hover:border-blue-200 transition group">
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                    <Stethoscope className="w-8 h-8 text-blue-600" />
                                </div>
                                <h3 className="text-lg font-bold text-blue-900">Log Symptoms</h3>
                                <p className="text-sm text-blue-600/80 mt-1">Record updates for {selectedPatient.name.split(' ')[0]}</p>
                            </button>

                            <button className="flex flex-col items-center justify-center p-8 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 hover:border-emerald-200 transition group">
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                    <Tablets className="w-8 h-8 text-emerald-600" />
                                </div>
                                <h3 className="text-lg font-bold text-emerald-900">Manage Schedule</h3>
                                <p className="text-sm text-emerald-600/80 mt-1">Meds & Appointments</p>
                            </button>
                        </div>
                    </div>
                </section>
            )}

        </div>
    );
}
