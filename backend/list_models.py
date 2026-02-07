import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

api_key = os.getenv('GEMINI_API_KEY')

if api_key:
    client = genai.Client(api_key=api_key)
    
    print("Available Gemini models:")
    print("=" * 60)
    
    try:
        models = client.models.list()
        for model in models:
            print(f"Model: {model.name}")
            if hasattr(model, 'supported_generation_methods'):
                print(f"  Supports: {model.supported_generation_methods}")
            print()
    except Exception as e:
        print(f"Error listing models: {e}")
        print("\nTrying common model names...")
        
        # Try common models
        common_models = [
            'gemini-1.5-flash',
            'gemini-1.5-pro',
            'gemini-pro',
            'gemini-1.0-pro'
        ]
        
        for model_name in common_models:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents="Say hello"
                )
                print(f"✓ {model_name} WORKS!")
                print(f"  Response: {response.text[:50]}...")
                break
            except Exception as e:
                print(f"✗ {model_name} - {str(e)[:80]}...")
else:
    print("ERROR: GEMINI_API_KEY not set")
