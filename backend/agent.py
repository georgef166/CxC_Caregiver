# agents.py
from typing import List, Optional
import os
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv
import requests
from datetime import datetime
from google.oauth2 import service_account
from googleapiclient.discovery import build
import datetime
from google import genai
from google.genai import types
from pydantic import BaseModel
from utils.agent_ext import use_extended_tools


class AgentRequest(BaseModel):
    prompt: str

load_dotenv()


class CaregiverAgent:
    def __init__(self,
                 prompt: str, ):
        self.chat_id = os.environ['CHAT_ID']
        self.prompt = prompt
        self.system_prompt = \
            """
            You are an AI agent assisting caregivers of people with Parkinson's disease.
            You act as the single source of truth for the patient's information.
            Assume patient details are accumulated accurately over prior interactions and are always available to you.
            Your mission is to reduce caregiver effort in real time and answer questions decisively.

            IMPORTANT INTERACTION RULES:
            This is a SINGLE-TURN interaction. You receive one request, execute the necessary actions using your tools, and provide a final summary.
            Do NOT ask follow-up questions. Do NOT ask for confirmation before acting. Do NOT say things like "Would you like me to..." or "Do you want me to...".
            The user cannot reply to you. Act decisively on what was requested and report what you did.
            If the user does not specify details like a subject line, email body, event description, etc., generate reasonable defaults yourself. NEVER respond asking what the subject or body should be — just fill them in appropriately based on context.

            CONTEXT:
            You are often facilitating indirect communication between parties in a caregiving workflow — for example, a doctor emailing a caregiver, a caregiver messaging a family member, or scheduling appointments on behalf of the patient. The user issuing the request may not be the recipient. Write all messages, emails, and event details from the perspective appropriate to the situation (e.g. if a doctor is sending an email to a caregiver, write it as the doctor addressing the caregiver).

            Medical constraints:
            Do not diagnose or prescribe.
            Ground medical claims in current sources.
            Clearly flag escalation thresholds ("contact clinician if X", "emergency if Y").
            Decision heuristic:
            If the answer exists in patient data → respond immediately.
            If an action can reduce caregiver work → execute it.
            If uncertainty impacts safety → escalate or clarify once.
            Tone:
            Direct, calm, authoritative.
            No speculation.
            """
        message_tool = {
            "name": "send_telegram_message",
            "description": "Sends a message to a Telegram chat using a bot.",
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
            "description": """Sends an email using SMTP""",
            "parameters": {
                "type": "object",
                "properties": {
                    "to": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        },
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
                        "items": {
                            "type": "string"
                        },
                        "description": "Optional: List of CC email addresses."
                    },
                    "reply_to": {
                        "type": "string",
                        "description": "Optional: Reply-To email address."
                    }
                },
                "required": [
                    "to",
                    "subject",
                    "body"
                ]
            }
        }
        book_event_tool = {
            "name": "book_google_calendar_event",
            "description": "Creates an event on a specific Google Calendar using a Service Account.",
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
                        "items": {
                            "type": "string"
                        },
                        "description": "Optional: List of attendee email addresses."
                    },
                    "description": {
                        "type": "string",
                        "description": "Optional: Event description or notes."
                    },
                    "calendar_id": {
                        "type": "string",
                        "description": "The ID of the calendar (e.g., 'cxccaregiver@gmail.com')."
                    },
                    "timezone": {
                        "type": "string",
                        "description": "Timezone string, e.g., 'America/New_York'. Defaults to UTC."
                    }
                },
                "required": [
                    "summary",
                    "start_time",
                    "end_time"
                ]
            }
        }

        ext_tool = {
            "name": "call_tool_ext",
            "description": """Executes an external Google built-in tool (Search, Maps, or URL context).
                            This acts as a bridge to Google's native capabilities.""",
            "parameters": {
                "type": "object",
                "properties": {
                    "content": {
                        "type": "string",
                        "description": """The prompt you were currently provided with,
                                        append 'USE <tool name>' to the content"""
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
    ) -> None:
        """
        Sends an email using SMTP.

        Args:
            to (List[str]): List of recipient email addresses.
            subject (str): Email subject line.
            body (str): Plain-text email body.
            cc (Optional[List[str]], optional): List of CC email addresses. Defaults to None.
            reply_to (Optional[str], optional): Reply-To email address. Defaults to None.

        Raises:
            smtplib.SMTPException: If sending the email fails.
            KeyError: If SMTP credentials are not set in environment variables.

        Environment Variables:
            SMTP_USER (str): The email address to send from.
            SMTP_PASSWORD (str): The app password for SMTP authentication.
        """
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
        except smtplib.SMTPException as e:
            raise e

    def send_telegram_message(self, text: str) -> None:
        """
        Sends a message to a Telegram chat using a bot.

        Args:
            text (str): The message text to send.
            chat_id (int): The Telegram chat ID of the recipient.


        Raises:
            requests.HTTPError: If the request to the Telegram API fails.

        Environment Variables:
            TELEGRAM_BOT_TOKEN (str): The bot token obtained from BotFather.
        """
        token = os.environ["TELEGRAM_BOT_TOKEN"]
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {"chat_id": self.chat_id, "text": text}

        resp = requests.post(url, json=payload)
        try:
            resp.raise_for_status()
        except:
            raise requests.HTTPError(resp.text)

    @staticmethod
    def book_google_calendar_event(
            summary: str,
            start_time: str,
            end_time: str,
            attendees_emails: list[str] = None,
            description: str = "",
            calendar_id: str = "cxccaregiver@gmail.com",
            timezone: str = "UTC"  # Defaults to UTC, change to e.g. "America/New_York"
    ):
        """
        Creates an event on a specific Google Calendar using a Service Account.

        NOTE: For personal @gmail.com accounts, you must SHARE the calendar
        with the Service Account email (found in your JSON file) and grant
        "Make changes to events" permission.

        Args:
            summary (str): Event title.
            start_time (str): Event start "YYYY-MM-DD HH:MM".
            end_time (str): Event end "YYYY-MM-DD HH:MM".
            calendar_id (str): The ID of the calendar to book on (usually your email).
            attendees_emails (list[str], optional): List of attendee emails.
            description (str, optional): Event description.
            timezone (str, optional): Timezone string (default "UTC").

        Returns:
            dict: The created event object.
        """

        _scopes = ["https://www.googleapis.com/auth/calendar"]
        _service_account_file = "./cxccaregiver-223983f52c92.json"

        # 1. Load credentials (standard, no delegation)
        creds = service_account.Credentials.from_service_account_file(
            _service_account_file, scopes=_scopes
        )

        service = build("calendar", "v3", credentials=creds)

        # 2. Parse times
        start_dt = datetime.datetime.strptime(start_time, "%Y-%m-%d %H:%M")
        end_dt = datetime.datetime.strptime(end_time, "%Y-%m-%d %H:%M")

        # 3. Format attendees
        attendees_payload = []
        if attendees_emails:
            attendees_payload = [{'email': email} for email in attendees_emails]

        # 4. Build event body
        event = {
            "summary": summary,
            "description": description,
            "start": {
                "dateTime": start_dt.isoformat(),
                "timeZone": timezone
            },
            "end": {
                "dateTime": end_dt.isoformat(),
                "timeZone": timezone
            },
            "attendees": attendees_payload,
        }

        # 5. Insert event
        # We use 'calendar_id' (your email) instead of 'primary'.
        # If we used 'primary', it would book on the Service Account's invisible calendar.
        try:
            created_event = service.events().insert(
                calendarId=calendar_id,
                body=event,
                sendUpdates="all"
            ).execute()
            return created_event
        except Exception as e:
            print(f"Error: {e}")
            print(f"Ensure that {calendar_id} has shared 'Make Changes' access with the service account.")
            raise

    def call_tool_ext(self, content: str = None):
        """
        Executes an external Google built-in tool.

        This function serves as a bridge to utilize Google's native capabilities
        such as Search, Maps, and URL context processing.

        Args:
            content (str, optional): The query string, location, or URL
                to be processed by the tool. Defaults to None.

        Returns:
            Any: The raw response data from the utility execution.
        """
        # Assuming the implementation logic remains the same
        return use_extended_tools(content)

    def call_function(self, tool_name: str, *args, **kwargs):
        """
        Dynamically call any method of this class, whether static or instance.
        """
        method = getattr(self, tool_name)
        return method(*args, **kwargs)


async def run(prompt: str):
    agent = CaregiverAgent(prompt=prompt)
    api_key = os.environ["API_KEY"]
    client = genai.Client(api_key=api_key)

    custom_tools = types.Tool(
        function_declarations=[types.FunctionDeclaration(**tool) for tool in agent.tools]
    )

    config = types.GenerateContentConfig(
        tools=[custom_tools],
        system_instruction=agent.system_prompt,
    )

    contents = [types.Content(role="user", parts=[types.Part(text=prompt)])]

    while True:
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=config,
        )

        part = response.candidates[0].content.parts[0]

        if part.function_call:
            fc = part.function_call
            # Append the model's function call to the conversation
            contents.append(response.candidates[0].content)

            # Execute the function
            result = agent.call_function(fc.name, **fc.args)

            # Send the result back to the model
            contents.append(types.Content(
                role="user",
                parts=[types.Part(function_response=types.FunctionResponse(
                    name=fc.name,
                    response={"result": str(result)},
                ))],
            ))
        else:
            return response.text


# ============================================================
# Standalone utility functions (used by main.py task queue)
# ============================================================

def send_email(
    to: List[str],
    subject: str,
    body: str,
    cc: Optional[List[str]] = None,
    reply_to: Optional[str] = None,
    attachment_path: Optional[str] = None
) -> None:
    """
    Standalone email sender (used by task queue / email assistant).
    """
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

    if attachment_path and os.path.exists(attachment_path):
        import mimetypes
        mime_type, _ = mimetypes.guess_type(attachment_path)
        if mime_type:
            maintype, subtype = mime_type.split("/")
        else:
            maintype, subtype = "application", "octet-stream"
        with open(attachment_path, "rb") as f:
            msg.add_attachment(f.read(), maintype=maintype, subtype=subtype,
                               filename=os.path.basename(attachment_path))

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)


def send_telegram_message(text: str, chat_id: int = int(os.getenv("TELEGRAM_CHAT_ID", "0"))) -> None:
    """
    Standalone Telegram message sender (used by task queue).
    """
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        print("TELEGRAM_BOT_TOKEN not set, skipping telegram send")
        return
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {"chat_id": chat_id, "text": text}

    resp = requests.post(url, json=payload)
    resp.raise_for_status()
    return resp.json()


def get_telegram_updates(offset: Optional[int] = None) -> List[dict]:
    """
    Fetches updates from the Telegram bot.
    """
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        return []
    url = f"https://api.telegram.org/bot{token}/getUpdates"
    params = {"timeout": 5}
    if offset:
        params["offset"] = offset

    try:
        resp = requests.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
        if data["ok"]:
            return data["result"]
        return []
    except Exception as e:
        print(f"Error fetching telegram updates: {e}")
        return []
