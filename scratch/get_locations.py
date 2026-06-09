import sqlite3

conn = sqlite3.connect('data.sqlite')
cursor = conn.cursor()

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

for owner in owners:
    print(f"\n================ OWNER: {owner} ================")
    cursor.execute("SELECT id, amount, property_type, company, location, source_url FROM assets WHERE owner_name = ?", (owner,))
    rows = cursor.fetchall()
    total_val = sum(r[1] for r in rows)
    print(f"Total Portfolio Value: ${total_val:,.2f} ({len(rows)} assets)")
    for r in rows:
        print(f"  ID: {r[0]} | Amt: ${r[1]:,.2f} | Type: {r[2]} | Holder: {r[3]} | Loc: {r[4]} | Src: {r[5]}")

conn.close()
