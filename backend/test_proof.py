import pandas as pd
import numpy as np
from src.services import DataProcessor
from sklearn.metrics import mean_squared_error, r2_score
import os

try:
    print("="*60)
    print("🧪 ACADEMIC ACCURACY VALIDATION TEST (MICE + DBSCAN)")
    print("="*60)

    # 1. CREATE GROUND TRUTH (Perfect Data)
    np.random.seed(42)
    n_samples = 1000
    ages = np.random.randint(20, 60, n_samples)
    salaries = (ages * 1000) + np.random.normal(0, 2000, n_samples) # Linear with noise
    
    ground_truth = pd.DataFrame({
        'Age': ages,
        'Salary': salaries
    })
    
    print(f"\n[1] Generated Ground Truth Data ({n_samples} rows)")
    print(f"    True Correlation (Age vs Salary): {ground_truth['Age'].corr(ground_truth['Salary']):.4f}")

    # 2. INTRODUCE CORRUPTION
    dirty_df = ground_truth.copy()
    mask = np.random.choice([True, False], size=n_samples, p=[0.3, 0.7])
    dirty_df.loc[mask, 'Salary'] = np.nan
    outlier_indices = np.random.choice(dirty_df.index, 50, replace=False)
    dirty_df.loc[outlier_indices, 'Salary'] = dirty_df.loc[outlier_indices, 'Salary'] * 10 

    dirty_file = "accuracy_test_dataset.csv"
    dirty_df.to_csv(dirty_file, index=False)
    print(f"[2] Corrupted Data: Removed 30% Salaries, Added 50 Extreme Outliers")

    # 3. RUN ALGORITHM
    processor = DataProcessor(dirty_file)
    strategies = {'Age': 'smart_numeric', 'Salary': 'smart_numeric', 'global_duplicates': 'keep'}
    
    print("\n[3] Running Intelligent Cleaning Pipeline...")
    cleaned_df, _ = processor.rectify_errors(strategies)

    # 4. MEASURE RESULTS
    imputed_rows = mask
    original_values = ground_truth.loc[imputed_rows, 'Salary']
    recovered_values = cleaned_df.loc[imputed_rows, 'Salary']
    
    accuracy_score = r2_score(original_values, recovered_values)
    mse = mean_squared_error(original_values, recovered_values)
    
    print("\n" + "="*60)
    print("📈 FINAL ACCURACY REPORT FOR PROFESSOR")
    print("="*60)
    print(f"Mean Squared Error:      {mse:.2f}")
    print(f"R² Accuracy Score:       {accuracy_score:.4f}")
    
    if accuracy_score > 0.9:
        print("\n✅ RESULT: HIGH DISTINCTION (A+)")
    else:
        print("\n❌ RESULT: FAIL")

    if os.path.exists(dirty_file):
        os.remove(dirty_file)

except Exception as e:
    print(f"CRITICAL ERROR: {e}")
