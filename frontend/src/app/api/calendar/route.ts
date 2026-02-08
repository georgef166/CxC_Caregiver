import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

// GET - Fetch Google Calendar events
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const days = searchParams.get("days") || "14";

        const response = await fetch(`${BACKEND_URL}/calendar/events?days=${days}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        const result = await response.json();
        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching calendar events:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch calendar events" },
            { status: 500 }
        );
    }
}
