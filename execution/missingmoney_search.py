#!/usr/bin/env python3
"""
MissingMoney / SWS API batch search adapter.
Requires a Turnstile token obtained manually from the browser.

USAGE:
  1. Open https://missingmoney.com in a browser, F12 -> Network tab
  2. Search for any name, look for POST to /SWS/properties
  3. Copy the cf-turnstile-response header value
  4. python3 missingmoney_search.py --token "YOUR_TOKEN" --state NV --limit 10000

The SWS API uses the same endpoint across nvup.gov AND missingmoney.com.
MissingMoney aggregates all states, so results come back with a stateCode field.
"""

import requests
import sqlite3
import json
import sys
import os
import time
import argparse

API_URL = "https://www.nvup.gov/SWS/properties"  # Also: missingmoney.com/SWS/properties
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data.sqlite")

HEADERS_TEMPLATE = {
    "Content-Type": "application/json",
    "Origin": "https://www.nvup.gov",
    "Referer": "https://www.nvup.gov/app/claim-search",
}


def search(token: str, lastName: str = "", firstName: str = "", 
           city: str = "", state: str = "", zipCode: str = "",
           propertyId: str = "", api_url: str = API_URL) -> list:
    """
    Search the SWS properties endpoint.
    Returns list of property records.
    """
    headers = HEADERS_TEMPLATE.copy()
    headers["cf-turnstile-response"] = token

    payload = {
        "lastName": lastName,
        "firstName": firstName,
        "city": city,
        "state": state,
        "zipCode": zipCode,
        "propertyId": propertyId,
    }

    resp = requests.post(api_url, json=payload, headers=headers, timeout=30)
    
    if resp.status_code == 200:
        data = resp.json()
        # Response format from SWS: {"properties": [...], "totalCount": N}
        if isinstance(data, dict) and "properties" in data:
            return data["properties"]
        elif isinstance(data, list):
            return data
        else:
            print(f"  Unexpected response shape: {type(data)}")
            return []
    elif resp.status_code == 403:
        print(f"  Turnstile token rejected (403). Get a fresh token from browser.")
        return []
    else:
        print(f"  HTTP {resp.status_code}: {resp.text[:200]}")
        return []


def insert_into_db(db_path: str, records: list, source_url: str = "upload:missingmoney"):
    """
    Insert SWS property records into the LostAssets SQLite DB.
    Maps SWS field names to our schema.
    """
    if not records:
        return 0

    db = sqlite3.connect(db_path)
    db.execute("PRAGMA journal_mode = DELETE")
    db.execute("PRAGMA synchronous = NORMAL")

    stmt = db.execute("""
        INSERT OR IGNORE INTO assets (owner_name, first_name, last_name, state, property_type,
                           amount, company, location, state_id, source_url, confidence)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """)

    imported = 0
    for r in records:
        # SWS field mapping (confirmed from nvup.gov JS bundle)
        owner_name = (
            r.get("reportedOwnerName") or 
            r.get("ownerName") or 
            f"{r.get('firstName','')} {r.get('lastName','')}".strip() or
            "Unknown"
        )
        state = r.get("stateCode") or r.get("state") or "NV"
        amount = float(r.get("cashAmount") or r.get("amount") or 0)
        company = r.get("holderName") or r.get("source") or None
        city = r.get("city") or ""
        address = r.get("street") or r.get("address") or ""
        zip_code = r.get("zipCode") or r.get("zip") or ""
        location = f"{address}, {city}, {state} {zip_code}".strip(", ")
        state_id = r.get("propertyId") or r.get("id") or None
        property_type = r.get("propertyType") or None

        db.execute("""
            INSERT OR IGNORE INTO assets (owner_name, first_name, last_name, state, property_type,
                               amount, company, location, state_id, source_url, confidence)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            owner_name,
            r.get("firstName") or None,
            r.get("lastName") or None,
            state,
            property_type,
            amount,
            company,
            location if location.strip(", ") else None,
            state_id,
            source_url,
            "live_portal_protected"
        ))
        imported += 1

    db.commit()
    db.close()
    return imported


# ── Batch search by common names ──────────────────────

# Top 200 most common US last names — covers ~30% of population
COMMON_NAMES = [
    "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis",
    "Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson",
    "Thomas","Taylor","Moore","Jackson","Martin","Lee","Perez","Thompson",
    "White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson","Walker",
    "Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill",
    "Flores","Green","Adams","Nelson","Baker","Hall","Rivera","Campbell",
    "Mitchell","Carter","Roberts","Gomez","Phillips","Evans","Turner","Diaz",
    "Parker","Cruz","Edwards","Collins","Reyes","Stewart","Morris","Morales",
    "Murphy","Cook","Rogers","Gutierrez","Ortiz","Morgan","Cooper","Peterson",
    "Bailey","Reed","Kelly","Howard","Ramos","Kim","Cox","Ward",
    "Richardson","Watson","Brooks","Chavez","Wood","James","Bennett","Gray",
    "Mendoza","Ruiz","Hughes","Price","Alvarez","Castillo","Sanders","Patel",
    "Myers","Long","Ross","Foster","Jimenez",
]

def batch_search(token: str, state: str, db_path: str = DB_PATH, 
                 delay: float = 2.0, limit_names: int = 0):
    """
    Search for all common last names in a given state.
    Uses SWS API (MissingMoney / state portal).
    """
    names = COMMON_NAMES[:limit_names] if limit_names else COMMON_NAMES
    total = 0

    print(f"Batch searching {len(names)} last names in {state}")
    print(f"API: {API_URL}")
    print()

    for i, name in enumerate(names):
        print(f"[{i+1}/{len(names)}] Searching '{name}'...", end=" ")
        results = search(token, lastName=name, state=state)
        if results:
            inserted = insert_into_db(db_path, results)
            total += inserted
            print(f"{len(results)} found, {inserted} imported")
        else:
            print("no results or token expired")
            # Token might be expired — stop and tell user
            if i > 0:
                print("\nToken may be expired. Get a fresh one from browser F12.")
                break
        
        time.sleep(delay)

    print(f"\nTotal imported: {total} records into {db_path}")
    return total


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MissingMoney/SWS unclaimed property search")
    parser.add_argument("--token", required=True, help="Cloudflare Turnstile token (from browser F12)")
    parser.add_argument("--state", default="NV", help="State code (default: NV)")
    parser.add_argument("--lastname", default="", help="Search single last name")
    parser.add_argument("--firstname", default="", help="Search single first name")
    parser.add_argument("--batch", action="store_true", help="Batch search common names")
    parser.add_argument("--limit", type=int, default=0, help="Limit batch to N names")
    parser.add_argument("--delay", type=float, default=2.0, help="Delay between requests (seconds)")
    parser.add_argument("--db", default=DB_PATH, help="SQLite database path")
    parser.add_argument("--api", default=API_URL, help="SWS API URL")
    args = parser.parse_args()

    if not os.path.exists(args.db):
        print(f"ERROR: DB not found at {args.db}")
        print("Create it first: python3 init_db.py")
        sys.exit(1)

    if args.batch:
        batch_search(args.token, args.state, args.db, args.delay, args.limit)
    else:
        results = search(args.token, args.lastname, args.firstname, state=args.state)
        print(f"Found {len(results)} results")
        for r in results[:5]:
            print(f"  {r.get('reportedOwnerName','?')} - ${r.get('cashAmount',0)} - {r.get('stateCode','')}")
        if results:
            imported = insert_into_db(args.db, results)
            print(f"\nImported {imported} records")
