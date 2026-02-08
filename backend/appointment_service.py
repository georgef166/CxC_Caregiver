"""
Appointment Service
Handles AI-powered symptom analysis, appointment suggestions, and booking automation
"""

import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from google import genai
from dotenv import load_dotenv
from agent import send_email

load_dotenv()


class AppointmentService:
    """Handles appointment suggestions and automated booking"""
    
    def __init__(self):
        self.client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
    
    def analyze_symptom_urgency(self, symptom: str, patient_context: Optional[Dict] = None) -> Dict:
        """
        Analyze a symptom and determine if medical attention is needed
        
        Args:
            symptom: The symptom description logged by patient/caregiver
            patient_context: Optional dict with patient info (conditions, medications, etc.)
            
        Returns:
            Dict with urgency level, recommendation, and suggested action
        """
        context_str = ""
        if patient_context:
            if patient_context.get("conditions"):
                context_str += f"\nPatient's conditions: {', '.join(patient_context['conditions'])}"
            if patient_context.get("medications"):
                context_str += f"\nCurrent medications: {', '.join(patient_context['medications'])}"
            if patient_context.get("age"):
                context_str += f"\nPatient age: {patient_context['age']}"
        
        prompt = f"""You are a medical triage assistant helping caregivers determine if a symptom requires medical attention.

Symptom reported: {symptom}
{context_str}

CRITICAL: For the following symptoms, ALWAYS set urgency to "emergency":
- Chest pain, tightness, or pressure
- Difficulty breathing or shortness of breath
- Signs of stroke (facial drooping, arm weakness, speech difficulty)
- Severe allergic reaction / anaphylaxis
- Loss of consciousness, fainting, unresponsiveness
- Severe bleeding or head injury
- Sudden severe headache ("worst headache of my life")
- Choking or inability to swallow
- Seizure (especially first-time)
- Suicidal thoughts or self-harm

For these symptoms, ALWAYS set urgency to "high":
- High fever (above 103°F / 39.4°C)
- Persistent vomiting or inability to keep fluids down
- Sudden vision changes
- Severe abdominal pain
- Signs of infection (red streaks, warmth, fever with wound)
- Falls with possible fracture
- Medication adverse reaction
- Confusion or disorientation (new onset)
- Severe tremors or rigidity (in Parkinson's patients)

Analyze this symptom and provide:
1. URGENCY: One of [low, moderate, high, emergency]
2. RECOMMENDATION: A brief explanation of what the caregiver should do
3. SUGGEST_APPOINTMENT: yes or no - whether to suggest booking a doctor appointment
4. SUGGESTED_TIMEFRAME: If appointment suggested, when (e.g., "within 24 hours", "within 3 days", "next available")
5. QUESTIONS_TO_ASK: 2-3 additional questions the caregiver might want to note for the doctor

Format your response exactly like this:
URGENCY: [level]
RECOMMENDATION: [text]
SUGGEST_APPOINTMENT: [yes/no]
SUGGESTED_TIMEFRAME: [timeframe]
QUESTIONS_TO_ASK:
- [question 1]
- [question 2]
- [question 3]

Be helpful but conservative - when in doubt about serious symptoms, escalate to higher urgency."""

        try:
            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            
            return self._parse_analysis(response.text, symptom)
            
        except Exception as e:
            print(f"Error analyzing symptom: {e}")
            return {
                "urgency": "moderate",
                "recommendation": "Unable to analyze symptom. Consider consulting with healthcare provider.",
                "suggest_appointment": True,
                "suggested_timeframe": "within 3 days",
                "questions_to_ask": ["When did this symptom start?", "How severe is it on a scale of 1-10?"],
                "error": str(e)
            }
    
    def _parse_analysis(self, response_text: str, symptom: str) -> Dict:
        """Parse the AI response into structured data"""
        result = {
            "symptom": symptom,
            "urgency": "moderate",
            "recommendation": "",
            "suggest_appointment": True,
            "suggested_timeframe": "within 3 days",
            "questions_to_ask": []
        }
        
        lines = response_text.strip().split('\n')
        in_questions = False
        
        for line in lines:
            line = line.strip()
            if line.upper().startswith('URGENCY:'):
                result["urgency"] = line.split(':', 1)[1].strip().lower()
            elif line.upper().startswith('RECOMMENDATION:'):
                result["recommendation"] = line.split(':', 1)[1].strip()
            elif line.upper().startswith('SUGGEST_APPOINTMENT:'):
                val = line.split(':', 1)[1].strip().lower()
                result["suggest_appointment"] = val.startswith('y')
            elif line.upper().startswith('SUGGESTED_TIMEFRAME:'):
                result["suggested_timeframe"] = line.split(':', 1)[1].strip()
            elif line.upper().startswith('QUESTIONS_TO_ASK:'):
                in_questions = True
            elif in_questions and line.startswith('-'):
                result["questions_to_ask"].append(line[1:].strip())
        
        return result
    
    def generate_appointment_email(
        self,
        doctor_name: str,
        doctor_email: str,
        patient_name: str,
        symptom: str,
        urgency: str,
        preferred_timeframe: str,
        additional_notes: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Generate an appointment request email to a doctor
        
        Returns:
            Dict with 'subject' and 'body' for the email
        """
        urgency_text = {
            "low": "at your earliest convenience",
            "moderate": "within the next few days",
            "high": "as soon as possible, preferably within 24 hours",
            "emergency": "URGENTLY - immediate attention requested"
        }.get(urgency, "at your earliest convenience")
        
        subject = f"Appointment Request for {patient_name}" + (" - URGENT" if urgency in ["high", "emergency"] else "")
        
        body = f"""Dear Dr. {doctor_name},

I am writing to request an appointment for {patient_name}.

Reason for Visit:
{symptom}

The patient would like to be seen {urgency_text}.
Preferred timing: {preferred_timeframe}

"""
        if additional_notes:
            body += f"""Additional Notes:
{additional_notes}

"""
        
        body += """Please let us know your available times, or feel free to call to schedule.

Thank you for your prompt attention to this matter.

Best regards,
CareLink - Caregiver Assistant"""
        
        return {
            "subject": subject,
            "body": body
        }
    
    def send_appointment_request(
        self,
        doctor_email: str,
        doctor_name: str,
        patient_name: str,
        symptom: str,
        urgency: str,
        preferred_timeframe: str,
        caregiver_email: Optional[str] = None,
        additional_notes: Optional[str] = None
    ) -> Dict:
        """
        Send an appointment request email to the doctor
        
        Returns:
            Dict with success status and message
        """
        try:
            email_content = self.generate_appointment_email(
                doctor_name=doctor_name,
                doctor_email=doctor_email,
                patient_name=patient_name,
                symptom=symptom,
                urgency=urgency,
                preferred_timeframe=preferred_timeframe,
                additional_notes=additional_notes
            )
            
            # Send the email
            cc = [caregiver_email] if caregiver_email else None
            send_email(
                to=[doctor_email],
                subject=email_content["subject"],
                body=email_content["body"],
                cc=cc
            )
            
            return {
                "success": True,
                "message": f"Appointment request sent to Dr. {doctor_name}",
                "email_sent_to": doctor_email,
                "subject": email_content["subject"]
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": f"Failed to send appointment request: {str(e)}"
            }
    
    def generate_calendar_invite_email(
        self,
        patient_email: str,
        patient_name: str,
        doctor_name: str,
        appointment_datetime: datetime,
        location: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Dict:
        """
        Generate and send a calendar invite email to the patient
        
        The email includes an .ics attachment for easy calendar import
        """
        # Generate iCal format
        event_uid = f"carelink-{datetime.now().strftime('%Y%m%d%H%M%S')}@carelink.app"
        event_start = appointment_datetime.strftime('%Y%m%dT%H%M%S')
        event_end = (appointment_datetime + timedelta(hours=2)).strftime('%Y%m%dT%H%M%S')
        
        ical_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CareLink//Appointment//EN
BEGIN:VEVENT
UID:{event_uid}
DTSTAMP:{datetime.now().strftime('%Y%m%dT%H%M%SZ')}
DTSTART:{event_start}
DTEND:{event_end}
SUMMARY:Doctor Appointment with Dr. {doctor_name}
DESCRIPTION:{notes or 'Medical appointment scheduled via CareLink'}
LOCATION:{location or 'To be confirmed'}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR"""
        
        subject = f"📅 Appointment Confirmed: Dr. {doctor_name} on {appointment_datetime.strftime('%B %d, %Y at %I:%M %p')}"
        
        body = f"""Dear {patient_name},

Your appointment has been confirmed!

📅 APPOINTMENT DETAILS
━━━━━━━━━━━━━━━━━━━━━
Doctor: Dr. {doctor_name}
Date: {appointment_datetime.strftime('%A, %B %d, %Y')}
Time: {appointment_datetime.strftime('%I:%M %p')}
Location: {location or 'To be confirmed'}

{f"Notes: {notes}" if notes else ""}

━━━━━━━━━━━━━━━━━━━━━

To add this to your calendar:
• Google Calendar: Copy the event details above
• Apple Calendar: The appointment details are formatted for easy addition
• Outlook: Create a new event with the details above

If you need to reschedule or cancel, please contact the doctor's office directly.

Best regards,
CareLink - Your Care Management Assistant
"""
        
        try:
            send_email(
                to=[patient_email],
                subject=subject,
                body=body,
                attachments=[{
                    'filename': 'appointment.ics',
                    'content': ical_content,
                    'maintype': 'text',
                    'subtype': 'calendar'
                }]
            )
            
            return {
                "success": True,
                "message": f"Calendar invite sent to {patient_email}",
                "appointment_datetime": appointment_datetime.isoformat(),
                "doctor": doctor_name
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": f"Failed to send calendar invite: {str(e)}"
            }


if __name__ == "__main__":
    # Test the service
    service = AppointmentService()
    
    # Test symptom analysis
    print("Testing symptom analysis...")
    result = service.analyze_symptom_urgency(
        "Patient has had persistent headache for 3 days with some dizziness",
        {"conditions": ["hypertension"], "age": 72}
    )
    print(f"Analysis result: {result}")
