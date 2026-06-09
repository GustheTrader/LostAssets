import sqlite3

conn = sqlite3.connect('data.sqlite')
cursor = conn.cursor()

print("=== VERIFYING LEADS ===")
cursor.execute("SELECT id, full_name, relation, phone, email, notes FROM leads ORDER BY id DESC LIMIT 10")
for r in cursor.fetchall():
    print(f"ID: {r[0]}, Name: {r[1]}, Relation: {r[2]}, Phone: {r[3]}, Email: {r[4]}\n  Notes: {r[5]}\n")

print("\n=== VERIFYING RELATIVES ===")
cursor.execute("SELECT r.id, r.full_name, r.relation_type, l.full_name FROM relatives r JOIN leads l ON r.lead_id = l.id ORDER BY r.id DESC LIMIT 10")
for r in cursor.fetchall():
    print(f"ID: {r[0]}, Name: {r[1]}, Relation Type: {r[2]} of Lead: {r[3]}")

conn.close()
