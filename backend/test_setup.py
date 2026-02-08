"""
Test Script for Email Assistant
Run this to verify your setup is working correctly
"""

import os
from dotenv import load_dotenv

load_dotenv()

def test_environment_variables():
    """Test if all required environment variables are set"""
    print("🔍 Checking environment variables...")
    
    required_vars = ['SMTP_USER', 'SMTP_PASSWORD', 'GEMINI_API_KEY']
    missing_vars = []
    
    for var in required_vars:
        if os.getenv(var):
            print(f"  ✓ {var} is set")
        else:
            print(f"  ✗ {var} is MISSING")
            missing_vars.append(var)
    
    if missing_vars:
        print(f"\n❌ Missing variables: {', '.join(missing_vars)}")
        print("Please add them to your .env file")
        return False
    else:
        print("\n✅ All environment variables are set!")
        return True


def test_credentials_file():
    """Test if credentials.json exists"""
    print("\n🔍 Checking for credentials.json...")
    
    if os.path.exists('credentials.json'):
        print("  ✓ credentials.json found")
        return True
    else:
        print("  ✗ credentials.json NOT FOUND")
        print("Please download it from Google Cloud Console")
        return False


def test_imports():
    """Test if all required packages are installed"""
    print("\n🔍 Checking Python packages...")
    
    packages = {
        'fastapi': 'FastAPI',
        'google.genai': 'Google Genai',
        'googleapiclient': 'Google API Client',
        'dotenv': 'Python Dotenv',
        'mcp': 'MCP'
    }
    
    missing_packages = []
    
    for package, name in packages.items():
        try:
            __import__(package)
            print(f"  ✓ {name}")
        except ImportError:
            print(f"  ✗ {name} NOT INSTALLED")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n❌ Missing packages. Run: pip install -r requirements.txt")
        return False
    else:
        print("\n✅ All packages are installed!")
        return True


def test_gemini_connection():
    """Test Gemini API connection"""
    print("\n🔍 Testing Gemini AI connection...")
    
    try:
        from google import genai
        
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            print("  ✗ GEMINI_API_KEY not set")
            return False
        
        client = genai.Client(api_key=api_key)
        
        # Test simple generation
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents="Say 'Hello, Email Assistant!'"
        )
        
        if response.text:
            print(f"  ✓ Gemini AI is working!")
            print(f"  Response: {response.text[:50]}...")
            return True
        else:
            print("  ✗ Gemini AI returned empty response")
            return False
            
    except Exception as e:
        print(f"  ✗ Gemini AI connection failed: {str(e)}")
        return False


def main():
    """Run all tests"""
    print("=" * 60)
    print("EMAIL ASSISTANT SETUP TEST")
    print("=" * 60)
    
    results = []
    
    # Run tests
    results.append(("Environment Variables", test_environment_variables()))
    results.append(("Credentials File", test_credentials_file()))
    results.append(("Python Packages", test_imports()))
    results.append(("Gemini AI Connection", test_gemini_connection()))
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    all_passed = all(result[1] for result in results)
    
    if all_passed:
        print("\n🎉 All tests passed! Your setup is ready.")
        print("\nNext steps:")
        print("1. Run the FastAPI server: python main.py")
        print("2. Visit http://localhost:8000/docs for API docs")
        print("3. Try the MCP server: python mcp_server.py")
    else:
        print("\n⚠️  Some tests failed. Please fix the issues above.")
        print("\nSetup guide: See README.md for detailed instructions")
    
    print("=" * 60)


if __name__ == "__main__":
    main()
