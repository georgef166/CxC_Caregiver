"""
CaregiverAgent — Autonomous AI Agent with Gemini Tool-Calling
Provides an agentic loop that can autonomously:
  - Send emails (SMTP)
  - Send Telegram messages
  - Book Google Calendar events (Service Account)
  - Search the web (Google Search)
  - Look up locations (Google Maps)
  - Read URLs (URL Context)
"""

from typing import List, Optional, Dict, Any
import os
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv
import requests
import datetime
from google import genai
from google.genai import types
from utils.agent_ext import use_extended_tools
import asyncio

load_dotenv()


class CaregiverAgent:
    """
    Autonomous caregiver AI agent that uses Gemini's tool-calling
    to decide and execute actions on behalf of the caregiver.
    """

    def __init__(self, prompt: str, patient_context: Optional[Dict[str, Any]] = None):
        self.chat_id = os.getenv("CHAT_ID", os.getenv("TELEGRAM_CHAT_ID", "0"))
        self.prompt = prompt
        self.patient_context = patient_context or {}

        # Build dynamic system prompt with patient context
        patient_info = ""
        if patient_context:
            patient_info = f"""
            Current Patient Context:
            - Patient Name: {patient_context.get('name', 'Unknown')}
            - Conditions: {', '.join(patient_context.get('conditions', ['Not specified']))}
            - Current Medications: {', '.join(patient_context.get('medications', ['None listed']))}
            - Doctors: {', '.join([f"{d.get('name', '')} ({d.get('specialty', '')}): {d.get('email', 'no email')}" for d in patient_context.get('doctors', [])])}
            - Emergency Contacts: {', '.join([f"{c.get('name', '')} ({c.get('relationship', '')}): {c.get('phone', '')}" for c in patient_context.get('emergency_contacts', [])])}
            """

        self.system_prompt = f"""You are CareLink AI, an autonomous agent assisting caregivers of patients with Parkinson's disease.
You act as the single source of truth for the patient's information.
Your mission is to reduce caregiver effort in real time and answer questions decisively.

{patient_info}

Medical constraints:
- Do not diagnose or prescribe.
- Ground medical claims in current sources.
- Clearly flag escalation thresholds ("contact clinician if X", "emergency if Y").

Decision heuristic:
- If the answer exists in patient data → respond immediately.
- If an action can reduce caregiver work → execute it (send email, book calendar, send message).
- If uncertainty impacts safety → escalate or clarify once.

When booking appointments, default to 2-hour duration unless specified.
When sending emails, always be professional and include the patient's name for context.
When searching, prefer recent and reputable medical sources.

Tone: Direct, calm, authoritative. No speculation."""

        # Tool declarations for Gemini function calling
        message_tool = {
            "name": "send_telegram_message",
            "description": "Sends a message to the caregiver's Telegram chat.",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {
                        "type": "string",
                        "description": "The message text to send."
                    }
                },
                "required": ["text"]
            }
        }

        email_tool = {
            "name": "send_email",
            "description": "Sends an email using SMTP. Use this to email doctors, pharmacies, or contacts.",
            "parameters": {
                "type": "object",
                "properties": {
                    "to": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of recipient email addresses."
                    },
                    "subject": {
                        "type": "string",
                        "description": "Email subject line."
                    },
                    "body": {
                        "type": "string",
                        "description": "Plain-text email body."
                    },
                    "cc": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional: List of CC email addresses."
                    },
                    "reply_to": {
                        "type": "string",
                        "description": "Optional: Reply-To email address."
                    }
                },
                "required": ["to", "subject", "body"]
            }
        }

        book_event_tool = {
            "name": "book_google_calendar_event",
            "description": "Creates an event on the caregiver's Google Calendar. Use for appointments, follow-ups, medication reminders.",
            "parameters": {
                "type": "object",
                "properties": {
                    "summary": {
                        "type": "string",
                        "description": "Event title."
                    },
                    "start_time": {
                        "type": "string",
                        "description": "Event start time in 'YYYY-MM-DD HH:MM' format."
                    },
                    "end_time": {
                        "type": "string",
                        "description": "Event end time in 'YYYY-MM-DD HH:MM' format."
                    },
                    "attendees_emails": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional: List of attendee email addresses."
                    },
                    "description": {
                        "type": "string",
                        "description": "Optional: Event description or notes."
                    },
                    "calendar_id": {
                        "type": "string",
                        "description": "The calendar ID. Defaults to the caregiver's email."
                    },
                    "timezone": {
                        "type": "string",
                        "description": "Timezone string, e.g., 'America/Toronto'. Defaults to 'America/Toronto'."
                    }
                },
                "required": ["summary", "start_time", "end_time"]
            }
        }

        ext_tool = {
            "name": "call_tool_ext",
            "description": "Executes Google Search, Maps lookup, or URL reading. Use for medical research, finding nearby pharmacies/clinics, or reading web pages.",
            "parameters": {
                "type": "object",
                "properties": {
                    "content": {
                        "type": "string",
                        "description": "The query. Append 'USE google_search', 'USE google_maps', or 'USE url_context' to specify which tool."
                    }
                },
                "required": ["content"]
            }
        }

        self.tools = [message_tool, email_tool, book_event_tool, ext_tool]

    @staticmethod
    def send_email(
        to: List[str],
        subject: str,
        body: str,
        cc: Optional[List[str]] = None,
        reply_to: Optional[str] = None
    ) -> str:
        """Send an email using SMTP."""
        smtp_user = os.environ["SMTP_USER"]
        smtp_password = os.environ["SMTP_PASSWORD"]

        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = smtp_user
        msg["To"] = ", ".join(to)
        if cc:
            msg["Cc"] = ", ".join(cc)
        if reply_to:
            msg["Reply-To"] = reply_to
        msg.set_content(body)

        try:
            with smtplib.SMTP("smtp.gmail.com", 587) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.send_message(msg)
            return f"Email sent successfully to {', '.join(to)}"
        except smtplib.SMTPException as e:
            return f"Failed to send email: {str(e)}"

    def send_telegram_message(self, text: str) -> str:
        """Send a message to the caregiver's Telegram chat."""
        token = os.getenv("TELEGRAM_BOT_TOKEN")
        if not token:
            return "Telegram not configured (TELEGRAM_BOT_TOKEN not set)"

        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {"chat_id": self.chat_id, "text": text}

        try:
            resp = requests.post(url, json=payload)
            resp.raise_for_status()
            return f"Telegram message sent successfully"
        except Exception as e:
            return f"Failed to send Telegram message: {str(e)}"

    @staticmethod
    def book_google_calendar_event(
        summary: str,
        start_time: str,
        end_time: str,
        attendees_emails: Optional[List[str]] = None,
        description: str = "",
        calendar_id: str = None,
        timezone: str = "America/Toronto"
    ) -> str:
        """Create an event on Google Calendar using Service Account."""
        try:
            from google.oauth2 import service_account
            from googleapiclient.discovery import build

            _scopes = ["https://www.googleapis.com/auth/calendar"]
            _service_account_file = os.path.join(
                os.path.dirname(__file__),
                os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "cxccaregiver-223983f52c92.json")
            )

            if not os.path.exists(_service_account_file):
                return f"Service account file not found: {_service_account_file}"

            if not calendar_id:
                calendar_id = os.getenv("GOOGLE_CALENDAR_ID", "cxccaregiver@gmail.com")

            creds = service_account.Credentials.from_service_account_file(
                _service_account_file, scopes=_scopes
            )
            service = build("calendar", "v3", credentials=creds)

            start_dt = datetime.datetime.strptime(start_time, "%Y-%m-%d %H:%M")
            end_dt = datetime.datetime.strptime(end_time, "%Y-%m-%d %H:%M")

            attendees_payload = []
            if attendees_emails:
                attendees_payload = [{"email": email} for email in attendees_emails]

            event = {
                "summary": summary,
                "description": description,
                "start": {"dateTime": start_dt.isoformat(), "timeZone": timezone},
                "end": {"dateTime": end_dt.isoformat(), "timeZone": timezone},
                "attendees": attendees_payload,
            }

            created_event = service.events().insert(
                calendarId=calendar_id,
                body=event,
                sendUpdates="all"
            ).execute()

            return f"Calendar event created: {created_event.get('htmlLink', 'success')}"
        except Exception as e:
            return f"Failed to create calendar event: {str(e)}"

    def call_tool_ext(self, content: str = "") -> str:
        """Execute an extended Google tool (Search, Maps, URL Context)."""
        try:
            response = use_extended_tools(content)
            if response and hasattr(response, 'text'):
                return response.text
            return str(response)
        except Exception as e:
            return f"Extended tool error: {str(e)}"

    def call_function(self, tool_name: str, **kwargs) -> str:
        """Dynamically call any method of this class by name."""
        method = getattr(self, tool_name, None)
        if not method:
            return f"Unknown tool: {tool_name}"
        try:
            return method(**kwargs)
        except Exception as e:
            return f"Tool execution error ({tool_name}): {str(e)}"


async def run_agent(
    prompt: str,
    patient_context: Optional[Dict[str, Any]] = None,
    max_iterations: int = 10
) -> Dict[str, Any]:
    """
    Run the autonomous agent loop.

    Args:
        prompt: The natural language request from the caregiver
        patient_context: Optional dict with patient info (name, conditions, medications, doctors, etc.)
        max_iterations: Safety limit on tool-call loops

    Returns:
        Dict with 'response' (text), 'actions_taken' (list of tool calls made), 'success' (bool)
    """
    agent = CaregiverAgent(prompt=prompt, patient_context=patient_context)

    # Use GEMINI_API_KEY (main branch) or API_KEY (agent branch) — try both
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("API_KEY")
    if not api_key:
        return {
            "response": "Agent error: No API key configured (GEMINI_API_KEY or API_KEY)",
            "actions_taken": [],
            "success": False
        }

    client = genai.Client(api_key=api_key)

    custom_tools = types.Tool(
        function_declarations=[types.FunctionDeclaration(**tool) for tool in agent.tools]
    )

    config = types.GenerateContentConfig(
        tools=[custom_tools],
        system_instruction=agent.system_prompt,
    )

    contents = [types.Content(role="user", parts=[types.Part(text=prompt)])]
    actions_taken = []

    for i in range(max_iterations):
        try:
            response = await client.aio.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config=config,
            )

            if not response.candidates:
                return {
                    "response": "Agent received no response from the model.",
                    "actions_taken": actions_taken,
                    "success": False
                }

            part = response.candidates[0].content.parts[0]

            if part.function_call:
                fc = part.function_call
                contents.append(response.candidates[0].content)

                # Execute the tool
                result = agent.call_function(fc.name, **fc.args)
                actions_taken.append({
                    "tool": fc.name,
                    "args": dict(fc.args),
                    "result": str(result)[:500]  # Truncate for safety
                })

                # Feed result back to the model
                contents.append(types.Content(
                    role="user",
                    parts=[types.Part(function_response=types.FunctionResponse(
                        name=fc.name,
                        response={"result": str(result)},
                    ))],
                ))
            else:
                # Model returned text — we're done
                return {
                    "response": response.text or "Agent completed with no text response.",
                    "actions_taken": actions_taken,
                    "success": True
                }
        except Exception as e:
            return {
                "response": f"Agent error during iteration {i+1}: {str(e)}",
                "actions_taken": actions_taken,
                "success": False
            }

    return {
        "response": "Agent reached maximum iterations without completing.",
        "actions_taken": actions_taken,
        "success": False
    }


def run_agent_sync(
    prompt: str,
    patient_context: Optional[Dict[str, Any]] = None,
    max_iterations: int = 10
) -> Dict[str, Any]:
    """Synchronous wrapper for run_agent — safe to call from any thread."""
    try:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            # We're inside an existing event loop — run in a new thread with its own loop
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                def _run():
                    new_loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(new_loop)
                    try:
                        return new_loop.run_until_complete(
                            run_agent(prompt, patient_context, max_iterations)
                        )
                    finally:
                        new_loop.close()
                future = pool.submit(_run)
                return future.result(timeout=120)
        else:
            return asyncio.run(run_agent(prompt, patient_context, max_iterations))
    except Exception as e:
        return {
            "response": f"Agent execution error: {str(e)}",
            "actions_taken": [],
            "success": False
        }
