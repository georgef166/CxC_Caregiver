"use client";

import { useState, useEffect } from "react";
import {
    Calendar, Clock, MapPin, RefreshCw, Loader2, ExternalLink,
    ChevronLeft, ChevronRight, AlertCircle
} from "lucide-react";

type CalendarEvent = {
    id: string;
    summary: string;
    description: string;
    location: string;
    start: string;
    end: string;
    html_link: string;
    status: string;
};

export default function GoogleCalendarView() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [days, setDays] = useState(14);

    const fetchEvents = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/calendar?days=${days}`);
            const data = await res.json();
            if (data.success) {
                setEvents(data.events);
            } else {
                setError(data.detail || data.error || "Failed to load calendar");
            }
        } catch {
            setError("Could not connect to calendar service");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, [days]);

    // Group events by date
    const grouped: Record<string, CalendarEvent[]> = {};
    events.forEach(ev => {
        const dateStr = ev.start.includes("T")
            ? ev.start.split("T")[0]
            : ev.start;
        if (!grouped[dateStr]) grouped[dateStr] = [];
        grouped[dateStr].push(ev);
    });
    const sortedDates = Object.keys(grouped).sort();

    const formatTime = (iso: string) => {
        if (!iso.includes("T")) return "All day";
        return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    };

    const formatDateHeader = (dateStr: string) => {
        const d = new Date(dateStr + "T00:00:00");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (d.getTime() === today.getTime()) return "Today";
        if (d.getTime() === tomorrow.getTime()) return "Tomorrow";
        return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    };

    const getDuration = (start: string, end: string) => {
        if (!start.includes("T") || !end.includes("T")) return "";
        const ms = new Date(end).getTime() - new Date(start).getTime();
        const mins = Math.round(ms / 60000);
        if (mins < 60) return `${mins}m`;
        const hrs = Math.floor(mins / 60);
        const rem = mins % 60;
        return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
    };

    const getEventColor = (summary: string) => {
        const s = summary.toLowerCase();
        if (s.includes("appointment") || s.includes("doctor") || s.includes("dr."))
            return "border-l-teal-500 bg-teal-50/50";
        if (s.includes("follow-up") || s.includes("followup"))
            return "border-l-blue-500 bg-blue-50/50";
        if (s.includes("urgent") || s.includes("emergency"))
            return "border-l-red-500 bg-red-50/50";
        return "border-l-gray-300 bg-white";
    };

    return (
        <div className="bg-white rounded-xl border border-gray-100 h-full flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-white to-gray-50">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-teal-600" />
                        Google Calendar
                    </h3>
                    <p className="text-sm text-gray-500">
                        Upcoming events from your connected calendar
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Range Selector */}
                    <div className="flex items-center bg-gray-100 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setDays(Math.max(7, days - 7))}
                            className="p-2 hover:bg-gray-200 transition"
                            title="Show fewer days"
                        >
                            <ChevronLeft className="w-4 h-4 text-gray-600" />
                        </button>
                        <span className="px-2 text-sm font-medium text-gray-700 min-w-[60px] text-center">
                            {days} days
                        </span>
                        <button
                            onClick={() => setDays(Math.min(60, days + 7))}
                            className="p-2 hover:bg-gray-200 transition"
                            title="Show more days"
                        >
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>
                    <button
                        onClick={fetchEvents}
                        disabled={isLoading}
                        className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 bg-gray-50/50">
                {isLoading && events.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-3" />
                        <p className="text-gray-500 text-sm">Loading calendar events...</p>
                    </div>
                )}

                {error && (
                    <div className="flex flex-col items-center justify-center py-16">
                        <AlertCircle className="w-10 h-10 text-orange-400 mb-3" />
                        <p className="text-gray-700 font-medium mb-1">Calendar Unavailable</p>
                        <p className="text-sm text-gray-500 text-center max-w-sm mb-4">{error}</p>
                        <button
                            onClick={fetchEvents}
                            className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {!isLoading && !error && events.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                            <Calendar className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-gray-700 font-medium mb-1">No upcoming events</p>
                        <p className="text-sm text-gray-500">
                            Nothing on the calendar for the next {days} days
                        </p>
                    </div>
                )}

                {!error && sortedDates.length > 0 && (
                    <div className="space-y-6">
                        {sortedDates.map(dateStr => (
                            <div key={dateStr}>
                                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
                                    {formatDateHeader(dateStr)}
                                </h4>
                                <div className="space-y-2">
                                    {grouped[dateStr].map(ev => (
                                        <div
                                            key={ev.id}
                                            className={`p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition border-l-4 ${getEventColor(ev.summary)}`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <h5 className="font-semibold text-gray-900 truncate">
                                                        {ev.summary}
                                                    </h5>
                                                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {formatTime(ev.start)}
                                                            {getDuration(ev.start, ev.end) && (
                                                                <span className="text-gray-400">
                                                                    ({getDuration(ev.start, ev.end)})
                                                                </span>
                                                            )}
                                                        </span>
                                                        {ev.location && (
                                                            <span className="flex items-center gap-1">
                                                                <MapPin className="w-3.5 h-3.5" />
                                                                <span className="truncate max-w-[200px]">{ev.location}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                    {ev.description && (
                                                        <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                                                            {ev.description}
                                                        </p>
                                                    )}
                                                </div>
                                                {ev.html_link && (
                                                    <a
                                                        href={ev.html_link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="ml-3 p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition flex-shrink-0"
                                                        title="Open in Google Calendar"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
