"""
Gmail Email Reader
Reads emails from Gmail using the Gmail API
"""

import os
import base64
from typing import List, Dict, Optional
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# If modifying these scopes, delete the file token.json.
SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/calendar'
]


class GmailReader:
    """
    Class to handle reading emails from Gmail
    """
    
    def __init__(self, credentials_path: str = 'credentials.json', token_path: str = 'token.json'):
        """
        Initialize Gmail reader with authentication
        
        Args:
            credentials_path: Path to credentials.json file
            token_path: Path to token.json file
        """
        self.credentials_path = credentials_path
        self.token_path = token_path
        self.service = None
        self._authenticate()
    
    def _authenticate(self):
        """Authenticate with Gmail API"""
        creds = None
        
        # The file token.json stores the user's access and refresh tokens
        if os.path.exists(self.token_path):
            creds = Credentials.from_authorized_user_file(self.token_path, SCOPES)
        
        # If there are no (valid) credentials available, let the user log in.
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(
                    self.credentials_path, SCOPES)
                creds = flow.run_local_server(port=0)
            
            # Save the credentials for the next run
            with open(self.token_path, 'w') as token:
                token.write(creds.to_json())
        
        self.creds = creds
        self.service = build('gmail', 'v1', credentials=creds)
    
    def get_unread_emails(self, max_results: int = 10) -> List[Dict]:
        """
        Get unread emails
        
        Args:
            max_results: Maximum number of emails to retrieve
            
        Returns:
            List of email dictionaries with id, subject, sender, body, and date
        """
        try:
            # Get list of unread messages
            results = self.service.users().messages().list(
                userId='me',
                q='is:unread',
                maxResults=max_results
            ).execute()
            
            messages = results.get('messages', [])
            
            if not messages:
                return []
            
            emails = []
            for message in messages:
                email_data = self._get_email_details(message['id'])
                if email_data:
                    emails.append(email_data)
            
            return emails
            
        except HttpError as error:
            print(f'An error occurred: {error}')
            return []
    
    def get_email_by_id(self, message_id: str) -> Optional[Dict]:
        """
        Get specific email by ID
        
        Args:
            message_id: Gmail message ID
            
        Returns:
            Email dictionary or None
        """
        return self._get_email_details(message_id)
    
    def _get_email_details(self, message_id: str) -> Optional[Dict]:
        """
        Get detailed information about an email
        
        Args:
            message_id: Gmail message ID
            
        Returns:
            Dictionary containing email details
        """
        try:
            message = self.service.users().messages().get(
                userId='me',
                id=message_id,
                format='full'
            ).execute()
            
            headers = message['payload']['headers']
            
            # Extract headers
            subject = next((h['value'] for h in headers if h['name'] == 'Subject'), 'No Subject')
            sender = next((h['value'] for h in headers if h['name'] == 'From'), 'Unknown')
            date = next((h['value'] for h in headers if h['name'] == 'Date'), 'Unknown')
            to = next((h['value'] for h in headers if h['name'] == 'To'), 'Unknown')
            
            # Extract body
            body = self._get_email_body(message['payload'])
            
            return {
                'id': message_id,
                'subject': subject,
                'sender': sender,
                'to': to,
                'date': date,
                'body': body,
                'snippet': message.get('snippet', '')
            }
            
        except HttpError as error:
            print(f'An error occurred: {error}')
            return None
    
    def _get_email_body(self, payload: Dict) -> str:
        """
        Extract email body from payload
        
        Args:
            payload: Email payload from Gmail API
            
        Returns:
            Email body as string
        """
        body = ''
        
        if 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    if 'data' in part['body']:
                        body = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
                        break
                elif part['mimeType'] == 'text/html' and not body:
                    if 'data' in part['body']:
                        body = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
        else:
            if 'body' in payload and 'data' in payload['body']:
                body = base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8')
        
        return body
    
    def mark_as_read(self, message_id: str) -> bool:
        """
        Mark an email as read
        
        Args:
            message_id: Gmail message ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            self.service.users().messages().modify(
                userId='me',
                id=message_id,
                body={'removeLabelIds': ['UNREAD']}
            ).execute()
            return True
        except HttpError as error:
            print(f'An error occurred: {error}')
            return False


if __name__ == "__main__":
    # Test the Gmail reader
    reader = GmailReader()
    unread = reader.get_unread_emails(max_results=5)
    
    print(f"Found {len(unread)} unread emails:")
    for email in unread:
        print(f"\nSubject: {email['subject']}")
        print(f"From: {email['sender']}")
        print(f"Date: {email['date']}")
        print(f"Snippet: {email['snippet'][:100]}...")
