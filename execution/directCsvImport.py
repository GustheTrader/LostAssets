#!/usr/bin/env python3
"""
Streaming CSV → SQLite importer for large CA unclaimed property files.
Uses Python's csv.DictReader (fast C-backed) + sqlite3 batch inserts.
Handles the CA-specific column mapping.

Usage: python3 directCsvImport.py "/path/to/From_500_To_Beyond_1*.csv"
"""

import csv
import sqlite3
import sys
import os
import glob
import time

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data.sqlite")
BATCH_SIZE = 100000

def import_csv(filepath):
    print(f"\n=== {os.path.basename(filepath)} ===")
    size_mb = os.path.getsize(filepath) / 1_048_576
    print(f"  Size: {size_mb:.1f} MB")

    db = sqlite3.connect(DB_PATH)
    db.execute("PRAGMA journal_mode = WAL")
    db.execute("PRAGMA synchronous = OFF")
    db.execute("PRAGMA cache_size = -65536")
    db.execute("PRAGMA foreign_keys = ON")

    # Deduplication query for fast count
    existing = db.execute("SELECT COUNT(*) FROM assets").fetchone()[0]
    source_url = f"upload:{os.path.basename(filepath)}"

    batch = []
    imported = 0
    skipped = 0
    row_count = 0
    start = time.time()

    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)

        for row in reader:
            owner_name = row.get("OWNER_NAME", "").strip() or row.get("OWNER_NAME", "")
            owner_state = row.get("OWNER_STATE", "").strip()
            cash_reported = row.get("CASH_REPORTED", "").strip()
            current_balance = row.get("CURRENT_CASH_BALANCE", "").strip()
            property_type = row.get("PROPERTY_TYPE", "").strip() or None
            holder_name = row.get("HOLDER_NAME", "").strip() or None
            owner_city = row.get("OWNER_CITY", "").strip()
            owner_street = row.get("OWNER_STREET_1", "").strip()
            owner_zip = row.get("OWNER_ZIP", "").strip()
            property_id = row.get("PROPERTY_ID", "").strip() or None
            shares = row.get("SHARES_REPORTED", "").strip()
            securities_name = row.get("NAME_OF_SECURITIES_REPORTED", "").strip()

            if not owner_name:
                owner_name = "Unknown"

            if not owner_name or owner_name == "Unknown" and not owner_state:
                skipped += 1
                continue

            # Parse amount: prefer CASH_REPORTED, fall back to CURRENT_CASH_BALANCE
            amount = 0
            for val in [cash_reported, current_balance]:
                if val:
                    try:
                        cleaned = val.replace("$", "").replace(",", "")
                        amount = float(cleaned)
                        break
                    except ValueError:
                        pass

            # Build location
            parts = []
            if owner_street:
                parts.append(owner_street)
            if owner_city:
                parts.append(owner_city)
            if owner_state:
                parts.append(owner_state)
            if owner_zip:
                parts.append(owner_zip)
            location = ", ".join(parts) if parts else None

            # For property_type, append securities info if available
            if securities_name and property_type:
                property_type = f"{property_type} | {securities_name}"
            elif securities_name:
                property_type = securities_name

            batch.append((
                owner_name, None, None, owner_state,
                property_type, amount, holder_name,
                location, property_id, source_url, "manual_entry"
            ))

            row_count += 1

            if len(batch) >= BATCH_SIZE:
                db.executemany(
                    """INSERT OR IGNORE INTO assets
                       (owner_name, first_name, last_name, state, property_type, amount,
                        company, location, state_id, source_url, confidence)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    batch
                )
                imported += len(batch)
                elapsed = time.time() - start
                rate = row_count / elapsed if elapsed > 0 else 0
                print(f"  [{elapsed:.0f}s] {row_count:,} rows | {imported:,} imported | {rate:,.0f} rows/sec")
                batch = []

    # Flush remaining
    if batch:
        db.executemany(
            """INSERT OR IGNORE INTO assets
               (owner_name, first_name, last_name, state, property_type, amount,
                company, location, state_id, source_url, confidence)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            batch
        )
        imported += len(batch)

    total = time.time() - start
    total_imported = db.execute("SELECT COUNT(*) FROM assets").fetchone()[0]
    print(f"  DONE: {row_count:,} rows parsed, {imported:,} newly imported")
    print(f"  Total DB: {total_imported:,} assets | Time: {total:.1f}s | Rate: {row_count/total:,.0f} rows/sec")
    db.close()


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        print("Usage: python3 directCsvImport.py <csv_file_or_glob...>")
        sys.exit(1)

    files = []
    for arg in args:
        matched = glob.glob(arg)
        if matched:
            files.extend(matched)
        elif os.path.isfile(arg):
            files.append(arg)
        else:
            print(f"Not found: {arg}")

    print(f"Files to process: {len(files)}")
    for f in files:
        import_csv(f)

    print("\n=== All imports complete ===")
