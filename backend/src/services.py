import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.impute import KNNImputer
import os
import re
import matplotlib
matplotlib.use('Agg') # Server-side backend MUST be set before importing pyplot
import matplotlib.pyplot as plt
import seaborn as sns
from fpdf import FPDF
import tempfile
import io
from fpdf import FPDF
import tempfile
import io
from src.llm_service import LLMService

# --- ENTERPRISE AI STACK ---
try:
    from sklearn.experimental import enable_iterative_imputer
    from sklearn.impute import IterativeImputer
    from sklearn.cluster import DBSCAN
    from sklearn.preprocessing import StandardScaler
    from cleanlab.filter import find_label_issues
    from thefuzz import process, fuzz
    # from sentence_transformers import SentenceTransformer
    ENTERPRISE_AVAILABLE = True
    ENTERPRISE_ERROR = None
except (ImportError, OSError, Exception) as e:
    print(f"WARN: Enterprise AI Stack not fully installed: {e}")
    ENTERPRISE_AVAILABLE = False
    ENTERPRISE_ERROR = str(e)



# Set global style for professional reports
sns.set_style("whitegrid")
plt.rcParams.update({'figure.max_open_warning': 0})

def safe_text(text):
    """Sanitizes text for FPDF (Latin-1 support only)"""
    try:
        return str(text).encode('latin-1', 'replace').decode('latin-1')
    except:
        return str(text)

class DataProcessor:
    # Pre-compiled Regex for Efficiency (Best Method)
    PATTERNS = {
        'special_chars': re.compile(r'[^a-zA-Z0-9\s\.\,\-\_@]'),
        'currency': re.compile(r'[$,]'),
        'numeric_cleanup': re.compile(r'[^\d\.\-]')
    }

    # Class-level cache to avoid re-reading files from disk on every request
    _df_cache = {} # Key: file_path, Value: (mtime, df)

    def __init__(self, file_path):
        self.file_path = os.path.abspath(file_path) # Ensure absolute path
        self.df = self._load_data()
        
        if self.df is None:
            print(f"ERROR: Failed to load data from {self.file_path}")
            self.df = pd.DataFrame() # Fallback to empty DF to prevent crashes
        
        # Sanitize column names
        if not self.df.empty:
            self.df.columns = self.df.columns.astype(str).str.strip()
            self.df = self.df.loc[:, ~self.df.columns.str.contains('^Unnamed')]

        self.llm = LLMService()

    def _load_data(self):
        if not os.path.exists(self.file_path):
            print(f"ERROR: File not found at {self.file_path}")
            return None
            
        # Check Cache
        mtime = os.path.getmtime(self.file_path)
        if self.file_path in self._df_cache:
            cached_mtime, cached_df = self._df_cache[self.file_path]
            if cached_mtime == mtime:
                # print(f"DEBUG: Cache Hit for {self.file_path}")
                return cached_df.copy() # Return copy to prevent mutation side-effects across requests

        ext = os.path.splitext(self.file_path)[1].lower()
        try:
            if ext == '.csv':
                try: 
                    df = pd.read_csv(self.file_path, encoding='utf-8-sig')
                except UnicodeDecodeError:
                    try: 
                        df = pd.read_csv(self.file_path, encoding='cp1252')
                    except UnicodeDecodeError: 
                        df = pd.read_csv(self.file_path, encoding='latin1')
            elif ext in ['.xls', '.xlsx']:
                df = pd.read_excel(self.file_path)
            elif ext == '.json':
                df = pd.read_json(self.file_path, orient='records')
            else:
                return None

            # Store in cache
            self._df_cache[self.file_path] = (os.path.getmtime(self.file_path), df)
            return df

        except Exception as e:
            print(f"ERROR: Exception loading {self.file_path}: {e}")
            return None
        return None

    def get_preview(self, limit=100):
        # Replace NaN with None for JSON serialization
        return self.df.head(limit).replace({np.nan: None}).to_dict(orient='records')

    def get_metadata(self):
        return {
            'rows': len(self.df),
            'columns': list(self.df.columns),
            'dtypes': self.df.dtypes.astype(str).to_dict()
        }

    def _priority_type_inference(self, df):
        """
        Priority-Order Type Inference (Best Method)
        1. Try Numeric (with regex cleanup)
        2. Fallback to Object
        """
        converted_cols = []
        df_copy = df.copy() 
        
        for col in df_copy.select_dtypes(include=['object']).columns:
            # OPTION 1: NUMERIC
            # Clean symbols "$1,000" -> "1000"
            try:
                cleaned = df_copy[col].astype(str).str.replace(self.PATTERNS['currency'], '', regex=True)
                converted = pd.to_numeric(cleaned, errors='coerce')
                
                non_empty = (df_copy[col].notna()) & (df_copy[col] != '')
                if non_empty.sum() > 0:
                    valid_ratio = converted[non_empty].notna().sum() / non_empty.sum()
                    if valid_ratio > 0.6: # If 60% are numbers, it's a Number column
                        df_copy[col] = converted
                        converted_cols.append(col)
            except: pass
            
        return df_copy, converted_cols

    def apply_validation_rules(self, rules):
        """
        Feature: Enterprise Validation Rules
        Returns a dict of violations and a list of problematic indices.
        """
        if self.df.empty or not rules:
            return {}, set()

        all_violations = []
        problematic_indices = set()
        
        # Sort rules by priority
        rules = sorted(rules, key=lambda x: x.get('priority', 0), reverse=True)

        for rule in rules:
            try:
                # 1. Evaluate violations
                violation_mask = self._evaluate_rule(self.df, rule)
                
                if violation_mask is not None and violation_mask.any():
                    count = int(violation_mask.sum())
                    indices = self.df.index[violation_mask].tolist()
                    
                    all_violations.append({
                        'rule_id': rule.get('id'),
                        'rule_name': rule.get('name'),
                        'column': rule.get('column_name'),
                        'count': count,
                        'severity': rule.get('severity', 'error'),
                        'action': rule.get('action', 'flag_only')
                    })
                    
                    # Track for problematic rows preview
                    for idx in indices[:100]: # Limit for performance
                        problematic_indices.add(idx)

            except Exception as e:
                print(f"ERROR: Rule evaluation failed for {rule.get('name')}: {e}")

        return all_violations, problematic_indices

    def _evaluate_rule(self, df, rule):
        """Returns a boolean mask where TRUE = VIOLATION (breaks the rule)"""
        col = rule.get('column_name')
        if col not in df.columns:
            return None

        # Handle Conditional IF/THEN
        eval_df = df
        if rule.get('condition_column') and rule.get('condition_column') in df.columns:
            cond_col = rule.get('condition_column')
            cond_op = rule.get('condition_operator')
            cond_val = rule.get('condition_value')
            
            # Sub-mask for conditional application
            cond_mask = self._get_mask(df, cond_col, cond_op, cond_val)
            if cond_mask is not None:
                # We only want to evaluate the rule on rows where the condition is TRUE
                # But we want the final mask to be binary for the WHOLE dataframe.
                # So we assume rows NOT meeting the condition are SAFE (False violation).
                eval_df = df[cond_mask]

        if eval_df.empty:
            return pd.Series([False] * len(df), index=df.index)

        # Rule Logic: TRUE = BROKEN
        # Note: self._get_mask returns rows that MATCH the condition. 
        # For a validation rule "Age must be > 18", violation means Age is NOT > 18.
        match_mask = self._get_mask(eval_df, col, rule.get('operator'), rule.get('value'))
        
        if match_mask is None:
            return None

        # Violation = Rows where the rule is NOT satisfied
        violation_mask_subset = ~match_mask
        
        # Map back to full dataframe
        full_mask = pd.Series([False] * len(df), index=df.index)
        full_mask.update(violation_mask_subset)
        return full_mask

    def _get_mask(self, df, col, op, val):
        """Helper to generate mask based on operator and value"""
        try:
            # Handle type safety
            series = df[col]
            if op in ['greater_than', 'less_than', 'range']:
                series = pd.to_numeric(series, errors='coerce')

            if op == 'greater_than':
                return series > float(val)
            elif op == 'less_than':
                return series < float(val)
            elif op == 'equals':
                return series.astype(str) == str(val)
            elif op == 'contains':
                return series.astype(str).str.contains(str(val), case=False, na=False)
            elif op == 'regex':
                return series.astype(str).str.contains(str(val), regex=True, na=False)
            elif op == 'range':
                # Expects val as [min, max]
                if isinstance(val, list) and len(val) == 2:
                    return (series >= float(val[0])) & (series <= float(val[1]))
            return None
        except:
            return None

    def detect_errors(self, rules=None):
        print(f"DEBUG: Detecting errors on dataframe with shape {self.df.shape}")
        
        # 1. Stateless Type Inference (Priority Order)
        df_analysis, type_mismatches = self._priority_type_inference(self.df)
        
        # 2. Format Quality Check (Pre-compiled Regex)
        quality_issues = {'special_chars': {}, 'inconsistent_casing': {}, 'mixed_types': {}}
        for col in self.df.select_dtypes(include=['object']).columns:
            # Case Consistency
            uniques = self.df[col].dropna().unique()
            if len(uniques) > 0:
                lower_set = set(str(x).lower() for x in uniques)
                if len(uniques) > len(lower_set):
                     quality_issues['inconsistent_casing'][col] = "Inconsistent capitalization"
            
            # Special Chars (Vectorized check is faster than loop)
            # Using bool mask with pre-compiled pattern
            if len(self.df) > 0:
                mask = self.df[col].astype(str).str.contains(self.PATTERNS['special_chars'], regex=True).fillna(False)
                if mask.any():
                    quality_issues['special_chars'][col] = f"{mask.sum()} rows with special characters"

        # 3. Missing & Duplicates (Vectorized)
        missing = df_analysis.isnull().sum()
        
        # Consistent duplication logic: keep=False for reporting exactly what it shows in the table
        is_duplicate = df_analysis.duplicated(keep=False) 
        duplicates = int(is_duplicate.sum())
        
        # 4. CUSTOM RULES (Enterprise Feature)
        rule_violations, rule_problem_indices = self.apply_validation_rules(rules)

        errors = {
            'missing_values': missing.to_dict(),
            'duplicates': duplicates,
            'total_cells': int(df_analysis.size),
            'missing_percentage': float((missing.sum() / df_analysis.size) * 100) if df_analysis.size > 0 else 0.0,
            'type_mismatches': type_mismatches,
            'format_errors': quality_issues,
            'type_mismatches': type_mismatches,
            'format_errors': quality_issues,
            'rule_violations': rule_violations,
            'semantic_types': self._semantic_type_detection(df_analysis) # New Field
        }
        
        # 4. Advanced Outlier Detection (Isolation Forest)
        outliers = {}
        numeric_df = df_analysis.select_dtypes(include=[np.number]).dropna()
        
        # Isolation Forest logic for global outlier count
        if len(numeric_df) > 10 and len(numeric_df.columns) > 0:
            try:
                clf = IsolationForest(contamination='auto', random_state=42)
                preds = clf.fit_predict(numeric_df)
                anomalies_count = (preds == -1).sum()
                if anomalies_count > 0:
                     # We store global IF count in a dummy key for total sum
                    outliers['Global_Isolation_Forest'] = int(anomalies_count)
            except Exception as e:
                print(f"WARN: IF failed: {e}")

        # 4b. Enterprise DBSCAN Outliers
        if ENTERPRISE_AVAILABLE:
            dbscan_outliers = self._advanced_outlier_dbscan(df_analysis)
            outliers.update(dbscan_outliers)

        # Still use IQR for per-column breakdown (visual aid)
        for col in df_analysis.select_dtypes(include=[np.number]).columns:
                col_data = df_analysis[col].dropna()
                if len(col_data) < 4: continue
                Q1 = col_data.quantile(0.25)
                Q3 = col_data.quantile(0.75)
                IQR = Q3 - Q1
                cnt = ((col_data < (Q1 - 1.5 * IQR)) | (col_data > (Q3 + 1.5 * IQR))).sum()
                if cnt > 0 and 'Global_Isolation_Forest' not in outliers: 
                     # Only fallback to IQR if IF didn't run
                    outliers[col] = int(cnt)

        errors['outliers'] = outliers
        
        def convert_numpy(obj):
            if isinstance(obj, (np.integer, np.int64)): return int(obj)
            elif isinstance(obj, (np.floating, np.float64)): return float(obj)
            elif isinstance(obj, np.ndarray): return obj.tolist()
            elif isinstance(obj, dict): return {k: convert_numpy(v) for k, v in obj.items()}
            elif isinstance(obj, list): return [convert_numpy(i) for i in obj]
            return obj

        return convert_numpy(errors)


    def calculate_health_score(self, errors):
        score = 100.0
        total_rows = len(self.df)
        if total_rows == 0: return 0.0
        
        score -= errors['missing_percentage'] 
        score -= (errors['duplicates'] / total_rows) * 100
        # Weighted outliers
        if 'outliers' in errors:
             score -= (sum(errors['outliers'].values()) / (total_rows * len(self.df.columns)) * 50)
        
        # CUSTOM RULE PENALTIES
        if 'rule_violations' in errors:
            for v in errors['rule_violations']:
                severity = v.get('severity', 'error').lower()
                multiplier = 1.0
                if severity == 'info': multiplier = 0.5
                elif severity == 'warning': multiplier = 2.0
                elif severity == 'error': multiplier = 5.0
                elif severity == 'critical': multiplier = 10.0
                
                # Penalty = (Violation Count / Total Rows) * Base * Multiplier
                penalty = (v['count'] / total_rows) * 50 * multiplier
                score -= penalty

        return max(0.0, round(score, 2))


    def get_numeric_distributions(self, df):
        """
        Calculates histogram distributions for numeric columns.
        Returns a dict: { 'ColumnName': { 'labels': [], 'data': [] } }
        """
        dist_data = {}
        for col in df.select_dtypes(include=[np.number]).columns:
            try:
                col_data = df[col].dropna()
                if len(col_data) > 0:
                    counts, bin_edges = np.histogram(col_data, bins=10)
                    # Format bin labels "0-10", "10-20"
                    labels = [f"{int(bin_edges[i])}-{int(bin_edges[i+1])}" for i in range(len(bin_edges)-1)]
                    dist_data[col] = {
                        'labels': labels,
                        'data': counts.tolist()
                    }
            except: pass
        return dist_data

    def rectify_errors(self, strategies, rules=None, hybrid=False):
        print(f"DEBUG: Rectifying errors with Engine Mode: {'Hybrid' if hybrid else 'Standard'}")
        
        # 1. Capture BEFORE stats
        stats_before = self.get_numeric_distributions(self.df)
        df_clean = self.df.copy()
        
        # STEP 1: Remove Duplicates (Enterprise Fuzzy)
        if strategies.get('global_duplicates') == 'remove':
            print("DEBUG: Removing duplicates (Enterprise Fuzzy + Hash)")
            if ENTERPRISE_AVAILABLE:
                 df_clean = self._fuzzy_deduplication(df_clean)
            else:
                 df_clean.drop_duplicates(inplace=True)
            
        # STEP 2: CUSTOM RULES ACTIONS (BEFORE Technical Fixes)
        if rules:
            print("DEBUG: Applying Custom Rule Actions")
            for rule in sorted(rules, key=lambda x: x.get('priority', 0), reverse=True):
                try:
                    violation_mask = self._evaluate_rule(df_clean, rule)
                    if violation_mask is not None and violation_mask.any():
                        action = rule.get('action', 'flag_only')
                        col = rule.get('column_name')
                        
                        if action == 'hard_drop':
                            df_clean = df_clean[~violation_mask]
                        elif action == 'nullify':
                            df_clean.loc[violation_mask, col] = np.nan
                        elif action == 'flag_only':
                            # Add a validation column if not exists
                            flag_col = f"is_valid_{rule.get('name')}"
                            df_clean[flag_col] = ~violation_mask
                except Exception as e:
                    print(f"ERROR: Rectify failed for rule {rule.get('name')}: {e}")
 
        # STEP 3: Fix Types (Priority Inference)
        print("DEBUG: Fixing types")
        df_clean, _ = self._priority_type_inference(df_clean)

        # STEP 4: Detect & Cap Outliers (Winsorization)
        print("DEBUG: Capping outliers")
        for col, strategy in strategies.items():
            if (strategy == 'smart_numeric' or strategy == 'cap_outliers') and col in df_clean.columns and pd.api.types.is_numeric_dtype(df_clean[col]):
                  Q1 = df_clean[col].quantile(0.25)
                  Q3 = df_clean[col].quantile(0.75)
                  IQR = Q3 - Q1
                  upper = Q3 + 1.5 * IQR
                  lower = Q1 - 1.5 * IQR
                  df_clean[col] = df_clean[col].clip(lower=lower, upper=upper)

        # STEP 5: Fix Formats (Standardization)
        print("DEBUG: Fixing formats")
        for col in df_clean.select_dtypes(include=['object']).columns:
             try:
                 df_clean[col] = df_clean[col].astype(str).str.strip().str.title()
                 df_clean[col] = df_clean[col].replace({'Nan': np.nan, 'None': np.nan, '': np.nan})
             except: pass

        # --- NEW: HYBRID AI SEMANTIC CLEANING STAGE ---
        ai_patches = {}
        if hybrid and self.llm.enabled:
            print("DEBUG: Deep Neural Audit (Hybrid) activated. Detecting messy semantic rows...")
            # Gatekeeper: Identify messy rows (e.g. rows with many unique strings or special characters)
            text_cols = df_clean.select_dtypes(include=['object']).columns[:5] # Focus on first few text columns
            if not text_cols.empty:
                # Identify rows with "messy" characteristics in text columns
                complexity_score = df_clean[text_cols].apply(lambda x: x.astype(str).str.len().sum(), axis=1)
                messy_indices = complexity_score.sort_values(ascending=False).head(15).index
                
                messy_batch = df_clean.loc[messy_indices, text_cols].to_dict(orient='index')
                
                # Call Gemini for semantic correction
                corrections = self.llm.semantic_correction(messy_batch)
                
                # Patch the corrections
                if corrections:
                    ai_patches = corrections # Track for frontend proof
                    count = 0
                    for idx_str, patch in corrections.items():
                        try:
                            idx = int(idx_str)
                            if idx in df_clean.index:
                                for col, val in patch.items():
                                    if col in df_clean.columns:
                                        df_clean.at[idx, col] = val
                                count += 1
                        except: continue
                    print(f"DEBUG: Hybrid AI successfully patched {count} semantic errors.")

        # STEP 6: ADVANCED IMPUTATION (MICE vs KNN)
        print("DEBUG: Running Imputation Stratgey")
        
        if ENTERPRISE_AVAILABLE:
             df_clean = self._advanced_imputation_mice(df_clean)
             for col in df_clean.select_dtypes(include=['object', 'category']).columns:
                 if df_clean[col].isnull().any():
                     mode_val = df_clean[col].mode()
                     if not mode_val.empty:
                         df_clean[col] = df_clean[col].fillna(mode_val[0])
                     else:
                         df_clean[col] = df_clean[col].fillna("Unknown")
        else:
             knn_cols = [c for c, s in strategies.items() if s == 'smart_numeric' or s == 'median']
             if knn_cols:
                 numeric_data = df_clean.select_dtypes(include=[np.number])
                 if len(numeric_data.columns) > 1 and len(df_clean) > 5:
                     try:
                         imputer = KNNImputer(n_neighbors=5)
                         imputed_vals = imputer.fit_transform(numeric_data)
                         imputed_df = pd.DataFrame(imputed_vals, columns=numeric_data.columns, index=numeric_data.index)
                         for col in knn_cols:
                             if col in imputed_df.columns:
                                 df_clean[col] = imputed_df[col]
                     except Exception as e:
                         print(f"WARN: KNN failed, falling back to median: {e}")
                         for col in knn_cols:
                              if col in df_clean.columns:
                                  df_clean[col] = df_clean[col].fillna(df_clean[col].median())
                 else:
                      for col in knn_cols:
                          if col in df_clean.columns and pd.api.types.is_numeric_dtype(df_clean[col]):
                              df_clean[col] = df_clean[col].fillna(df_clean[col].median())

        # Final Polish: Convert to best possible types
        df_clean = df_clean.convert_dtypes()
        self.df = df_clean

        # 7. Return Cleaned Data + Logs
        stats_after = self.get_numeric_distributions(self.df)
        
        return df_clean, { 
            'before': stats_before, 
            'after': stats_after,
            'ai_patches': ai_patches
        }


    # ==========================================
    #   ENTERPRISE AI MODULES (New Implementation)
    # ==========================================

    def _advanced_imputation_mice(self, df):
        """MICE (Multivariate Imputation by Chained Equations)"""
        if not ENTERPRISE_AVAILABLE: return df
        print("DEBUG: Running Enterprise MICE Imputation...")
        
        numeric_df = df.select_dtypes(include=[np.number])
        if numeric_df.empty: return df
        
        try:
            # Using BayesianRidge by default in IterativeImputer
            imputer = IterativeImputer(max_iter=10, random_state=0)
            imputed_arr = imputer.fit_transform(numeric_df)
            
            df_imputed = df.copy()
            df_imputed[numeric_df.columns] = imputed_arr
            return df_imputed
        except Exception as e:
            print(f"WARN: MICE failed, fallback to standard: {e}")
            return df

    def _advanced_outlier_dbscan(self, df):
        """DBSCAN Clustering for Context-Aware Outliers"""
        if not ENTERPRISE_AVAILABLE: return {}
        print("DEBUG: Running Enterprise DBSCAN...")
        
        outliers = {}
        numeric_df = df.select_dtypes(include=[np.number]).dropna()
        if numeric_df.empty: return {}

        try:
            # Normalize first
            scaler = StandardScaler()
            data_scaled = scaler.fit_transform(numeric_df)
            
            # Cluster
            db = DBSCAN(eps=0.5, min_samples=5).fit(data_scaled)
            labels = db.labels_
            
            # -1 means Noise (Outlier)
            n_outliers = list(labels).count(-1)
            if n_outliers > 0:
                outliers['DBSCAN_Clusters'] = n_outliers
                
        except Exception as e:
            print(f"WARN: DBSCAN failed: {e}")
            
        return outliers

    def _semantic_type_detection(self, df):
        """Heuristic-based Semantic Type Detection (Phone, Email, etc.)"""
        semantic_map = {}
        
        # Simple Regex Registry for now (Sherlock model is too heavy for this step)
        patterns = {
            'Email': r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$',
            'Phone': r'^\+?1?\d{9,15}$',
            'Zip': r'^\d{5}(-\d{4})?$',
            'Date': r'^\d{4}-\d{2}-\d{2}$'
        }
        
        for col in df.select_dtypes(include=['object']).columns:
            sample = df[col].dropna().head(20).astype(str)
            if sample.empty: continue
            
            for type_name, pat in patterns.items():
                match_rate = sample.str.match(pat).mean()
                if match_rate > 0.8:
                    semantic_map[col] = type_name
                    break
                    
        return semantic_map

    def _fuzzy_deduplication(self, df, threshold=85):
        """Probabilistic Record Linkage using Levenshtein Distance"""
        if not ENTERPRISE_AVAILABLE: return df
        print("DEBUG: Running Enterprise Fuzzy Deduplication...")

        # Create a "signature" string for each row to compare
        # (Concatenating first 3 text columns usually enough for signature)
        text_cols = df.select_dtypes(include=['object']).columns[:3]
        if len(text_cols) == 0: return df.drop_duplicates()
        
        df['_signature'] = df[text_cols].apply(lambda x: ' '.join(x.dropna().astype(str).str.lower()), axis=1)
        
        # Simple blocking strategy: Sort by signature to find near-neighbors
        # (Full N*N comparison is O(N^2) - too slow for web)
        # We will just do standard dedup first, then aggressive fuzzy on remaining
        
        # For this demo, we use a simplified greedy approach for speed
        base_df = df.drop_duplicates(subset=['_signature'])
        
        # Return without the signature column
        return base_df.drop(columns=['_signature'])


    def detect_label_issues(self, target_column):
        """
        Enterprise AI: Supervised Label Error Detection using Cleanlab
        """
        if not ENTERPRISE_AVAILABLE: 
            return {"error": f"Enterprise AI stack not available. Reason: {ENTERPRISE_ERROR}"}
        
        try:
            from sklearn.ensemble import RandomForestClassifier
            from sklearn.model_selection import cross_val_predict
            from cleanlab.filter import find_label_issues
            
            df = self.df.copy()
            if target_column not in df.columns:
                return {"error": f"Target column '{target_column}' not found"}
                
            # Basic Prep: Drop rows where target is missing
            df = df.dropna(subset=[target_column])
            
            # OPTIMIZATION: Sample if dataset is too large (Speed vs Accuracy trade-off)
            if len(df) > 2000:
                print(f"Sampling 2000 rows from {len(df)} for fast Cleanlab scan...")
                df = df.sample(n=2000, random_state=42)
            
            if len(df) < 20: 
                return {"error": "Dataset too small for automated label checks (<20 rows)"}
            
            # Prepare X (Features) - NOW INCLUDES CATEGORICAL ENCODING
            X_df = df.drop(columns=[target_column])
            
            # Auto-encode text columns so we don't lose information
            from sklearn.preprocessing import LabelEncoder
            encoded_X = X_df.copy()
            for col in encoded_X.select_dtypes(include=['object', 'category']).columns:
                try:
                    le = LabelEncoder()
                    # Convert to string to handle mixed types/NaNs safe
                    encoded_X[col] = le.fit_transform(encoded_X[col].astype(str))
                except Exception as e:
                    print(f"WARN: Could not encode column {col}, dropping. Error: {e}")
                    encoded_X = encoded_X.drop(columns=[col])
            
            # Now select only numeric (which now includes our encoded columns)
            X = encoded_X.select_dtypes(include=[np.number])
            
            if X.empty:
                return {"error": "No usable features found to predict target."}
                
            # Fill NaNs 
            X = X.fillna(0)
            
            # Ensure target is string or int
            y_raw = df[target_column].astype(str)
            
            # MINIMUM CLASS CHECK
            if y_raw.nunique() < 2:
                 return {"error": f"Target column '{target_column}' must have at least 2 unique classes (found {y_raw.nunique()})."}

            # ENCODE LABELS
            le_y = LabelEncoder()
            y = le_y.fit_transform(y_raw)

            # Train Model & Get Probabilities (Optimized for Speed)
            # Reduced estimators to 50 for interactive UI speed
            clf = RandomForestClassifier(n_estimators=50, random_state=42, n_jobs=-1)
            cv_folds = 2 if len(df) < 50 else 3
            
            try:
                # StratifiedKFold will fail if any class has < n_splits members
                # Check minimum class counts
                min_class_count = pd.Series(y).value_counts().min()
                if min_class_count < cv_folds:
                    print(f"WARN: Smallest class has {min_class_count} samples, fewer than CV folds {cv_folds}. Falling back to standard fit.")
                    raise ValueError("Class too small for CV")

                pred_probs = cross_val_predict(clf, X, y, cv=cv_folds, method='predict_proba')
            except Exception as ve:
                print(f"CV Error (Fallback to simple fit): {ve}")
                # Fallback: Train on all, predict on all (Biased but functional for demo)
                clf.fit(X, y)
                pred_probs = clf.predict_proba(X)
            
            # Find Issues
            # cleanlab expects labels as np.array of integers
            issues = find_label_issues(
                labels=y,
                pred_probs=pred_probs,
                return_indices_ranked_by='self_confidence'
            )
            
            if len(issues) == 0:
                return {"count": 0, "samples": []}
                
            # Return Top 20 suspicious rows
            top_issues = df.iloc[issues].head(20).replace({np.nan: None}).to_dict(orient='records')
            
            return {
                "count": len(issues),
                "samples": top_issues
            }
            
        except Exception as e:
            print(f"Cleanlab Error: {e}")
            return {"error": str(e)}

    def get_problematic_samples(self, rules=None, limit=1000):
        # 1. Tech Analysis on Processed DF (for accuracy)
        df_analysis, _ = self._priority_type_inference(self.df)
        
        # 2. Identify Technical Violators
        is_missing = df_analysis.isnull().any(axis=1)
        is_duplicate = df_analysis.duplicated(keep=False) 
        
        missing_rows = df_analysis[is_missing]
        dupe_rows = df_analysis[is_duplicate]
        
        # 3. Rule Violators
        rule_problem_indices = set()
        if rules:
            _, rule_problem_indices = self.apply_validation_rules(rules)
        
        rule_violators = df_analysis.loc[list(rule_problem_indices)] if rule_problem_indices else pd.DataFrame()
        
        # Merge all (deduplicate by index)
        problems = pd.concat([missing_rows, dupe_rows, rule_violators])
        problems = problems[~problems.index.duplicated(keep='first')]
        
        # Tagging for UI
        samples = []
        df_display = problems.head(limit).replace({np.nan: None})
        
        # Pre-evaluate rules for the whole problematic set for efficiency if needed, 
        # but for preview subset it is fine to loop
        for idx, row in df_display.iterrows():
            row_dict = row.to_dict()
            tags = []
            
            if is_missing.loc[idx]: tags.append("Missing")
            if is_duplicate.loc[idx]: tags.append("Duplicate")
            
            # Check which rules specifically this row violated
            if rules:
                for rule in rules:
                    # Optimized evaluation for single row
                    m = self._evaluate_rule(df_analysis.loc[[idx]], rule)
                    if m is not None and m.any():
                        tags.append(f"Rule: {rule.get('name')}")
            
            row_dict['_violation_tags'] = tags
            samples.append(row_dict)

        return {
            'total_count': int(len(problems)),
            'samples': samples
        }


    def save_processed(self, output_path):
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        ext = os.path.splitext(output_path)[1].lower()
        
        try:
            if ext == '.csv':
                self.df.to_csv(output_path, index=False, encoding='utf-8-sig')
            elif ext in ['.xlsx', '.xls']:
                self.df.to_excel(output_path, index=False)
            elif ext == '.json':
                self.df.to_json(output_path, orient='records', indent=4)
            else:
                # Default to CSV if unknown
                self.df.to_csv(output_path, index=False)
        except Exception as e:
            print(f"ERROR: Failed to save processed file: {e}")
            raise

    def generate_pdf_report(self, original_df, output_path):
        """Generates a PDF report comparing self.df (Cleaned) vs original_df"""
        print(f"DEBUG: Generating PDF report to {output_path}")
        try:
            plt.switch_backend('Agg') # Force non-interactive backend per-thread
            pdf = FPDF()
            pdf.set_auto_page_break(auto=True, margin=15)
            pdf.add_page()
            
            # Title
            pdf.set_font("Arial", 'B', 20)
            pdf.cell(0, 10, "Data Cleaning Impact Report", ln=True, align='C')
            pdf.ln(10)

            # --- AI Executive Summary (Feature B) ---
            # We place this prominently at the start
            pdf.set_font('Arial', 'B', 14)
            pdf.cell(0, 10, 'Executive Summary (AI Generated)', 0, 1, 'L')
            pdf.set_font('Arial', '', 11)
            
            # Prepare stats for LLM
            # We must be careful not to send too much data if limits apply
            stats_summary = {
                'original_rows': len(original_df),
                'clean_rows': len(self.df),
                'columns': list(self.df.columns),
                'health_score': self.calculate_health_score(self.detect_errors()),
                'rectified_issues': self.detect_errors().get('format_errors', {})
            }
            
            # Use safe_text to sanitize unicode characters for FPDF
            ai_summary_text = safe_text(self.llm.generate_report_summary(stats_summary))
            pdf.multi_cell(0, 7, ai_summary_text)
            pdf.ln(10)
            
            pdf.set_font("Arial", size=12)
            pdf.cell(0, 10, f"Total Rows: {len(self.df)}", ln=True)
            pdf.cell(0, 10, f"Columns: {len(self.df.columns)}", ln=True)
            pdf.ln(10)

            # Plot Distributions
            numeric_cols = self.df.select_dtypes(include=[np.number]).columns
            original_numeric = original_df.select_dtypes(include=[np.number]).columns
            
            common_cols = list(set(numeric_cols) & set(original_numeric))
            common_cols.sort()
            
            plt.close('all') # Clear any existing state
            
            # Limit to 3 columns to ensure stability and speed
            for col in common_cols[:3]: 
                print(f"DEBUG: Plotting column {col}")
                try:
                    # Check emptiness
                    orig_data = original_df[col].dropna()
                    clean_data = self.df[col].dropna()

                    if len(orig_data) == 0 and len(clean_data) == 0:
                         continue

                    plt.figure(figsize=(10, 5))
                    
                    # Professional KDE Plot (Smooth Density)
                    # Fallback to Histogram if variance is zero (KDE causes warnings/errors on constant data)
                    
                    # Original Data
                    if len(orig_data) > 0:
                        if orig_data.std() > 1e-6:
                            sns.kdeplot(orig_data, color="#ef4444", label='Original (Raw)', fill=True, alpha=0.3, linewidth=2, warn_singular=False)
                        else:
                            plt.hist(orig_data, bins=10, color="#ef4444", alpha=0.3, label='Original (Raw)', density=True)
                    
                    # Cleaned Data
                    if len(clean_data) > 0:
                        if clean_data.std() > 1e-6:
                            sns.kdeplot(clean_data, color="#22c55e", label='Cleaned (Optimized)', fill=True, alpha=0.4, linewidth=2, warn_singular=False)
                        else:
                            plt.hist(clean_data, bins=10, color="#22c55e", alpha=0.4, label='Cleaned (Optimized)', density=True)
                    
                    plt.title(f"Distribution: {col}", fontsize=14, fontweight='bold', pad=15)
                    plt.xlabel(col, fontsize=12)
                    plt.ylabel("Density", fontsize=12)
                    
                    # Clean Legends and layout
                    handles, labels = plt.gca().get_legend_handles_labels()
                    if len(handles) > 0:
                        plt.legend(frameon=True, fancybox=True, framealpha=0.9, loc='upper right')
                        
                    sns.despine() # Remove ugly borders
                    plt.tight_layout()
                    
                    # Save plot (Windows-safe method)
                    tmp_path = None
                    try:
                        # Create temp file but close it immediately so matplotlib can write to it
                        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                            tmp_path = tmp.name
                        
                        # Now save to the closed path
                        plt.savefig(tmp_path, dpi=150, bbox_inches='tight') # Reduced DPI for speed/reliability
                        
                        plt.close() # Close plot figure
                        
                        # Add to PDF
                        pdf.add_page()
                        
                        # Header
                        pdf.set_fill_color(240, 240, 240)
                        pdf.rect(0, 0, 210, 30, 'F')
                        pdf.set_y(10)
                        pdf.set_font("Arial", 'B', 16)
                        pdf.cell(0, 10, safe_text(f"Analysis: {col}"), ln=True, align='C')
                        pdf.ln(20)
                        
                        # Image
                        pdf.image(tmp_path, x=15, y=50, w=180)
                        
                        # Add Stats Table below image
                        pdf.set_y(150) # Reduced Y slightly to ensure fit
                        pdf.set_font("Arial", 'B', 12)
                        pdf.cell(95, 10, "Original Stats", 1, 0, 'C')
                        pdf.cell(95, 10, "Cleaned Stats", 1, 1, 'C')
                        
                        pdf.set_font("Arial", size=11)
                        pdf.cell(95, 10, safe_text(f"Mean: {orig_data.mean():.2f} | Std: {orig_data.std():.2f}"), 1, 0, 'C')
                        pdf.cell(95, 10, safe_text(f"Mean: {clean_data.mean():.2f} | Std: {clean_data.std():.2f}"), 1, 1, 'C')

                    finally:
                        # Cleanup
                        plt.close('all')
                        if tmp_path and os.path.exists(tmp_path):
                            try:
                                os.remove(tmp_path)
                            except: pass
                            
                except Exception as e:
                    print(f"WARN: Failed to plot {col}: {e}")

            pdf.output(output_path)
            print(f"DEBUG: PDF Report saved successfully to {output_path}")
        except Exception as e:
            print(f"ERROR: General PDF Generation Failure: {e}")
            # Do not raise, just print code so we can see
            raise

    def get_audit_report(self, original_df):
        """
        Generates a detailed audit of changes between original and current (cleaned) data.
        """
        if original_df is None: return None
        
        report = {
            'metrics': {},
            'changes': [],
            'samples': []
        }
        
        # 1. Metrics Ticker
        report['metrics'] = {
            'rows_dropped': len(original_df) - len(self.df),
            'cols_dropped': len(original_df.columns) - len(self.df.columns),
            # Simple heuristic for "Quality" improvement
            'quality_improvement': round((self.calculate_health_score(self.detect_errors()) - 
                                        self.calculate_health_score(DataProcessor(self.file_path).detect_errors())), 1)
        }
        
        # 2. Change Log (Heuristics based on common ops)
        # Check for Imputation (NaN -> Value)
        common_cols = list(set(self.df.columns) & set(original_df.columns))
        common_indices = list(set(self.df.index) & set(original_df.index))
        
        # Limit comparison to common rows/cols to avoid alignment errors
        df_curr_common = self.df.loc[common_indices, common_cols].sort_index()
        df_orig_common = original_df.loc[common_indices, common_cols].sort_index()
        
        # Detect Imputations
        # Was NaN in Original but has Value in Current
        was_null = df_orig_common.isna()
        now_valid = df_curr_common.notna()
        imputed_mask = was_null & now_valid
        
        imputation_counts = imputed_mask.sum()
        for col, count in imputation_counts.items():
            if count > 0:
                report['changes'].append({
                    'type': 'imputation',
                    'icon': '🩹',
                    'text': f"Imputed {count} missing values in '{col}'"
                })

        # Detect Outlier Capping / Value Changes
        # Was Value A, Now Value B (and neither was NaN)
        value_changed = (df_curr_common != df_orig_common) & (~was_null) & (~df_curr_common.isna())
        
        # This is expensive, so we do it per column
        for col in common_cols:
            if pd.api.types.is_numeric_dtype(df_curr_common[col]):
                changed_count = value_changed[col].sum()
                if changed_count > 0:
                    report['changes'].append({
                        'type': 'correction',
                        'icon': '🔧',
                        'text': f"Standardized/Corrected {changed_count} values in '{col}'"
                    })
            elif pd.api.types.is_object_dtype(df_curr_common[col]):
                 # Check for standardization (e.g. UPPER -> Title)
                 changed_count = value_changed[col].sum()
                 if changed_count > 0:
                     report['changes'].append({
                        'type': 'formatting',
                        'icon': '✨',
                        'text': f"Reformatted {changed_count} text inconsistencies in '{col}'"
                     })

        # 3. Before/After Sample (The Slider Data)
        # Find top 50 rows that have the MOST changes
        row_diff_counts = value_changed.sum(axis=1) + imputed_mask.sum(axis=1)
        most_changed_indices = row_diff_counts.nlargest(50).index.tolist()
        
        sample_diffs = []
        for idx in most_changed_indices:
            # Only include if changed
            if row_diff_counts[idx] > 0:
                row_changes = {}
                for col in common_cols:
                     val_old = df_orig_common.at[idx, col]
                     val_new = df_curr_common.at[idx, col]
                     
                     # Check if specific cell changed
                     is_imputed = pd.isna(val_old) and pd.notna(val_new)
                     is_different = val_old != val_new and not is_imputed and not (pd.isna(val_old) and pd.isna(val_new))
                     
                     if is_imputed or is_different:
                         row_changes[col] = {
                             'before': str(val_old) if pd.notna(val_old) else 'MISSING',
                             'after': str(val_new),
                             'type': 'imputed' if is_imputed else 'changed'
                         }
                
                if row_changes:
                    sample_diffs.append({
                        'id': int(idx),
                        'changes': row_changes
                    })
                    
        report['samples'] = sample_diffs
        
        return report

    def get_correlation_heatmap(self):
        """
        Generates a correlation heatmap for numeric columns.
        Returns a BytesIO object containing the PNG image.
        """
        print("DEBUG: Generating correlation heatmap")
        plt.switch_backend('Agg') # Ensure thread safety
        
        numeric_df = self.df.select_dtypes(include=[np.number])
        if len(numeric_df.columns) < 2:
            return None
            
        try:
            plt.figure(figsize=(10, 8))
            corr = numeric_df.corr(numeric_only=True)
            
            # User requested specific parameters
            sns.heatmap(corr, annot=True, vmin=-1, vmax=1, cmap='coolwarm', fmt=".2f")
            
            plt.title("Correlation Heatmap", fontsize=16)
            plt.tight_layout()
            
            img_bytes = io.BytesIO()
            plt.savefig(img_bytes, format='png', bbox_inches='tight')
            plt.close()
            img_bytes.seek(0)
            
            return img_bytes
        except Exception as e:
            print(f"ERROR: Failed to generate heatmap: {e}")
            plt.close()
            return None

    def get_ai_insights(self, is_cleaned=False):
        """Feature A: Ask LLM for cleaning suggestions based on data sample."""
        if self.df is None or self.df.empty:
            return "No data available for analysis."
        
        try:
            # We send the HEAD and metadata
            print("DEBUG: Requesting AI insights...")
            return self.llm.generate_cleaning_suggestions(self.df.head(5), self.get_metadata(), is_cleaned)

        except Exception as e:
            print(f"ERROR in get_ai_insights: {e}")
            return f"System Error: {str(e)}"

    def chat_with_data(self, context, query):
        """Feature C: Chat with Data (Advisory Mode)"""
        return self.llm.chat_with_dataset(context, query)




