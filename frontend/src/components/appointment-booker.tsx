"use client";

import { useState, useEffect } from "react";
import { Calendar, AlertCircle, CheckCircle, Loader2, X, Stethoscope, Clock, Send, User } from "lucide-react";

type Doctor = {
    id: string;
    name: string;
    specialty: string;
    email?: string;
    phone?: string;
    is_primary: boolean;
};

type SymptomAnalysis = {
    symptom: string;
    urgency: string;
    recommendation: string;
    suggest_appointment: boolean;
    suggested_timeframe: string;
    questions_to_ask: string[];
};

type AppointmentBookerProps = {
    symptom: string;
    patientId: string;
    patientName: string;
    patientEmail?: string;
    doctors: Doctor[];
    onClose: () => void;
    onSuccess: () => void;
};

export default function AppointmentBooker({
    symptom,
    patientId,
    patientName,
    patientEmail,
    doctors,
    onClose,
    onSuccess
}: AppointmentBookerProps) {
    const [analysis, setAnalysis] = useState<SymptomAnalysis | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(true);
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [isBooking, setIsBooking] = useState(false);
    const [bookingResult, setBookingResult] = useState<{ success: boolean; message: string } | null>(null);
    const [preferredTimeframe, setPreferredTimeframe] = useState("within 3 days");
    const [additionalNotes, setAdditionalNotes] = useState("");
    const [step, setStep] = useState<'analyze' | 'select-doctor' | 'confirm' | 'result'>('analyze');

    // Auto-select primary doctor
    useEffect(() => {
        const primaryDoctor = doctors.find(d => d.is_primary);
        if (primaryDoctor) {
            setSelectedDoctor(primaryDoctor);
        } else if (doctors.length > 0) {
            setSelectedDoctor(doctors[0]);
        }
    }, [doctors]);

    // Analyze symptom on mount
    useEffect(() => {
        analyzeSymptom();
    }, []);

    const analyzeSymptom = async () => {
        setIsAnalyzing(true);
        try {
            const response = await fetch("/api/symptoms/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    symptom,
                    patient_name: patientName
                }),
            });
            const data = await response.json();
            if (data.success) {
                setAnalysis(data.analysis);
                if (data.analysis.suggested_timeframe) {
                    setPreferredTimeframe(data.analysis.suggested_timeframe);
                }
            }
        } catch (error) {
            console.error("Error analyzing symptom:", error);
        } finally {
            setIsAnalyzing(false);
            setStep('select-doctor');
        }
    };

    const bookAppointment = async () => {
        if (!selectedDoctor || !selectedDoctor.email) {
            setBookingResult({ success: false, message: "Selected doctor has no email address" });
            setStep('result');
            return;
        }

        setIsBooking(true);
        try {
            const response = await fetch("/api/appointments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "book",
                    doctor_email: selectedDoctor.email,
                    doctor_name: selectedDoctor.name,
                    patient_name: patientName,
                    symptom,
                    urgency: analysis?.urgency || "moderate",
                    preferred_timeframe: preferredTimeframe,
                    additional_notes: additionalNotes || undefined
                }),
            });
            const data = await response.json();
            setBookingResult(data);
            setStep('result');
            if (data.success) {
                onSuccess();
            }
        } catch (error) {
            setBookingResult({ success: false, message: "Failed to send appointment request" });
            setStep('result');
        } finally {
            setIsBooking(false);
        }
    };

    const getUrgencyColor = (urgency: string) => {
        switch (urgency) {
            case 'emergency': return 'bg-red-100 text-red-800 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getUrgencyIcon = (urgency: string) => {
        if (urgency === 'emergency' || urgency === 'high') {
            return <AlertCircle className="w-5 h-5" />;
        }
        return <Clock className="w-5 h-5" />;
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="px-6 py-4 bg-teal-600 text-white flex items-center justify-between">
                    <h2 className="font-bold flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Book Appointment
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[70vh]">
                    {/* Symptom Summary */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                        <p className="text-sm text-gray-500 mb-1">Symptom Reported</p>
                        <p className="text-gray-900 font-medium">{symptom}</p>
                    </div>

                    {/* Analyzing State */}
                    {isAnalyzing && (
                        <div className="flex flex-col items-center py-8">
                            <Loader2 className="w-10 h-10 text-teal-600 animate-spin mb-4" />
                            <p className="text-gray-600">Analyzing symptom...</p>
                            <p className="text-sm text-gray-400">AI is determining urgency and recommendations</p>
                        </div>
                    )}

                    {/* Analysis Result */}
                    {!isAnalyzing && analysis && step !== 'result' && (
                        <>
                            {/* Urgency Badge */}
                            <div className={`mb-4 p-4 rounded-xl border ${getUrgencyColor(analysis.urgency)}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    {getUrgencyIcon(analysis.urgency)}
                                    <span className="font-bold capitalize">{analysis.urgency} Urgency</span>
                                </div>
                                <p className="text-sm">{analysis.recommendation}</p>
                            </div>

                            {/* Questions to Ask Doctor */}
                            {analysis.questions_to_ask.length > 0 && (
                                <div className="mb-6 p-4 bg-teal-50 rounded-xl border border-teal-200">
                                    <p className="font-semibold text-teal-800 mb-2">Questions for the Doctor</p>
                                    <ul className="space-y-1">
                                        {analysis.questions_to_ask.map((q, i) => (
                                            <li key={i} className="text-sm text-teal-700 flex gap-2">
                                                <span>•</span>
                                                <span>{q}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Doctor Selection */}
                            {step === 'select-doctor' && (
                                <>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Doctor</label>
                                        <div className="space-y-2">
                                            {doctors.map(doctor => (
                                                <button
                                                    key={doctor.id}
                                                    onClick={() => setSelectedDoctor(doctor)}
                                                    className={`w-full p-3 rounded-xl border-2 text-left transition ${selectedDoctor?.id === doctor.id
                                                            ? 'border-teal-500 bg-teal-50'
                                                            : 'border-gray-200 hover:border-teal-300'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                                                <Stethoscope className="w-5 h-5 text-gray-500" />
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-gray-900">Dr. {doctor.name}</p>
                                                                <p className="text-sm text-gray-500">{doctor.specialty}</p>
                                                            </div>
                                                        </div>
                                                        {doctor.is_primary && (
                                                            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full">Primary</span>
                                                        )}
                                                    </div>
                                                    {!doctor.email && (
                                                        <p className="text-xs text-orange-600 mt-2">⚠️ No email on file</p>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                        {doctors.length === 0 && (
                                            <p className="text-gray-500 text-center py-4">No doctors on file. Please add a doctor first.</p>
                                        )}
                                    </div>

                                    {/* Timeframe */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Timeframe</label>
                                        <select
                                            value={preferredTimeframe}
                                            onChange={(e) => setPreferredTimeframe(e.target.value)}
                                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500"
                                        >
                                            <option value="as soon as possible">As soon as possible</option>
                                            <option value="within 24 hours">Within 24 hours</option>
                                            <option value="within 3 days">Within 3 days</option>
                                            <option value="this week">This week</option>
                                            <option value="next available">Next available</option>
                                        </select>
                                    </div>

                                    {/* Additional Notes */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes (Optional)</label>
                                        <textarea
                                            value={additionalNotes}
                                            onChange={(e) => setAdditionalNotes(e.target.value)}
                                            placeholder="Any additional information for the doctor..."
                                            rows={3}
                                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 resize-none"
                                        />
                                    </div>

                                    <button
                                        onClick={() => setStep('confirm')}
                                        disabled={!selectedDoctor || !selectedDoctor.email}
                                        className="w-full py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 disabled:opacity-50 transition"
                                    >
                                        Continue
                                    </button>
                                </>
                            )}

                            {/* Confirmation Step */}
                            {step === 'confirm' && selectedDoctor && (
                                <div className="space-y-4">
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <h4 className="font-semibold mb-3">Confirm Appointment Request</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Patient</span>
                                                <span className="font-medium">{patientName}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Doctor</span>
                                                <span className="font-medium">Dr. {selectedDoctor.name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Email to</span>
                                                <span className="font-medium">{selectedDoctor.email}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Timeframe</span>
                                                <span className="font-medium capitalize">{preferredTimeframe}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setStep('select-doctor')}
                                            className="flex-1 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={bookAppointment}
                                            disabled={isBooking}
                                            className="flex-1 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                                        >
                                            {isBooking ? (
                                                <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</>
                                            ) : (
                                                <><Send className="w-5 h-5" /> Send Request</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Result */}
                    {step === 'result' && bookingResult && (
                        <div className={`text-center py-8 ${bookingResult.success ? 'text-green-600' : 'text-red-600'}`}>
                            {bookingResult.success ? (
                                <CheckCircle className="w-16 h-16 mx-auto mb-4" />
                            ) : (
                                <AlertCircle className="w-16 h-16 mx-auto mb-4" />
                            )}
                            <h3 className="text-xl font-bold mb-2">
                                {bookingResult.success ? 'Request Sent!' : 'Error'}
                            </h3>
                            <p className="text-gray-600 mb-6">{bookingResult.message}</p>
                            <button
                                onClick={onClose}
                                className="px-6 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
