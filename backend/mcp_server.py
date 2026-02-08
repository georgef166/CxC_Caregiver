"""
MCP Server for Email Assistant
Provides email reading and reply generation capabilities via MCP
"""

import os
import json
from typing import Any, Sequence
from mcp.server import Server
from mcp.types import Tool, TextContent, ImageContent, EmbeddedResource
from gmail_reader import GmailReader
from gemini_reply import GeminiReplyGenerator
from agents import send_email

# Initialize the MCP server
app = Server("email-assistant")

# Initialize Gmail and Gemini
gmail_reader = GmailReader()
reply_generator = GeminiReplyGenerator()


@app.list_tools()
async def list_tools() -> list[Tool]:
    """
    List available tools for the email assistant
    """
    return [
        Tool(
            name="get_unread_emails",
            description="Get a list of unread emails from Gmail. Returns email ID, subject, sender, date, and snippet.",
            inputSchema={
                "type": "object",
                "properties": {
                    "max_results": {
                        "type": "integer",
                        "description": "Maximum number of emails to retrieve (default: 10)",
                        "default": 10
                    }
                }
            }
        ),
        Tool(
            name="get_email_details",
            description="Get full details of a specific email by ID, including the complete body.",
            inputSchema={
                "type": "object",
                "properties": {
                    "message_id": {
                        "type": "string",
                        "description": "Gmail message ID"
                    }
                },
                "required": ["message_id"]
            }
        ),
        Tool(
            name="generate_reply",
            description="Generate an AI-powered reply to an email using Gemini AI.",
            inputSchema={
                "type": "object",
                "properties": {
                    "email_subject": {
                        "type": "string",
                        "description": "Subject of the original email"
                    },
                    "email_body": {
                        "type": "string",
                        "description": "Body of the original email"
                    },
                    "sender": {
                        "type": "string",
                        "description": "Email address of the sender"
                    },
                    "context": {
                        "type": "string",
                        "description": "Additional context for generating the reply (optional)"
                    },
                    "tone": {
                        "type": "string",
                        "description": "Tone of the reply: professional, friendly, formal, or casual",
                        "enum": ["professional", "friendly", "formal", "casual"],
                        "default": "professional"
                    }
                },
                "required": ["email_subject", "email_body", "sender"]
            }
        ),
        Tool(
            name="analyze_email",
            description="Analyze an email to determine its intent, urgency, and whether it requires a reply.",
            inputSchema={
                "type": "object",
                "properties": {
                    "email_body": {
                        "type": "string",
                        "description": "Body of the email to analyze"
                    }
                },
                "required": ["email_body"]
            }
        ),
        Tool(
            name="send_email_reply",
            description="Send an email reply using SMTP.",
            inputSchema={
                "type": "object",
                "properties": {
                    "to": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of recipient email addresses"
                    },
                    "subject": {
                        "type": "string",
                        "description": "Email subject line"
                    },
                    "body": {
                        "type": "string",
                        "description": "Email body"
                    },
                    "cc": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of CC email addresses (optional)"
                    },
                    "reply_to": {
                        "type": "string",
                        "description": "Reply-To email address (optional)"
                    }
                },
                "required": ["to", "subject", "body"]
            }
        ),
        Tool(
            name="mark_email_read",
            description="Mark an email as read in Gmail.",
            inputSchema={
                "type": "object",
                "properties": {
                    "message_id": {
                        "type": "string",
                        "description": "Gmail message ID"
                    }
                },
                "required": ["message_id"]
            }
        )
    ]


@app.call_tool()
async def call_tool(name: str, arguments: Any) -> Sequence[TextContent | ImageContent | EmbeddedResource]:
    """
    Handle tool calls
    """
    
    if name == "get_unread_emails":
        max_results = arguments.get("max_results", 10)
        emails = gmail_reader.get_unread_emails(max_results=max_results)
        return [TextContent(
            type="text",
            text=json.dumps(emails, indent=2)
        )]
    
    elif name == "get_email_details":
        message_id = arguments["message_id"]
        email = gmail_reader.get_email_by_id(message_id)
        return [TextContent(
            type="text",
            text=json.dumps(email, indent=2)
        )]
    
    elif name == "generate_reply":
        reply = reply_generator.generate_reply(
            email_subject=arguments["email_subject"],
            email_body=arguments["email_body"],
            sender=arguments["sender"],
            context=arguments.get("context"),
            tone=arguments.get("tone", "professional")
        )
        return [TextContent(
            type="text",
            text=json.dumps(reply, indent=2)
        )]
    
    elif name == "analyze_email":
        analysis = reply_generator.analyze_email_intent(arguments["email_body"])
        return [TextContent(
            type="text",
            text=json.dumps(analysis, indent=2)
        )]
    
    elif name == "send_email_reply":
        try:
            send_email(
                to=arguments["to"],
                subject=arguments["subject"],
                body=arguments["body"],
                cc=arguments.get("cc"),
                reply_to=arguments.get("reply_to")
            )
            return [TextContent(
                type="text",
                text=json.dumps({"status": "success", "message": "Email sent successfully"})
            )]
        except Exception as e:
            return [TextContent(
                type="text",
                text=json.dumps({"status": "error", "message": str(e)})
            )]
    
    elif name == "mark_email_read":
        message_id = arguments["message_id"]
        success = gmail_reader.mark_as_read(message_id)
        return [TextContent(
            type="text",
            text=json.dumps({
                "status": "success" if success else "error",
                "message_id": message_id
            })
        )]
    
    else:
        raise ValueError(f"Unknown tool: {name}")


async def main():
    """Run the MCP server"""
    from mcp.server.stdio import stdio_server
    
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
