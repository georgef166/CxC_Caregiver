"""
FastAPI Email Assistant Backend
Provides REST API endpoints for email management with AI-powered replies
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sys
import os

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from gmail_reader import GmailReader
from gemini_reply import GeminiReplyGenerator
from agent import send_email
from appointment_service import AppointmentService
from datetime import datetime

app = FastAPI(
    title="Email Assistant API",
    description="AI-powered email management system with Gemini AI",
    version="1.0.0"
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services (lazy loading for Gmail to allow server startup)
gmail_reader = None
reply_generator = GeminiReplyGenerator()
appointment_service = AppointmentService()

def get_gmail_reader():
    """Lazy initialization of Gmail reader"""
    global gmail_reader
    if gmail_reader is None:
        gmail_reader = GmailReader()
    return gmail_reader


# Pydantic models for request/response
class EmailReplyRequest(BaseModel):
    email_subject: str
    email_body: str
    sender: str
    context: Optional[str] = None
    tone: str = "professional"


class SendEmailRequest(BaseModel):
    to: List[str]
    subject: str
    body: str
    cc: Optional[List[str]] = None
    reply_to: Optional[str] = None


class MarkReadRequest(BaseModel):
    message_id: str


class EmailAnalysisRequest(BaseModel):
    email_body: str


class SymptomAnalysisRequest(BaseModel):
    symptom: str
    patient_conditions: Optional[List[str]] = None
    patient_medications: Optional[List[str]] = None
    patient_age: Optional[int] = None


class AppointmentBookingRequest(BaseModel):
    doctor_email: str
    doctor_name: str
    patient_name: str
    symptom: str
    urgency: str = "moderate"
    preferred_timeframe: str = "within 3 days"
    caregiver_email: Optional[str] = None
    additional_notes: Optional[str] = None


class CalendarInviteRequest(BaseModel):
    patient_email: str
    patient_name: str
    doctor_name: str
    appointment_datetime: str  # ISO format
    location: Optional[str] = None
    notes: Optional[str] = None


# API Endpoints
@app.get("/")
def read_root():
    """Root endpoint"""
    return {
        "message": "Email Assistant API",
        "version": "1.0.0",
        "endpoints": {
            "unread_emails": "/emails/unread",
            "email_details": "/emails/{message_id}",
            "generate_reply": "/emails/generate-reply",
            "analyze_email": "/emails/analyze",
            "send_email": "/emails/send",
            "mark_read": "/emails/mark-read"
        }
    }


@app.get("/emails/unread")
def get_unread_emails(max_results: int = 10):
    """
    Get unread emails from Gmail
    
    Args:
        max_results: Maximum number of emails to retrieve (default: 10)
    
    Returns:
        List of unread emails
    """
    try:
        emails = get_gmail_reader().get_unread_emails(max_results=max_results)
        return {
            "success": True,
            "count": len(emails),
            "emails": emails
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/emails/{message_id}")
def get_email_details(message_id: str):
    """
    Get detailed information about a specific email
    
    Args:
        message_id: Gmail message ID
    
    Returns:
        Email details including full body
    """
    try:
        email = get_gmail_reader().get_email_by_id(message_id)
        if not email:
            raise HTTPException(status_code=404, detail="Email not found")
        return {
            "success": True,
            "email": email
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/emails/generate-reply")
def generate_reply(request: EmailReplyRequest):
    """
    Generate an AI-powered reply to an email
    
    Args:
        request: Email reply request with subject, body, sender, context, and tone
    
    Returns:
        Generated reply with subject and body
    """
    try:
        reply = reply_generator.generate_reply(
            email_subject=request.email_subject,
            email_body=request.email_body,
            sender=request.sender,
            context=request.context,
            tone=request.tone
        )
        return {
            "success": True,
            "reply": reply
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/emails/analyze")
def analyze_email(request: EmailAnalysisRequest):
    """
    Analyze an email to determine intent, urgency, and reply necessity
    
    Args:
        request: Email analysis request with email body
    
    Returns:
        Analysis results
    """
    try:
        analysis = reply_generator.analyze_email_intent(request.email_body)
        return {
            "success": True,
            "analysis": analysis
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/emails/send")
def send_email_endpoint(request: SendEmailRequest):
    """
    Send an email via SMTP
    
    Args:
        request: Send email request with recipients, subject, body, and optional CC/reply-to
    
    Returns:
        Success status
    """
    try:
        send_email(
            to=request.to,
            subject=request.subject,
            body=request.body,
            cc=request.cc,
            reply_to=request.reply_to
        )
        return {
            "success": True,
            "message": "Email sent successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/emails/mark-read")
def mark_email_read(request: MarkReadRequest):
    """
    Mark an email as read in Gmail
    
    Args:
        request: Mark read request with message ID
    
    Returns:
        Success status
    """
    try:
        success = get_gmail_reader().mark_as_read(request.message_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to mark email as read")
        return {
            "success": True,
            "message": "Email marked as read",
            "message_id": request.message_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ APPOINTMENT ENDPOINTS ============

@app.post("/symptoms/analyze")
def analyze_symptom(request: SymptomAnalysisRequest):
    """
    Analyze a symptom and get AI-powered recommendations
    
    Args:
        request: Symptom analysis request with symptom and optional patient context
    
    Returns:
        Analysis with urgency level, recommendation, and suggested actions
    """
    try:
        patient_context = {}
        if request.patient_conditions:
            patient_context["conditions"] = request.patient_conditions
        if request.patient_medications:
            patient_context["medications"] = request.patient_medications
        if request.patient_age:
            patient_context["age"] = request.patient_age
        
        analysis = appointment_service.analyze_symptom_urgency(
            symptom=request.symptom,
            patient_context=patient_context if patient_context else None
        )
        
        return {
            "success": True,
            "analysis": analysis
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/appointments/book")
def book_appointment(request: AppointmentBookingRequest):
    """
    Send an appointment request email to a doctor
    
    Args:
        request: Appointment booking request with doctor and patient details
    
    Returns:
        Success status and confirmation message
    """
    try:
        result = appointment_service.send_appointment_request(
            doctor_email=request.doctor_email,
            doctor_name=request.doctor_name,
            patient_name=request.patient_name,
            symptom=request.symptom,
            urgency=request.urgency,
            preferred_timeframe=request.preferred_timeframe,
            caregiver_email=request.caregiver_email,
            additional_notes=request.additional_notes
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/appointments/calendar-invite")
def send_calendar_invite(request: CalendarInviteRequest):
    """
    Send a calendar invite email to the patient
    
    Args:
        request: Calendar invite request with appointment details
    
    Returns:
        Success status and confirmation
    """
    try:
        # Parse the datetime string
        appointment_dt = datetime.fromisoformat(request.appointment_datetime)
        
        result = appointment_service.generate_calendar_invite_email(
            patient_email=request.patient_email,
            patient_name=request.patient_name,
            doctor_name=request.doctor_name,
            appointment_datetime=appointment_dt,
            location=request.location,
            notes=request.notes
        )
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid datetime format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/auth/gmail")
def authorize_gmail():
    """
    Trigger Gmail OAuth authorization.
    This will open the authorization flow.
    """
    try:
        reader = get_gmail_reader()
        return {
            "success": True,
            "message": "Gmail is now authorized"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "instructions": "Please run 'python gmail_reader.py' in the backend directory to complete OAuth"
        }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    import os
    gmail_status = "configured" if os.path.exists("token.json") else "needs_auth"
    
    return {
        "status": "healthy",
        "services": {
            "gmail": gmail_status,
            "gemini": "connected",
            "smtp": "configured"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
