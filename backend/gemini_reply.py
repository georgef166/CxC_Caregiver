"""
Gemini AI Reply Generator
Generates email replies using Google's Gemini AI
"""

import os
from typing import Dict, Optional
from google import genai
from google.genai import types
from dotenv import load_dotenv
import json

load_dotenv()


class GeminiReplyGenerator:
    """
    Class to generate email replies using Gemini AI
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Gemini AI
        
        Args:
            api_key: Gemini API key (if not provided, reads from environment)
        """
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        self.client = genai.Client(api_key=self.api_key)
    
    def generate_reply(
        self,
        email_subject: str,
        email_body: str,
        sender: str,
        context: Optional[str] = None,
        tone: str = "professional"
    ) -> Dict[str, str]:
        """
        Generate a reply to an email
        
        Args:
            email_subject: Subject of the original email
            email_body: Body of the original email
            sender: Sender's email address
            context: Additional context for generating the reply
            tone: Tone of the reply (professional, friendly, formal, casual)
            
        Returns:
            Dictionary with 'subject' and 'body' keys
        """
        
        prompt = self._build_prompt(email_subject, email_body, sender, context, tone)
        
        try:
            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            reply_text = response.text
            
            # Parse the response to extract subject and body
            subject, body = self._parse_reply(reply_text, email_subject)
            
            return {
                'subject': subject,
                'body': body
            }
            
        except Exception as e:
            print(f"Error generating reply: {e}")
            return {
                'subject': f"Re: {email_subject}",
                'body': "I apologize, but I encountered an error generating a reply. Please respond manually."
            }
    
    def _build_prompt(
        self,
        email_subject: str,
        email_body: str,
        sender: str,
        context: Optional[str],
        tone: str
    ) -> str:
        """
        Build the prompt for Gemini AI
        
        Args:
            email_subject: Subject of the original email
            email_body: Body of the original email
            sender: Sender's email address
            context: Additional context
            tone: Desired tone
            
        Returns:
            Formatted prompt string
        """
        
        prompt = f"""You are an AI assistant acting on behalf of a caregiver managing a patient's care. Your job is to draft ACTIONABLE replies — never say "I'll check and get back to you" or "I'll let you know later". You must make a decision in every reply.

Original Email Details:
From: {sender}
Subject: {email_subject}

Email Body:
{email_body}

"""
        
        if context:
            prompt += f"""
CALENDAR & AVAILABILITY INFO (use this to make scheduling decisions):
{context}

"""
        
        prompt += f"""
IMPORTANT RULES:
1. If someone proposes a time and the calendar shows FREE → CONFIRM the appointment. Say "That time works, we'll be there" or similar.
2. If someone proposes a time and the calendar shows BUSY → Decline that specific time and ASK for an alternative day/time. Do NOT say you'll "check and get back."
3. If someone asks a medical question → Answer helpfully based on the context or say you'll discuss with the doctor at the next appointment.
4. If someone needs a decision → MAKE the decision. Be proactive, not passive.
5. NEVER say "I'll check my schedule", "I'll get back to you", "Let me look into it", or anything deferring action.
6. Keep it {tone}, warm, and concise.
7. Sign off as the caregiver (not as an AI).

Format your response as:
SUBJECT: [Reply subject line]

BODY:
[Reply email body]
"""
        
        return prompt
    
    def _parse_reply(self, reply_text: str, original_subject: str) -> tuple[str, str]:
        """
        Parse the AI-generated reply into subject and body
        
        Args:
            reply_text: Raw reply text from Gemini
            original_subject: Original email subject for fallback
            
        Returns:
            Tuple of (subject, body)
        """
        
        lines = reply_text.strip().split('\n')
        subject = f"Re: {original_subject}"
        body = reply_text
        
        # Try to extract SUBJECT: and BODY: sections
        for i, line in enumerate(lines):
            if line.strip().upper().startswith('SUBJECT:'):
                subject = line.split(':', 1)[1].strip()
                # Find BODY: section
                for j in range(i+1, len(lines)):
                    if lines[j].strip().upper().startswith('BODY:'):
                        body = '\n'.join(lines[j+1:]).strip()
                        break
                break
        
        return subject, body
    
    def analyze_email_intent(self, email_body: str) -> Dict[str, any]:
        """
        Analyze the intent and urgency of an email
        
        Args:
            email_body: Email body text
            
        Returns:
            Dictionary with 'intent', 'urgency', and 'requires_reply' keys
        """
        
        prompt = f"""Analyze the following email and determine:
1. The primary intent (question, request, information, complaint, feedback, other)
2. The urgency level (low, medium, high)
3. Whether it requires a reply (yes/no)

Email:
{email_body}

Respond in this format:
INTENT: [intent]
URGENCY: [urgency level]
REQUIRES_REPLY: [yes/no]
REASONING: [brief explanation]
"""
        
        try:
            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            analysis_text = response.text
            
            # Parse the response
            analysis = {
                'intent': 'unknown',
                'urgency': 'medium',
                'requires_reply': True,
                'reasoning': ''
            }
            
            for line in analysis_text.split('\n'):
                line = line.strip()
                if line.upper().startswith('INTENT:'):
                    analysis['intent'] = line.split(':', 1)[1].strip().lower()
                elif line.upper().startswith('URGENCY:'):
                    analysis['urgency'] = line.split(':', 1)[1].strip().lower()
                elif line.upper().startswith('REQUIRES_REPLY:'):
                    reply_needed = line.split(':', 1)[1].strip().lower()
                    analysis['requires_reply'] = reply_needed.startswith('y')
                elif line.upper().startswith('REASONING:'):
                    analysis['reasoning'] = line.split(':', 1)[1].strip()
            
            return analysis
            
        except Exception as e:
            print(f"Error analyzing email: {e}")
            return {
                'intent': 'unknown',
                'urgency': 'medium',
                'requires_reply': True,
                'reasoning': 'Analysis failed'
            }


    def extract_scheduling_info(self, email_body: str) -> Dict[str, any]:
        """Extract date/time info for appointments."""
        prompt = f"""
        Analyze this email body to find if there is a specific date and time proposed for an appointment or meeting.
        Assume the year is 2026.
        Return raw JSON object:
        {{
            "has_proposal": boolean, 
            "datetime_iso": "YYYY-MM-DDTHH:MM:SS" (string or null if not found, use 24h format),
            "duration_minutes": number (default 120),
            "summary": "Meeting Title (e.g. Appointment with Dr. X)"
        }}
        
        Email Body: 
        {email_body[:2000]}
        """
        try:
            response = self.client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json")
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"Error extracting scheduling info: {e}")
            return {"has_proposal": False}


if __name__ == "__main__":
    # Test the reply generator
    generator = GeminiReplyGenerator()
    
    test_email = {
        'subject': 'Meeting Request for Next Week',
        'body': 'Hi, I would like to schedule a meeting with you next week to discuss the caregiver scheduling system. Are you available Tuesday or Wednesday afternoon?',
        'sender': 'john@example.com'
    }
    
    reply = generator.generate_reply(
        email_subject=test_email['subject'],
        email_body=test_email['body'],
        sender=test_email['sender'],
        tone='professional'
    )
    
    print("Generated Reply:")
    print(f"Subject: {reply['subject']}")
    print(f"\n{reply['body']}")
    
    print("\n" + "="*50 + "\n")
    
    analysis = generator.analyze_email_intent(test_email['body'])
    print("Email Analysis:")
    print(f"Intent: {analysis['intent']}")
    print(f"Urgency: {analysis['urgency']}")
    print(f"Requires Reply: {analysis['requires_reply']}")
    print(f"Reasoning: {analysis['reasoning']}")
