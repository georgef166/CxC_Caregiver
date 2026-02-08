from googleapiclient.discovery import build
import datetime

class CalendarService:
    def __init__(self, creds):
        self.service = build('calendar', 'v3', credentials=creds)

    def is_free(self, start_time: datetime.datetime, end_time: datetime.datetime):
        """Check if time slot is free (assumes UTC for simplicity)."""
        body = {
            "timeMin": start_time.isoformat() + 'Z',
            "timeMax": end_time.isoformat() + 'Z',
            "items": [{"id": "primary"}]
        }
        events = self.service.freebusy().query(body=body).execute()
        calendars = events.get('calendars', {})
        primary_busy = calendars.get('primary', {}).get('busy', [])
        return len(primary_busy) == 0

    def add_event(self, summary, start_time: datetime.datetime, end_time: datetime.datetime, description=""):
        """Create event in primary calendar."""
        event = {
            'summary': summary,
            'description': description,
            'start': {'dateTime': start_time.isoformat(), 'timeZone': 'UTC'},
            'end': {'dateTime': end_time.isoformat(), 'timeZone': 'UTC'},
        }
        event = self.service.events().insert(calendarId='primary', body=event).execute()
        return event.get('htmlLink')

    def get_events(self, time_min: datetime.datetime, time_max: datetime.datetime, max_results: int = 50):
        """List events from primary calendar in a time range."""
        events_result = self.service.events().list(
            calendarId='primary',
            timeMin=time_min.isoformat() + 'Z',
            timeMax=time_max.isoformat() + 'Z',
            maxResults=max_results,
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        items = events_result.get('items', [])
        return [
            {
                "id": ev.get("id"),
                "summary": ev.get("summary", "(No title)"),
                "description": ev.get("description", ""),
                "location": ev.get("location", ""),
                "start": ev.get("start", {}).get("dateTime") or ev.get("start", {}).get("date", ""),
                "end": ev.get("end", {}).get("dateTime") or ev.get("end", {}).get("date", ""),
                "html_link": ev.get("htmlLink", ""),
                "status": ev.get("status", "confirmed"),
            }
            for ev in items
        ]
