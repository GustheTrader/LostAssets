import json

with open("scratch/top_1000_2000_assets_report.json", "r") as f:
    data = json.load(f)

print("Top human names in 1001-2000:")
count = 0
excludes = [
    "LLC", "INC", "CORP", "CO ", " CO", "LTD", "BANK", "INSURANCE", 
    "ESTIMATED", "LIABILITY", "TRUST", "HEALTH", "SYSTEMS", "SERVICES", 
    "PARTNERS", "ASSOCIATES", "GROUP", "STATE", "COUNTY", "CITY", 
    "UNCLAIMED", "COMPANY", "SCHOOL", "UNIV", "COLLEGE", "BOARD", "DEPT", 
    "ESTATE OF", "EST OF", "BENEFICIARY", "THE ", "ASSOCIATION", "UNION",
    "FOUNDATION", "COMMISSION", "CHURCH", "CLINIC", "HOSPITAL", "DISTRICT"
]

for item in data:
    name = item["owner"].strip().upper()
    
    # Check if name looks like a company or institution
    is_company = False
    for ex in excludes:
        if ex in name:
            is_company = True
            break
            
    # Names must have spaces (first and last name)
    if " " not in name:
        continue
        
    if not is_company:
        primary_loc = item["assets"][0]["location"] if item["assets"] else "Unknown"
        print(f"Rank: {item['rank']}, Name: {name}, Top Asset: ${item['top_asset_value']:,.2f}, Total: ${item['total_value']:,.2f}, Assets: {item['num_assets']}, Loc: {primary_loc}")
        count += 1
        if count >= 40:
            break
