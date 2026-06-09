import sqlite3

conn = sqlite3.connect('data.sqlite')
cursor = conn.cursor()

patterns = ["FILIPPIS", "PHAM", "GAO", "VELADOR", "SHIMADA", "DEGEN", "GLOGER", "YATES", "PINKEL", "BELLEVUE", "SPERBER", "MERK"]

for pat in patterns:
    print(f"\nSearching for pattern: {pat}")
    cursor.execute("SELECT id, owner_name, amount, location, property_type FROM assets WHERE owner_name LIKE ? ORDER BY amount DESC LIMIT 5", (f"%{pat}%",))
    rows = cursor.fetchall()
    for r in rows:
        print(f"  ID: {r[0]} | Name: {r[1]} | Amt: ${r[2]:,.2f} | Loc: {r[3]} | Type: {r[4]}")

conn.close()
