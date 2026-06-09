import sqlite3

def main():
    conn = sqlite3.connect('data.sqlite')
    cursor = conn.cursor()
    
    # 1. Let's run the exact business query
    biz_clauses = [
        "owner_name LIKE '% INC%'",
        "owner_name LIKE '% LLC%'",
        "owner_name LIKE '% CORP%'",
        "owner_name LIKE '% CO %'",
        "owner_name LIKE '% CO'",
        "owner_name LIKE '% LTD%'",
        "owner_name LIKE '%COMPANY%'",
        "owner_name LIKE '%ASSOCIATION%'",
        "owner_name LIKE '%PARTNERS%'",
        "owner_name LIKE '%TRUST%'",
        "owner_name LIKE '%FOUNDATION%'",
        "owner_name LIKE '%BANK%'",
        "owner_name LIKE '% SYS%'",
        "owner_name LIKE '% INT%'",
        "owner_name LIKE '% SVC%'",
        "owner_name LIKE '% SERV%'",
        "owner_name LIKE '% CLUB%'",
        "owner_name LIKE '% DEPT%'",
        "owner_name LIKE '% GROUP%'",
        "owner_name LIKE '% UNION%'",
        "owner_name LIKE '% SOC%'",
        "owner_name LIKE '% CLINIC%'",
        "owner_name LIKE '% HOSP%'",
        "owner_name LIKE '% CTR%'",
        "owner_name LIKE '% CENTER%'",
        "owner_name LIKE '% CORP'"
    ]
    
    filter_expr = " OR ".join(biz_clauses)
    
    query = f"""
    SELECT owner_name, SUM(amount) AS total_amount, COUNT(*) AS asset_count
    FROM assets
    WHERE ({filter_expr})
    GROUP BY owner_name
    ORDER BY total_amount DESC
    LIMIT 15
    """
    
    print("--- BUSINESS QUERY RESULTS ---")
    results = cursor.execute(query).fetchall()
    for row in results:
        owner_name = row[0]
        # Let's find which specific clauses matched this owner name
        matching_clauses = []
        for clause in biz_clauses:
            # simple mock check using python
            like_val = clause.split("LIKE '")[1][:-1]
            # convert sql like to python check
            py_pattern = like_val.replace('%', '')
            # handle start/end matching
            matched = False
            lower_name = owner_name.lower()
            lower_pattern = py_pattern.lower()
            if like_val.startswith('%') and like_val.endswith('%'):
                matched = lower_pattern in lower_name
            elif like_val.startswith('%'):
                matched = lower_name.endswith(lower_pattern)
            elif like_val.endswith('%'):
                matched = lower_name.startswith(lower_pattern)
            else:
                matched = lower_name == lower_pattern
            
            if matched:
                matching_clauses.append(clause)
        
        print(f"Name: {owner_name} | Total: ${row[1]:,.2f} | Matches: {matching_clauses}")
        
    conn.close()

if __name__ == '__main__':
    main()
