import requests
import json

url = "http://127.0.0.1:5000/api/datasets/version/1/chat"
# Need a token. This is hard without login.
# But I can bypass auth in routes.py temporarily to test?
# Or I can use the existing token if I knew it.

# Alternatively, I can simulate the internal function call like I did for LLM.
from src.services import DataProcessor
from src.llm_service import LLMService
# Need dummy data.
import pandas as pd
df = pd.DataFrame({'Age': [22, 38, 26, 35], 'Survived': [0, 1, 1, 0], 'Name': ['A', 'B', 'C', 'D']})

print("--- Testing Query ---")
processor = DataProcessor("dummy.csv") # Dummy file path
processor.df = df # Inject data
processor.llm = LLMService()


if not processor.llm.enabled:
    print("LLM Disabled. Aborting.")
    exit()

try:
    print("Query: Show me survivors")
    data, msg = processor.query_data_with_ai("Show me survivors")
    print(f"\n[RESULT MESSAGE]: {msg}")
    print(f"[RESULT DATA]: {data}")
except Exception as e:
    print(f"FAILED: {e}")
    import traceback
    traceback.print_exc()


