import os
import csv
import glob

CSV_DIR = "04_From_500_To_Beyond"

owners = [
    "DE FILIPPIS LEON",
    "CRISSMAN SUSAN J",
    "PHAM THIEN T",
    "GAO HONGXIA",
    "VELADOR MATILDE",
    "SHIMADA HISAO",
    "DEGEN LEO",
    "GLOGER PAUL B",
    "YATES BILLY R",
    "PINKEL FRED",
    "BELLEVUE EUGENE F",
    "BELLEVUE DOROTHY I",
    "SPERBER JOSEPH E",
    "MERK SOPHIA MAY",
    "ROHAL JOHN"
]

owners_set = set(owners)

csv_pattern = os.path.join(CSV_DIR, "From_500_To_Beyond_*.csv")
csv_files = sorted(glob.glob(csv_pattern))

found_records = {owner: [] for owner in owners}

for filepath in csv_files:
    print(f"Reading {os.path.basename(filepath)}...")
    with open(filepath, "r", encoding="utf-8-sig", errors="ignore") as f:
        reader = csv.DictReader(f)
        for row in reader:
            owner = (row.get("OWNER_NAME") or "").strip().upper()
            if owner in owners_set:
                found_records[owner].append({
                    "property_id": row.get("PROPERTY_ID"),
                    "property_type": row.get("PROPERTY_TYPE"),
                    "amount": row.get("CURRENT_CASH_BALANCE") or row.get("CASH_REPORTED") or "0",
                    "holder": row.get("HOLDER_NAME"),
                    "street": row.get("OWNER_STREET_1") or "",
                    "city": row.get("OWNER_CITY") or "",
                    "state": row.get("OWNER_STATE") or "",
                    "zip": row.get("OWNER_ZIP") or "",
                    "source": os.path.basename(filepath)
                })

for owner, records in found_records.items():
    print(f"\n================ OWNER: {owner} ================")
    print(f"Total found in CSV: {len(records)} records")
    for r in records[:5]:
        print(f"  ID: {r['property_id']} | Amt: {r['amount']} | Type: {r['property_type']} | Holder: {r['holder']} | Loc: {r['street']}, {r['city']}, {r['state']} {r['zip']}")
    if len(records) > 5:
        print(f"  ... and {len(records) - 5} more")
