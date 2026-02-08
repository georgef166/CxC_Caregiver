"use client";
import { useState, useEffect } from "react";
import { Check, X, Edit, Loader2, AlertCircle, Mail, MessageSquare, HeartPulse, Clock, RefreshCw, Sparkles, Pill, Calendar } from "lucide-react";

type Task = {
    id: string;
    type: string;
    title: string;
    description: string;
    urgency: "low" | "medium" | "high";
    status: string;
    payload?: any;
    created_at: string;
};

interface TaskQueueProps {
    onEditTask?: (task: Task) => void;
    patientName?: string;
    doctorEmails?: string[];
    doctorNames?: string[];
    contactEmails?: string[];
}

export default function TaskQueue({ onEditTask, patientName, doctorEmails, doctorNames, contactEmails }: TaskQueueProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchTasks = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (patientName) params.set('patient_name', patientName);
            if (doctorEmails?.length) params.set('doctor_emails', doctorEmails.join(','));
            if (doctorNames?.length) params.set('doctor_names', doctorNames.join(','));
            if (contactEmails?.length) params.set('contact_emails', contactEmails.join(','));
            const url = `http://localhost:8000/tasks${params.toString() ? '?' + params.toString() : ''}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setTasks(data);
            }
        } catch (error) {
            console.error("Error fetching tasks:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const patientKey = patientName || "";

    useEffect(() => {
        fetchTasks();
        const interval = setInterval(fetchTasks, 1000); // Poll every 1s for live updates
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientKey]);

    const handleAccept = async (id: string) => {
        setProcessingId(id);
        try {
            await fetch(`http://localhost:8000/tasks/${id}/accept`, { method: "POST" });
            fetchTasks();
        } catch (error) {
            console.error("Error accepting task:", error);
        } finally {
            setProcessingId(null);
        }
    };

    const handleDismiss = async (id: string) => {
        setProcessingId(id);
        try {
            await fetch(`http://localhost:8000/tasks/${id}/dismiss`, { method: "POST" });
            fetchTasks();
        } catch (error) {
            console.error("Error dismissing task:", error);
        } finally {
            setProcessingId(null);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "email_reply": return <Mail className="w-4 h-4 text-blue-500" />;
            case "telegram_reply": return <MessageSquare className="w-4 h-4 text-sky-500" />;
            case "health_alert": return <HeartPulse className="w-4 h-4 text-red-500" />;
            case "prescription_refill": return <Pill className="w-4 h-4 text-purple-500" />;
            case "appointment_scheduler": return <Calendar className="w-4 h-4 text-teal-500" />;
            default: return <Clock className="w-4 h-4 text-gray-500" />;
        }
    };

    if (tasks.length === 0 && !isLoading) {
        return (
            <div className="p-4 bg-white rounded-xl border border-dashed border-gray-200 text-center text-sm text-gray-500">
                <p>No active tasks</p>
                <button onClick={fetchTasks} className="mt-2 text-teal-600 hover:underline flex items-center justify-center gap-1 mx-auto"><RefreshCw className="w-3 h-3" /> Refresh</button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mt-6">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    AI Task Queue
                </h3>
                <div className="flex items-center gap-2">
                    <button onClick={fetchTasks} className="p-1 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded transition" title="Scan Now">
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                    <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-0.5 rounded-full">{tasks.length}</span>
                </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
                {tasks.map(task => (
                    <div key={task.id} className="p-3 border-b border-gray-50 hover:bg-gray-50 transition group">
                        <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-2">
                                {getIcon(task.type)}
                                <span className="font-semibold text-gray-800 text-sm truncate max-w-[150px]">{task.title}</span>
                            </div>
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${task.urgency === 'high' ? 'bg-red-100 text-red-700' :
                                task.urgency === 'medium' ? 'bg-orange-100 text-orange-700' :
                                    'bg-green-100 text-green-700'
                                }`}>
                                {task.urgency}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{task.description}</p>

                        <div className="flex items-center gap-2 mt-2">
                            {task.type === 'email_reply' ? (
                                <>
                                    <button
                                        onClick={() => handleAccept(task.id)}
                                        disabled={!!processingId}
                                        className="flex-1 py-1.5 bg-teal-600 text-white text-xs font-medium rounded hover:bg-teal-700 transition flex items-center justify-center gap-1"
                                        title="Send the AI-drafted reply as-is"
                                    >
                                        {processingId === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                        Confirm
                                    </button>
                                    {onEditTask && (
                                        <button
                                            onClick={() => onEditTask(task)}
                                            disabled={!!processingId}
                                            className="flex-1 py-1.5 text-teal-700 bg-teal-50 hover:bg-teal-100 text-xs font-medium rounded transition flex items-center justify-center gap-1"
                                            title="Review and edit before sending"
                                        >
                                            <Edit className="w-3 h-3" />
                                            Review
                                        </button>
                                    )}
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => handleAccept(task.id)}
                                        disabled={!!processingId}
                                        className="flex-1 py-1.5 bg-teal-600 text-white text-xs font-medium rounded hover:bg-teal-700 transition flex items-center justify-center gap-1"
                                    >
                                        {processingId === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                        Accept
                                    </button>
                                    {onEditTask && (
                                        <button
                                            onClick={() => onEditTask(task)}
                                            disabled={!!processingId}
                                            className="flex-1 py-1.5 text-gray-500 hover:bg-gray-100 text-xs font-medium rounded transition flex items-center justify-center gap-1"
                                            title="Modify"
                                        >
                                            <Edit className="w-3 h-3" />
                                            Edit
                                        </button>
                                    )}
                                </>
                            )}

                            <button
                                onClick={() => handleDismiss(task.id)}
                                disabled={!!processingId}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                                title="Dismiss"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
