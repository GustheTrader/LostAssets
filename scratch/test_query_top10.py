import sqlite3

def main():
    conn = sqlite3.connect('data.sqlite')
    cursor = conn.cursor()
    
    query = """
    SELECT owner_name, SUM(amount) AS total_amount, COUNT(*) AS asset_count
    FROM assets
    GROUP BY owner_name
    ORDER BY total_amount DESC
    LIMIT 10
    """
    
    print("--- TOP 10 OVERALL ---")
    results = cursor.execute(query).fetchall()
    for row in results:
        print(f"Name: {row[0]} | Total: ${row[1]:,.2f} | Count: {row[2]}")
        
    conn.close()

if __name__ == '__main__':
    main()
