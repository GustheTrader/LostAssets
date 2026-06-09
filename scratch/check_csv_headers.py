import os
import glob
import pandas as pd

CSV_DIR = "04_From_500_To_Beyond"
csv_pattern = os.path.join(CSV_DIR, "From_500_To_Beyond_*.csv")
csv_files = sorted(glob.glob(csv_pattern))

if csv_files:
    filepath = csv_files[0]
    print(f"Reading first 5 rows of {os.path.basename(filepath)}...")
    df = pd.read_csv(filepath, nrows=5)
    print("Columns:", list(df.columns))
    print(df.to_string())
else:
    print("No CSV files found.")
