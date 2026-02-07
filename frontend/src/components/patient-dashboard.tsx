"use client";

import { useState, useEffect } from "react";
import {
    CopyIcon, CheckIcon, User as UserIcon, Calendar, Activity, Edit2, Save,
    Plus, Trash2, Shield, Pill, Stethoscope, Phone, X, AlertCircle, Home
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
};

type AllowedCaregiver = { id: string; caregiver_code: string; nickname: string; };
type Medication = { id: string; name: string; dosage: string; frequency: string; is_current: boolean; notes?: string; };
type Doctor = { id: string; name: string; specialty: string; phone: string; hospital?: string; is_primary: boolean; notes?: string; };
type EmergencyContact = { id: string; name: string; relationship: string; phone: string; email?: string; is_primary: boolean; };

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-zinc-200">
                <div className="flex items-center justify-between p-6 border-b border-zinc-100 bg-blue-50">
                    <h2 className="text-xl font-bold text-zinc-900">{title}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-lg transition"><X className="w-5 h-5 text-zinc-500" /></button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

export default function PatientDashboard({ user }: { user: Auth0User }) {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'caregivers' | 'medications' | 'doctors' | 'emergency'>('overview');

    const [allowedCaregivers, setAllowedCaregivers] = useState<AllowedCaregiver[]>([]);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);

    const [medicationModal, setMedicationModal] = useState<{ isOpen: boolean; editing: Medication | null }>({ isOpen: false, editing: null });
    const [doctorModal, setDoctorModal] = useState<{ isOpen: boolean; editing: Doctor | null }>({ isOpen: false, editing: null });
    const [emergencyModal, setEmergencyModal] = useState<{ isOpen: boolean; editing: EmergencyContact | null }>({ isOpen: false, editing: null });

    const [newCaregiverCode, setNewCaregiverCode] = useState("");
    const [newCaregiverNickname, setNewCaregiverNickname] = useState("");
    const [addingCaregiver, setAddingCaregiver] = useState(false);

    const [formData, setFormData] = useState({ full_name: "", bio: "", diagnosis_year: 0, phone: "", address: "", diagnosis_details: "", date_of_birth: "" });

    useEffect(() => { fetchProfile(); fetchRelatedData(); }, [user.sub]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const { data } = await supabase.from('profiles').select('*').eq('auth0_id', user.sub).single();
            if (data) {
                setProfile(data);
                setFormData({ full_name: data.full_name || user.name || "", bio: data.bio || "", diagnosis_year: data.diagnosis_year || 0, phone: data.phone || "", address: data.address || "", diagnosis_details: data.diagnosis_details || "", date_of_birth: data.date_of_birth || "" });
            }
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
    };

    const generateInviteCode = async () => {
        if (!profile) return;
        const namePart = (formData.full_name || "patient").split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
        const newCode = `${namePart}-${Math.floor(1000 + Math.random() * 9000)}`;
        const result = await updatePatientProfile({ user: { sub: user.sub, email: user.email }, data: { invite_code: newCode } });
        if (result.success) setProfile({ ...profile, invite_code: newCode });
        else alert(`Error: ${result.error}`);
    };

    const saveProfile = async () => {
        if (!profile) return;
        const result = await updatePatientProfile({ user: { sub: user.sub, email: user.email }, data: formData });
        if (result.success) { setProfile({ ...profile, ...formData }); setIsEditing(false); }
        else alert(`Error: ${result.error}`);
    };

    const saveMedication = async (med: Partial<Medication>) => {
        if (!profile) return;
        if (med.id) {
            await supabase.from('medications').update(med).eq('id', med.id);
            setMedications(medications.map(m => m.id === med.id ? { ...m, ...med } as Medication : m));
        } else {
            const { data } = await supabase.from('medications').insert({ ...med, patient_id: profile.id }).select().single();
            if (data) setMedications([...medications, data]);
        }
        setMedicationModal({ isOpen: false, editing: null });
    };
    const deleteMedication = async (id: string) => { if (confirm("Delete this medication?")) { await supabase.from('medications').delete().eq('id', id); setMedications(medications.filter(m => m.id !== id)); } };

    const saveDoctor = async (doc: Partial<Doctor>) => {
        if (!profile) return;
        if (doc.id) { await supabase.from('doctors').update(doc).eq('id', doc.id); setDoctors(doctors.map(d => d.id === doc.id ? { ...d, ...doc } as Doctor : d)); }
        else { const { data } = await supabase.from('doctors').insert({ ...doc, patient_id: profile.id }).select().single(); if (data) setDoctors([...doctors, data]); }
        setDoctorModal({ isOpen: false, editing: null });
    };
    const deleteDoctor = async (id: string) => { if (confirm("Delete this provider?")) { await supabase.from('doctors').delete().eq('id', id); setDoctors(doctors.filter(d => d.id !== id)); } };

    const saveEmergencyContact = async (c: Partial<EmergencyContact>) => {
        if (!profile) return;
        if (c.id) { await supabase.from('emergency_contacts').update(c).eq('id', c.id); setEmergencyContacts(emergencyContacts.map(x => x.id === c.id ? { ...x, ...c } as EmergencyContact : x)); }
        else { const { data } = await supabase.from('emergency_contacts').insert({ ...c, patient_id: profile.id }).select().single(); if (data) setEmergencyContacts([...emergencyContacts, data]); }
        setEmergencyModal({ isOpen: false, editing: null });
    };
    const deleteEmergencyContact = async (id: string) => { if (confirm("Delete this contact?")) { await supabase.from('emergency_contacts').delete().eq('id', id); setEmergencyContacts(emergencyContacts.filter(c => c.id !== id)); } };

    const addAllowedCaregiver = async () => {
        if (!profile || !newCaregiverCode.trim()) return;
        setAddingCaregiver(true);
        try {
            const { data, error } = await supabase.from('allowed_caregivers').insert({ patient_id: profile.id, caregiver_code: newCaregiverCode.trim().toLowerCase(), nickname: newCaregiverNickname.trim() || "Caregiver" }).select().single();
            if (data) { setAllowedCaregivers([...allowedCaregivers, data]); setNewCaregiverCode(""); setNewCaregiverNickname(""); }
            if (error) throw error;
        } catch (err: any) { alert(`Error: ${err.message}`); }
        finally { setAddingCaregiver(false); }
    };
    const removeAllowedCaregiver = async (id: string) => { if (confirm("Remove?")) { await supabase.from('allowed_caregivers').delete().eq('id', id); setAllowedCaregivers(allowedCaregivers.filter(c => c.id !== id)); } };

    const copyToClipboard = () => { if (profile?.invite_code) { navigator.clipboard.writeText(profile.invite_code); setCopied(true); setTimeout(() => setCopied(false), 2000); } };

    if (loading) return <div className="min-h-screen bg-blue-50 flex items-center justify-center"><p className="text-zinc-500">Loading your profile...</p></div>;

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
                        <span className="text-zinc-500 font-medium">Patient Dashboard</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <img src={user.picture} alt="Profile" className="w-9 h-9 rounded-full border-2 border-white shadow-sm" />
                            <span className="font-medium text-zinc-700 hidden md:block">{profile?.full_name || user.name}</span>
                        </div>
                        <a href="/auth/logout" className="px-4 py-2 text-zinc-600 hover:text-zinc-900 font-medium rounded-lg hover:bg-zinc-100 transition">Log Out</a>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
                {/* Tab Navigation */}
                <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-zinc-200 overflow-x-auto shadow-sm">
                    {[
                        { id: 'overview', label: 'Overview', icon: Activity },
                        { id: 'caregivers', label: 'Caregivers', icon: Shield },
                        { id: 'medications', label: 'Medications', icon: Pill },
                        { id: 'doctors', label: 'Doctors', icon: Stethoscope },
                        { id: 'emergency', label: 'Emergency', icon: AlertCircle },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-3 px-4 rounded-xl font-medium transition flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'}`}>
                            <tab.icon className="w-4 h-4" />
                            <span className="hidden md:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="grid lg:grid-cols-3 gap-8">
                        <div className="space-y-6">
                            {/* Invite Code Card */}
                            <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg">
                                <h3 className="text-blue-100 font-medium mb-1 flex items-center gap-2"><Activity className="w-4 h-4" /> Your Connection Code</h3>
                                <p className="text-sm text-blue-200 mb-6">Share this code with caregivers.</p>
                                {!profile?.invite_code ? (
                                    <button onClick={generateInviteCode} className="w-full py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition shadow-lg">Generate My Code</button>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="bg-white/20 rounded-xl p-4 text-center border border-white/20"><span className="text-2xl font-mono font-bold tracking-widest">{profile.invite_code}</span></div>
                                        <button onClick={copyToClipboard} className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg font-medium flex items-center justify-center gap-2 transition">{copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}{copied ? "Copied!" : "Copy Code"}</button>
                                    </div>
                                )}
                            </div>
                            {/* Quick Stats */}
                            <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
                                <h3 className="font-bold text-zinc-900 mb-4">Quick Stats</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between"><span className="text-zinc-500">Approved Caregivers</span><span className="font-bold text-zinc-900">{allowedCaregivers.length}</span></div>
                                    <div className="flex justify-between"><span className="text-zinc-500">Active Medications</span><span className="font-bold text-zinc-900">{medications.filter(m => m.is_current).length}</span></div>
                                    <div className="flex justify-between"><span className="text-zinc-500">Healthcare Providers</span><span className="font-bold text-zinc-900">{doctors.length}</span></div>
                                    <div className="flex justify-between"><span className="text-zinc-500">Emergency Contacts</span><span className="font-bold text-zinc-900">{emergencyContacts.length}</span></div>
                                </div>
                            </div>
                        </div>
                        {/* Profile Details */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-zinc-100 bg-blue-50 flex justify-between items-center">
                                    <h3 className="font-bold text-zinc-900">Personal Information</h3>
                                    <div className="flex gap-2">
                                        {isEditing && <button onClick={saveProfile} className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg font-medium flex items-center gap-1.5 hover:bg-blue-700 transition"><Save className="w-3.5 h-3.5" /> Save</button>}
                                        <button onClick={() => setIsEditing(!isEditing)} className={`text-sm px-4 py-1.5 rounded-lg font-medium transition ${isEditing ? 'bg-zinc-100 text-zinc-600' : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'}`}>{isEditing ? 'Cancel' : <><Edit2 className="w-3.5 h-3.5 inline mr-1" />Edit</>}</button>
                                    </div>
                                </div>
                                <div className="p-6 space-y-5">
                                    <div className="grid md:grid-cols-2 gap-5">
                                        <div><label className="block text-sm font-medium text-zinc-500 mb-1.5">Full Name</label>{isEditing ? <input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white" /> : <p className="text-zinc-900 font-medium">{profile?.full_name || "Not set"}</p>}</div>
                                        <div><label className="block text-sm font-medium text-zinc-500 mb-1.5">Date of Birth</label>{isEditing ? <input type="date" value={formData.date_of_birth} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white" /> : <p className="text-zinc-900 font-medium flex items-center gap-2"><Calendar className="w-4 h-4 text-zinc-400" />{profile?.date_of_birth || "Not set"}</p>}</div>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-5">
                                        <div><label className="block text-sm font-medium text-zinc-500 mb-1.5">Phone</label>{isEditing ? <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white" placeholder="(555) 123-4567" /> : <p className="text-zinc-900">{formData.phone || "Not set"}</p>}</div>
                                        <div><label className="block text-sm font-medium text-zinc-500 mb-1.5">Diagnosis Year</label>{isEditing ? <input type="number" value={formData.diagnosis_year || ''} onChange={(e) => setFormData({ ...formData, diagnosis_year: e.target.value ? parseInt(e.target.value) : 0 })} className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white" /> : <p className="text-zinc-900">{profile?.diagnosis_year || "Not set"}</p>}</div>
                                    </div>
                                    <div><label className="block text-sm font-medium text-zinc-500 mb-1.5">Address</label>{isEditing ? <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white" /> : <p className="text-zinc-900">{formData.address || "Not set"}</p>}</div>
                                    <div><label className="block text-sm font-medium text-zinc-500 mb-1.5">Diagnosis Details</label>{isEditing ? <textarea value={formData.diagnosis_details} onChange={(e) => setFormData({ ...formData, diagnosis_details: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white" /> : <p className="text-zinc-700 bg-zinc-50 p-3 rounded-xl border border-zinc-100">{formData.diagnosis_details || <span className="text-zinc-400 italic">No details</span>}</p>}</div>
                                    <div><label className="block text-sm font-medium text-zinc-500 mb-1.5">Bio / Notes</label>{isEditing ? <textarea value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white" /> : <p className="text-zinc-700 bg-zinc-50 p-3 rounded-xl border border-zinc-100">{formData.bio || <span className="text-zinc-400 italic">No bio</span>}</p>}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* CAREGIVERS TAB */}
                {activeTab === 'caregivers' && (
                    <div className="space-y-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5"><h3 className="font-semibold text-blue-900 mb-2">Two-Way Linking</h3><p className="text-blue-700 text-sm">Caregivers can only link if you approve their code here first.</p></div>
                        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
                            <h3 className="font-bold text-zinc-900 mb-4">Add Approved Caregiver</h3>
                            <div className="flex flex-col md:flex-row gap-4">
                                <input type="text" value={newCaregiverCode} onChange={(e) => setNewCaregiverCode(e.target.value)} placeholder="Caregiver's code" className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white" />
                                <input type="text" value={newCaregiverNickname} onChange={(e) => setNewCaregiverNickname(e.target.value)} placeholder="Nickname" className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white" />
                                <button onClick={addAllowedCaregiver} disabled={!newCaregiverCode.trim() || addingCaregiver} className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-sm"><Plus className="w-5 h-5" /> Add</button>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-zinc-100 bg-blue-50"><h3 className="font-bold text-zinc-900">Approved Caregivers ({allowedCaregivers.length})</h3></div>
                            {allowedCaregivers.length === 0 ? <div className="p-8 text-center text-zinc-400"><Shield className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No caregivers approved yet.</p></div> : (
                                <div className="divide-y divide-zinc-100">{allowedCaregivers.map(c => (<div key={c.id} className="px-6 py-4 flex items-center justify-between hover:bg-blue-50 transition"><div><p className="font-medium text-zinc-900">{c.nickname}</p><p className="text-zinc-500 text-sm font-mono">{c.caregiver_code}</p></div><button onClick={() => removeAllowedCaregiver(c.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition"><Trash2 className="w-5 h-5" /></button></div>))}</div>
                            )}
                        </div>
                    </div>
                )}

                {/* MEDICATIONS TAB */}
                {activeTab === 'medications' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-zinc-900">Medications</h2><button onClick={() => setMedicationModal({ isOpen: true, editing: null })} className="px-4 py-2 bg-blue-600 text-white font-medium rounded-xl flex items-center gap-2 hover:bg-blue-700 shadow-sm"><Plus className="w-5 h-5" /> Add</button></div>
                        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
                            {medications.length === 0 ? <div className="p-8 text-center text-zinc-400"><Pill className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No medications recorded.</p></div> : (
                                <div className="divide-y divide-zinc-100">{medications.map(med => (<div key={med.id} className="px-6 py-4 flex items-center justify-between hover:bg-blue-50 transition"><div className="flex-1"><p className="font-medium text-zinc-900">{med.name}</p><p className="text-zinc-500 text-sm">{med.dosage} • {med.frequency}</p>{med.notes && <p className="text-zinc-400 text-sm mt-1">{med.notes}</p>}</div><div className="flex items-center gap-3"><span className={`px-3 py-1 rounded-full text-xs font-medium ${med.is_current ? 'bg-blue-100 text-blue-800' : 'bg-zinc-100 text-zinc-600'}`}>{med.is_current ? 'Current' : 'Past'}</span><button onClick={() => setMedicationModal({ isOpen: true, editing: med })} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg"><Edit2 className="w-4 h-4" /></button><button onClick={() => deleteMedication(med.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></div>))}</div>
                            )}
                        </div>
                    </div>
                )}

                {/* DOCTORS TAB */}
                {activeTab === 'doctors' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-zinc-900">Healthcare Providers</h2><button onClick={() => setDoctorModal({ isOpen: true, editing: null })} className="px-4 py-2 bg-blue-600 text-white font-medium rounded-xl flex items-center gap-2 hover:bg-blue-700 shadow-sm"><Plus className="w-5 h-5" /> Add</button></div>
                        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
                            {doctors.length === 0 ? <div className="p-8 text-center text-zinc-400"><Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No providers recorded.</p></div> : (
                                <div className="divide-y divide-zinc-100">{doctors.map(doc => (<div key={doc.id} className="px-6 py-4 flex items-center justify-between hover:bg-blue-50 transition"><div className="flex-1"><p className="font-medium text-zinc-900 flex items-center gap-2">{doc.name}{doc.is_primary && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">Primary</span>}</p><p className="text-zinc-500 text-sm">{doc.specialty}{doc.hospital && ` • ${doc.hospital}`}</p>{doc.phone && <p className="text-zinc-400 text-sm flex items-center gap-1 mt-1"><Phone className="w-3 h-3" />{doc.phone}</p>}</div><div className="flex items-center gap-2"><button onClick={() => setDoctorModal({ isOpen: true, editing: doc })} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg"><Edit2 className="w-4 h-4" /></button><button onClick={() => deleteDoctor(doc.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></div>))}</div>
                            )}
                        </div>
                    </div>
                )}

                {/* EMERGENCY CONTACTS TAB */}
                {activeTab === 'emergency' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-zinc-900">Emergency Contacts</h2><button onClick={() => setEmergencyModal({ isOpen: true, editing: null })} className="px-4 py-2 bg-blue-600 text-white font-medium rounded-xl flex items-center gap-2 hover:bg-blue-700 shadow-sm"><Plus className="w-5 h-5" /> Add</button></div>
                        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
                            {emergencyContacts.length === 0 ? <div className="p-8 text-center text-zinc-400"><AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No emergency contacts recorded.</p></div> : (
                                <div className="divide-y divide-zinc-100">{emergencyContacts.map(c => (<div key={c.id} className="px-6 py-4 flex items-center justify-between hover:bg-blue-50 transition"><div className="flex-1"><p className="font-medium text-zinc-900 flex items-center gap-2">{c.name}{c.is_primary && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">Primary</span>}</p><p className="text-zinc-500 text-sm">{c.relationship}</p><p className="text-zinc-400 text-sm flex items-center gap-1 mt-1"><Phone className="w-3 h-3" />{c.phone}</p></div><div className="flex items-center gap-2"><button onClick={() => setEmergencyModal({ isOpen: true, editing: c })} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg"><Edit2 className="w-4 h-4" /></button><button onClick={() => deleteEmergencyContact(c.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></div>))}</div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* MODALS */}
            <MedicationModal isOpen={medicationModal.isOpen} editing={medicationModal.editing} onClose={() => setMedicationModal({ isOpen: false, editing: null })} onSave={saveMedication} />
            <DoctorModal isOpen={doctorModal.isOpen} editing={doctorModal.editing} onClose={() => setDoctorModal({ isOpen: false, editing: null })} onSave={saveDoctor} />
            <EmergencyContactModal isOpen={emergencyModal.isOpen} editing={emergencyModal.editing} onClose={() => setEmergencyModal({ isOpen: false, editing: null })} onSave={saveEmergencyContact} />
        </div>
    );
}

// MODAL COMPONENTS
function MedicationModal({ isOpen, editing, onClose, onSave }: { isOpen: boolean; editing: Medication | null; onClose: () => void; onSave: (m: Partial<Medication>) => void }) {
    const [form, setForm] = useState<Partial<Medication>>({ name: '', dosage: '', frequency: '', is_current: true, notes: '' });
    useEffect(() => { if (editing) setForm(editing); else setForm({ name: '', dosage: '', frequency: '', is_current: true, notes: '' }); }, [editing, isOpen]);
    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={editing ? "Edit Medication" : "Add Medication"}>
            <div className="space-y-4">
                <div><label className="block text-sm font-medium text-zinc-700 mb-1">Medication Name *</label><input type="text" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="e.g., Carbidopa-Levodopa" /></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-zinc-700 mb-1">Dosage</label><input type="text" value={form.dosage || ''} onChange={(e) => setForm({ ...form, dosage: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="e.g., 25/100mg" /></div><div><label className="block text-sm font-medium text-zinc-700 mb-1">Frequency</label><input type="text" value={form.frequency || ''} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="e.g., 3x daily" /></div></div>
                <div><label className="block text-sm font-medium text-zinc-700 mb-1">Notes</label><textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" /></div>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_current || false} onChange={(e) => setForm({ ...form, is_current: e.target.checked })} className="rounded" /><span className="text-sm text-zinc-700">Currently taking this medication</span></label>
                <div className="flex gap-3 pt-4"><button onClick={onClose} className="flex-1 py-2.5 border border-zinc-200 rounded-xl font-medium hover:bg-zinc-50">Cancel</button><button onClick={() => onSave({ ...form, id: editing?.id })} disabled={!form.name?.trim()} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50">Save</button></div>
            </div>
        </Modal>
    );
}

function DoctorModal({ isOpen, editing, onClose, onSave }: { isOpen: boolean; editing: Doctor | null; onClose: () => void; onSave: (d: Partial<Doctor>) => void }) {
    const [form, setForm] = useState<Partial<Doctor>>({ name: '', specialty: '', phone: '', hospital: '', is_primary: false });
    useEffect(() => { if (editing) setForm(editing); else setForm({ name: '', specialty: '', phone: '', hospital: '', is_primary: false }); }, [editing, isOpen]);
    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={editing ? "Edit Provider" : "Add Healthcare Provider"}>
            <div className="space-y-4">
                <div><label className="block text-sm font-medium text-zinc-700 mb-1">Name *</label><input type="text" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Dr. John Smith" /></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-zinc-700 mb-1">Specialty</label><input type="text" value={form.specialty || ''} onChange={(e) => setForm({ ...form, specialty: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Neurologist" /></div><div><label className="block text-sm font-medium text-zinc-700 mb-1">Hospital/Clinic</label><input type="text" value={form.hospital || ''} onChange={(e) => setForm({ ...form, hospital: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" /></div></div>
                <div><label className="block text-sm font-medium text-zinc-700 mb-1">Phone</label><input type="tel" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="(555) 123-4567" /></div>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_primary || false} onChange={(e) => setForm({ ...form, is_primary: e.target.checked })} className="rounded" /><span className="text-sm text-zinc-700">Primary care provider</span></label>
                <div className="flex gap-3 pt-4"><button onClick={onClose} className="flex-1 py-2.5 border border-zinc-200 rounded-xl font-medium hover:bg-zinc-50">Cancel</button><button onClick={() => onSave({ ...form, id: editing?.id })} disabled={!form.name?.trim()} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50">Save</button></div>
            </div>
        </Modal>
    );
}

function EmergencyContactModal({ isOpen, editing, onClose, onSave }: { isOpen: boolean; editing: EmergencyContact | null; onClose: () => void; onSave: (c: Partial<EmergencyContact>) => void }) {
    const [form, setForm] = useState<Partial<EmergencyContact>>({ name: '', relationship: '', phone: '', email: '', is_primary: false });
    useEffect(() => { if (editing) setForm(editing); else setForm({ name: '', relationship: '', phone: '', email: '', is_primary: false }); }, [editing, isOpen]);
    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={editing ? "Edit Contact" : "Add Emergency Contact"}>
            <div className="space-y-4">
                <div><label className="block text-sm font-medium text-zinc-700 mb-1">Name *</label><input type="text" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Jane Doe" /></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-zinc-700 mb-1">Relationship</label><input type="text" value={form.relationship || ''} onChange={(e) => setForm({ ...form, relationship: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Spouse, Child" /></div><div><label className="block text-sm font-medium text-zinc-700 mb-1">Phone *</label><input type="tel" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" /></div></div>
                <div><label className="block text-sm font-medium text-zinc-700 mb-1">Email</label><input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" /></div>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_primary || false} onChange={(e) => setForm({ ...form, is_primary: e.target.checked })} className="rounded" /><span className="text-sm text-zinc-700">Primary emergency contact</span></label>
                <div className="flex gap-3 pt-4"><button onClick={onClose} className="flex-1 py-2.5 border border-zinc-200 rounded-xl font-medium hover:bg-zinc-50">Cancel</button><button onClick={() => onSave({ ...form, id: editing?.id })} disabled={!form.name?.trim() || !form.phone?.trim()} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50">Save</button></div>
            </div>
        </Modal>
    );
}
