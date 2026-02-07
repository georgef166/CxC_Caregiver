import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

// GET - Fetch unread emails
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const maxResults = searchParams.get("max_results") || "10";

    try {
        const response = await fetch(`${BACKEND_URL}/emails/unread?max_results=${maxResults}`);
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching emails:", error);
        return NextResponse.json(
            { success: false, error: "Failed to connect to email service" },
            { status: 500 }
        );
    }
}

// POST - Handle various email actions
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, ...data } = body;

        let endpoint = "";
        let method = "POST";

        switch (action) {
            case "generate-reply":
                endpoint = "/emails/generate-reply";
                break;
            case "analyze":
                endpoint = "/emails/analyze";
                break;
            case "send":
                endpoint = "/emails/send";
                break;
            case "mark-read":
                endpoint = "/emails/mark-read";
                break;
            default:
                return NextResponse.json(
                    { success: false, error: "Unknown action" },
                    { status: 400 }
                );
        }

        const response = await fetch(`${BACKEND_URL}${endpoint}`, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        const result = await response.json();
        return NextResponse.json(result);
    } catch (error) {
        console.error("Error with email action:", error);
        return NextResponse.json(
            { success: false, error: "Failed to process email action" },
            { status: 500 }
        );
    }
}
