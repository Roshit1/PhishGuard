import os
import google.generativeai as genai
from dotenv import load_dotenv

# Use absolute path to find the backend/.env file
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_env = os.path.join(current_dir, "..", "backend", ".env")

print(f"Looking for .env at: {backend_env}")
load_dotenv(dotenv_path=backend_env)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    print(f"API Key found: {GEMINI_API_KEY[:5]}...{GEMINI_API_KEY[-5:]}")
else:
    print("Error: GEMINI_API_KEY not found in .env")
    exit(1)

try:
    print("Attempting to list models...")
    genai.configure(api_key=GEMINI_API_KEY)
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"Model: {m.name}")
    
    print("\nAttempting to connect to Gemini (using gemini-flash-latest)...")
    model = genai.GenerativeModel('gemini-flash-latest')
    response = model.generate_content("Ping")
    print("Success! Gemini response:")
    print(response.text)
except Exception as e:
    print(f"Failed: {e}")
