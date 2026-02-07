"use client";

import { useState } from "react";
import { ChevronRight, ChevronLeft, Plus, Trash2, Check, User, Pill, Stethoscope, Calendar, Phone, Shield } from "lucide-react";

type Medication = {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    is_current: boolean;
};

type Doctor = {
    id: string;
    name: string;
    specialty: string;
    phone: string;
    email: string;
    is_primary: boolean;
};

type EmergencyContact = {
    id: string;
    name: string;
    relationship: string;
    phone: string;
};

type AllowedCaregiver = {
    id: string;
    caregiver_code: string;
    nickname: string;
};

type OnboardingData = {
    // Step 1: Basic Info
    full_name: string;
    date_of_birth: string;
    phone: string;
    address: string;
    diagnosis_year: number | null;
    diagnosis_details: string;
    // Step 2: Medications
    medications: Medication[];
    // Step 3: Doctors
    doctors: Doctor[];
    // Step 4: Emergency Contacts
    emergency_contacts: EmergencyContact[];
    // Step 5: Allowed Caregivers
    allowed_caregivers: AllowedCaregiver[];
};

const STEPS = [
    { id: 1, title: "Basic Information", icon: User },
    { id: 2, title: "Medications", icon: Pill },
    { id: 3, title: "Healthcare Providers", icon: Stethoscope },
    { id: 4, title: "Emergency Contacts", icon: Phone },
    { id: 5, title: "Approved Caregivers", icon: Shield },
    { id: 6, title: "Review & Complete", icon: Check },
];

interface PatientOnboardingProps {
    user: any;
    onComplete: (data: OnboardingData) => Promise<void>;
}

export default function PatientOnboarding({ user, onComplete }: PatientOnboardingProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [data, setData] = useState<OnboardingData>({
        full_name: user?.name || "",
        date_of_birth: "",
        phone: "",
        address: "",
        diagnosis_year: null,
        diagnosis_details: "",
        medications: [],
        doctors: [],
        emergency_contacts: [],
        allowed_caregivers: [],
    });

    const updateData = (field: keyof OnboardingData, value: any) => {
        setData(prev => ({ ...prev, [field]: value }));
    };

    const addMedication = () => {
        const newMed: Medication = {
            id: crypto.randomUUID(),
            name: "",
            dosage: "",
            frequency: "",
            is_current: true,
        };
        updateData("medications", [...data.medications, newMed]);
    };

    const updateMedication = (id: string, field: keyof Medication, value: any) => {
        updateData("medications", data.medications.map(m =>
            m.id === id ? { ...m, [field]: value } : m
        ));
    };

    const removeMedication = (id: string) => {
        updateData("medications", data.medications.filter(m => m.id !== id));
    };

    const addDoctor = () => {
        const newDoc: Doctor = {
            id: crypto.randomUUID(),
            name: "",
            specialty: "",
            phone: "",
            email: "",
            is_primary: data.doctors.length === 0,
        };
        updateData("doctors", [...data.doctors, newDoc]);
    };

    const updateDoctor = (id: string, field: keyof Doctor, value: any) => {
        updateData("doctors", data.doctors.map(d =>
            d.id === id ? { ...d, [field]: value } : d
        ));
    };

    const removeDoctor = (id: string) => {
        updateData("doctors", data.doctors.filter(d => d.id !== id));
    };

    const addEmergencyContact = () => {
        const newContact: EmergencyContact = {
            id: crypto.randomUUID(),
            name: "",
            relationship: "",
            phone: "",
        };
        updateData("emergency_contacts", [...data.emergency_contacts, newContact]);
    };

    const updateEmergencyContact = (id: string, field: keyof EmergencyContact, value: any) => {
        updateData("emergency_contacts", data.emergency_contacts.map(c =>
            c.id === id ? { ...c, [field]: value } : c
        ));
    };

    const removeEmergencyContact = (id: string) => {
        updateData("emergency_contacts", data.emergency_contacts.filter(c => c.id !== id));
    };

    const addAllowedCaregiver = () => {
        const newCaregiver: AllowedCaregiver = {
            id: crypto.randomUUID(),
            caregiver_code: "",
            nickname: "",
        };
        updateData("allowed_caregivers", [...data.allowed_caregivers, newCaregiver]);
    };

    const updateAllowedCaregiver = (id: string, field: keyof AllowedCaregiver, value: any) => {
        updateData("allowed_caregivers", data.allowed_caregivers.map(c =>
            c.id === id ? { ...c, [field]: value } : c
        ));
    };

    const removeAllowedCaregiver = (id: string) => {
        updateData("allowed_caregivers", data.allowed_caregivers.filter(c => c.id !== id));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await onComplete(data);
        } catch (error) {
            console.error("Onboarding error:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const canProceed = () => {
        switch (currentStep) {
            case 1:
                return data.full_name.trim() !== "";
            default:
                return true;
        }
    };

    return (
        <div className="min-h-screen bg-teal-50 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-zinc-900">Welcome to CareGlobe</h1>
                    <p className="text-zinc-500 mt-2">Let's set up your patient profile</p>
                </div>

                {/* Progress Steps */}
                <div className="flex justify-between items-center mb-8 px-4">
                    {STEPS.map((step, index) => (
                        <div key={step.id} className="flex items-center">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${currentStep >= step.id
                                ? "bg-teal-600 border-teal-600 text-white"
                                : "bg-white border-zinc-300 text-zinc-400"
                                }`}>
                                <step.icon className="w-5 h-5" />
                            </div>
                            {index < STEPS.length - 1 && (
                                <div className={`w-8 md:w-16 h-1 mx-1 rounded ${currentStep > step.id ? "bg-teal-600" : "bg-zinc-200"
                                    }`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                <div className="bg-white rounded-2xl shadow-xl border border-zinc-100 p-8">
                    <h2 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
                        {STEPS[currentStep - 1].title}
                    </h2>

                    {/* Step 1: Basic Info */}
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 mb-2">Full Name *</label>
                                    <input
                                        type="text"
                                        value={data.full_name}
                                        onChange={(e) => updateData("full_name", e.target.value)}
                                        className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 mb-2">Date of Birth</label>
                                    <input
                                        type="date"
                                        value={data.date_of_birth}
                                        onChange={(e) => updateData("date_of_birth", e.target.value)}
                                        className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 mb-2">Phone Number</label>
                                    <input
                                        type="tel"
                                        value={data.phone}
                                        onChange={(e) => updateData("phone", e.target.value)}
                                        className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                        placeholder="(555) 123-4567"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 mb-2">Year of Diagnosis</label>
                                    <input
                                        type="number"
                                        value={data.diagnosis_year || ""}
                                        onChange={(e) => updateData("diagnosis_year", parseInt(e.target.value) || null)}
                                        className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                        placeholder="2020"
                                        min="1900"
                                        max={new Date().getFullYear()}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-2">Address</label>
                                <input
                                    type="text"
                                    value={data.address}
                                    onChange={(e) => updateData("address", e.target.value)}
                                    className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                    placeholder="123 Main St, City, State"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-2">Diagnosis Details</label>
                                <textarea
                                    value={data.diagnosis_details}
                                    onChange={(e) => updateData("diagnosis_details", e.target.value)}
                                    className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                    rows={3}
                                    placeholder="Any additional details about your diagnosis..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Medications */}
                    {currentStep === 2 && (
                        <div className="space-y-4">
                            <p className="text-zinc-500 text-sm mb-4">Add your current and past medications. This helps caregivers understand your treatment history.</p>

                            {data.medications.map((med, index) => (
                                <div key={med.id} className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-sm font-medium text-zinc-600">Medication {index + 1}</span>
                                        <button onClick={() => removeMedication(med.id)} className="text-red-500 hover:text-red-700">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid md:grid-cols-3 gap-3">
                                        <input
                                            type="text"
                                            value={med.name}
                                            onChange={(e) => updateMedication(med.id, "name", e.target.value)}
                                            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                            placeholder="Medication name"
                                        />
                                        <input
                                            type="text"
                                            value={med.dosage}
                                            onChange={(e) => updateMedication(med.id, "dosage", e.target.value)}
                                            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                            placeholder="Dosage (e.g., 50mg)"
                                        />
                                        <input
                                            type="text"
                                            value={med.frequency}
                                            onChange={(e) => updateMedication(med.id, "frequency", e.target.value)}
                                            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                            placeholder="Frequency (e.g., Twice daily)"
                                        />
                                    </div>
                                    <label className="flex items-center gap-2 mt-3 text-sm text-zinc-600">
                                        <input
                                            type="checkbox"
                                            checked={med.is_current}
                                            onChange={(e) => updateMedication(med.id, "is_current", e.target.checked)}
                                            className="rounded"
                                        />
                                        Currently taking this medication
                                    </label>
                                </div>
                            ))}

                            <button
                                onClick={addMedication}
                                className="w-full py-3 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-600 hover:border-teal-400 hover:text-teal-600 transition flex items-center justify-center gap-2"
                            >
                                <Plus className="w-5 h-5" /> Add Medication
                            </button>

                            {data.medications.length === 0 && (
                                <p className="text-center text-zinc-400 text-sm py-4">No medications added. You can skip this step or add medications now.</p>
                            )}
                        </div>
                    )}

                    {/* Step 3: Doctors */}
                    {currentStep === 3 && (
                        <div className="space-y-4">
                            <p className="text-zinc-500 text-sm mb-4">Add your healthcare providers so caregivers know who to contact.</p>

                            {data.doctors.map((doc, index) => (
                                <div key={doc.id} className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-sm font-medium text-zinc-600">Provider {index + 1}</span>
                                        <button onClick={() => removeDoctor(doc.id)} className="text-red-500 hover:text-red-700">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-3">
                                        <input
                                            type="text"
                                            value={doc.name}
                                            onChange={(e) => updateDoctor(doc.id, "name", e.target.value)}
                                            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                            placeholder="Doctor's name"
                                        />
                                        <input
                                            type="text"
                                            value={doc.specialty}
                                            onChange={(e) => updateDoctor(doc.id, "specialty", e.target.value)}
                                            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                            placeholder="Specialty (e.g., Neurologist)"
                                        />
                                        <input
                                            type="tel"
                                            value={doc.phone}
                                            onChange={(e) => updateDoctor(doc.id, "phone", e.target.value)}
                                            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                            placeholder="Phone number"
                                        />
                                        <input
                                            type="email"
                                            value={doc.email || ""}
                                            onChange={(e) => updateDoctor(doc.id, "email", e.target.value)}
                                            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                            placeholder="Email address"
                                        />
                                    </div>
                                    <label className="flex items-center gap-2 mt-3 text-sm text-zinc-600">
                                        <input
                                            type="checkbox"
                                            checked={doc.is_primary}
                                            onChange={(e) => updateDoctor(doc.id, "is_primary", e.target.checked)}
                                            className="rounded"
                                        />
                                        Primary care provider
                                    </label>
                                </div>
                            ))}

                            <button
                                onClick={addDoctor}
                                className="w-full py-3 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-600 hover:border-teal-400 hover:text-teal-600 transition flex items-center justify-center gap-2"
                            >
                                <Plus className="w-5 h-5" /> Add Healthcare Provider
                            </button>
                        </div>
                    )}

                    {/* Step 4: Emergency Contacts */}
                    {currentStep === 4 && (
                        <div className="space-y-4">
                            <p className="text-zinc-500 text-sm mb-4">Add emergency contacts who should be notified in case of an emergency.</p>

                            {data.emergency_contacts.map((contact, index) => (
                                <div key={contact.id} className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-sm font-medium text-zinc-600">Contact {index + 1}</span>
                                        <button onClick={() => removeEmergencyContact(contact.id)} className="text-red-500 hover:text-red-700">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid md:grid-cols-3 gap-3">
                                        <input
                                            type="text"
                                            value={contact.name}
                                            onChange={(e) => updateEmergencyContact(contact.id, "name", e.target.value)}
                                            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                            placeholder="Contact name"
                                        />
                                        <input
                                            type="text"
                                            value={contact.relationship}
                                            onChange={(e) => updateEmergencyContact(contact.id, "relationship", e.target.value)}
                                            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                            placeholder="Relationship (e.g., Spouse)"
                                        />
                                        <input
                                            type="tel"
                                            value={contact.phone}
                                            onChange={(e) => updateEmergencyContact(contact.id, "phone", e.target.value)}
                                            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                            placeholder="Phone number"
                                        />
                                    </div>
                                </div>
                            ))}

                            <button
                                onClick={addEmergencyContact}
                                className="w-full py-3 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-600 hover:border-teal-400 hover:text-teal-600 transition flex items-center justify-center gap-2"
                            >
                                <Plus className="w-5 h-5" /> Add Emergency Contact
                            </button>
                        </div>
                    )}

                    {/* Step 5: Allowed Caregivers */}
                    {currentStep === 5 && (
                        <div className="space-y-4">
                            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-6">
                                <h3 className="font-semibold text-teal-900 mb-2">Two-Way Linking</h3>
                                <p className="text-teal-700 text-sm">
                                    For security, caregivers can only link to you if you've pre-approved their code here.
                                    Ask your caregiver for their CareGlobe code and add it below.
                                </p>
                            </div>

                            {data.allowed_caregivers.map((caregiver, index) => (
                                <div key={caregiver.id} className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-sm font-medium text-zinc-600">Caregiver {index + 1}</span>
                                        <button onClick={() => removeAllowedCaregiver(caregiver.id)} className="text-red-500 hover:text-red-700">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-3">
                                        <input
                                            type="text"
                                            value={caregiver.caregiver_code}
                                            onChange={(e) => updateAllowedCaregiver(caregiver.id, "caregiver_code", e.target.value)}
                                            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                            placeholder="Caregiver's code (e.g., mom-1234)"
                                        />
                                        <input
                                            type="text"
                                            value={caregiver.nickname}
                                            onChange={(e) => updateAllowedCaregiver(caregiver.id, "nickname", e.target.value)}
                                            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                            placeholder="Nickname (e.g., Mom)"
                                        />
                                    </div>
                                </div>
                            ))}

                            <button
                                onClick={addAllowedCaregiver}
                                className="w-full py-3 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-600 hover:border-teal-400 hover:text-teal-600 transition flex items-center justify-center gap-2"
                            >
                                <Plus className="w-5 h-5" /> Add Approved Caregiver
                            </button>

                            <p className="text-center text-zinc-400 text-sm py-2">You can always add more caregivers later from your dashboard.</p>
                        </div>
                    )}

                    {/* Step 6: Review */}
                    {currentStep === 6 && (
                        <div className="space-y-6">
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                <h3 className="font-semibold text-green-900 mb-2">Almost Done!</h3>
                                <p className="text-green-700 text-sm">Review your information below. You can always update this later from your dashboard.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-zinc-50 rounded-lg p-4">
                                    <h4 className="font-semibold text-zinc-800 mb-2">Basic Information</h4>
                                    <p className="text-zinc-600 text-sm">Name: {data.full_name || "Not provided"}</p>
                                    <p className="text-zinc-600 text-sm">DOB: {data.date_of_birth || "Not provided"}</p>
                                    <p className="text-zinc-600 text-sm">Diagnosis Year: {data.diagnosis_year || "Not provided"}</p>
                                </div>

                                <div className="bg-zinc-50 rounded-lg p-4">
                                    <h4 className="font-semibold text-zinc-800 mb-2">Medications</h4>
                                    <p className="text-zinc-600 text-sm">{data.medications.length} medication(s) added</p>
                                </div>

                                <div className="bg-zinc-50 rounded-lg p-4">
                                    <h4 className="font-semibold text-zinc-800 mb-2">Healthcare Providers</h4>
                                    <p className="text-zinc-600 text-sm">{data.doctors.length} provider(s) added</p>
                                </div>

                                <div className="bg-zinc-50 rounded-lg p-4">
                                    <h4 className="font-semibold text-zinc-800 mb-2">Emergency Contacts</h4>
                                    <p className="text-zinc-600 text-sm">{data.emergency_contacts.length} contact(s) added</p>
                                </div>

                                <div className="bg-zinc-50 rounded-lg p-4">
                                    <h4 className="font-semibold text-zinc-800 mb-2">Approved Caregivers</h4>
                                    <p className="text-zinc-600 text-sm">{data.allowed_caregivers.length} caregiver(s) pre-approved</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between mt-8 pt-6 border-t border-zinc-100">
                        <button
                            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                            disabled={currentStep === 1}
                            className="px-6 py-3 text-zinc-600 font-medium rounded-lg hover:bg-zinc-100 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <ChevronLeft className="w-5 h-5" /> Back
                        </button>

                        {currentStep < STEPS.length ? (
                            <button
                                onClick={() => setCurrentStep(prev => Math.min(STEPS.length, prev + 1))}
                                disabled={!canProceed()}
                                className="px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                Next <ChevronRight className="w-5 h-5" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSubmitting ? "Saving..." : "Complete Setup"} <Check className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
