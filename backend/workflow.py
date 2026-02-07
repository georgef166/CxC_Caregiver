"""
Complete Email Workflow
Reads unread emails, analyzes them, generates AI replies, and optionally sends them
"""

from gmail_reader import GmailReader
from gemini_reply import GeminiReplyGenerator
from agent import send_email
import time


def process_emails(max_emails=5, auto_send=False, mark_read=True):
    """
    Complete email processing workflow
    
    Args:
        max_emails: Maximum number of emails to process
        auto_send: If True, automatically sends replies (USE WITH CAUTION!)
        mark_read: If True, marks processed emails as read
    """
    
    print("=" * 70)
    print("EMAIL ASSISTANT WORKFLOW")
    print("=" * 70)
    
    # Initialize services
    print("\n📧 Initializing Gmail reader...")
    reader = GmailReader()
    
    print("🤖 Initializing Gemini AI...")
    generator = GeminiReplyGenerator()
    
    # Get unread emails
    print(f"\n📬 Fetching up to {max_emails} unread emails...")
    emails = reader.get_unread_emails(max_results=max_emails)
    
    if not emails:
        print("✅ No unread emails found!")
        return
    
    print(f"📨 Found {len(emails)} unread email(s)\n")
    
    # Process each email
    for i, email in enumerate(emails, 1):
        print("=" * 70)
        print(f"EMAIL {i}/{len(emails)}")
        print("=" * 70)
        
        # Display email info
        print(f"\n📧 Subject: {email['subject']}")
        print(f"👤 From: {email['sender']}")
        print(f"📅 Date: {email['date']}")
        print(f"\n📝 Preview: {email['snippet'][:150]}...")
        
        # Analyze the email
        print("\n🔍 Analyzing email...")
        analysis = generator.analyze_email_intent(email['body'])
        
        print(f"   Intent: {analysis['intent']}")
        print(f"   Urgency: {analysis['urgency']}")
        print(f"   Requires Reply: {analysis['requires_reply']}")
        print(f"   Reasoning: {analysis['reasoning']}")
        
        # Decide whether to reply
        if not analysis['requires_reply']:
            print("\n⏭️  Skipping - No reply needed")
            
            if mark_read:
                reader.mark_as_read(email['id'])
                print("✓ Marked as read")
            
            print()
            continue
        
        # Generate reply
        print("\n🤖 Generating AI reply...")
        reply = generator.generate_reply(
            email_subject=email['subject'],
            email_body=email['body'],
            sender=email['sender'],
            tone='professional'
        )
        
        print(f"\n📤 Generated Reply:")
        print(f"   Subject: {reply['subject']}")
        print(f"   Body Preview: {reply['body'][:200]}...")
        
        # Show full reply
        print("\n" + "-" * 70)
        print("FULL REPLY:")
        print("-" * 70)
        print(f"Subject: {reply['subject']}\n")
        print(reply['body'])
        print("-" * 70)
        
        # Send or ask for confirmation
        if auto_send:
            print("\n📮 Auto-sending reply...")
            try:
                # Extract sender email (remove name if present)
                sender_email = email['sender']
                if '<' in sender_email:
                    sender_email = sender_email.split('<')[1].split('>')[0]
                
                send_email(
                    to=[sender_email],
                    subject=reply['subject'],
                    body=reply['body']
                )
                print("✅ Reply sent!")
                
                if mark_read:
                    reader.mark_as_read(email['id'])
                    print("✓ Marked as read")
                    
            except Exception as e:
                print(f"❌ Error sending email: {e}")
        else:
            print("\n⚠️  Reply NOT sent (auto_send=False)")
            print("   To send replies automatically, set auto_send=True")
            
            if mark_read:
                user_input = input("\n❓ Mark this email as read? (y/n): ").lower()
                if user_input == 'y':
                    reader.mark_as_read(email['id'])
                    print("✓ Marked as read")
        
        print()
        time.sleep(1)  # Small delay between emails
    
    # Summary
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"✅ Processed {len(emails)} email(s)")
    print(f"📊 Mode: {'Auto-send' if auto_send else 'Preview only'}")
    print("=" * 70)


def interactive_mode():
    """
    Interactive mode - prompts user for each email
    """
    print("=" * 70)
    print("EMAIL ASSISTANT - INTERACTIVE MODE")
    print("=" * 70)
    
    # Initialize services
    print("\n📧 Initializing services...")
    reader = GmailReader()
    generator = GeminiReplyGenerator()
    
    # Get unread emails
    max_emails = input("\n📬 How many emails to process? (default: 5): ").strip()
    max_emails = int(max_emails) if max_emails else 5
    
    emails = reader.get_unread_emails(max_results=max_emails)
    
    if not emails:
        print("✅ No unread emails found!")
        return
    
    print(f"\n📨 Found {len(emails)} unread email(s)")
    
    # Process each email
    for i, email in enumerate(emails, 1):
        print("\n" + "=" * 70)
        print(f"EMAIL {i}/{len(emails)}")
        print("=" * 70)
        
        print(f"\n📧 Subject: {email['subject']}")
        print(f"👤 From: {email['sender']}")
        print(f"📅 Date: {email['date']}")
        print(f"\n📝 Snippet: {email['snippet']}")
        
        # Ask if user wants to process this email
        process = input("\n❓ Generate reply for this email? (y/n/q to quit): ").lower()
        
        if process == 'q':
            print("👋 Exiting...")
            break
        
        if process != 'y':
            print("⏭️  Skipped")
            continue
        
        # Analyze
        print("\n🔍 Analyzing...")
        analysis = generator.analyze_email_intent(email['body'])
        print(f"   Intent: {analysis['intent']}, Urgency: {analysis['urgency']}")
        
        # Generate reply
        print("\n🤖 Generating reply...")
        reply = generator.generate_reply(
            email_subject=email['subject'],
            email_body=email['body'],
            sender=email['sender'],
            tone='professional'
        )
        
        print("\n" + "-" * 70)
        print(f"Subject: {reply['subject']}\n")
        print(reply['body'])
        print("-" * 70)
        
        # Ask if user wants to send
        send = input("\n❓ Send this reply? (y/n): ").lower()
        
        if send == 'y':
            try:
                sender_email = email['sender']
                if '<' in sender_email:
                    sender_email = sender_email.split('<')[1].split('>')[0]
                
                send_email(
                    to=[sender_email],
                    subject=reply['subject'],
                    body=reply['body']
                )
                print("✅ Reply sent!")
                
                # Mark as read
                reader.mark_as_read(email['id'])
                print("✓ Marked as read")
                
            except Exception as e:
                print(f"❌ Error: {e}")
        else:
            print("⏭️  Reply not sent")


if __name__ == "__main__":
    print("\n🤖 EMAIL ASSISTANT\n")
    print("Choose a mode:")
    print("1. Preview mode (analyze & generate replies, don't send)")
    print("2. Interactive mode (ask for each email)")
    print("3. Auto mode (automatically send replies - USE WITH CAUTION!)")
    
    choice = input("\nEnter choice (1/2/3): ").strip()
    
    if choice == '1':
        print("\n📋 Running in PREVIEW mode (won't send emails)\n")
        process_emails(max_emails=5, auto_send=False, mark_read=False)
    
    elif choice == '2':
        print("\n💬 Running in INTERACTIVE mode\n")
        interactive_mode()
    
    elif choice == '3':
        confirm = input("\n⚠️  AUTO MODE will send replies automatically. Are you sure? (yes/no): ")
        if confirm.lower() == 'yes':
            print("\n🚀 Running in AUTO mode\n")
            process_emails(max_emails=5, auto_send=True, mark_read=True)
        else:
            print("❌ Cancelled")
    
    else:
        print("❌ Invalid choice")
