import os
import json
import pandas as pd

# Graceful optional dependency
try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False
    print("WARNING: google.generativeai module not found. AI features disabled.")

class LLMService:
    def __init__(self):
        self.enabled = False
        api_key = os.environ.get("GEMINI_API_KEY")
        
        if HAS_GENAI and api_key and api_key != "YOUR_API_KEY_HERE":
            try:
                genai.configure(api_key=api_key)
                self.model = genai.GenerativeModel('gemini-flash-lite-latest')
                self.enabled = True

                print("SUCCESS: Google Gemini AI initialized.")
            except Exception as e:
                print(f"ERROR: Failed to configure Gemini AI: {e}")
                # Fallback to simulation if initialization fails (e.g. invalid key/model)
                self.enabled = False



        else:
            print("WARNING: AI features disabled (Missing Key or Module).")


    def _get_simulation_message(self, feature_name):
        return f"Simulation: AI features are disabled because GEMINI_API_KEY is missing. This would be the {feature_name}."

    def chat_with_dataset(self, context_data, user_query):
        """
        Advisory Chat Mode: Answers user questions based STRICTLY on provided metadata.
        No raw rows are accessed.
        """
        if not self.enabled:
             return "I am in simulation mode. I can tell you that the dataset has 500 rows and 'Age' has missing values, but I can't answer custom questions without a valid API Key."

        system_prompt = f"""
        You are the 'Data Quality Assistant' for an enterprise dataset platform.
        
        YOUR GOAL:
        Explain data quality issues, health scores, and cleaning rules to the user based ONLY on the provided context stats.
        
        STRICT RULES:
        1. You DO NOT have access to the raw data rows. DO NOT pretend to see them.
        2. Answer ONLY using the JSON statistics provided below (Context).
        3. If 'rules_active' is empty, explicitly state "There are no custom validation rules currently active for this dataset."
        4. If the answer is not in the context, say "I don't have that information in my summary."
        5. Be concise, professional, and business-focused.
        6. DO NOT write code. DO NOT suggest dropping specific rows by ID unless listed in the 'problem_samples'.
        
        CONTEXT DATA (JSON Summary):
        {json.dumps(context_data, indent=2, default=str)}
        """
        
        try:
            response = self.model.generate_content(
                f"{system_prompt}\n\nUSER QUESTION: {user_query}"
            )
            return response.text
        except Exception as e:
            print(f"LLM Chat Error: {e}")
            return "I'm having trouble connecting to the AI service right now. Please try again."

    def generate_cleaning_suggestions(self, df_head, metadata, is_cleaned=False):
        """
        Feature A: 'Smart' Cleaning Suggestions
        Analyzes the head of the dataframe and metadata to suggest cleaning operations.
        is_cleaned: Boolean, if True, the data has already undergone basic cleaning.
        """
        if not self.enabled:
            return "AI Suggestion: Standardize date formats in 'Date' column and impute missing values in 'Salary' using median strategy. (Simulation)"

        context_note = ""
        if is_cleaned:
            context_note = "NOTE: This dataset has ALREADY been cleaned. Start your response with '✅ **Basic Cleaning Complete. The dataset looks healthy.**' then provide optional tips for Advanced Feature Engineering."


        try:
            data_sample = df_head.to_markdown()
        except ImportError:
            data_sample = df_head.to_string()

        prompt = f"""
        You are an expert Data Scientist. Analyze this dataset sample and metadata to provide smart cleaning suggestions.
        {context_note}
        
        Metadata: {json.dumps(metadata, default=str)}

        
        First 5 rows of data:
        {data_sample}
        
        Identify specific data quality issues (mixed formats, potential outliers, missing value patterns) and suggest concrete 
        cleaning steps or business logic formatting (e.g., "Standardize phone numbers to E.164").
        Keep the response concise (max 3 bullet points) and practical.
        """
        
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Error generating suggestions: {str(e)}"

    def generate_report_summary(self, stats):
        """
        Feature B: Narrative Reporting
        Generates an executive summary based on dataset statistics.
        """
        if not self.enabled:
            return "Executive Summary: The dataset contains clean structured data with minimal outliers. Distribution of key metrics follows a normal curve. (Simulation)"

        prompt = f"""
        Write a professional Executive Summary (1 paragraph) for a PDF report based on these dataset statistics.
        Focus on data health, key findings, and any rectifications made.
        
        Statistics:
        {json.dumps(stats, default=str)}
        """
        
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Error generating summary: {str(e)}"

    def generate_recommendations(self, metadata):
        """
        Semantic next steps recommendation.
        Always explains why and suggests actions.
        """
        if not self.enabled:
            return [
                {
                    "type": "Time Series",
                    "title": "Predict Revenue",
                    "reason": "We detected 'Date' and financial columns.",
                    "benefit": "Forecasting helps in resource planning."
                },
                {
                    "type": "Geospatial",
                    "title": "Customer Mapping",
                    "reason": "Location-based strings were found.",
                    "benefit": "Identify regional gaps in your business."
                }
            ]

        prompt = f"""
        Analyze these dataset columns and suggest 3 high-value 'Next Steps' for a user who just finished cleaning their data.
        
        Metadata: {json.dumps(metadata, default=str)}

        STRICT RULES:
        1. NO heavy analysis.
        2. NO auto-training.
        3. Suggest only meaningful business or data science tasks like: Time Series, Geospatial Mapping, Customer Segmentation, Outlier Deep Dive, etc.
        4. ALWAYS explain 'WHY' based on the column names.
        5. Return ONLY a JSON list of objects:
           [
             {{
               "type": "Task Type",
               "title": "Engaging Title",
               "reason": "Specific reason based on columns found",
               "benefit": "Business benefit of this action"
             }}
           ]
        """
        
        try:
            response = self.model.generate_content(prompt)
            text = response.text.strip()
            # Clean up potential markdown code blocks
            if text.startswith("```json"):
                text = text[7:]
            if text.endswith("```"):
                text = text[:-3]
            return json.loads(text.strip())
        except Exception as e:
            print(f"Recommendation Error: {e}")
            return []

    def semantic_correction(self, messy_data_json):
        """
        Engine: Hybrid AI Cleaning (Deep Neural Audit)
        Corrects messy, semantic data based on real-world logic.
        """
        if not self.enabled:
            return {}

        prompt = f"""
        You are a Senior Data Reliability Engineer. You have been provided with a small batch of 'messy' data records that traditional algorithms cannot confidently clean.
        
        GOAL:
        1. Rectify semantic inconsistencies (e.g., standardizing 'NYC', 'NY', 'New York City' -> 'New York').
        2. Fix obvious human typos while maintaining data integrity.
        3. Standardize formats (e.g., Honorifics like 'Mr', 'Mister' -> 'Mr.').
        
        MESSY DATA (JSON):
        {json.dumps(messy_data_json, indent=2)}
        
        STRICT RULES:
        1. DO NOT change values that appear correct.
        2. KEEP THE DATA TYPES EXACT (if a value is a number, return a number).
        3. ONLY return a JSON object mapping the ROW INDEX (the key in input) to a dictionary of JUST THE CORRECTED COLUMNS.
        
        Example Output Format:
        {{
           "row_index_1": {{ "City": "New York", "Status": "Active" }},
           "row_index_5": {{ "Name": "John Smith" }}
        }}
        
        Your response must be ONLY valid JSON.
        """
        
        try:
            response = self.model.generate_content(prompt)
            text = response.text.strip()
            # Clean up potential markdown code blocks
            if text.startswith("```json"):
                text = text[7:]
            if text.endswith("```"):
                text = text[:-3]
            return json.loads(text.strip())
        except Exception as e:
            print(f"Semantic Correction Error: {e}")
            return {}
