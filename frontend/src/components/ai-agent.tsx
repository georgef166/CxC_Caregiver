"use client";

import { useState, useEffect } from "react";
import { ClipboardList, FileText, TrendingUp, Mic, X, Loader2, Send, CheckCircle, AlertCircle, History, Calendar, Stethoscope, Mail } from "lucide-react";

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

type SymptomAnalysis = {
    symptom: string;
    urgency: string;
    recommendation: string;
    suggest_appointment: boolean;
    suggested_timeframe: string;
    questions_to_ask: string[];
};

export default function AIAgent({ patientId, patientName, doctors = [], onBookAppointment, onDraftEmail, forceOpenAction, compact = false }: {
    patientId: string;
    patientName: string;
    doctors?: Doctor[];
    onBookAppointment?: (symptom: string) => void;
    onDraftEmail?: (symptom: string, urgency: string) => void;
    forceOpenAction?: 'symptom' | 'summary' | 'insights' | null;
    compact?: boolean;
}) {
    const [activeModal, setActiveModal] = useState<'symptom' | 'summary' | 'insights' | 'history' | null>(null);

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

    const logSymptom = async () => {
        if (!symptomInput.trim()) return;
        setIsLoading(true);
        setResult(null);

        try {
            const response = await fetch("/api/ai-chat", {
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
            const response = await fetch("/api/ai-chat", {
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
            const response = await fetch("/api/ai-chat", {
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
            const response = await fetch("/api/ai-chat", {
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
            </div>

            {/* Modal Overlay */}
            {activeModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
                        {/* Modal Header */}
                        <div className="px-6 py-4 bg-teal-600 text-white flex items-center justify-between">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                {activeModal === 'symptom' && <><ClipboardList className="w-5 h-5" /> Log Symptom</>}
                                {activeModal === 'summary' && <><FileText className="w-5 h-5" /> Care Summary</>}
                                {activeModal === 'insights' && <><TrendingUp className="w-5 h-5" /> AI Insights</>}
                                {activeModal === 'history' && <><History className="w-5 h-5" /> Symptom History</>}
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

                                    {/* AI Appointment Suggestion */}
                                    {result?.success && (isAnalyzing || symptomAnalysis) && (
                                        <div className="mt-4 p-4 rounded-xl bg-teal-50 border border-teal-200">
                                            {isAnalyzing ? (
                                                <div className="flex items-center gap-3 text-teal-700">
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    <span>AI is analyzing symptom urgency...</span>
                                                </div>
                                            ) : symptomAnalysis && (
                                                <div>
                                                    {/* Urgency Badge */}
                                                    <div className="flex items-center gap-2 mb-3">
                                                        {symptomAnalysis.urgency === 'high' || symptomAnalysis.urgency === 'emergency' ? (
                                                            <AlertCircle className="w-5 h-5 text-orange-600" />
                                                        ) : (
                                                            <Stethoscope className="w-5 h-5 text-teal-600" />
                                                        )}
                                                        <span className={`text-sm font-bold uppercase ${symptomAnalysis.urgency === 'emergency' ? 'text-red-700' :
                                                            symptomAnalysis.urgency === 'high' ? 'text-orange-700' :
                                                                symptomAnalysis.urgency === 'moderate' ? 'text-yellow-700' :
                                                                    'text-green-700'
                                                            }`}>
                                                            {symptomAnalysis.urgency} Urgency
                                                        </span>
                                                    </div>

                                                    <p className="text-sm text-teal-800 mb-3">{symptomAnalysis.recommendation}</p>

                                                    {symptomAnalysis.suggest_appointment && onBookAppointment && (
                                                        <button
                                                            onClick={() => {
                                                                onBookAppointment(lastLoggedSymptom);
                                                                closeModal();
                                                            }}
                                                            className="w-full py-2.5 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition flex items-center justify-center gap-2"
                                                        >
                                                            <Calendar className="w-4 h-4" />
                                                            Book Doctor Appointment
                                                        </button>
                                                    )}

                                                    {['high', 'emergency'].includes(symptomAnalysis.urgency) && onDraftEmail && (
                                                        <button
                                                            onClick={() => {
                                                                onDraftEmail(lastLoggedSymptom, symptomAnalysis.urgency);
                                                                closeModal();
                                                            }}
                                                            className="w-full mt-3 py-2.5 bg-white border-2 border-red-100 text-red-700 font-semibold rounded-lg hover:bg-red-50 transition flex items-center justify-center gap-2"
                                                        >
                                                            <Mail className="w-5 h-5" />
                                                            Draft Dr. Email
                                                        </button>
                                                    )}

                                                    {symptomAnalysis.questions_to_ask.length > 0 && (
                                                        <div className="mt-3 pt-3 border-t border-teal-200">
                                                            <p className="text-xs font-medium text-teal-700 mb-1">Questions for the doctor:</p>
                                                            <ul className="text-xs text-teal-600 space-y-0.5">
                                                                {symptomAnalysis.questions_to_ask.slice(0, 2).map((q, i) => (
                                                                    <li key={i}>• {q}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
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
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
