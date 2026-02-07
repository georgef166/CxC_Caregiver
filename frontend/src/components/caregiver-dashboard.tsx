"use client";

import { useState, useEffect } from "react";
import {
    User, Link as LinkIcon, Stethoscope, Plus, Users, ArrowLeft, User as UserIcon,
    Copy, Check, Key, Calendar, Pill, Phone, AlertCircle, Activity, Home,
    Settings, LogOut, Heart, ChevronRight
} from "lucide-react";
import { findPatientByCode, linkPatientToCaregiverTwoWay, getLinkedPatients, generateCaregiverCode } from "@/app/actions";
import { createClient } from "@supabase/supabase-js";
import AIAgent from "@/components/ai-agent";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

type Patient = {
    id: string;
    name: string;
    avatar_url?: string;
    gender: 'male' | 'female' | 'neutral';
};

type Medication = { id: string; name: string; dosage: string; frequency: string; is_current: boolean; notes?: string; };
type Doctor = { id: string; name: string; specialty: string; phone: string; hospital?: string; is_primary: boolean; };
type EmergencyContact = { id: string; name: string; relationship: string; phone: string; email?: string; is_primary: boolean; };
type SymptomLog = { id: string; symptom: string; severity: string; logged_at: string; };

// CareLink Logo Component
function CareLinkLogo() {
    return (
        <div className="flex items-center gap-3 px-4 py-5">
            <img src="/carelinkLogo.jpeg" alt="CareLink" className="w-10 h-10 rounded-lg" />
            <span className="text-xl font-bold italic text-white">CareLink</span>
        </div>
    );
}


export default function CaregiverDashboard({ user }: { user: any }) {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [view, setView] = useState<'list' | 'add' | 'detail'>('list');
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'medications' | 'doctors' | 'emergency'>('overview');

    // Patient data when viewing details
    const [patientMedications, setPatientMedications] = useState<Medication[]>([]);
    const [patientDoctors, setPatientDoctors] = useState<Doctor[]>([]);
    const [patientEmergencyContacts, setPatientEmergencyContacts] = useState<EmergencyContact[]>([]);
    const [patientProfile, setPatientProfile] = useState<any>(null);
    const [recentSymptoms, setRecentSymptoms] = useState<SymptomLog[]>([]);
    const [loadingPatientData, setLoadingPatientData] = useState(false);

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

    const fetchPatientDetails = async (patientId: string) => {
        setLoadingPatientData(true);
        try {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', patientId).single();
            if (profile) setPatientProfile(profile);

            const { data: meds } = await supabase.from('medications').select('*').eq('patient_id', patientId).order('is_current', { ascending: false });
            if (meds) setPatientMedications(meds);

            const { data: docs } = await supabase.from('doctors').select('*').eq('patient_id', patientId).order('is_primary', { ascending: false });
            if (docs) setPatientDoctors(docs);

            const { data: contacts } = await supabase.from('emergency_contacts').select('*').eq('patient_id', patientId).order('is_primary', { ascending: false });
            if (contacts) setPatientEmergencyContacts(contacts);

            const { data: symptoms } = await supabase.from('symptom_logs').select('*').eq('patient_id', patientId).order('logged_at', { ascending: false }).limit(5);
            if (symptoms) setRecentSymptoms(symptoms);
        } catch (err) {
            console.error("Error fetching patient details:", err);
        } finally {
            setLoadingPatientData(false);
        }
    };

    const handleSelectPatient = (patient: Patient) => {
        setSelectedPatient(patient);
        setView('detail');
        setActiveTab('overview');
        fetchPatientDetails(patient.id);
    };

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
        return <div className={`${size} bg-teal-100 text-teal-600 rounded-full flex items-center justify-center border-2 border-white shadow-sm`}><UserIcon className="w-2/3 h-2/3" /></div>;
    };

    const calculateAge = (dob?: string): number => {
        if (!dob) return 0;
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
    };

    const activeMeds = patientMedications.filter(m => m.is_current);

    // Main List/Add View
    if (view !== 'detail') {
        return (
            <div className="min-h-screen bg-slate-50 flex">
                {/* Left Sidebar */}
                <aside className="w-56 bg-teal-700 flex flex-col fixed h-full">
                    <CareLinkLogo />

                    <nav className="flex-1 px-3 py-4">
                        <p className="text-teal-300 text-xs font-medium uppercase tracking-wider px-3 mb-3">Main Menu</p>

                        <button
                            onClick={() => setView('list')}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition ${view === 'list' ? 'bg-teal-600 text-white' : 'text-teal-100 hover:bg-teal-600/50'
                                }`}
                        >
                            <Users className="w-5 h-5" />
                            <span className="font-medium">My Patients</span>
                            {patients.length > 0 && (
                                <span className="ml-auto bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{patients.length}</span>
                            )}
                        </button>

                        <button
                            onClick={() => setView('add')}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition ${view === 'add' ? 'bg-teal-600 text-white' : 'text-teal-100 hover:bg-teal-600/50'
                                }`}
                        >
                            <Plus className="w-5 h-5" />
                            <span className="font-medium">Add Patient</span>
                        </button>
                    </nav>

                    {/* User Section */}
                    <div className="p-4 border-t border-teal-600">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold overflow-hidden">
                                {user.picture ? (
                                    <img src={user.picture} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    user.name?.charAt(0) || 'C'
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-medium text-sm truncate">{user.name}</p>
                                <p className="text-teal-300 text-xs">Caregiver</p>
                            </div>
                        </div>

                        <a href="#" className="flex items-center gap-2 text-teal-200 hover:text-white text-sm py-1.5 transition">
                            <Settings className="w-4 h-4" />
                            Settings
                        </a>
                        <a href="/auth/logout" className="flex items-center gap-2 text-teal-200 hover:text-white text-sm py-1.5 transition">
                            <LogOut className="w-4 h-4" />
                            Logout
                        </a>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 ml-56">
                    {/* Top Header */}
                    <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
                        <div>
                            <p className="text-sm text-gray-500">Caregiver Dashboard</p>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {view === 'list' ? 'My Patients' : 'Add New Patient'}
                            </h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600">{user.name}</span>
                            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded">Caregiver</span>
                            <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden">
                                {user.picture ? (
                                    <img src={user.picture} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-600 font-bold">
                                        {user.name?.charAt(0) || 'C'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>

                    <div className="p-8">
                        {/* Caregiver Code Card */}
                        <div className="bg-teal-600 rounded-xl p-5 mb-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                    <Key className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">Your Caregiver Code</h3>
                                    <p className="text-teal-100 text-sm">Share this with patients so they can approve you</p>
                                </div>
                            </div>
                            {myCode ? (
                                <div className="flex items-center gap-3">
                                    <code className="bg-white/20 px-4 py-2 rounded-lg font-mono text-lg font-bold tracking-wider text-white">{myCode}</code>
                                    <button onClick={copyCode} className="p-2 bg-white text-teal-600 rounded-lg hover:bg-teal-50 transition">
                                        {codeCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                            ) : (
                                <button onClick={handleGenerateCode} disabled={isGeneratingCode} className="px-4 py-2 bg-white text-teal-600 rounded-lg font-bold hover:bg-teal-50 transition disabled:opacity-50">
                                    {isGeneratingCode ? "Generating..." : "Generate Code"}
                                </button>
                            )}
                        </div>

                        {view === 'list' && (
                            <>
                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    <div className="bg-white rounded-xl p-5 border border-gray-100">
                                        <p className="text-3xl font-bold text-gray-900">{patients.length}</p>
                                        <p className="text-gray-500 text-sm">Linked Patients</p>
                                        <span className="inline-block mt-2 text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full">Active</span>
                                    </div>
                                    <div className="bg-white rounded-xl p-5 border border-gray-100">
                                        <p className="text-3xl font-bold text-gray-900">0</p>
                                        <p className="text-gray-500 text-sm">Pending Requests</p>
                                        <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">None</span>
                                    </div>
                                    <div className="bg-white rounded-xl p-5 border border-gray-100">
                                        <p className="text-3xl font-bold text-gray-900">0</p>
                                        <p className="text-gray-500 text-sm">Symptoms Logged Today</p>
                                        <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">All Clear</span>
                                    </div>
                                </div>

                                {/* Patients Grid */}
                                <div className="bg-white rounded-xl border border-gray-100">
                                    <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-gray-900">Your Patients</h3>
                                        <button
                                            onClick={() => setView('add')}
                                            className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm"
                                        >
                                            <Plus className="w-4 h-4" /> Add Patient
                                        </button>
                                    </div>

                                    {patients.length === 0 ? (
                                        <div className="p-12 text-center">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                                                <Users className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <p className="text-gray-500 mb-4">No patients linked yet</p>
                                            <button
                                                onClick={() => setView('add')}
                                                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
                                            >
                                                Add Your First Patient
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-50">
                                            {patients.map(patient => (
                                                <button
                                                    key={patient.id}
                                                    onClick={() => handleSelectPatient(patient)}
                                                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        {renderPatientIcon(patient.gender, "w-12 h-12")}
                                                        <div className="text-left">
                                                            <p className="font-medium text-gray-900">{patient.name}</p>
                                                            <p className="text-sm text-gray-500">Tap to view details</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full">Linked</span>
                                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {view === 'add' && (
                            <div className="bg-white rounded-xl border border-gray-100 max-w-2xl">
                                <div className="p-5 border-b border-gray-100">
                                    <h3 className="text-lg font-bold text-gray-900">Link a New Patient</h3>
                                    <p className="text-sm text-gray-500">Enter the patient's invite code to connect with them.</p>
                                </div>

                                <div className="p-5">
                                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
                                        <h4 className="font-semibold text-teal-800 mb-1">Two-Way Verification Required</h4>
                                        <p className="text-teal-700 text-sm">
                                            The patient must first add your caregiver code (<code className="bg-teal-100 px-1 rounded">{myCode || "generate above"}</code>) to their approved caregivers list.
                                        </p>
                                    </div>

                                    {!foundPatient ? (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Patient's Invite Code</label>
                                                <div className="relative">
                                                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. P-ABC123"
                                                        value={inviteCode}
                                                        onChange={(e) => { const val = e.target.value; setInviteCode(val.includes('/invite/') ? val.split('/invite/')[1] : val); setError(""); }}
                                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                                    />
                                                </div>
                                            </div>
                                            {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
                                            <button
                                                onClick={verifyInviteCode}
                                                disabled={!inviteCode || isSearching}
                                                className="w-full bg-teal-600 text-white font-semibold py-3 rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
                                            >
                                                {isSearching ? "Verifying..." : "Find Patient"}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="bg-teal-50 p-6 rounded-lg border border-teal-200 text-center">
                                            {renderPatientIcon(foundPatient.gender, "w-20 h-20 mx-auto mb-4")}
                                            <h4 className="text-xl font-bold text-gray-900 mb-1">Found {foundPatient.name}!</h4>
                                            <p className="text-gray-600 mb-4">Ready to link to your account.</p>
                                            {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg mb-4">{error}</p>}
                                            <div className="flex gap-3">
                                                <button onClick={() => { setFoundPatient(null); setError(""); }} className="flex-1 bg-white text-gray-700 font-medium py-2 rounded-lg border border-gray-200 hover:bg-gray-50">Cancel</button>
                                                <button onClick={addPatientToList} className="flex-1 bg-teal-600 text-white font-semibold py-2 rounded-lg hover:bg-teal-700">Confirm Link</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </main>


            </div>
        );
    }

    // Patient Detail View
    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Left Sidebar */}
            <aside className="w-56 bg-teal-700 flex flex-col fixed h-full">
                <CareLinkLogo />

                <nav className="flex-1 px-3 py-4">
                    <p className="text-teal-300 text-xs font-medium uppercase tracking-wider px-3 mb-3">Patient Menu</p>

                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition ${activeTab === 'overview' ? 'bg-teal-600 text-white' : 'text-teal-100 hover:bg-teal-600/50'
                            }`}
                    >
                        <Home className="w-5 h-5" />
                        <span className="font-medium">Overview</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('medications')}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg mb-1 transition ${activeTab === 'medications' ? 'bg-teal-600 text-white' : 'text-teal-100 hover:bg-teal-600/50'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <Pill className="w-5 h-5" />
                            <span className="font-medium">Medications</span>
                        </div>
                        {activeMeds.length > 0 && (
                            <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{activeMeds.length}</span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('doctors')}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg mb-1 transition ${activeTab === 'doctors' ? 'bg-teal-600 text-white' : 'text-teal-100 hover:bg-teal-600/50'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <Stethoscope className="w-5 h-5" />
                            <span className="font-medium">Doctors</span>
                        </div>
                        {patientDoctors.length > 0 && (
                            <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{patientDoctors.length}</span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('emergency')}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg mb-1 transition ${activeTab === 'emergency' ? 'bg-teal-600 text-white' : 'text-teal-100 hover:bg-teal-600/50'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <Phone className="w-5 h-5" />
                            <span className="font-medium">Emergency</span>
                        </div>
                        {patientEmergencyContacts.length > 0 && (
                            <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{patientEmergencyContacts.length}</span>
                        )}
                    </button>

                    <div className="border-t border-teal-600 mt-4 pt-4">
                        <button
                            onClick={() => { setView('list'); setSelectedPatient(null); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-teal-100 hover:bg-teal-600/50 transition"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span className="font-medium">Back to Patients</span>
                        </button>
                    </div>
                </nav>

                {/* User Section */}
                <div className="p-4 border-t border-teal-600">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold overflow-hidden">
                            {user.picture ? (
                                <img src={user.picture} alt="" className="w-full h-full object-cover" />
                            ) : (
                                user.name?.charAt(0) || 'C'
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm truncate">{user.name}</p>
                            <p className="text-teal-300 text-xs">Caregiver</p>
                        </div>
                    </div>

                    <a href="#" className="flex items-center gap-2 text-teal-200 hover:text-white text-sm py-1.5 transition">
                        <Settings className="w-4 h-4" />
                        Settings
                    </a>
                    <a href="/auth/logout" className="flex items-center gap-2 text-teal-200 hover:text-white text-sm py-1.5 transition">
                        <LogOut className="w-4 h-4" />
                        Logout
                    </a>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-56">
                {/* Top Header */}
                <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
                    <div>
                        <p className="text-sm text-gray-500">Viewing Patient</p>
                        <h1 className="text-2xl font-bold text-gray-900">{selectedPatient?.name}</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded">Linked</span>
                        {renderPatientIcon(selectedPatient?.gender || 'neutral', "w-10 h-10")}
                    </div>
                </header>

                {loadingPatientData ? (
                    <div className="p-12 text-center">
                        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading patient information...</p>
                    </div>
                ) : (
                    <div className="p-8 flex gap-6">
                        {/* Main Content */}
                        <div className="flex-1 space-y-6">
                            {activeTab === 'overview' && (
                                <>
                                    {/* Stats Cards */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-white rounded-xl p-5 border border-gray-100">
                                            <p className="text-3xl font-bold text-gray-900">{activeMeds.length}</p>
                                            <p className="text-gray-500 text-sm">Active Medications</p>
                                            <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">On track</span>
                                        </div>
                                        <div className="bg-white rounded-xl p-5 border border-gray-100">
                                            <p className="text-3xl font-bold text-gray-900">{patientDoctors.length}</p>
                                            <p className="text-gray-500 text-sm">Healthcare Providers</p>
                                            <span className="inline-block mt-2 text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full">Listed</span>
                                        </div>
                                        <div className="bg-white rounded-xl p-5 border border-gray-100">
                                            <p className="text-3xl font-bold text-gray-900">{patientEmergencyContacts.length}</p>
                                            <p className="text-gray-500 text-sm">Emergency Contacts</p>
                                            <span className="inline-block mt-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Ready</span>
                                        </div>
                                    </div>

                                    {/* Health Summary */}
                                    <div className="bg-white rounded-xl p-6 border border-gray-100">
                                        <h3 className="text-lg font-bold text-gray-900 mb-4">Health Summary</h3>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase">Patient Name</p>
                                                <p className="text-gray-900 font-medium">{patientProfile?.full_name}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase">Age</p>
                                                <p className="text-gray-900 font-medium">{calculateAge(patientProfile?.date_of_birth)} years</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase">Phone</p>
                                                <p className="text-gray-900 font-medium">{patientProfile?.phone || 'Not set'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase">Blood Type</p>
                                                <p className="text-gray-900 font-medium">{patientProfile?.blood_type || 'Unknown'}</p>
                                            </div>
                                        </div>
                                        {patientProfile?.diagnosis_details && (
                                            <div className="border-t border-gray-100 mt-4 pt-4">
                                                <p className="text-xs text-gray-400 uppercase">Primary Diagnosis</p>
                                                <p className="text-gray-900 font-medium">{patientProfile.diagnosis_details}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* AI Agent */}
                                    <AIAgent patientId={selectedPatient!.id} patientName={selectedPatient!.name} />

                                    {/* Recent Symptoms */}
                                    <div className="bg-white rounded-xl border border-gray-100">
                                        <div className="p-5 flex items-center justify-between border-b border-gray-100">
                                            <h3 className="text-lg font-bold text-gray-900">Recent Symptoms</h3>
                                        </div>
                                        <div className="divide-y divide-gray-50">
                                            {recentSymptoms.slice(0, 3).map(symptom => (
                                                <div key={symptom.id} className="p-4 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm text-gray-500">{new Date(symptom.logged_at).toLocaleDateString()}</p>
                                                        <p className="text-gray-900">{symptom.symptom}</p>
                                                    </div>
                                                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${symptom.severity === 'severe' ? 'bg-red-100 text-red-700' :
                                                        symptom.severity === 'moderate' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-green-100 text-green-700'
                                                        }`}>{symptom.severity}</span>
                                                </div>
                                            ))}
                                            {recentSymptoms.length === 0 && (
                                                <div className="p-6 text-center text-gray-400">No symptoms logged yet</div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'medications' && (
                                <div className="bg-white rounded-xl border border-gray-100">
                                    <div className="p-5 border-b border-gray-100">
                                        <h3 className="text-lg font-bold text-gray-900">Medications</h3>
                                    </div>
                                    <div className="divide-y divide-gray-50">
                                        {patientMedications.map(med => (
                                            <div key={med.id} className="p-4 flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium text-gray-900">{med.name}</p>
                                                    <p className="text-sm text-gray-500">{med.dosage} • {med.frequency}</p>
                                                    {med.notes && <p className="text-xs text-gray-400 mt-1">{med.notes}</p>}
                                                </div>
                                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${med.is_current ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {med.is_current ? 'Active' : 'Past'}
                                                </span>
                                            </div>
                                        ))}
                                        {patientMedications.length === 0 && (
                                            <div className="p-6 text-center text-gray-400">No medications recorded</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'doctors' && (
                                <div className="bg-white rounded-xl border border-gray-100">
                                    <div className="p-5 border-b border-gray-100">
                                        <h3 className="text-lg font-bold text-gray-900">Healthcare Providers</h3>
                                    </div>
                                    <div className="divide-y divide-gray-50">
                                        {patientDoctors.map(doc => (
                                            <div key={doc.id} className="p-4 flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium text-gray-900">{doc.name}</p>
                                                    <p className="text-sm text-gray-500">{doc.specialty}{doc.hospital && ` • ${doc.hospital}`}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {doc.is_primary && <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full">Primary</span>}
                                                    {doc.phone && (
                                                        <a href={`tel:${doc.phone}`} className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition text-sm font-medium">
                                                            <Phone className="w-4 h-4" /> Call
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {patientDoctors.length === 0 && (
                                            <div className="p-6 text-center text-gray-400">No providers recorded</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'emergency' && (
                                <div className="bg-white rounded-xl border border-gray-100">
                                    <div className="p-5 border-b border-gray-100">
                                        <h3 className="text-lg font-bold text-gray-900">Emergency Contacts</h3>
                                    </div>
                                    <div className="divide-y divide-gray-50">
                                        {patientEmergencyContacts.map(contact => (
                                            <div key={contact.id} className="p-4 flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium text-gray-900">{contact.name}</p>
                                                    <p className="text-sm text-gray-500">{contact.relationship}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {contact.is_primary && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Primary</span>}
                                                    <a href={`tel:${contact.phone}`} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium">
                                                        <Phone className="w-4 h-4" /> {contact.phone}
                                                    </a>
                                                </div>
                                            </div>
                                        ))}
                                        {patientEmergencyContacts.length === 0 && (
                                            <div className="p-6 text-center text-gray-400">No emergency contacts recorded</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Sidebar */}
                        {activeTab === 'overview' && (
                            <div className="w-72 space-y-6">
                                {/* Latest Vitals */}
                                <div className="bg-white rounded-xl border border-gray-100 p-5">
                                    <h4 className="font-bold text-gray-900 mb-4">Latest Vitals</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 text-sm">Blood Pressure</span>
                                            <span className="font-medium text-gray-900">125/80</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 text-sm">Heart Rate</span>
                                            <span className="font-medium text-gray-900">70 bpm</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 text-sm">Temperature</span>
                                            <span className="font-medium text-gray-900">36.6°C</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 text-sm">O2 Saturation</span>
                                            <span className="font-medium text-gray-900">99%</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-4">Last updated: {new Date().toLocaleDateString()}</p>
                                </div>

                                {/* Quick Actions */}
                                <div className="bg-white rounded-xl border border-gray-100 p-5">
                                    <h4 className="font-bold text-gray-900 mb-4">Quick Actions</h4>
                                    <div className="space-y-2">
                                        <button className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm font-medium text-gray-700">
                                            📝 Log Symptom
                                        </button>
                                        <button className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm font-medium text-gray-700">
                                            📋 Generate Report
                                        </button>
                                        <button className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm font-medium text-gray-700">
                                            🤖 AI Insights
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>


        </div>
    );
}
