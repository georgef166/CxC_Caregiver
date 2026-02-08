"""
Gemini AI Reply Generator
Generates email replies using Google's Gemini AI
"""

import os
from typing import Dict, Optional
from google import genai
from google.genai import types
from dotenv import load_dotenv

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
        
        prompt = f"""You are an email assistant helping to draft a reply to an email.

Original Email Details:
From: {sender}
Subject: {email_subject}

Email Body:
{email_body}

"""
        
        if context:
            prompt += f"""
Additional Context:
{context}

"""
        
        prompt += f"""
Please generate a {tone} email reply. Follow these guidelines:
1. Address the main points of the original email
2. Be clear and concise
3. Maintain a {tone} tone
4. If the email requires specific information you don't have, acknowledge this politely
5. End with an appropriate closing

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
