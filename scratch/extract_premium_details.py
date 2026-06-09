import json

with open("scratch/top_1000_2000_assets_report.json", "r") as f:
    data = json.load(f)

target_owners = [
    'CALLAWAY MARIA D',
    'CALLAWAY SAN JUANITA S',
    'CALLAWAY WILLIAM R JR',
    'MYKKANEN CYNTHIA A',
    'MCFARLAND ROBERT GORDON',
    'MCFARLAND FRANCES SCHUE',
    'SCHAVER WILLIAM',
    'YEE LEE SHUEY'
]

matching = []
for item in data:
    if item["owner"].strip().upper() in target_owners:
        matching.append(item)

with open("scratch/premium_assets_detailed.json", "w") as out:
    json.dump(matching, out, indent=2)

print(f"Extracted {len(matching)} premium portfolios to scratch/premium_assets_detailed.json")
for m in matching:
    print(f"Rank {m['rank']}: {m['owner']} - Total portfolio: ${m['total_value']:.2f}")
