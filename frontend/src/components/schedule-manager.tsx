"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, MapPin, User, Plus, Check, X, Loader2, Trash2 } from "lucide-react";

type Doctor = {
    id: string;
    name: string;
    specialty: string;
    email?: string;
};

type Appointment = {
    id: string;
    title: string;
    doctorName?: string;
    date: string; // ISO date string
    time: string;
    location: string;
    notes?: string;
};

type ScheduleManagerProps = {
    patientId: string;
    patientName: string;
    patientEmail?: string;
    doctors: Doctor[];
};

export default function ScheduleManager({ patientId, patientName, patientEmail, doctors }: ScheduleManagerProps) {
    const [appointments, setAppointments] = useState<Appointment[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(`appointments_${patientId}`);
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

    // Save to local storage whenever appointments change
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(`appointments_${patientId}`, JSON.stringify(appointments));
        }
    }, [appointments, patientId]);

    const [isAdding, setIsAdding] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // New Appointment State
    const [newAppt, setNewAppt] = useState({
        title: "",
        doctorId: "",
        date: "",
        time: "",
        location: "",
        notes: "",
        sendInvite: true
    });

    const handleSave = async () => {
        if (!newAppt.title || !newAppt.date || !newAppt.time) {
            setNotification({ type: 'error', message: "Please fill in all required fields" });
            return;
        }

        setIsLoading(true);
        setNotification(null);

        try {
            const selectedDoctor = doctors.find(d => d.id === newAppt.doctorId);
            const doctorName = selectedDoctor ? selectedDoctor.name : "Unknown Doctor";

            // Format datetime for email
            const dateTimeStr = `${newAppt.date}T${newAppt.time}:00`;

            // Send Calendar Invite if requested
            if (newAppt.sendInvite && patientEmail) {
                const response = await fetch("/api/appointments", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "calendar-invite",
                        patient_email: patientEmail,
                        patient_name: patientName,
                        doctor_name: doctorName,
                        appointment_datetime: dateTimeStr,
                        location: newAppt.location,
                        notes: newAppt.notes
                    }),
                });

                const result = await response.json();
                if (!result.success) {
                    throw new Error(result.error || "Failed to send invite");
                }
            }

            // Add to local list
            const appointment: Appointment = {
                id: crypto.randomUUID(),
                title: newAppt.title,
                doctorName: selectedDoctor?.name,
                date: newAppt.date,
                time: newAppt.time,
                location: newAppt.location,
                notes: newAppt.notes
            };

            setAppointments(prev => [...prev, appointment].sort((a, b) =>
                new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime()
            ));

            setNotification({ type: 'success', message: "Appointment added & calendar invite sent!" });
            setIsAdding(false);
            setNewAppt({
                title: "",
                doctorId: "",
                date: "",
                time: "",
                location: "",
                notes: "",
                sendInvite: true
            });

        } catch (error) {
            setNotification({ type: 'error', message: "Error saving appointment: " + (error as any).message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = (id: string) => {
        setAppointments(prev => prev.filter(a => a.id !== id));
    };

    return (
        <div className="bg-white rounded-xl border border-gray-100 h-full flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-white to-gray-50">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-teal-600" />
                        Care Schedule
                    </h3>
                    <p className="text-sm text-gray-500">Manage appointments & consultations</p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-teal-700 transition shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Appointment
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-5 bg-gray-50/50">
                {notification && (
                    <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${notification.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                        {notification.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        {notification.message}
                    </div>
                )}

                {isAdding && (
                    <div className="mb-6 bg-white p-5 rounded-xl border border-teal-100 shadow-sm animate-in fade-in slide-in-from-top-4">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-semibold text-gray-900">New Appointment</h4>
                            <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={newAppt.title}
                                    onChange={e => setNewAppt({ ...newAppt, title: e.target.value })}
                                    placeholder="e.g. Cardiologist Checkup"
                                    className="w-full p-2.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Doctor (Optional)</label>
                                <select
                                    value={newAppt.doctorId}
                                    onChange={e => {
                                        const doc = doctors.find(d => d.id === e.target.value);
                                        setNewAppt({
                                            ...newAppt,
                                            doctorId: e.target.value,
                                            location: newAppt.location || (doc?.specialty ? `${doc.name}'s Clinic` : "")
                                        });
                                    }}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="">Select Doctor</option>
                                    {doctors.map(doc => (
                                        <option key={doc.id} value={doc.id}>Dr. {doc.name} ({doc.specialty})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                <input
                                    type="date"
                                    value={newAppt.date}
                                    onChange={e => setNewAppt({ ...newAppt, date: e.target.value })}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                                <input
                                    type="time"
                                    value={newAppt.time}
                                    onChange={e => setNewAppt({ ...newAppt, time: e.target.value })}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                <div className="relative">
                                    <MapPin className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                    <input
                                        type="text"
                                        value={newAppt.location}
                                        onChange={e => setNewAppt({ ...newAppt, location: e.target.value })}
                                        placeholder="Clinic Address or Virtual Link"
                                        className="w-full p-2.5 pl-10 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    value={newAppt.notes}
                                    onChange={e => setNewAppt({ ...newAppt, notes: e.target.value })}
                                    placeholder="Instructions, preparation..."
                                    rows={2}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="flex items-center gap-2 p-3 bg-teal-50 border border-teal-100 rounded-lg cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newAppt.sendInvite}
                                        onChange={e => setNewAppt({ ...newAppt, sendInvite: e.target.checked })}
                                        className="rounded text-teal-600 focus:ring-teal-500"
                                        disabled={!patientEmail}
                                    />
                                    <div className="text-sm">
                                        <span className="font-medium text-teal-900">Send calendar invite to patient</span>
                                        {!patientEmail && <span className="text-red-500 ml-2">(No email on file)</span>}
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsAdding(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isLoading}
                                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2 transition"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Schedule & Notify
                            </button>
                        </div>
                    </div>
                )}

                {/* Appointment List */}
                <div className="space-y-3">
                    {appointments.length === 0 && !isAdding ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Calendar className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-gray-900 font-medium mb-1">No appointments scheduled</h3>
                            <p className="text-sm text-gray-500">Add an appointment to notify the patient.</p>
                        </div>
                    ) : (
                        appointments.map(appt => (
                            <div key={appt.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition group">
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-4">
                                        <div className="flex flex-col items-center bg-teal-50 px-3 py-2 rounded-lg border border-teal-100 min-w-[60px]">
                                            <span className="text-xs font-bold text-teal-600 uppercase">
                                                {new Date(appt.date).toLocaleString('default', { month: 'short' })}
                                            </span>
                                            <span className="text-xl font-bold text-gray-900">
                                                {new Date(appt.date).getDate()}
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-lg">{appt.title}</h4>
                                            <div className="flex flex-col gap-1 mt-1 text-sm text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-gray-400" />
                                                    {new Date('2000-01-01T' + appt.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                </div>
                                                {appt.location && (
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-4 h-4 text-gray-400" />
                                                        {appt.location}
                                                    </div>
                                                )}
                                                {appt.doctorName && (
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-4 h-4 text-gray-400" />
                                                        Dr. {appt.doctorName}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(appt.id)}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 transition"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
