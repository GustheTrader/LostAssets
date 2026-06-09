import sqlite3

def main():
    conn = sqlite3.connect('data.sqlite')
    cursor = conn.cursor()
    
    name = 'DE FILIPPIS LEON'
    print(f"--- QUERY FOR {name} ---")
    rows = cursor.execute("SELECT * FROM assets WHERE owner_name = ?", (name,)).fetchall()
    
    col_names = [col[1] for col in cursor.execute("PRAGMA table_info(assets)").fetchall()]
    
    for row in rows:
        print(dict(zip(col_names, row)))
        
    conn.close()

if __name__ == '__main__':
    main()
