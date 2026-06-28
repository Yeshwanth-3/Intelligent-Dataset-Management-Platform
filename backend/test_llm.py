from src.llm_service import LLMService

print("--- Testing LLM Service ---")
try:
    llm = LLMService()
    if llm.enabled:
        print("✅ Service Enabled!")
        import google.generativeai as genai
        print("Attempting to generate text with gemini-flash-lite-latest...")
        model = genai.GenerativeModel('gemini-flash-lite-latest')
        response = model.generate_content("Hello! Are you working?")
        print(f"✅ Response received: {response.text}")





    else:
        print("❌ Service DISABLED. Check environment variables.")
        import os
        print(f"Current Key in Env: {os.environ.get('GEMINI_API_KEY')}")

except Exception as e:
    print(f"❌ CRITICAL ERROR: {e}")
