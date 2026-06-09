import sqlite3
import time

def main():
    conn = sqlite3.connect('data.sqlite')
    cursor = conn.cursor()
    
    # 1. Total row count
    t0 = time.time()
    total_assets = cursor.execute("SELECT COUNT(*) FROM assets").fetchone()[0]
    print(f"Total assets: {total_assets:,} (took {time.time() - t0:.3f}s)")
    
    # 2. Test how long a basic LIKE filter query takes to count matching records
    biz_expr = "(owner_name LIKE '% INC%' OR owner_name LIKE '% LLC%' OR owner_name LIKE '% CORP%' OR owner_name LIKE '% CO %' OR owner_name LIKE '% CO' OR owner_name LIKE '% LTD%' OR owner_name LIKE '%COMPANY%' OR owner_name LIKE '%ASSOCIATION%' OR owner_name LIKE '%PARTNERS%' OR owner_name LIKE '%TRUST%' OR owner_name LIKE '%FOUNDATION%' OR owner_name LIKE '%BANK%' OR owner_name LIKE '% SYS%' OR owner_name LIKE '% INT%' OR owner_name LIKE '% SVC%' OR owner_name LIKE '% SERV%' OR owner_name LIKE '% CLUB%' OR owner_name LIKE '% DEPT%' OR owner_name LIKE '% GROUP%' OR owner_name LIKE '% UNION%' OR owner_name LIKE '% SOC%' OR owner_name LIKE '% CLINIC%' OR owner_name LIKE '% HOSP%' OR owner_name LIKE '% CTR%' OR owner_name LIKE '% CENTER%' OR owner_name LIKE '% CORP')"
    
    t0 = time.time()
    try:
        biz_count = cursor.execute(f"SELECT COUNT(*) FROM assets WHERE {biz_expr}").fetchone()[0]
        print(f"Matching business assets: {biz_count:,} (took {time.time() - t0:.3f}s)")
    except Exception as e:
        print(f"Error: {e}")
        
    conn.close()

if __name__ == '__main__':
    main()
