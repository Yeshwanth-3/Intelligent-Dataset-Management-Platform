import pandas as pd
import numpy as np
import sys
import os

# Add src to path
sys.path.append(os.getcwd())
from src.services import DataProcessor

def test_cleanlab():
    print("Testing Cleanlab Integration...")
    
    # 1. Create Synthetic Data (2 Classes)
    # Class 0: x < 5
    # Class 1: x >= 5
    data = []
    for i in range(100):
        val = np.random.randint(0, 10)
        true_label = 0 if val < 5 else 1
        
        # Inject Noise (Label Error)
        # Row 10: val=2 (Should be 0), but we label it 1
        actual_label = true_label
        if i == 10: 
            actual_label = 1 if true_label == 0 else 0
            print(f"Injecting Error at Row 10: Value={val}, True={true_label}, Labelled={actual_label}")
            
        data.append({'Val': val, 'Label': actual_label})
        
    df = pd.DataFrame(data)
    # Save to temp csv
    df.to_csv("temp_test_cleanlab.csv", index=False)
    
    try:
        # 2. Run Processor
        proc = DataProcessor("temp_test_cleanlab.csv")
        result = proc.detect_label_issues('Label')
        
        print("Result:", result)
        
        if result.get('count', 0) > 0:
            print("SUCCESS: Detected errors.")
        else:
            print("FAILURE: No errors detected.")
            
    except Exception as e:
        print(f"CRASHED: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if os.path.exists("temp_test_cleanlab.csv"):
            os.remove("temp_test_cleanlab.csv")

if __name__ == "__main__":
    test_cleanlab()
