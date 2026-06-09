import json

with open("scratch/top_500_assets_report.json", "r") as f:
    data = json.load(f)

print("Top 30 human names:")
count = 0
for item in data:
    name = item["owner"]
    # Check if name looks like a company
    excludes = ["LLC", "INC", "CORP", "CO ", " CO", "LTD", "BANK", "INSURANCE", "ESTIMATED", "LIABILITY", "TRUST", "HEALTH", "SYSTEMS", "SERVICES", "PARTNERS", "ASSOCIATES", "GROUP", "STATE", "COUNTY", "CITY", "UNCLAIMED"]
    is_company = False
    for ex in excludes:
        if ex in name:
            is_company = True
            break
            
    # Also names must have spaces (at least a first and last name)
    if " " not in name:
        continue
        
    if not is_company:
        print(f"Rank: {item['rank']}, Name: {name}, Top Asset: ${item['top_asset_value']:,.2f}, Total: ${item['total_value']:,.2f}, Assets: {item['num_assets']}")
        count += 1
        if count >= 30:
            break
