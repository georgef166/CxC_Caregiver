"use client";

import { useState, useEffect } from "react";
import { User, Link as LinkIcon, Stethoscope, Tablets, Plus, Users, ArrowLeft, UserCircle2, User as UserIcon, Copy, Check, Key, Calendar, Pill, Phone, AlertCircle } from "lucide-react";
import { findPatientByCode, linkPatientToCaregiverTwoWay, getLinkedPatients, generateCaregiverCode } from "@/app/actions";

type Patient = {
    id: string;
    name: string;
    avatar_url?: string;
    gender: 'male' | 'female' | 'neutral';
};

export default function CaregiverDashboard({ user }: { user: any }) {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [view, setView] = useState<'list' | 'add' | 'detail'>('list');
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

    const [myCode, setMyCode] = useState<string | null>(null);
    const [isGeneratingCode, setIsGeneratingCode] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);

    const [inviteCode, setInviteCode] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [foundPatient, setFoundPatient] = useState<Patient | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        const loadData = async () => {
            if (user && user.sub) {
                const patientsResult = await getLinkedPatients({ sub: user.sub });
                if (patientsResult.success && patientsResult.patients) {
                    setPatients(patientsResult.patients as any);
                }
                const codeResult = await generateCaregiverCode({ sub: user.sub });
                if (codeResult.success && codeResult.code) {
                    setMyCode(codeResult.code);
                }
            }
        };
        loadData();
    }, [user.sub]);

    const handleGenerateCode = async () => {
        setIsGeneratingCode(true);
        const result = await generateCaregiverCode({ sub: user.sub });
        if (result.success && result.code) setMyCode(result.code);
        setIsGeneratingCode(false);
    };

    const copyCode = () => {
        if (myCode) { navigator.clipboard.writeText(myCode); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); }
    };

    const verifyInviteCode = async () => {
        setIsSearching(true); setError("");
        const result = await findPatientByCode(inviteCode);
        if (result.success && result.patient) {
            setFoundPatient({ id: result.patient.id, name: result.patient.name, gender: result.patient.gender as any });
        } else { setError(result.error || "Invalid invite code."); setFoundPatient(null); }
        setIsSearching(false);
    };

    const addPatientToList = async () => {
        if (foundPatient) {
            const result = await linkPatientToCaregiverTwoWay({ sub: user.sub }, inviteCode);
            if (result.success) { setPatients((prev) => [...prev, foundPatient]); setFoundPatient(null); setInviteCode(""); setView('list'); }
            else { setError(result.error || "Failed to link."); }
        }
    };

    const renderPatientIcon = (gender: string, size: string = "w-10 h-10") => {
        return <div className={`${size} bg-blue-100 text-blue-600 rounded-full flex items-center justify-center border-2 border-white shadow-sm`}><UserIcon className="w-2/3 h-2/3" /></div>;
    };

    return (
        <div className="min-h-screen bg-blue-50">
            {/* Header */}
            <header className="bg-white border-b border-zinc-200 sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <a href="/" className="flex items-center gap-2 font-bold text-xl text-zinc-900">
                            <img src="/caregivelogo.png" alt="CareGlobe" className="w-9 h-9 rounded-lg shadow-sm" />
                            CareGlobe
                        </a>
                        <span className="text-zinc-300">|</span>
                        <span className="text-zinc-500 font-medium">Caregiver Dashboard</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <img src={user.picture} alt="Profile" className="w-9 h-9 rounded-full border-2 border-white shadow-sm" />
                            <span className="font-medium text-zinc-700 hidden md:block">{user.name}</span>
                        </div>
                        <a href="/auth/logout" className="px-4 py-2 text-zinc-600 hover:text-zinc-900 font-medium rounded-lg hover:bg-zinc-100 transition">Log Out</a>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
                {/* MY CAREGIVER CODE SECTION */}
                <section className="bg-blue-600 p-6 rounded-2xl shadow-lg text-white">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                                <Key className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">Your Caregiver Code</h3>
                                <p className="text-blue-100 text-sm">Share this with patients so they can approve you</p>
                            </div>
                        </div>
                        {myCode ? (
                            <div className="flex items-center gap-3">
                                <code className="bg-white/20 px-5 py-3 rounded-xl font-mono text-xl font-bold tracking-wider border border-white/20">{myCode}</code>
                                <button onClick={copyCode} className="p-3 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition shadow-lg">
                                    {codeCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                </button>
                            </div>
                        ) : (
                            <button onClick={handleGenerateCode} disabled={isGeneratingCode} className="px-5 py-3 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition shadow-lg disabled:opacity-50">
                                {isGeneratingCode ? "Generating..." : "Generate Code"}
                            </button>
                        )}
                    </div>
                </section>

                {/* VIEW: PATIENT LIST */}
                {view === 'list' && (
                    <section>
                        <div className="flex justify-between items-end mb-6">
                            <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2"><Users className="w-6 h-6" /> Your Patients</h2>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Add New Card */}
                            <button onClick={() => setView('add')} className="flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed border-blue-200 rounded-2xl hover:bg-blue-50 hover:border-blue-400 transition group h-64">
                                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Plus className="w-8 h-8 text-blue-600" />
                                </div>
                                <h3 className="font-bold text-zinc-700">Add New Patient</h3>
                            </button>

                            {/* Patient Cards */}
                            {patients.map(patient => (
                                <button key={patient.id} onClick={() => { setSelectedPatient(patient); setView('detail'); }} className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 hover:shadow-lg hover:border-blue-200 transition text-left h-64 flex flex-col items-center justify-center space-y-4">
                                    {renderPatientIcon(patient.gender, "w-20 h-20")}
                                    <div className="text-center">
                                        <h3 className="text-xl font-bold text-zinc-900">{patient.name}</h3>
                                        <p className="text-zinc-500 text-sm">Tap to manage care</p>
                                    </div>
                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">Active</span>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* VIEW: ADD PATIENT */}
                {view === 'add' && (
                    <section className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8">
                        <button onClick={() => { setView('list'); setInviteCode(""); setFoundPatient(null); setError(""); }} className="text-sm text-zinc-500 hover:text-blue-600 flex items-center gap-1 mb-6">
                            <ArrowLeft className="w-4 h-4" /> Back to List
                        </button>

                        <div className="mb-6">
                            <h2 className="text-2xl font-semibold text-zinc-900 flex items-center gap-2"><LinkIcon className="w-7 h-7 text-blue-600" /> Link a New Patient</h2>
                            <p className="text-zinc-500 mt-1">Enter the patient's invite code to link with them.</p>
                        </div>

                        {/* Two-way linking info */}
                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6">
                            <h3 className="font-semibold text-blue-900 mb-2">Two-Way Verification Required</h3>
                            <p className="text-blue-700 text-sm">For security, the patient must first add your caregiver code (<code className="bg-blue-100 px-1 rounded">{myCode || "generate above"}</code>) to their approved caregivers list.</p>
                        </div>

                        <div className="max-w-xl mx-auto space-y-6">
                            {!foundPatient ? (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-700 mb-2">Patient's Invite Code</label>
                                        <div className="relative">
                                            <LinkIcon className="absolute left-4 top-4 text-zinc-400 w-5 h-5" />
                                            <input type="text" placeholder="e.g. john-1234" value={inviteCode} onChange={(e) => { const val = e.target.value; setInviteCode(val.includes('/invite/') ? val.split('/invite/')[1] : val); setError(""); }} className="w-full rounded-xl border border-zinc-200 pl-12 pr-4 py-4 focus:ring-2 focus:ring-blue-500 focus:outline-none text-lg bg-white" />
                                        </div>
                                    </div>
                                    {error && <p className="text-red-600 text-sm bg-red-50 p-4 rounded-xl">{error}</p>}
                                    <button onClick={verifyInviteCode} disabled={!inviteCode || isSearching} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 shadow-lg">
                                        {isSearching ? "Verifying..." : "Find Patient"}
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-blue-50 p-8 rounded-2xl border border-blue-200 flex flex-col items-center justify-center space-y-6">
                                    {renderPatientIcon(foundPatient.gender, "w-24 h-24")}
                                    <div className="text-center">
                                        <h3 className="text-2xl font-bold text-zinc-800">Found {foundPatient.name}!</h3>
                                        <p className="text-zinc-600">Ready to link to your account.</p>
                                    </div>
                                    {error && <p className="text-red-600 text-sm bg-red-50 p-4 rounded-xl w-full">{error}</p>}
                                    <div className="flex w-full gap-4">
                                        <button onClick={() => { setFoundPatient(null); setError(""); }} className="flex-1 bg-white text-zinc-600 font-medium py-3 rounded-xl border border-zinc-200 hover:bg-zinc-50">Cancel</button>
                                        <button onClick={addPatientToList} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-lg">Confirm Link</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* VIEW: PATIENT DETAIL */}
                {view === 'detail' && selectedPatient && (
                    <section>
                        <button onClick={() => setView('list')} className="text-sm text-zinc-500 hover:text-blue-600 flex items-center gap-1 mb-6">
                            <ArrowLeft className="w-4 h-4" /> Back to All Patients
                        </button>

                        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8">
                            <div className="flex items-center gap-6 mb-8 pb-8 border-b border-zinc-100">
                                {renderPatientIcon(selectedPatient.gender, "w-20 h-20")}
                                <div>
                                    <h2 className="text-3xl font-bold text-zinc-900">{selectedPatient.name}</h2>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold uppercase tracking-wide">Linked Patient</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <button className="flex flex-col items-center justify-center p-8 bg-blue-50 border border-blue-100 rounded-2xl hover:shadow-lg transition group">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                        <Stethoscope className="w-8 h-8 text-blue-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-blue-900">Log Symptoms</h3>
                                    <p className="text-sm text-blue-600/80 mt-1">Record updates for {selectedPatient.name.split(' ')[0]}</p>
                                </button>

                                <button className="flex flex-col items-center justify-center p-8 bg-blue-50 border border-blue-100 rounded-2xl hover:shadow-lg transition group">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                        <Tablets className="w-8 h-8 text-blue-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-blue-900">Manage Schedule</h3>
                                    <p className="text-sm text-blue-600/80 mt-1">Meds & Appointments</p>
                                </button>

                                <button className="flex flex-col items-center justify-center p-8 bg-blue-50 border border-blue-100 rounded-2xl hover:shadow-lg transition group">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                        <Pill className="w-8 h-8 text-blue-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-blue-900">View Medications</h3>
                                    <p className="text-sm text-blue-600/80 mt-1">Current prescriptions</p>
                                </button>

                                <button className="flex flex-col items-center justify-center p-8 bg-blue-50 border border-blue-100 rounded-2xl hover:shadow-lg transition group">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                        <AlertCircle className="w-8 h-8 text-blue-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-blue-900">Emergency Info</h3>
                                    <p className="text-sm text-blue-600/80 mt-1">Contacts & critical details</p>
                                </button>
                            </div>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
