"use client";

import { useState, useEffect } from "react";
import {
    CopyIcon, CheckIcon, User as UserIcon, Calendar, Activity, Edit2, Save,
    Plus, Trash2, Shield, Pill, Stethoscope, Phone, X, AlertCircle, Home,
    Settings, LogOut, ChevronRight, Heart
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { updatePatientProfile } from "@/app/actions";

type Auth0User = {
    name?: string;
    sub?: string;
    email?: string;
    picture?: string;
    [key: string]: any;
};

type Profile = {
    id: string;
    full_name: string;
    bio: string;
    diagnosis_year: number;
    invite_code: string;
    avatar_url: string;
    phone?: string;
    address?: string;
    diagnosis_details?: string;
    date_of_birth?: string;
    blood_type?: string;
};

type AllowedCaregiver = { id: string; caregiver_code: string; nickname: string; };
type Medication = { id: string; name: string; dosage: string; frequency: string; is_current: boolean; notes?: string; };
type Doctor = { id: string; name: string; specialty: string; phone: string; hospital?: string; is_primary: boolean; notes?: string; };
type EmergencyContact = { id: string; name: string; relationship: string; phone: string; email?: string; is_primary: boolean; };
type SymptomLog = { id: string; symptom: string; severity: string; logged_at: string; };

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

// CareLink Logo Component
function CareLinkLogo({ collapsed = false }: { collapsed?: boolean }) {
    return (
        <div className="flex items-center gap-3 px-4 py-5">
            <img src="/carelinkLogo.jpeg" alt="CareLink" className="w-10 h-10 rounded-lg" />
            {!collapsed && <span className="text-xl font-bold italic text-white">CareLink</span>}
        </div>
    );
}


// Modal Component
function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition"><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}

export default function PatientDashboard({ user }: { user: Auth0User }) {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'caregivers' | 'medications' | 'doctors' | 'emergency'>('overview');

    const [allowedCaregivers, setAllowedCaregivers] = useState<AllowedCaregiver[]>([]);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
    const [recentSymptoms, setRecentSymptoms] = useState<SymptomLog[]>([]);

    const [medicationModal, setMedicationModal] = useState<{ isOpen: boolean; editing: Medication | null }>({ isOpen: false, editing: null });
    const [doctorModal, setDoctorModal] = useState<{ isOpen: boolean; editing: Doctor | null }>({ isOpen: false, editing: null });
    const [emergencyModal, setEmergencyModal] = useState<{ isOpen: boolean; editing: EmergencyContact | null }>({ isOpen: false, editing: null });

    const [newCaregiverCode, setNewCaregiverCode] = useState("");
    const [newCaregiverNickname, setNewCaregiverNickname] = useState("");
    const [addingCaregiver, setAddingCaregiver] = useState(false);

    useEffect(() => { fetchProfile(); fetchRelatedData(); }, [user.sub]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const { data } = await supabase.from('profiles').select('*').eq('auth0_id', user.sub).single();
            if (data) setProfile(data);
        } catch (error) { console.error("Error fetching profile:", error); }
        finally { setLoading(false); }
    };

    const fetchRelatedData = async () => {
        if (!user.sub) return;
        const { data: profileData } = await supabase.from('profiles').select('id').eq('auth0_id', user.sub).single();
        if (!profileData) return;

        const { data: caregivers } = await supabase.from('allowed_caregivers').select('*').eq('patient_id', profileData.id);
        if (caregivers) setAllowedCaregivers(caregivers);

        const { data: meds } = await supabase.from('medications').select('*').eq('patient_id', profileData.id).order('is_current', { ascending: false });
        if (meds) setMedications(meds);

        const { data: docs } = await supabase.from('doctors').select('*').eq('patient_id', profileData.id).order('is_primary', { ascending: false });
        if (docs) setDoctors(docs);

        const { data: contacts } = await supabase.from('emergency_contacts').select('*').eq('patient_id', profileData.id).order('is_primary', { ascending: false });
        if (contacts) setEmergencyContacts(contacts);

        const { data: symptoms } = await supabase.from('symptom_logs').select('*').eq('patient_id', profileData.id).order('logged_at', { ascending: false }).limit(5);
        if (symptoms) setRecentSymptoms(symptoms);
    };

    const copyCode = () => {
        if (profile?.invite_code) {
            navigator.clipboard.writeText(profile.invite_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const addCaregiver = async () => {
        if (!profile?.id || !newCaregiverCode.trim()) return;
        setAddingCaregiver(true);
        const { data, error } = await supabase.from('allowed_caregivers').insert({
            patient_id: profile.id,
            caregiver_code: newCaregiverCode.trim().toUpperCase(),
            nickname: newCaregiverNickname.trim() || "Caregiver"
        }).select().single();
        if (data) setAllowedCaregivers(prev => [...prev, data]);
        setNewCaregiverCode("");
        setNewCaregiverNickname("");
        setAddingCaregiver(false);
    };

    const removeCaregiver = async (id: string) => {
        await supabase.from('allowed_caregivers').delete().eq('id', id);
        setAllowedCaregivers(prev => prev.filter(c => c.id !== id));
    };

    // Medication handlers
    const saveMedication = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const medData = {
            patient_id: profile?.id,
            name: form.get('name') as string,
            dosage: form.get('dosage') as string,
            frequency: form.get('frequency') as string,
            is_current: form.get('is_current') === 'on',
            notes: form.get('notes') as string
        };
        if (medicationModal.editing) {
            await supabase.from('medications').update(medData).eq('id', medicationModal.editing.id);
        } else {
            await supabase.from('medications').insert(medData);
        }
        setMedicationModal({ isOpen: false, editing: null });
        fetchRelatedData();
    };

    const deleteMedication = async (id: string) => {
        await supabase.from('medications').delete().eq('id', id);
        fetchRelatedData();
    };

    // Doctor handlers
    const saveDoctor = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const docData = {
            patient_id: profile?.id,
            name: form.get('name') as string,
            specialty: form.get('specialty') as string,
            phone: form.get('phone') as string,
            hospital: form.get('hospital') as string,
            is_primary: form.get('is_primary') === 'on',
            notes: form.get('notes') as string
        };
        if (doctorModal.editing) {
            await supabase.from('doctors').update(docData).eq('id', doctorModal.editing.id);
        } else {
            await supabase.from('doctors').insert(docData);
        }
        setDoctorModal({ isOpen: false, editing: null });
        fetchRelatedData();
    };

    const deleteDoctor = async (id: string) => {
        await supabase.from('doctors').delete().eq('id', id);
        fetchRelatedData();
    };

    // Emergency contact handlers
    const saveEmergencyContact = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const contactData = {
            patient_id: profile?.id,
            name: form.get('name') as string,
            relationship: form.get('relationship') as string,
            phone: form.get('phone') as string,
            email: form.get('email') as string,
            is_primary: form.get('is_primary') === 'on'
        };
        if (emergencyModal.editing) {
            await supabase.from('emergency_contacts').update(contactData).eq('id', emergencyModal.editing.id);
        } else {
            await supabase.from('emergency_contacts').insert(contactData);
        }
        setEmergencyModal({ isOpen: false, editing: null });
        fetchRelatedData();
    };

    const deleteEmergencyContact = async (id: string) => {
        await supabase.from('emergency_contacts').delete().eq('id', id);
        fetchRelatedData();
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

    const activeMeds = medications.filter(m => m.is_current);
    const patientId = profile?.invite_code?.replace('P-', 'PT') || 'PT0001';

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Left Sidebar */}
            <aside className="w-56 bg-teal-700 flex flex-col fixed h-full">
                <CareLinkLogo />

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4">
                    <p className="text-teal-300 text-xs font-medium uppercase tracking-wider px-3 mb-3">Main Menu</p>

                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition ${activeTab === 'overview' ? 'bg-teal-600 text-white' : 'text-teal-100 hover:bg-teal-600/50'
                            }`}
                    >
                        <Home className="w-5 h-5" />
                        <span className="font-medium">Overview</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('caregivers')}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg mb-1 transition ${activeTab === 'caregivers' ? 'bg-teal-600 text-white' : 'text-teal-100 hover:bg-teal-600/50'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <Heart className="w-5 h-5" />
                            <span className="font-medium">Caregivers</span>
                        </div>
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
                        {doctors.length > 0 && (
                            <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{doctors.length}</span>
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
                        {emergencyContacts.length > 0 && (
                            <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{emergencyContacts.length}</span>
                        )}
                    </button>
                </nav>

                {/* User Section */}
                <div className="p-4 border-t border-teal-600">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold">
                            {profile?.full_name?.charAt(0) || 'P'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm truncate">{profile?.full_name || user.name}</p>
                            <p className="text-teal-300 text-xs">{patientId}</p>
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
                        <p className="text-sm text-gray-500">Patient Dashboard</p>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {activeTab === 'overview' && 'Overview'}
                            {activeTab === 'caregivers' && 'Caregivers'}
                            {activeTab === 'medications' && 'Medications'}
                            {activeTab === 'doctors' && 'Doctors'}
                            {activeTab === 'emergency' && 'Emergency Contacts'}
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">{profile?.full_name || user.name}</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Patient</span>
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold">
                            {profile?.full_name?.charAt(0) || 'P'}
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="p-8 flex gap-6">
                    {/* Main Content Section */}
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
                                        <p className="text-3xl font-bold text-gray-900">2</p>
                                        <p className="text-gray-500 text-sm">Upcoming Appointments</p>
                                        <span className="inline-block mt-2 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Scheduled</span>
                                    </div>
                                    <div className="bg-white rounded-xl p-5 border border-gray-100">
                                        <p className="text-3xl font-bold text-gray-900">{allowedCaregivers.length}</p>
                                        <p className="text-gray-500 text-sm">Active Caregivers</p>
                                        <span className="inline-block mt-2 text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full">Connected</span>
                                    </div>
                                </div>

                                {/* Health Summary */}
                                <div className="bg-white rounded-xl p-6 border border-gray-100">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Health Summary</h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase">Patient Name</p>
                                            <p className="text-gray-900 font-medium">{profile?.full_name}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase">Age</p>
                                            <p className="text-gray-900 font-medium">{calculateAge(profile?.date_of_birth)} years</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase">Patient ID</p>
                                            <p className="text-gray-900 font-medium">{patientId}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase">Blood Type</p>
                                            <p className="text-gray-900 font-medium">{profile?.blood_type || 'A+'}</p>
                                        </div>
                                    </div>
                                    <div className="border-t border-gray-100 mt-4 pt-4">
                                        <p className="text-xs text-gray-400 uppercase">Primary Diagnosis</p>
                                        <p className="text-gray-900 font-medium">{profile?.diagnosis_details || 'Type 2 Diabetes'}</p>
                                    </div>
                                    <div className="border-t border-gray-100 mt-4 pt-4">
                                        <p className="text-xs text-gray-400 uppercase">Last Updated</p>
                                        <p className="text-gray-500 text-sm">{new Date().toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Active Medications */}
                                <div className="bg-white rounded-xl border border-gray-100">
                                    <div className="p-5 flex items-center justify-between border-b border-gray-100">
                                        <h3 className="text-lg font-bold text-gray-900">Active Medications</h3>
                                        <button onClick={() => setActiveTab('medications')} className="text-teal-600 text-sm font-medium hover:underline">View All</button>
                                    </div>
                                    <div className="divide-y divide-gray-50">
                                        {activeMeds.slice(0, 3).map(med => (
                                            <div key={med.id} className="p-4 flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium text-gray-900">{med.name}</p>
                                                    <p className="text-sm text-gray-500">{med.dosage} • {med.frequency}</p>
                                                </div>
                                                <span className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">Active</span>
                                            </div>
                                        ))}
                                        {activeMeds.length === 0 && (
                                            <div className="p-6 text-center text-gray-400">No medications added yet</div>
                                        )}
                                    </div>
                                </div>

                                {/* Recent Symptoms */}
                                <div className="bg-white rounded-xl border border-gray-100">
                                    <div className="p-5 flex items-center justify-between border-b border-gray-100">
                                        <h3 className="text-lg font-bold text-gray-900">Recent Symptoms</h3>
                                        <button className="text-teal-600 text-sm font-medium hover:underline">View All</button>
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

                        {activeTab === 'caregivers' && (
                            <div className="bg-white rounded-xl border border-gray-100">
                                <div className="p-5 border-b border-gray-100">
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">Approved Caregivers</h3>
                                    <p className="text-sm text-gray-500">Share your invite code with caregivers so they can connect with you.</p>
                                </div>

                                {/* Invite Code */}
                                <div className="p-5 bg-teal-50 border-b border-gray-100">
                                    <p className="text-sm text-gray-600 mb-2">Your Invite Code</p>
                                    <div className="flex items-center gap-3">
                                        <code className="text-2xl font-mono font-bold text-teal-700 tracking-wider">{profile?.invite_code}</code>
                                        <button onClick={copyCode} className="p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition">
                                            {copied ? <CheckIcon className="w-5 h-5" /> : <CopyIcon className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Add Caregiver */}
                                <div className="p-5 border-b border-gray-100">
                                    <p className="text-sm font-medium text-gray-700 mb-3">Add a Caregiver by Code</p>
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            value={newCaregiverCode}
                                            onChange={(e) => setNewCaregiverCode(e.target.value)}
                                            placeholder="Caregiver code (e.g., C-ABC123)"
                                            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                        />
                                        <input
                                            type="text"
                                            value={newCaregiverNickname}
                                            onChange={(e) => setNewCaregiverNickname(e.target.value)}
                                            placeholder="Nickname"
                                            className="w-32 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                        />
                                        <button
                                            onClick={addCaregiver}
                                            disabled={addingCaregiver || !newCaregiverCode.trim()}
                                            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition"
                                        >
                                            {addingCaregiver ? 'Adding...' : 'Add'}
                                        </button>
                                    </div>
                                </div>

                                {/* Caregiver List */}
                                <div className="divide-y divide-gray-50">
                                    {allowedCaregivers.map(cg => (
                                        <div key={cg.id} className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center font-bold">
                                                    {cg.nickname.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{cg.nickname}</p>
                                                    <p className="text-sm text-gray-500">{cg.caregiver_code}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => removeCaregiver(cg.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {allowedCaregivers.length === 0 && (
                                        <div className="p-6 text-center text-gray-400">No caregivers added yet</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'medications' && (
                            <div className="bg-white rounded-xl border border-gray-100">
                                <div className="p-5 flex items-center justify-between border-b border-gray-100">
                                    <h3 className="text-lg font-bold text-gray-900">All Medications</h3>
                                    <button
                                        onClick={() => setMedicationModal({ isOpen: true, editing: null })}
                                        className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
                                    >
                                        <Plus className="w-4 h-4" /> Add Medication
                                    </button>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {medications.map(med => (
                                        <div key={med.id} className="p-4 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900">{med.name}</p>
                                                <p className="text-sm text-gray-500">{med.dosage} • {med.frequency}</p>
                                                {med.notes && <p className="text-xs text-gray-400 mt-1">{med.notes}</p>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${med.is_current ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {med.is_current ? 'Active' : 'Past'}
                                                </span>
                                                <button onClick={() => setMedicationModal({ isOpen: true, editing: med })} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => deleteMedication(med.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {medications.length === 0 && (
                                        <div className="p-6 text-center text-gray-400">No medications added yet</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'doctors' && (
                            <div className="bg-white rounded-xl border border-gray-100">
                                <div className="p-5 flex items-center justify-between border-b border-gray-100">
                                    <h3 className="text-lg font-bold text-gray-900">Healthcare Providers</h3>
                                    <button
                                        onClick={() => setDoctorModal({ isOpen: true, editing: null })}
                                        className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
                                    >
                                        <Plus className="w-4 h-4" /> Add Doctor
                                    </button>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {doctors.map(doc => (
                                        <div key={doc.id} className="p-4 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900">{doc.name}</p>
                                                <p className="text-sm text-gray-500">{doc.specialty} {doc.hospital && `• ${doc.hospital}`}</p>
                                                <p className="text-sm text-gray-400">{doc.phone}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {doc.is_primary && <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full">Primary</span>}
                                                <button onClick={() => setDoctorModal({ isOpen: true, editing: doc })} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => deleteDoctor(doc.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {doctors.length === 0 && (
                                        <div className="p-6 text-center text-gray-400">No doctors added yet</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'emergency' && (
                            <div className="bg-white rounded-xl border border-gray-100">
                                <div className="p-5 flex items-center justify-between border-b border-gray-100">
                                    <h3 className="text-lg font-bold text-gray-900">Emergency Contacts</h3>
                                    <button
                                        onClick={() => setEmergencyModal({ isOpen: true, editing: null })}
                                        className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
                                    >
                                        <Plus className="w-4 h-4" /> Add Contact
                                    </button>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {emergencyContacts.map(contact => (
                                        <div key={contact.id} className="p-4 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900">{contact.name}</p>
                                                <p className="text-sm text-gray-500">{contact.relationship}</p>
                                                <p className="text-sm text-gray-400">{contact.phone}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {contact.is_primary && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Primary</span>}
                                                <button onClick={() => setEmergencyModal({ isOpen: true, editing: contact })} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => deleteEmergencyContact(contact.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {emergencyContacts.length === 0 && (
                                        <div className="p-6 text-center text-gray-400">No emergency contacts added yet</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Sidebar */}
                    {activeTab === 'overview' && (
                        <div className="w-72 space-y-6">
                            {/* Quick Actions */}
                            <div className="bg-white rounded-xl border border-gray-100 p-5">
                                <h4 className="font-bold text-gray-900 mb-4">Quick Actions</h4>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => setActiveTab('caregivers')}
                                        className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm font-medium text-gray-700"
                                    >
                                        Add Caregiver
                                    </button>
                                    <button
                                        onClick={() => setDoctorModal({ isOpen: true, editing: null })}
                                        className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm font-medium text-gray-700"
                                    >
                                        Add Doctor
                                    </button>
                                    <button
                                        onClick={() => setMedicationModal({ isOpen: true, editing: null })}
                                        className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm font-medium text-gray-700"
                                    >
                                        Add Medication
                                    </button>
                                </div>
                            </div>

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
                                <p className="text-xs text-gray-400 mt-4">Last updated: 2/6/2025</p>
                            </div>

                            {/* Upcoming */}
                            <div className="bg-white rounded-xl border border-gray-100 p-5">
                                <h4 className="font-bold text-gray-900 mb-4">Upcoming</h4>
                                <div className="space-y-4">
                                    <div>
                                        <p className="font-medium text-gray-900 text-sm">Follow-up Consultation</p>
                                        <p className="text-xs text-gray-500">2025-02-15</p>
                                        <p className="text-xs text-gray-400">10:00 AM</p>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 text-sm">Cardiology Assessment</p>
                                        <p className="text-xs text-gray-500">2025-03-01</p>
                                        <p className="text-xs text-gray-400">2:30 PM</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Medication Modal */}
            <Modal
                isOpen={medicationModal.isOpen}
                onClose={() => setMedicationModal({ isOpen: false, editing: null })}
                title={medicationModal.editing ? "Edit Medication" : "Add Medication"}
            >
                <form onSubmit={saveMedication} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input name="name" defaultValue={medicationModal.editing?.name} required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
                        <input name="dosage" defaultValue={medicationModal.editing?.dosage} required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                        <input name="frequency" defaultValue={medicationModal.editing?.frequency} required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea name="notes" defaultValue={medicationModal.editing?.notes} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500" rows={2}></textarea>
                    </div>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" name="is_current" defaultChecked={medicationModal.editing?.is_current ?? true} className="rounded" />
                        <span className="text-sm text-gray-700">Currently taking</span>
                    </label>
                    <button type="submit" className="w-full py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-medium">
                        {medicationModal.editing ? 'Update' : 'Add'} Medication
                    </button>
                </form>
            </Modal>

            {/* Doctor Modal */}
            <Modal
                isOpen={doctorModal.isOpen}
                onClose={() => setDoctorModal({ isOpen: false, editing: null })}
                title={doctorModal.editing ? "Edit Doctor" : "Add Doctor"}
            >
                <form onSubmit={saveDoctor} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input name="name" defaultValue={doctorModal.editing?.name} required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                        <input name="specialty" defaultValue={doctorModal.editing?.specialty} required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input name="phone" defaultValue={doctorModal.editing?.phone} required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hospital</label>
                        <input name="hospital" defaultValue={doctorModal.editing?.hospital} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea name="notes" defaultValue={doctorModal.editing?.notes} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500" rows={2}></textarea>
                    </div>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" name="is_primary" defaultChecked={doctorModal.editing?.is_primary} className="rounded" />
                        <span className="text-sm text-gray-700">Primary doctor</span>
                    </label>
                    <button type="submit" className="w-full py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-medium">
                        {doctorModal.editing ? 'Update' : 'Add'} Doctor
                    </button>
                </form>
            </Modal>

            {/* Emergency Contact Modal */}
            <Modal
                isOpen={emergencyModal.isOpen}
                onClose={() => setEmergencyModal({ isOpen: false, editing: null })}
                title={emergencyModal.editing ? "Edit Emergency Contact" : "Add Emergency Contact"}
            >
                <form onSubmit={saveEmergencyContact} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input name="name" defaultValue={emergencyModal.editing?.name} required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                        <input name="relationship" defaultValue={emergencyModal.editing?.relationship} required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input name="phone" defaultValue={emergencyModal.editing?.phone} required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input name="email" type="email" defaultValue={emergencyModal.editing?.email} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" name="is_primary" defaultChecked={emergencyModal.editing?.is_primary} className="rounded" />
                        <span className="text-sm text-gray-700">Primary contact</span>
                    </label>
                    <button type="submit" className="w-full py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-medium">
                        {emergencyModal.editing ? 'Update' : 'Add'} Contact
                    </button>
                </form>
            </Modal>


        </div>
    );
}
