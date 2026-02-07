import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

// POST - Handle appointment actions (book or send calendar invite)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, ...data } = body;

        let endpoint = "";

        switch (action) {
            case "book":
                endpoint = "/appointments/book";
                break;
            case "calendar-invite":
                endpoint = "/appointments/calendar-invite";
                break;
            default:
                return NextResponse.json(
                    { success: false, error: "Unknown action" },
                    { status: 400 }
                );
        }

        const response = await fetch(`${BACKEND_URL}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        const result = await response.json();
        return NextResponse.json(result);
    } catch (error) {
        console.error("Error with appointment action:", error);
        return NextResponse.json(
            { success: false, error: "Failed to process appointment action" },
            { status: 500 }
        );
    }
}
