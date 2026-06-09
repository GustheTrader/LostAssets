import sqlite3

def main():
    conn = sqlite3.connect('data.sqlite')
    cursor = conn.cursor()
    
    query = """
    EXPLAIN QUERY PLAN 
    SELECT owner_name, SUM(amount) AS total_amount, COUNT(*) AS asset_count 
    FROM assets 
    WHERE is_business = 1 
    GROUP BY owner_name 
    ORDER BY total_amount DESC 
    LIMIT 5
    """
    
    print("--- QUERY PLAN ---")
    for row in cursor.execute(query).fetchall():
        print(row)
        
    conn.close()

if __name__ == '__main__':
    main()
