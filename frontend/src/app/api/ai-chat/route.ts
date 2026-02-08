import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create Supabase client lazily
function getSupabase() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("Missing Supabase environment variables");
    }
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
}

// Call OpenRouter API
async function callAI(prompt: string): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error("Missing OPENROUTER_API_KEY");
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            "X-Title": "CareLink"
        },
        body: JSON.stringify({
            model: "google/gemini-2.0-flash-001",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1000,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
}

export async function POST(req: NextRequest) {
    try {
        const { action, patientId, patientName, input } = await req.json();

        const supabase = getSupabase();

        // Handle different actions
        switch (action) {
            case "log_symptom": {
                let parsedData;

                try {
                    const prompt = `Parse this symptom description and extract structured data. 
Input: "${input}"

Respond with ONLY valid JSON in this exact format (no markdown, no code blocks):
{"symptom": "brief symptom description", "severity": "mild|moderate|severe", "notes": "any additional details or null"}

If you can't determine severity, use "moderate". Be concise with the symptom description.`;

                    const result = await callAI(prompt);
                    const cleaned = result.replace(/```json\n?|\n?```/g, '').trim();
                    parsedData = JSON.parse(cleaned);
                } catch (aiError: any) {
                    console.log("AI fallback - using direct input:", aiError.message);

                    let severity = "moderate";
                    const lowerInput = input.toLowerCase();
                    if (lowerInput.includes("severe") || lowerInput.includes("bad") || lowerInput.includes("terrible")) {
                        severity = "severe";
                    } else if (lowerInput.includes("mild") || lowerInput.includes("slight") || lowerInput.includes("minor")) {
                        severity = "mild";
                    }

                    parsedData = { symptom: input, severity, notes: null };
                }

                const { error } = await supabase.from("symptom_logs").insert({
                    patient_id: patientId,
                    symptom: parsedData.symptom,
                    severity: parsedData.severity || "moderate",
                    notes: parsedData.notes,
                    logged_at: new Date().toISOString(),
                });

                if (error) throw error;

                return NextResponse.json({
                    success: true,
                    message: `Logged: "${parsedData.symptom}" (${parsedData.severity})`,
                    data: parsedData
                });
            }

            case "get_summary": {
                const { data: patient } = await supabase
                    .from("profiles")
                    .select("full_name, diagnosis_details, date_of_birth")
                    .eq("id", patientId)
                    .single();

                const { data: meds } = await supabase
                    .from("medications")
                    .select("name, dosage, frequency")
                    .eq("patient_id", patientId)
                    .eq("is_current", true);

                const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
                const { data: symptoms } = await supabase
                    .from("symptom_logs")
                    .select("symptom, severity, logged_at")
                    .eq("patient_id", patientId)
                    .gte("logged_at", cutoff)
                    .order("logged_at", { ascending: false });

                let summary: string;

                try {
                    const prompt = `Generate a brief care summary for a doctor visit based on this data:

Patient: ${patient?.full_name || patientName}
Diagnosis: ${patient?.diagnosis_details || "Parkinson's Disease"}

Current Medications (${meds?.length || 0}):
${meds?.map(m => `- ${m.name} (${m.dosage}) ${m.frequency}`).join("\n") || "None recorded"}

Recent Symptoms (last 14 days, ${symptoms?.length || 0} logged):
${symptoms?.map(s => `- ${new Date(s.logged_at).toLocaleDateString()}: ${s.symptom} (${s.severity})`).join("\n") || "None logged"}

Write a concise 2-3 paragraph summary highlighting:
1. Current medication regimen
2. Symptom patterns or concerns
3. Any recommendations for the doctor to consider

Be professional but compassionate. This is for a Parkinson's patient.`;

                    summary = await callAI(prompt);
                } catch (aiError) {
                    console.log("AI fallback - generating basic summary");
                    const severeCount = symptoms?.filter(s => s.severity === 'severe').length || 0;

                    summary = `**Care Summary for ${patient?.full_name || patientName}**
Generated: ${new Date().toLocaleDateString()}

**Diagnosis:** ${patient?.diagnosis_details || "Parkinson's Disease"}

**Current Medications (${meds?.length || 0}):**
${meds?.map(m => `• ${m.name} (${m.dosage}) - ${m.frequency}`).join("\n") || "No medications on file"}

**Recent Symptoms (last 14 days):**
${symptoms?.length ? symptoms.map(s => `• ${new Date(s.logged_at).toLocaleDateString()}: ${s.symptom} (${s.severity})`).join("\n") : "No symptoms logged"}

${severeCount > 0 ? `⚠️ Note: ${severeCount} severe symptom(s) recorded in the past 2 weeks.` : ""}`;
                }

                return NextResponse.json({
                    success: true,
                    summary,
                    stats: {
                        medications: meds?.length || 0,
                        recentSymptoms: symptoms?.length || 0,
                    }
                });
            }

            case "get_insights": {
                const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
                const { data: symptoms } = await supabase
                    .from("symptom_logs")
                    .select("symptom, severity, logged_at, notes")
                    .eq("patient_id", patientId)
                    .gte("logged_at", cutoff)
                    .order("logged_at", { ascending: false });

                if (!symptoms || symptoms.length < 2) {
                    return NextResponse.json({
                        success: true,
                        insights: "Not enough symptom data yet. Log more symptoms to see patterns and insights.",
                        hasEnoughData: false
                    });
                }

                let insights: string;

                try {
                    const prompt = `Analyze these symptom logs for a Parkinson's patient and identify patterns:

${symptoms.map(s => `- ${new Date(s.logged_at).toLocaleDateString()} ${new Date(s.logged_at).toLocaleTimeString()}: ${s.symptom} (${s.severity})${s.notes ? ` - ${s.notes}` : ""}`).join("\n")}

Provide brief insights (3-4 bullet points) about:
- Any patterns in timing or frequency
- Severity trends
- Common symptoms
- Recommendations for the caregiver

Format as simple bullet points. Be helpful and actionable.`;

                    insights = await callAI(prompt);
                } catch (aiError) {
                    console.log("AI fallback - generating basic insights");

                    const severeCount = symptoms.filter(s => s.severity === 'severe').length;
                    const moderateCount = symptoms.filter(s => s.severity === 'moderate').length;
                    const mildCount = symptoms.filter(s => s.severity === 'mild').length;

                    insights = `**Symptom Analysis (${symptoms.length} entries, last 30 days)**

• **Severity breakdown:** ${severeCount} severe, ${moderateCount} moderate, ${mildCount} mild
• **Frequency:** Averaging ${(symptoms.length / 30).toFixed(1)} logs per day
${severeCount > 2 ? '• ⚠️ Multiple severe symptoms logged - consider discussing with doctor' : '• Symptom severity appears manageable'}`;
                }

                return NextResponse.json({
                    success: true,
                    insights,
                    hasEnoughData: true,
                    symptomCount: symptoms.length
                });
            }

            case "get_recent_symptoms": {
                const { data: symptoms } = await supabase
                    .from("symptom_logs")
                    .select("id, symptom, severity, notes, logged_at")
                    .eq("patient_id", patientId)
                    .order("logged_at", { ascending: false })
                    .limit(10);

                return NextResponse.json({
                    success: true,
                    symptoms: symptoms || []
                });
            }

            default:
                return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
        }
    } catch (error: any) {
        console.error("AI Agent error:", error);
        return NextResponse.json({
            success: false,
            error: error.message || "An error occurred"
        }, { status: 500 });
    }
}
