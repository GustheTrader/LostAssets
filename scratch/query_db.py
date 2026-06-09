import sqlite3

conn = sqlite3.connect('data.sqlite')
cursor = conn.cursor()

# Check total number of assets
cursor.execute("SELECT COUNT(*) FROM assets")
print("Total assets:", cursor.fetchone()[0])

# Check if Leon De Filippis is in assets
cursor.execute("SELECT * FROM assets WHERE owner_name LIKE '%DE FILIPPIS%'")
print("De Filippis rows:", cursor.fetchall())

conn.close()
