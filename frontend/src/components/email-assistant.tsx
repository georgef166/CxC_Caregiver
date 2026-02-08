"use client";

import { useState, useEffect } from "react";
import { Mail, Send, RefreshCw, Sparkles, X, Loader2, Clock, User, CheckCircle, AlertCircle, MessageSquare } from "lucide-react";

type Email = {
    id: string;
    subject: string;
    sender: string;
    snippet: string;
    date: string;
    body?: string;
};

type EmailAssistantProps = {
    patientName?: string;
    doctorEmails?: string[];
    draftData?: { to: string; subject: string; body: string } | null;
};

export default function EmailAssistant({ patientName, doctorEmails = [], draftData }: EmailAssistantProps) {
    const [emails, setEmails] = useState<Email[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [generatedReply, setGeneratedReply] = useState<{ subject: string; body: string } | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [showCompose, setShowCompose] = useState(false);
    const [composeData, setComposeData] = useState({ to: "", subject: "", body: "" });
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Fetch unread emails
    const fetchEmails = async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/email?max_results=5");
            const data = await response.json();
            if (data.success) {
                setEmails(data.emails || []);
            }
        } catch (error) {
            console.error("Error fetching emails:", error);
            setMessage({ type: "error", text: "Failed to fetch emails" });
        } finally {
            setIsLoading(false);
        }
    };

    // Generate AI reply
    const generateReply = async (email: Email) => {
        setIsGenerating(true);
        setGeneratedReply(null);
        try {
            const response = await fetch("/api/email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "generate-reply",
                    email_subject: email.subject,
                    email_body: email.body || email.snippet,
                    sender: email.sender,
                    context: patientName ? `This is regarding patient care for ${patientName}` : undefined,
                    tone: "professional"
                }),
            });
            const data = await response.json();
            if (data.success) {
                setGeneratedReply(data.reply);
            } else {
                setMessage({ type: "error", text: "Failed to generate reply" });
            }
        } catch (error) {
            console.error("Error generating reply:", error);
            setMessage({ type: "error", text: "Failed to generate reply" });
        } finally {
            setIsGenerating(false);
        }
    };

    // Send email
    const sendEmail = async (to: string[], subject: string, body: string) => {
        setIsSending(true);
        try {
            const response = await fetch("/api/email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "send",
                    to,
                    subject,
                    body
                }),
            });
            const data = await response.json();
            if (data.success) {
                setMessage({ type: "success", text: "Email sent successfully!" });
                setSelectedEmail(null);
                setGeneratedReply(null);
                setShowCompose(false);
                setComposeData({ to: "", subject: "", body: "" });
            } else {
                setMessage({ type: "error", text: "Failed to send email" });
            }
        } catch (error) {
            console.error("Error sending email:", error);
            setMessage({ type: "error", text: "Failed to send email" });
        } finally {
            setIsSending(false);
        }
    };

    // Mark email as read
    const markAsRead = async (messageId: string) => {
        try {
            await fetch("/api/email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "mark-read",
                    message_id: messageId
                }),
            });
            setEmails(emails.filter(e => e.id !== messageId));
        } catch (error) {
            console.error("Error marking as read:", error);
        }
    };

    useEffect(() => {
        fetchEmails();
    }, []);

    // Auto-hide messages
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    // Handle external draft triggers
    useEffect(() => {
        if (draftData) {
            setComposeData(draftData);
            setShowCompose(true);
        }
    }, [draftData]);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                        <Mail className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">Email Assistant</h3>
                        <p className="text-xs text-gray-500">AI-powered email management</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowCompose(true)}
                        className="px-3 py-1.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition flex items-center gap-1"
                    >
                        <Send className="w-4 h-4" />
                        Compose
                    </button>
                    <button
                        onClick={fetchEmails}
                        disabled={isLoading}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                        <RefreshCw className={`w-4 h-4 text-gray-500 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Message Alert */}
            {message && (
                <div className={`px-4 py-3 flex items-center gap-2 ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {message.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span className="text-sm">{message.text}</span>
                </div>
            )}

            {/* Content */}
            <div className="p-4">
                {isLoading && emails.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-gray-500">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                        Loading emails...
                    </div>
                ) : emails.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Mail className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>No unread emails</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {emails.map((email) => (
                            <div
                                key={email.id}
                                className="p-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition cursor-pointer flex items-center justify-between group"
                                onClick={() => setSelectedEmail(email)}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex-shrink-0 flex items-center justify-center group-hover:bg-teal-50 group-hover:text-teal-600 transition">
                                        <User className="w-4 h-4 text-gray-500 group-hover:text-teal-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-900 text-sm truncate">{email.sender.split('<')[0].trim()}</p>
                                        {(patientName && (email.subject + email.snippet).toLowerCase().includes(patientName.toLowerCase()) ||
                                            ['patient', 'appoint', 'health', 'care', 'urgent', 'lab', 'test', 'result'].some(k => (email.subject + email.snippet).toLowerCase().includes(k))) && (
                                                <p className="text-xs font-medium text-teal-600 truncate">{email.subject}</p>
                                            )}
                                    </div>
                                </div>
                                <div className="text-xs text-gray-400 flex-shrink-0 ml-2">
                                    {new Date(email.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Email Detail Modal */}
            {selectedEmail && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl">
                        <div className="px-6 py-4 bg-teal-600 text-white flex items-center justify-between">
                            <h2 className="font-bold truncate flex-1 mr-4">{selectedEmail.subject}</h2>
                            <button onClick={() => { setSelectedEmail(null); setGeneratedReply(null); }} className="p-1 hover:bg-white/20 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-teal-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">{selectedEmail.sender}</p>
                                    <p className="text-xs text-gray-500">{selectedEmail.date}</p>
                                </div>
                            </div>

                            <div className="prose prose-sm max-w-none mb-6">
                                <p className="text-gray-700 whitespace-pre-wrap">{selectedEmail.body || selectedEmail.snippet}</p>
                            </div>

                            <div className="flex gap-3 mb-6">
                                <button
                                    onClick={() => generateReply(selectedEmail)}
                                    disabled={isGenerating}
                                    className="flex-1 py-2.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                                >
                                    {isGenerating ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                                    ) : (
                                        <><Sparkles className="w-4 h-4" /> Generate AI Reply</>
                                    )}
                                </button>
                                <button
                                    onClick={() => markAsRead(selectedEmail.id)}
                                    className="px-4 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition"
                                >
                                    Mark Read
                                </button>
                            </div>

                            {generatedReply && (
                                <div className="bg-teal-50 rounded-xl p-4 border border-teal-200">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Sparkles className="w-4 h-4 text-teal-600" />
                                        <span className="font-semibold text-teal-800">AI Generated Reply</span>
                                    </div>
                                    <p className="text-sm font-medium text-teal-900 mb-2">Subject: {generatedReply.subject}</p>
                                    <p className="text-sm text-teal-800 whitespace-pre-wrap mb-4">{generatedReply.body}</p>
                                    <button
                                        onClick={() => {
                                            const senderEmail = selectedEmail.sender.match(/<(.+)>/)?.[1] || selectedEmail.sender;
                                            sendEmail([senderEmail], generatedReply.subject, generatedReply.body);
                                        }}
                                        disabled={isSending}
                                        className="w-full py-2.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                                    >
                                        {isSending ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                                        ) : (
                                            <><Send className="w-4 h-4" /> Send Reply</>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Compose Modal */}
            {showCompose && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
                        <div className="px-6 py-4 bg-teal-600 text-white flex items-center justify-between">
                            <h2 className="font-bold flex items-center gap-2">
                                <MessageSquare className="w-5 h-5" /> New Email
                            </h2>
                            <button onClick={() => setShowCompose(false)} className="p-1 hover:bg-white/20 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                                <input
                                    type="email"
                                    value={composeData.to}
                                    onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                                    placeholder="recipient@example.com"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                <input
                                    type="text"
                                    value={composeData.subject}
                                    onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                                    placeholder="Email subject"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                <textarea
                                    value={composeData.body}
                                    onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                                    placeholder="Type your message..."
                                    rows={6}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                                />
                            </div>
                            <button
                                onClick={() => sendEmail([composeData.to], composeData.subject, composeData.body)}
                                disabled={isSending || !composeData.to || !composeData.subject || !composeData.body}
                                className="w-full py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                            >
                                {isSending ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</>
                                ) : (
                                    <><Send className="w-5 h-5" /> Send Email</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
