"use client";

import { useState, useEffect } from "react";
import { ClipboardList, FileText, TrendingUp, Mic, X, Loader2, Send, CheckCircle, AlertCircle, History, Calendar, Stethoscope, Mail, MessageCircle, Bot, Zap, Phone, ShieldAlert, Siren } from "lucide-react";

type SymptomLog = {
    id: string;
    symptom: string;
    severity: string;
    notes?: string;
    logged_at: string;
};

// Convert markdown-like text to proper JSX
function formatAIText(text: string): React.ReactElement[] {
    return text.split('\n').map((line, i) => {
        // Convert **bold** to <strong>
        let formatted = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        // Convert *italic* to <em>
        formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // Check if it's a bullet point
        const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*');
        const isHeader = line.trim().startsWith('**') && line.trim().endsWith('**');

        if (isBullet) {
            const content = formatted.replace(/^[\s]*[•\-\*]\s*/, '');
            return (
                <div key={i} className="flex gap-2 py-1">
                    <span className="text-teal-500">•</span>
                    <span dangerouslySetInnerHTML={{ __html: content }} />
                </div>
            );
        }

        if (isHeader || formatted.includes('<strong>')) {
            return (
                <p key={i} className="py-1" dangerouslySetInnerHTML={{ __html: formatted }} />
            );
        }

        if (line.trim() === '') {
            return <div key={i} className="h-2" />;
        }

        return (
            <p key={i} className="py-0.5" dangerouslySetInnerHTML={{ __html: formatted }} />
        );
    });
}

type Doctor = {
    id: string;
    name: string;
    specialty: string;
    email?: string;
    is_primary: boolean;
};

type EmergencyContact = {
    id: string;
    name: string;
    relationship: string;
    phone: string;
    email?: string;
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

export default function AIAgent({ patientId, patientName, doctors = [], emergencyContacts = [], onBookAppointment, onDraftEmail, onSendEmergencyEmail, forceOpenAction, compact = false }: {
    patientId: string;
    patientName: string;
    doctors?: Doctor[];
    emergencyContacts?: EmergencyContact[];
    onBookAppointment?: (symptom: string) => void;
    onDraftEmail?: (symptom: string, urgency: string) => void;
    onSendEmergencyEmail?: (symptom: string, urgency: string) => void;
    forceOpenAction?: 'symptom' | 'summary' | 'insights' | null;
    compact?: boolean;
}) {
    const [activeModal, setActiveModal] = useState<'symptom' | 'summary' | 'insights' | 'history' | 'agent' | null>(null);

    // React to external triggers (e.g. Quick Actions)
    useEffect(() => {
        if (forceOpenAction) {
            setActiveModal(forceOpenAction);
        }
    }, [forceOpenAction]);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [symptomInput, setSymptomInput] = useState("");

    // ... (rest of state/methods) stays same ...
    // Using simple replacement for start of component to avoid finding complex button block

    const startListening = () => {
        // ... (this logic is inside component, I can't easily replace it with just top-level match)
        // I will use multi_replace to target specific blocks.
    };

    // ...

    const [isListening, setIsListening] = useState(false);
    const [symptomAnalysis, setSymptomAnalysis] = useState<SymptomAnalysis | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [lastLoggedSymptom, setLastLoggedSymptom] = useState("");

    // Autonomous Agent Chat state
    const [agentInput, setAgentInput] = useState("");
    const [agentMessages, setAgentMessages] = useState<{ role: 'user' | 'agent'; text: string; actions?: any[] }[]>([]);
    const [isAgentLoading, setIsAgentLoading] = useState(false);

    const sendAgentMessage = async () => {
        if (!agentInput.trim()) return;
        const userMsg = agentInput.trim();
        setAgentInput("");
        setAgentMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsAgentLoading(true);

        try {
            const response = await fetch("/api/agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: userMsg,
                    patient_context: {
                        name: patientName,
                        doctors: doctors.map(d => ({
                            name: d.name,
                            specialty: d.specialty,
                            email: d.email || "",
                        })),
                    }
                }),
            });
            const data = await response.json();
            setAgentMessages(prev => [...prev, {
                role: 'agent',
                text: data.response || data.error || "No response",
                actions: data.actions_taken || []
            }]);
        } catch (error) {
            setAgentMessages(prev => [...prev, { role: 'agent', text: "Failed to reach the agent. Is the backend running?" }]);
        } finally {
            setIsAgentLoading(false);
        }
    };

    const logSymptom = async () => {
        if (!symptomInput.trim()) return;
        setIsLoading(true);
        setResult(null);

        try {
            const response = await fetch("/api/agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "log_symptom",
                    patientId,
                    patientName,
                    input: symptomInput,
                }),
            });
            const data = await response.json();
            setResult(data);
            if (data.success) {
                setLastLoggedSymptom(symptomInput);
                setSymptomInput("");
                // Analyze the symptom for appointment suggestion
                analyzeSymptom(symptomInput);
            }
        } catch (error) {
            setResult({ success: false, error: "Failed to connect to AI" });
        } finally {
            setIsLoading(false);
        }
    };

    const analyzeSymptom = async (symptom: string) => {
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
                setSymptomAnalysis(data.analysis);
            }
        } catch (error) {
            console.error("Error analyzing symptom:", error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getSummary = async () => {
        setIsLoading(true);
        setResult(null);

        try {
            const response = await fetch("/api/agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "get_summary",
                    patientId,
                    patientName,
                }),
            });
            const data = await response.json();
            setResult(data);
        } catch (error) {
            setResult({ success: false, error: "Failed to generate summary" });
        } finally {
            setIsLoading(false);
        }
    };

    const getInsights = async () => {
        setIsLoading(true);
        setResult(null);

        try {
            const response = await fetch("/api/agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "get_insights",
                    patientId,
                    patientName,
                }),
            });
            const data = await response.json();
            setResult(data);
        } catch (error) {
            setResult({ success: false, error: "Failed to get insights" });
        } finally {
            setIsLoading(false);
        }
    };

    const getRecentSymptoms = async () => {
        setIsLoading(true);
        setResult(null);

        try {
            const response = await fetch("/api/agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "get_recent_symptoms",
                    patientId,
                }),
            });
            const data = await response.json();
            setResult(data);
        } catch (error) {
            setResult({ success: false, error: "Failed to fetch symptoms" });
        } finally {
            setIsLoading(false);
        }
    };

    const startVoiceInput = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert("Voice input is not supported in this browser. Please use Chrome.");
            return;
        }

        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setSymptomInput(prev => prev + (prev ? " " : "") + transcript);
        };

        recognition.start();
    };

    const closeModal = () => {
        setActiveModal(null);
        setResult(null);
        setSymptomInput("");
    };

    // Auto-fetch data when modal opens
    useEffect(() => {
        if (activeModal === 'summary') {
            getSummary();
        } else if (activeModal === 'insights') {
            getInsights();
        }
    }, [activeModal]);

    return (
        <>
            {/* Action Buttons */}
            <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-4'}`}>
                <button
                    onClick={() => { setActiveModal('symptom'); setResult(null); }}
                    className={`flex flex-col items-center gap-3 ${compact ? 'p-2' : 'p-5'} bg-teal-600 text-white rounded-2xl hover:bg-teal-700 transition shadow-lg`}
                >
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <ClipboardList className="w-6 h-6" />
                    </div>
                    <span className="font-semibold">Log Symptoms</span>
                </button>

                <button
                    onClick={() => { setActiveModal('summary'); getSummary(); }}
                    className={`flex flex-col items-center gap-3 ${compact ? 'p-2' : 'p-5'} bg-teal-600 text-white rounded-2xl hover:bg-teal-700 transition shadow-lg`}
                >
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6" />
                    </div>
                    <span className="font-semibold">Care Summary</span>
                </button>

                <button
                    onClick={() => { setActiveModal('insights'); getInsights(); }}
                    className={`flex flex-col items-center gap-3 ${compact ? 'p-2' : 'p-5'} bg-teal-600 text-white rounded-2xl hover:bg-teal-700 transition shadow-lg`}
                >
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <span className="font-semibold">AI Insights</span>
                </button>

                <button
                    onClick={() => { setActiveModal('history'); getRecentSymptoms(); }}
                    className={`flex flex-col items-center gap-3 ${compact ? 'p-2' : 'p-5'} bg-white text-teal-600 border-2 border-teal-200 rounded-2xl hover:bg-teal-50 transition`}
                >
                    <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                        <History className="w-6 h-6" />
                    </div>
                    <span className="font-semibold">Symptom Log</span>
                </button>

                <button
                    onClick={() => { setActiveModal('agent'); }}
                    className={`flex flex-col items-center gap-3 ${compact ? 'p-2' : 'p-5'} bg-gradient-to-br from-violet-600 to-teal-600 text-white rounded-2xl hover:from-violet-700 hover:to-teal-700 transition shadow-lg col-span-full`}
                >
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <Bot className="w-6 h-6" />
                    </div>
                    <span className="font-semibold">Ask CareLink AI</span>
                    <span className="text-[10px] opacity-80 -mt-2">Email · Calendar · Search · Maps</span>
                </button>
            </div>

            {/* Modal Overlay */}
            {activeModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className={`bg-white rounded-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl ${activeModal === 'agent' ? 'max-w-2xl' : 'max-w-xl'}`}>
                        {/* Modal Header */}
                        <div className={`px-6 py-4 text-white flex items-center justify-between ${activeModal === 'agent' ? 'bg-gradient-to-r from-violet-600 to-teal-600' : 'bg-teal-600'}`}>
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                {activeModal === 'symptom' && <><ClipboardList className="w-5 h-5" /> Log Symptom</>}
                                {activeModal === 'summary' && <><FileText className="w-5 h-5" /> Care Summary</>}
                                {activeModal === 'insights' && <><TrendingUp className="w-5 h-5" /> AI Insights</>}
                                {activeModal === 'history' && <><History className="w-5 h-5" /> Symptom History</>}
                                {activeModal === 'agent' && <><Bot className="w-5 h-5" /> CareLink AI Agent</>}
                            </h2>
                            <button onClick={closeModal} className="p-1 hover:bg-white/20 rounded-lg transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            {/* SYMPTOM LOGGING */}
                            {activeModal === 'symptom' && (
                                <div className="space-y-4">
                                    <p className="text-zinc-600 text-sm">
                                        Describe what you observed. The AI will parse and categorize it automatically.
                                    </p>

                                    <div className="relative">
                                        <textarea
                                            value={symptomInput}
                                            onChange={(e) => setSymptomInput(e.target.value)}
                                            placeholder="e.g., Had tremors in hands this morning after breakfast, seemed moderate..."
                                            rows={3}
                                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none"
                                        />
                                        <button
                                            onClick={startVoiceInput}
                                            disabled={isListening}
                                            className={`absolute right-3 bottom-3 p-2 rounded-lg transition ${isListening
                                                ? 'bg-red-100 text-red-600 animate-pulse'
                                                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                                }`}
                                        >
                                            <Mic className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {isListening && (
                                        <p className="text-sm text-red-600 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                            Listening... speak now
                                        </p>
                                    )}

                                    <button
                                        onClick={logSymptom}
                                        disabled={!symptomInput.trim() || isLoading}
                                        className="w-full py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? (
                                            <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                                        ) : (
                                            <><Send className="w-5 h-5" /> Log Symptom</>
                                        )}
                                    </button>

                                    {result && (
                                        <div className={`p-4 rounded-xl ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                            {result.success ? (
                                                <div className="flex items-start gap-3">
                                                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="font-medium text-green-800">{result.message}</p>
                                                        {result.data?.notes && (
                                                            <p className="text-sm text-green-700 mt-1">Notes: {result.data.notes}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-red-700">
                                                    <AlertCircle className="w-5 h-5" />
                                                    <span>{result.error}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* AI Symptom Analysis & Emergency Actions */}
                                    {result?.success && (isAnalyzing || symptomAnalysis) && (
                                        <div className={`mt-4 rounded-xl border-2 ${
                                            symptomAnalysis?.urgency === 'emergency' ? 'bg-red-50 border-red-300 animate-pulse-once' :
                                            symptomAnalysis?.urgency === 'high' ? 'bg-orange-50 border-orange-300' :
                                            'bg-teal-50 border-teal-200'
                                        }`}>
                                            {isAnalyzing ? (
                                                <div className="flex items-center gap-3 text-teal-700 p-4">
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    <span>AI is analyzing symptom urgency...</span>
                                                </div>
                                            ) : symptomAnalysis && (
                                                <div>
                                                    {/* EMERGENCY BANNER */}
                                                    {symptomAnalysis.urgency === 'emergency' && (
                                                        <div className="bg-red-600 text-white px-4 py-3 rounded-t-xl flex items-center gap-3">
                                                            <Siren className="w-6 h-6 flex-shrink-0 animate-bounce" />
                                                            <div>
                                                                <p className="font-bold text-sm">⚠️ EMERGENCY DETECTED</p>
                                                                <p className="text-xs text-red-100">This symptom may require immediate medical attention</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* HIGH URGENCY BANNER */}
                                                    {symptomAnalysis.urgency === 'high' && (
                                                        <div className="bg-orange-500 text-white px-4 py-3 rounded-t-xl flex items-center gap-3">
                                                            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                                                            <div>
                                                                <p className="font-bold text-sm">HIGH URGENCY</p>
                                                                <p className="text-xs text-orange-100">Prompt medical attention recommended</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="p-4">
                                                        {/* Urgency Badge — for low/moderate */}
                                                        {!['emergency', 'high'].includes(symptomAnalysis.urgency) && (
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <Stethoscope className="w-5 h-5 text-teal-600" />
                                                                <span className={`text-sm font-bold uppercase ${
                                                                    symptomAnalysis.urgency === 'moderate' ? 'text-yellow-700' : 'text-green-700'
                                                                }`}>
                                                                    {symptomAnalysis.urgency} Urgency
                                                                </span>
                                                            </div>
                                                        )}

                                                        <p className={`text-sm mb-4 ${
                                                            symptomAnalysis.urgency === 'emergency' ? 'text-red-800 font-medium' :
                                                            symptomAnalysis.urgency === 'high' ? 'text-orange-800' :
                                                            'text-teal-800'
                                                        }`}>{symptomAnalysis.recommendation}</p>

                                                        {/* EMERGENCY ACTIONS */}
                                                        {symptomAnalysis.urgency === 'emergency' && (
                                                            <div className="space-y-2 mb-4">
                                                                {/* Call 911 */}
                                                                <a
                                                                    href="tel:911"
                                                                    className="w-full py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 text-lg shadow-lg"
                                                                >
                                                                    <Phone className="w-5 h-5" />
                                                                    Call 911
                                                                </a>

                                                                {/* Email Doctor Immediately */}
                                                                {onSendEmergencyEmail && (
                                                                    <button
                                                                        onClick={() => {
                                                                            onSendEmergencyEmail(lastLoggedSymptom, symptomAnalysis.urgency);
                                                                        }}
                                                                        className="w-full py-2.5 bg-red-100 text-red-800 font-semibold rounded-lg hover:bg-red-200 transition flex items-center justify-center gap-2 border border-red-300"
                                                                    >
                                                                        <Mail className="w-4 h-4" />
                                                                        Email Doctor Immediately
                                                                    </button>
                                                                )}

                                                                {/* Emergency Contacts */}
                                                                {emergencyContacts.length > 0 && (
                                                                    <div className="bg-white rounded-lg border border-red-200 p-3">
                                                                        <p className="text-xs font-bold text-red-700 uppercase mb-2 flex items-center gap-1">
                                                                            <Phone className="w-3 h-3" /> Emergency Contacts
                                                                        </p>
                                                                        <div className="space-y-2">
                                                                            {emergencyContacts.map(contact => (
                                                                                <a
                                                                                    key={contact.id}
                                                                                    href={`tel:${contact.phone}`}
                                                                                    className="flex items-center justify-between p-2 bg-red-50 rounded-lg hover:bg-red-100 transition"
                                                                                >
                                                                                    <div>
                                                                                        <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                                                                                        <p className="text-xs text-gray-500">{contact.relationship}</p>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2 text-red-700">
                                                                                        <span className="text-sm font-medium">{contact.phone}</span>
                                                                                        <Phone className="w-4 h-4" />
                                                                                    </div>
                                                                                </a>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* HIGH URGENCY ACTIONS */}
                                                        {symptomAnalysis.urgency === 'high' && (
                                                            <div className="space-y-2 mb-4">
                                                                {/* Email Doctor */}
                                                                {onSendEmergencyEmail && (
                                                                    <button
                                                                        onClick={() => {
                                                                            onSendEmergencyEmail(lastLoggedSymptom, symptomAnalysis.urgency);
                                                                        }}
                                                                        className="w-full py-2.5 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition flex items-center justify-center gap-2"
                                                                    >
                                                                        <Mail className="w-4 h-4" />
                                                                        Email Doctor Now
                                                                    </button>
                                                                )}

                                                                {/* Emergency Contacts for high urgency too */}
                                                                {emergencyContacts.length > 0 && (
                                                                    <div className="bg-white rounded-lg border border-orange-200 p-3">
                                                                        <p className="text-xs font-bold text-orange-700 uppercase mb-2 flex items-center gap-1">
                                                                            <Phone className="w-3 h-3" /> Emergency Contacts
                                                                        </p>
                                                                        <div className="space-y-2">
                                                                            {emergencyContacts.map(contact => (
                                                                                <a
                                                                                    key={contact.id}
                                                                                    href={`tel:${contact.phone}`}
                                                                                    className="flex items-center justify-between p-2 bg-orange-50 rounded-lg hover:bg-orange-100 transition"
                                                                                >
                                                                                    <div>
                                                                                        <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                                                                                        <p className="text-xs text-gray-500">{contact.relationship}</p>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2 text-orange-700">
                                                                                        <span className="text-sm font-medium">{contact.phone}</span>
                                                                                        <Phone className="w-4 h-4" />
                                                                                    </div>
                                                                                </a>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Book Appointment — for all urgency levels */}
                                                        {symptomAnalysis.suggest_appointment && onBookAppointment && (
                                                            <button
                                                                onClick={() => {
                                                                    onBookAppointment(lastLoggedSymptom);
                                                                    closeModal();
                                                                }}
                                                                className={`w-full py-2.5 font-semibold rounded-lg transition flex items-center justify-center gap-2 ${
                                                                    ['emergency', 'high'].includes(symptomAnalysis.urgency)
                                                                        ? 'bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50'
                                                                        : 'bg-teal-600 text-white hover:bg-teal-700'
                                                                }`}
                                                            >
                                                                <Calendar className="w-4 h-4" />
                                                                Book Doctor Appointment
                                                            </button>
                                                        )}

                                                        {/* Draft email for moderate (non-emergency gets simpler option) */}
                                                        {symptomAnalysis.urgency === 'moderate' && onDraftEmail && (
                                                            <button
                                                                onClick={() => {
                                                                    onDraftEmail(lastLoggedSymptom, symptomAnalysis.urgency);
                                                                    closeModal();
                                                                }}
                                                                className="w-full mt-2 py-2.5 bg-white border-2 border-yellow-200 text-yellow-700 font-semibold rounded-lg hover:bg-yellow-50 transition flex items-center justify-center gap-2"
                                                            >
                                                                <Mail className="w-4 h-4" />
                                                                Draft Email to Doctor
                                                            </button>
                                                        )}

                                                        {/* Questions to ask */}
                                                        {symptomAnalysis.questions_to_ask.length > 0 && (
                                                            <div className={`mt-3 pt-3 border-t ${
                                                                symptomAnalysis.urgency === 'emergency' ? 'border-red-200' :
                                                                symptomAnalysis.urgency === 'high' ? 'border-orange-200' :
                                                                'border-teal-200'
                                                            }`}>
                                                                <p className="text-xs font-medium text-gray-600 mb-1">Questions for the doctor:</p>
                                                                <ul className="text-xs text-gray-500 space-y-0.5">
                                                                    {symptomAnalysis.questions_to_ask.map((q, i) => (
                                                                        <li key={i}>• {q}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* SUMMARY / INSIGHTS */}
                            {(activeModal === 'summary' || activeModal === 'insights') && (
                                <div>
                                    {isLoading ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                                            <Loader2 className="w-8 h-8 animate-spin mb-4" />
                                            <p>{activeModal === 'summary' ? 'Generating care summary...' : 'Analyzing patterns...'}</p>
                                        </div>
                                    ) : result?.success ? (
                                        <div className="prose prose-sm max-w-none">
                                            {activeModal === 'summary' && result.stats && (
                                                <div className="flex gap-4 mb-4">
                                                    <div className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm">
                                                        {result.stats.medications} medications
                                                    </div>
                                                    <div className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm">
                                                        {result.stats.recentSymptoms} recent symptoms
                                                    </div>
                                                </div>
                                            )}
                                            <div className="text-zinc-700">
                                                {formatAIText(activeModal === 'summary' ? result.summary : result.insights)}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-red-600">
                                            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                                            <p>{result?.error || 'Something went wrong'}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* SYMPTOM HISTORY */}
                            {activeModal === 'history' && (
                                <div>
                                    {isLoading ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                                            <Loader2 className="w-8 h-8 animate-spin mb-4" />
                                            <p>Loading symptom history...</p>
                                        </div>
                                    ) : result?.success ? (
                                        result.symptoms.length === 0 ? (
                                            <div className="text-center py-8 text-zinc-500">
                                                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                                <p>No symptoms logged yet</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {result.symptoms.map((s: SymptomLog) => (
                                                    <div key={s.id} className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <p className="font-medium text-zinc-900">{s.symptom}</p>
                                                                {s.notes && <p className="text-sm text-zinc-500 mt-1">{s.notes}</p>}
                                                            </div>
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${s.severity === 'severe' ? 'bg-red-100 text-red-800' :
                                                                s.severity === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                                                                    'bg-green-100 text-green-800'
                                                                }`}>
                                                                {s.severity}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-zinc-400 mt-2">
                                                            {new Date(s.logged_at).toLocaleString()}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    ) : (
                                        <div className="text-center py-8 text-red-600">
                                            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                                            <p>{result?.error || 'Failed to load symptoms'}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* AUTONOMOUS AGENT CHAT */}
                            {activeModal === 'agent' && (
                                <div className="flex flex-col h-[55vh]">
                                    {/* Intro */}
                                    {agentMessages.length === 0 && !isAgentLoading && (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                                            <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-teal-100 rounded-2xl flex items-center justify-center mb-4">
                                                <Bot className="w-8 h-8 text-teal-600" />
                                            </div>
                                            <h3 className="font-bold text-zinc-900 mb-2">CareLink AI Agent</h3>
                                            <p className="text-sm text-zinc-500 mb-4">
                                                I can take actions for you autonomously. Try asking me to:
                                            </p>
                                            <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
                                                {[
                                                    "Email Dr. Smith about the latest symptoms",
                                                    "Book a follow-up appointment next Tuesday at 2 PM",
                                                    "Search for Parkinson's tremor management tips",
                                                    "Find nearby pharmacies open now",
                                                    "Send a Telegram update to the family"
                                                ].map((suggestion, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => { setAgentInput(suggestion); }}
                                                        className="text-left text-xs px-3 py-2 bg-zinc-50 hover:bg-teal-50 border border-zinc-200 hover:border-teal-300 rounded-lg transition text-zinc-600 hover:text-teal-700"
                                                    >
                                                        <Zap className="w-3 h-3 inline mr-1.5 text-teal-500" />
                                                        {suggestion}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Messages */}
                                    {agentMessages.length > 0 && (
                                        <div className="flex-1 overflow-y-auto space-y-3 mb-3">
                                            {agentMessages.map((msg, i) => (
                                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                                        ? 'bg-teal-600 text-white'
                                                        : 'bg-zinc-100 text-zinc-800'
                                                        }`}>
                                                        <div className="text-sm whitespace-pre-wrap">{formatAIText(msg.text)}</div>
                                                        {msg.actions && msg.actions.length > 0 && (
                                                            <div className="mt-2 pt-2 border-t border-zinc-200/50">
                                                                <p className="text-[10px] font-bold uppercase text-zinc-500 mb-1">Actions taken:</p>
                                                                {msg.actions.map((a: any, j: number) => (
                                                                    <div key={j} className="flex items-center gap-1.5 text-[11px] text-teal-700 bg-teal-50 rounded px-2 py-1 mb-1">
                                                                        <CheckCircle className="w-3 h-3" />
                                                                        <span className="font-medium">{a.tool}</span>
                                                                        <span className="text-zinc-500 truncate">— {a.result?.slice(0, 60)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {isAgentLoading && (
                                                <div className="flex justify-start">
                                                    <div className="bg-zinc-100 rounded-2xl px-4 py-3 flex items-center gap-2 text-zinc-500">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        <span className="text-sm">Agent is working...</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Input */}
                                    <div className="flex gap-2 pt-2 border-t border-zinc-100">
                                        <input
                                            value={agentInput}
                                            onChange={e => setAgentInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendAgentMessage()}
                                            placeholder="Ask the AI agent to do something..."
                                            className="flex-1 px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
                                            disabled={isAgentLoading}
                                        />
                                        <button
                                            onClick={sendAgentMessage}
                                            disabled={!agentInput.trim() || isAgentLoading}
                                            className="px-4 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 transition"
                                        >
                                            <Send className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
