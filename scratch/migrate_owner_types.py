import sqlite3
import time

def main():
    conn = sqlite3.connect('data.sqlite')
    cursor = conn.cursor()
    
    print("--- STARTING OWNER TYPES MIGRATION ---")
    
    # 1. Add column is_business if not exists
    try:
        t0 = time.time()
        cursor.execute("ALTER TABLE assets ADD COLUMN is_business INTEGER DEFAULT 0")
        conn.commit()
        print(f"Added column is_business (took {time.time() - t0:.3f}s)")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column is_business already exists, skipping ADD COLUMN.")
        else:
            raise e
            
    # 2. Update is_business column
    print("Updating is_business for all records matching business indicators...")
    biz_expr = "(owner_name LIKE '% INC%' OR owner_name LIKE '% LLC%' OR owner_name LIKE '% CORP%' OR owner_name LIKE '% CO %' OR owner_name LIKE '% CO' OR owner_name LIKE '% LTD%' OR owner_name LIKE '%COMPANY%' OR owner_name LIKE '%ASSOCIATION%' OR owner_name LIKE '%PARTNERS%' OR owner_name LIKE '%TRUST%' OR owner_name LIKE '%FOUNDATION%' OR owner_name LIKE '%BANK%' OR owner_name LIKE '% SYS%' OR owner_name LIKE '% INT%' OR owner_name LIKE '% SVC%' OR owner_name LIKE '% SERV%' OR owner_name LIKE '% CLUB%' OR owner_name LIKE '% DEPT%' OR owner_name LIKE '% GROUP%' OR owner_name LIKE '% UNION%' OR owner_name LIKE '% SOC%' OR owner_name LIKE '% CLINIC%' OR owner_name LIKE '% HOSP%' OR owner_name LIKE '% CTR%' OR owner_name LIKE '% CENTER%' OR owner_name LIKE '% CORP')"
    
    t0 = time.time()
    cursor.execute(f"UPDATE assets SET is_business = 1 WHERE {biz_expr}")
    conn.commit()
    rows_updated = cursor.rowcount
    print(f"Updated {rows_updated:,} business records (took {time.time() - t0:.3f}s)")
    
    # 3. Update is_estate column
    print("Updating is_estate for all records matching estate indicators...")
    estate_expr = "(owner_name LIKE '%ESTATE%' OR owner_name LIKE '%EST OF%' OR owner_name LIKE '%DECEASED%' OR owner_name LIKE '% DEC %' OR owner_name LIKE '% DEC' OR property_type LIKE '%LIFE INS%')"
    
    t0 = time.time()
    cursor.execute(f"UPDATE assets SET is_estate = 1 WHERE {estate_expr}")
    conn.commit()
    rows_updated = cursor.rowcount
    print(f"Updated {rows_updated:,} estate records (took {time.time() - t0:.3f}s)")
    
    # 4. Add index on is_business
    print("Creating index on is_business...")
    t0 = time.time()
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_assets_is_business ON assets(is_business)")
    conn.commit()
    print(f"Created index idx_assets_is_business (took {time.time() - t0:.3f}s)")
    
    # 5. Add index on is_estate
    print("Creating index on is_estate...")
    t0 = time.time()
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_assets_is_estate ON assets(is_estate)")
    conn.commit()
    print(f"Created index idx_assets_is_estate (took {time.time() - t0:.3f}s)")
    
    # 6. Verify counts
    total_assets = cursor.execute("SELECT COUNT(*) FROM assets").fetchone()[0]
    biz_count = cursor.execute("SELECT COUNT(*) FROM assets WHERE is_business = 1").fetchone()[0]
    estate_count = cursor.execute("SELECT COUNT(*) FROM assets WHERE is_estate = 1").fetchone()[0]
    ind_count = cursor.execute("SELECT COUNT(*) FROM assets WHERE is_business = 0 AND is_estate = 0").fetchone()[0]
    
    print("\n--- SUMMARY OF COUNTS ---")
    print(f"Total assets: {total_assets:,}")
    print(f"Business assets: {biz_count:,} ({biz_count/total_assets:.1%})")
    print(f"Estate assets: {estate_count:,} ({estate_count/total_assets:.1%})")
    print(f"Individual assets: {ind_count:,} ({ind_count/total_assets:.1%})")
    
    conn.close()

if __name__ == '__main__':
    main()
