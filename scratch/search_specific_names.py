import sqlite3

conn = sqlite3.connect('data.sqlite')
cursor = conn.cursor()

names = [
    'CALLAWAY MARIA D',
    'CALLAWAY SAN JUANITA S',
    'CALLAWAY WILLIAM R JR',
    'MYKKANEN CYNTHIA A',
    'MCFARLAND ROBERT GORDON',
    'MCFARLAND FRANCES SCHUE',
    'SCHAVER WILLIAM',
    'YEE LEE SHUEY'
]

print("Searching for specific names in assets table:")
for name in names:
    cursor.execute("SELECT id, owner_name, amount, state, location FROM assets WHERE owner_name = ?", (name,))
    rows = cursor.fetchall()
    print(f"\n--- {name} (Found {len(rows)} matching rows in assets) ---")
    for r in rows:
        print(f"  ID: {r[0]}, Owner: {r[1]}, Amount: ${r[2]:,.2f}, State: {r[3]}, Loc: {r[4]}")

conn.close()
