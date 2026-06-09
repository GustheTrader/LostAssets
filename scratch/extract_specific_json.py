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

print(json.dumps(matching, indent=2))
