import sqlite3
import time

def main():
    conn = sqlite3.connect('data.sqlite')
    cursor = conn.cursor()
    
    print("--- CREATING DATABASE TRIGGERS ---")
    
    # Trigger 1: AFTER INSERT ON assets
    trigger_insert = """
    CREATE TRIGGER IF NOT EXISTS trg_assets_owner_type_insert
    AFTER INSERT ON assets
    BEGIN
        UPDATE assets
        SET is_business = (
            CASE WHEN (
                new.owner_name LIKE '% INC%' OR new.owner_name LIKE '% LLC%' OR new.owner_name LIKE '% CORP%' OR 
                new.owner_name LIKE '% CO %' OR new.owner_name LIKE '% CO' OR new.owner_name LIKE '% LTD%' OR 
                new.owner_name LIKE '%COMPANY%' OR new.owner_name LIKE '%ASSOCIATION%' OR new.owner_name LIKE '%PARTNERS%' OR 
                new.owner_name LIKE '%TRUST%' OR new.owner_name LIKE '%FOUNDATION%' OR new.owner_name LIKE '%BANK%' OR 
                new.owner_name LIKE '% SYS%' OR new.owner_name LIKE '% INT%' OR new.owner_name LIKE '% SVC%' OR 
                new.owner_name LIKE '% SERV%' OR new.owner_name LIKE '% CLUB%' OR new.owner_name LIKE '% DEPT%' OR 
                new.owner_name LIKE '% GROUP%' OR new.owner_name LIKE '% UNION%' OR new.owner_name LIKE '% SOC%' OR 
                new.owner_name LIKE '% CLINIC%' OR new.owner_name LIKE '% HOSP%' OR new.owner_name LIKE '% CTR%' OR 
                new.owner_name LIKE '% CENTER%' OR new.owner_name LIKE '% CORP'
            ) THEN 1 ELSE 0 END
        ),
        is_estate = (
            CASE WHEN (
                new.is_estate = 1 OR new.owner_name LIKE '%ESTATE%' OR new.owner_name LIKE '%EST OF%' OR 
                new.owner_name LIKE '%DECEASED%' OR new.owner_name LIKE '% DEC %' OR new.owner_name LIKE '% DEC' OR 
                new.property_type LIKE '%LIFE INS%'
            ) THEN 1 ELSE 0 END
        )
        WHERE id = new.id;
    END;
    """
    
    # Trigger 2: AFTER UPDATE OF owner_name, is_estate, property_type ON assets
    trigger_update = """
    CREATE TRIGGER IF NOT EXISTS trg_assets_owner_type_update
    AFTER UPDATE OF owner_name, is_estate, property_type ON assets
    BEGIN
        UPDATE assets
        SET is_business = (
            CASE WHEN (
                new.owner_name LIKE '% INC%' OR new.owner_name LIKE '% LLC%' OR new.owner_name LIKE '% CORP%' OR 
                new.owner_name LIKE '% CO %' OR new.owner_name LIKE '% CO' OR new.owner_name LIKE '% LTD%' OR 
                new.owner_name LIKE '%COMPANY%' OR new.owner_name LIKE '%ASSOCIATION%' OR new.owner_name LIKE '%PARTNERS%' OR 
                new.owner_name LIKE '%TRUST%' OR new.owner_name LIKE '%FOUNDATION%' OR new.owner_name LIKE '%BANK%' OR 
                new.owner_name LIKE '% SYS%' OR new.owner_name LIKE '% INT%' OR new.owner_name LIKE '% SVC%' OR 
                new.owner_name LIKE '% SERV%' OR new.owner_name LIKE '% CLUB%' OR new.owner_name LIKE '% DEPT%' OR 
                new.owner_name LIKE '% GROUP%' OR new.owner_name LIKE '% UNION%' OR new.owner_name LIKE '% SOC%' OR 
                new.owner_name LIKE '% CLINIC%' OR new.owner_name LIKE '% HOSP%' OR new.owner_name LIKE '% CTR%' OR 
                new.owner_name LIKE '% CENTER%' OR new.owner_name LIKE '% CORP'
            ) THEN 1 ELSE 0 END
        ),
        is_estate = (
            CASE WHEN (
                new.is_estate = 1 OR new.owner_name LIKE '%ESTATE%' OR new.owner_name LIKE '%EST OF%' OR 
                new.owner_name LIKE '%DECEASED%' OR new.owner_name LIKE '% DEC %' OR new.owner_name LIKE '% DEC' OR 
                new.property_type LIKE '%LIFE INS%'
            ) THEN 1 ELSE 0 END
        )
        WHERE id = new.id;
    END;
    """
    
    t0 = time.time()
    cursor.execute(trigger_insert)
    cursor.execute(trigger_update)
    conn.commit()
    print(f"Created/verified triggers in {time.time() - t0:.3f}s")
    
    # Test inserting a new record to verify trigger works
    print("\nTesting trigger with a test insert...")
    cursor.execute("""
        INSERT INTO assets (owner_name, first_name, last_name, state, property_type, amount, confidence)
        VALUES ('TEST CORPORTATION INC', 'TEST', 'CORPORTATION', 'CA', 'SC20', 100.0, 'manual_entry')
    """)
    conn.commit()
    test_id = cursor.lastrowid
    
    row = cursor.execute("SELECT owner_name, is_business, is_estate FROM assets WHERE id = ?", (test_id,)).fetchone()
    print(f"Inserted: {row[0]} | is_business: {row[1]} | is_estate: {row[2]} (Expected: 1, 0)")
    
    # Clean up test insert
    cursor.execute("DELETE FROM assets WHERE id = ?", (test_id,))
    conn.commit()
    print("Test record cleaned up.")
    
    conn.close()

if __name__ == '__main__':
    main()
