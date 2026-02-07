# agents.py
from typing import List, Optional
import os
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv
import requests

load_dotenv()


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


def send_telegram_message(text: str, chat_id: int = 8323072245,) -> None:
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
    payload = {"chat_id": chat_id, "text": text}

    resp = requests.post(url, json=payload)
    try:
        resp.raise_for_status()
    except:
        raise requests.HTTPError(resp.text)


