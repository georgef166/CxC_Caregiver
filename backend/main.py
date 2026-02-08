"""
FastAPI Email Assistant Backend
Provides REST API endpoints for email management with AI-powered replies
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import sys
import os
import uuid
from agent import run, AgentRequest
import uvicorn

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from gmail_reader import GmailReader
from gemini_reply import GeminiReplyGenerator
from agent import send_email
from appointment_service import AppointmentService
from datetime import datetime, timedelta
from calendar_service import CalendarService
from caregiver_agent import run_agent

app = FastAPI(
    title="Email Assistant API",
    description="AI-powered email management system with Gemini AI",
    version="1.0.0"
)

# CORS middleware for frontend access
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
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


class GoogleCalendarEventRequest(BaseModel):
    summary: str  # e.g. "Appointment with Dr. Smith"
    appointment_datetime: str  # ISO format
    duration_minutes: int = 120
    description: Optional[str] = None
    location: Optional[str] = None


class AgentChatRequest(BaseModel):
    prompt: str
    patient_context: Optional[Dict[str, Any]] = None  # name, conditions, medications, doctors, etc.


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


@app.post("/appointments/google-calendar")
def add_to_google_calendar(request: GoogleCalendarEventRequest):
    """
    Add an appointment to the caregiver's Google Calendar.

    Uses the Gmail OAuth credentials (which already include the Calendar scope)
    to create an event on the primary calendar.
    """
    try:
        reader = get_gmail_reader()
        cal_service = CalendarService(reader.creds)

        start = datetime.fromisoformat(request.appointment_datetime)
        end = start + timedelta(minutes=request.duration_minutes)

        # Check availability first
        is_free = cal_service.is_free(start, end)

        # Create the event regardless but warn if busy
        event_link = cal_service.add_event(
            summary=request.summary,
            start_time=start,
            end_time=end,
            description=request.description or ""
        )

        return {
            "success": True,
            "message": "Event added to Google Calendar",
            "event_link": event_link,
            "was_free": is_free,
            "start": start.isoformat(),
            "end": end.isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/calendar/events")
def get_calendar_events(days: int = 14):
    """
    Get upcoming events from the caregiver's Google Calendar.

    Args:
        days: Number of days to look ahead (default 14)
    """
    try:
        reader = get_gmail_reader()
        cal_service = CalendarService(reader.creds)

        now = datetime.utcnow()
        time_max = now + timedelta(days=days)
        events = cal_service.get_events(time_min=now, time_max=time_max)

        return {
            "success": True,
            "count": len(events),
            "events": events
        }
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
            "smtp": "configured",
            "agent": "active"
        }
    }

@app.post("/agent")
async def communicate_agent(request: AgentRequest):
    res = await run(prompt=request.prompt)
    return {"success": True, "response": res}



# ============ AUTONOMOUS AGENT ENDPOINTS ============

@app.post("/agent/chat")
async def agent_chat(request: AgentChatRequest):
    """
    Send a natural language prompt to the autonomous CareLink agent.
    The agent can autonomously:
    - Send emails to doctors/contacts
    - Book Google Calendar events
    - Send Telegram messages
    - Search the web for medical info
    - Look up nearby pharmacies/clinics
    - Read web pages for context

    Args:
        request: AgentChatRequest with prompt and optional patient context
    
    Returns:
        Agent response with text and list of actions taken
    """
    try:
        result = await run_agent(
            prompt=request.prompt,
            patient_context=request.patient_context
        )
        return {
            "success": result.get("success", False),
            "response": result.get("response", ""),
            "actions_taken": result.get("actions_taken", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ TASK QUEUE SYSTEM ============

from agent import get_telegram_updates

class Task(BaseModel):
    id: str
    type: str  # email_reply, telegram_reply, health_alert, appointment_reminder
    title: str
    description: str
    urgency: str  # low, medium, high
    status: str = "pending"  # pending, accepted, dismissed, completed
    payload: Optional[Dict[str, Any]] = None
    created_at: str = str(datetime.now())

# In-memory store
TASKS: List[Task] = []
PROCESSED_IDS: set = set()
IS_SCANNING = False

def generate_tasks_from_sources():
    """Polls sources (Email, Telegram) and generates tasks"""
    global TASKS, PROCESSED_IDS, IS_SCANNING
    
    if IS_SCANNING: return
    IS_SCANNING = True
    
    # 1. Check Emails
    try:
        reader = get_gmail_reader()
        # Fetch unread emails (limit 5 for performance)
        messages = reader.service.users().messages().list(userId='me', q='is:unread', maxResults=10).execute()
        if 'messages' in messages:
            for msg in messages['messages']:
                msg_id = msg['id']
                if msg_id in PROCESSED_IDS:
                    continue
                
                email = reader.get_email_by_id(msg_id)
                if not email:
                    continue
                
                # Light filter: only skip obvious automated/marketing noise
                content = (email['subject'] + ' ' + email['body']).lower()
                sender = email.get('sender', '').lower()
                
                # Skip automated senders (noreply, marketing platforms)
                automated_senders = ['noreply@', 'no-reply@', 'mailer-daemon@', 'postmaster@', 'notifications@', 'marketing@', 'promo@', 'donotreply@']
                if any(ns in sender for ns in automated_senders):
                    PROCESSED_IDS.add(msg_id)
                    continue
                
                # Skip obvious spam/promo/automated subjects
                spam_keywords = ['unsubscribe', 'newsletter', 'limited time offer', 'click here to verify', 'verify your email', 'confirm your account', 'reset your password', 'sign-in attempt', 'two-factor', '2fa', 'otp', 'verification code']
                if any(sp in content for sp in spam_keywords):
                    PROCESSED_IDS.add(msg_id)
                    continue
                
                # Analyze urgency/intent
                analysis = reply_generator.analyze_email_intent(email['body'])
                # Check Availability & Scheduling
                availability_context = ""
                sched_info = {}
                if 'appoint' in content or 'schedule' in content or 'meet' in content or 'time' in content or 'date' in content or analysis.get('intent') == 'appointment':
                    # Extract date/time
                    sched_info = reply_generator.extract_scheduling_info(email['body'])
                    if sched_info.get('has_proposal') and sched_info.get('datetime_iso'):
                        try:
                            cal_service = CalendarService(reader.creds)
                            start = datetime.fromisoformat(sched_info['datetime_iso'])
                            duration = sched_info.get('duration_minutes', 120)
                            end = start + timedelta(minutes=duration)
                            is_free = cal_service.is_free(start, end)
                            proposed_time = start.strftime('%I:%M %p on %A, %B %d')
                            
                            if is_free:
                                availability_context = (
                                    f"CALENDAR CHECK: The proposed time ({proposed_time}) is AVAILABLE. "
                                    f"You should CONFIRM this appointment. Say the time works and you'll be there."
                                )
                            else:
                                # Try to find a free slot in the same week
                                alt_context = f"CALENDAR CHECK: The proposed time ({proposed_time}) is NOT available — there is a conflict. "
                                alt_context += "You should DECLINE this specific time and ask the sender for a different day or time. "
                                alt_context += "Suggest they propose another slot, or offer morning/afternoon of another day this week."
                                availability_context = alt_context
                        except Exception as e:
                            print(f"Calendar check failed: {e}")

                # Use AI analysis to decide: skip only if low urgency AND no reply needed AND no scheduling context
                if not analysis.get('requires_reply') and analysis.get('urgency') == 'low' and not sched_info.get('has_proposal'):
                    PROCESSED_IDS.add(msg_id)
                    continue

                # Create task for this email
                reply = reply_generator.generate_reply(
                    email_subject=email['subject'],
                    email_body=email['body'],
                    sender=email['sender'],
                    context=availability_context,
                    tone='professional'
                )
                
                task = Task(
                    id=str(uuid.uuid4()),
                    type="email_reply",
                    title=f"Reply to {email['sender']}",
                    description=f"Regarding: {email['subject']}",
                    urgency=analysis.get('urgency', 'medium'),
                    payload={
                        "email_id": msg_id,
                        "draft_reply": reply,
                        "original_email": email
                    }
                )
                TASKS.append(task)
                PROCESSED_IDS.add(msg_id)
    except Exception as e:
        print(f"Error processing emails for tasks: {e}")

    # 2. Check Telegram
    try:
        updates = get_telegram_updates()
        for update in updates:
            update_id = update['update_id']
            if f"tg_{update_id}" in PROCESSED_IDS:
                continue
                
            if 'message' in update:
                chat_id = update['message']['chat']['id']
                text = update['message'].get('text', '')
                sender = update['message']['from'].get('first_name', 'Unknown')
                
                task = Task(
                    id=str(uuid.uuid4()),
                    type="telegram_reply",
                    title=f"Message from {sender}",
                    description=f"Telegram: {text[:50]}...",
                    urgency="medium",
                    payload={
                        "chat_id": chat_id,
                        "text": text,
                        "sender": sender
                    }
                )
                TASKS.append(task)
                PROCESSED_IDS.add(f"tg_{update_id}")
    except Exception as e:
        print(f"Error processing telegram for tasks: {e}")

    IS_SCANNING = False





@app.get("/tasks", response_model=List[Task])
def get_tasks(
    background_tasks: BackgroundTasks,
    patient_name: Optional[str] = None,
    doctor_emails: Optional[str] = None,
    doctor_names: Optional[str] = None,
    contact_emails: Optional[str] = None,
):
    """Get list of pending AI tasks, filtered to the current patient's context"""
    # Trigger background scan if needed
    background_tasks.add_task(generate_tasks_from_sources)
    
    pending = [t for t in TASKS if t.status == "pending"]
    
    # If no patient context provided, return nothing — we require a patient to be selected
    if not patient_name and not doctor_emails and not doctor_names:
        return []
    
    # Build set of known contacts (lowercase for matching)
    known_emails = set()
    known_names = set()
    
    if doctor_emails:
        for e in doctor_emails.split(','):
            e = e.strip().lower()
            if e:
                known_emails.add(e)
    if contact_emails:
        for e in contact_emails.split(','):
            e = e.strip().lower()
            if e:
                known_emails.add(e)
    if doctor_names:
        for n in doctor_names.split(','):
            n = n.strip().lower()
            if n:
                known_names.add(n)
    if patient_name:
        known_names.add(patient_name.strip().lower())
    
    def is_relevant(task: Task) -> bool:
        """Check if a task is relevant to the current patient.
        STRICT: only match on original email sender/subject/body — never on AI-drafted reply text."""
        payload = task.payload or {}
        
        if task.type == "email_reply":
            original = payload.get("original_email", {})
            sender = original.get("sender", "").lower()
            subject = original.get("subject", "").lower()
            body = original.get("body", "").lower()
            
            # 1. Check sender email against known doctor/contact emails
            sender_email = sender
            if "<" in sender_email:
                sender_email = sender_email.split("<")[1].replace(">", "").strip()
            if sender_email in known_emails:
                return True
            
            # 2. Check if a known doctor name appears in sender display name or subject
            for name in known_names:
                if not name or len(name) < 3:
                    continue
                # Only match in sender line or subject — not the full body (too many false positives)
                if name in sender or name in subject:
                    return True
            
            # 3. Check if patient name explicitly appears in the original email body/subject
            if patient_name:
                pn = patient_name.strip().lower()
                if len(pn) >= 3 and (pn in subject or pn in body):
                    return True
            
            return False
        
        elif task.type == "telegram_reply":
            text = payload.get("text", "").lower()
            tg_sender = payload.get("sender", "").lower()
            # Match if telegram message mentions patient name or is from a known contact name
            if patient_name and patient_name.strip().lower() in text:
                return True
            for name in known_names:
                if name and name in tg_sender:
                    return True
            return False
        
        elif task.type == "appointment_scheduler":
            doctor = payload.get("doctor", "").lower()
            for name in known_names:
                if name and name in doctor:
                    return True
            return False
        
        elif task.type == "prescription_refill":
            # Only show if we have patient context (medication is patient-specific)
            return bool(patient_name)
        
        elif task.type == "health_alert":
            # Health alerts are always relevant when viewing a patient
            return bool(patient_name)
        
        return False
    
    return [t for t in pending if is_relevant(t)]

@app.post("/tasks/{task_id}/accept")
def accept_task(task_id: str):
    """Accept and execute a task"""
    task = next((t for t in TASKS if t.id == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    try:
        if task.type == "email_reply":
            # Send the email
            draft = task.payload.get("draft_reply", {})
            original = task.payload.get("original_email", {})
            sender_email = original.get("sender", "")
            # Extract email only
            if "<" in sender_email:
                sender_email = sender_email.split("<")[1].strip(">")
                
            send_email(
                to=[sender_email],
                subject=draft.get("subject", f"Re: {original.get('subject')}"),
                body=draft.get("body", "")
            )
            # Mark original as read? Yes.
            get_gmail_reader().mark_as_read(task.payload.get("email_id"))
            
        elif task.type == "telegram_reply":
            # Just mark completed, maybe send generic ack
            pass

        elif task.type == "appointment_scheduler":
            # Add follow-up to Google Calendar
            try:
                reader = get_gmail_reader()
                cal_service = CalendarService(reader.creds)
                doctor = task.payload.get("doctor", "Doctor")
                reason = task.payload.get("reason", "Follow-up")
                # Default: schedule 2 weeks from now at 10 AM
                start = datetime.now().replace(hour=10, minute=0, second=0, microsecond=0) + timedelta(weeks=2)
                end = start + timedelta(minutes=120)
                event_link = cal_service.add_event(
                    summary=f"Follow-up with {doctor}",
                    start_time=start,
                    end_time=end,
                    description=f"Reason: {reason}\nScheduled via CareLink AI Task Queue"
                )
            except Exception as e:
                print(f"Calendar event creation failed: {e}")

        task.status = "completed"
        return {"success": True, "message": "Task executed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tasks/{task_id}/dismiss")
def dismiss_task(task_id: str):
    """Dismiss a task"""
    task = next((t for t in TASKS if t.id == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task.status = "dismissed"
    return {"success": True}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

