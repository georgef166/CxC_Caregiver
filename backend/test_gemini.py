import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

api_key = os.getenv('GEMINI_API_KEY')
print(f"API Key found: {api_key[:20]}..." if api_key else "API Key: NOT FOUND")

if api_key:
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents="Say hello"
    )
    print(f"Response: {response.text}")
else:
    print("ERROR: GEMINI_API_KEY not set in .env file")
