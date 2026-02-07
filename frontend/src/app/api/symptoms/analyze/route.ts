import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

// POST - Analyze symptom and get AI recommendations
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const response = await fetch(`${BACKEND_URL}/symptoms/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error analyzing symptom:", error);
        return NextResponse.json(
            { success: false, error: "Failed to analyze symptom" },
            { status: 500 }
        );
    }
}
