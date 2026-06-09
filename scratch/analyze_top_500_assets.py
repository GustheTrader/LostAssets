import os
import csv
import glob
import heapq
import time
import json

CSV_DIR = "04_From_500_To_Beyond"

def clean_amount(val):
    if not val:
        return 0.0
    try:
        # Strip currency symbols, commas, spaces
        cleaned = val.replace("$", "").replace(",", "").strip()
        return float(cleaned)
    except ValueError:
        return 0.0

def find_top_assets():
    csv_pattern = os.path.join(CSV_DIR, "From_500_To_Beyond_*.csv")
    csv_files = sorted(glob.glob(csv_pattern))
    
    if not csv_files:
        print(f"Error: No CSV files found matching {csv_pattern}")
        return
        
    print(f"Found {len(csv_files)} CSV files to process.")
    
    # Heap will store tuples: (amount, file_index, row_index, owner_name, record_dict)
    # Using a min-heap to keep track of the top 500 largest values.
    top_heap = []
    limit = 500
    
    start_time = time.time()
    
    for file_idx, filepath in enumerate(csv_files):
        print(f"Pass 1: Scanning {os.path.basename(filepath)} for top {limit}...")
        file_start = time.time()
        
        with open(filepath, "r", encoding="utf-8-sig", errors="ignore") as f:
            reader = csv.DictReader(f)
            for row_idx, row in enumerate(reader):
                amt_str = row.get("CURRENT_CASH_BALANCE") or row.get("CASH_REPORTED") or "0"
                amount = clean_amount(amt_str)
                owner = (row.get("OWNER_NAME") or "").strip().upper()
                
                if not owner or owner == "UNKNOWN":
                    continue
                
                item = (amount, file_idx, row_idx, owner, row)
                
                if len(top_heap) < limit:
                    heapq.heappush(top_heap, item)
                else:
                    if amount > top_heap[0][0]:
                        heapq.heapreplace(top_heap, item)
                        
        print(f"  Finished in {time.time() - file_start:.1f}s")
        
    # Sort top assets descending by amount
    top_assets = sorted(top_heap, key=lambda x: x[0], reverse=True)
    print(f"\nPass 1 complete. Found top {len(top_assets)} assets in {time.time() - start_time:.1f}s.")
    
    # Get the unique owner names of these top 500 assets
    top_owners = set(asset[3] for asset in top_assets)
    print(f"Unique owner names in top {limit}: {len(top_owners)}")
    
    # Pass 2: Bundle all assets for these top owners
    bundled_assets = {owner: [] for owner in top_owners}
    
    start_pass2 = time.time()
    for filepath in csv_files:
        print(f"Pass 2: Bundling assets from {os.path.basename(filepath)}...")
        with open(filepath, "r", encoding="utf-8-sig", errors="ignore") as f:
            reader = csv.DictReader(f)
            for row in reader:
                owner = (row.get("OWNER_NAME") or "").strip().upper()
                if owner in top_owners:
                    amt_str = row.get("CURRENT_CASH_BALANCE") or row.get("CASH_REPORTED") or "0"
                    amount = clean_amount(amt_str)
                    
                    bundled_assets[owner].append({
                        "property_id": row.get("PROPERTY_ID"),
                        "property_type": row.get("PROPERTY_TYPE"),
                        "amount": amount,
                        "holder": row.get("HOLDER_NAME"),
                        "location": f"{row.get('OWNER_STREET_1','')}, {row.get('OWNER_CITY','')}, {row.get('OWNER_STATE','')} {row.get('OWNER_ZIP','')}".strip(", "),
                        "source": os.path.basename(filepath)
                    })
                    
    print(f"Pass 2 complete in {time.time() - start_pass2:.1f}s.")
    
    # Compile the final report data
    report_data = []
    
    for idx, (amount, file_idx, row_idx, owner, row) in enumerate(top_assets):
        all_assets = bundled_assets[owner]
        total_value = sum(item["amount"] for item in all_assets)
        
        # Sort their assets descending by amount
        all_assets_sorted = sorted(all_assets, key=lambda x: x["amount"], reverse=True)
        
        report_data.append({
            "rank": idx + 1,
            "owner": owner,
            "top_asset_value": amount,
            "total_value": total_value,
            "num_assets": len(all_assets),
            "assets": all_assets_sorted
        })
        
    # Write report data to a JSON backup
    with open("scratch/top_500_assets_report.json", "w", encoding="utf-8") as jf:
        json.dump(report_data, jf, indent=2)
        
    # Write the compiled detailed CSV of all portfolios
    csv_output_path = "scratch/california_top_500_portfolio.csv"
    with open(csv_output_path, "w", newline="", encoding="utf-8-sig") as cf:
        writer = csv.writer(cf)
        # Header row
        writer.writerow([
            "Owner Rank", "Owner Name", "Top Asset Value", "Total Portfolio Value", 
            "Property ID", "Property Type", "Property Amount", "Holder Name", "Owner Location", "Source File"
        ])
        
        for item in report_data:
            for asset in item["assets"]:
                writer.writerow([
                    item["rank"],
                    item["owner"],
                    f"{item['top_asset_value']:.2f}",
                    f"{item['total_value']:.2f}",
                    asset["property_id"],
                    asset["property_type"],
                    f"{asset['amount']:.2f}",
                    asset["holder"],
                    asset["location"],
                    asset["source"]
                ])
                
    print(f"Detailed CSV generated successfully at: {csv_output_path}")
    
    # Generate the Markdown report
    generate_markdown_report(report_data, csv_output_path)

def generate_markdown_report(report_data, csv_path):
    report_path = "scratch/california_top_500_assets_report.md"
    
    total_unclaimed_value = sum(item["total_value"] for item in report_data)
    total_assets_count = sum(item["num_assets"] for item in report_data)
    
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# California Top 500 Unclaimed Assets & Bundled Portfolio Report\n\n")
        f.write("## Executive Summary\n\n")
        f.write(f"- **Total Combined Portfolio Value**: ${total_unclaimed_value:,.2f}\n")
        f.write(f"- **Total Number of Assets**: {total_assets_count}\n")
        f.write(f"- **Source Directory**: `04_From_500_To_Beyond` (Files 1 to 4)\n")
        f.write(f"- **Report Generated**: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"- **Downloadable CSV Export**: [california_top_500_portfolio.csv](file:///{os.path.abspath(csv_path).replace(os.sep, '/')})\n\n")
        
        f.write("## Top 500 Owners & Value Summary\n\n")
        f.write("| Rank | Owner Name | Top Single Asset | Total Portfolio | Assets Count | Primary Location |\n")
        f.write("| --- | --- | --- | --- | --- | --- |\n")
        
        for item in report_data:
            primary_loc = item["assets"][0]["location"] if item["assets"] else "Unknown"
            f.write(f"| {item['rank']} | {item['owner']} | ${item['top_asset_value']:,.2f} | ${item['total_value']:,.2f} | {item['num_assets']} | {primary_loc} |\n")
            
        f.write("\n## Detailed Portfolio Bundling (First 100 Detailed)\n\n")
        f.write("Below is the detail of all properties associated with each of the top 100 owners. The full detail for all 500 owners is exported in the CSV file.\n\n")
        
        for item in report_data[:100]:
            f.write(f"### Rank {item['rank']}. {item['owner']}\n\n")
            f.write(f"- **Total Portfolio Value**: ${item['total_value']:,.2f}\n")
            f.write(f"- **Number of Assets**: {item['num_assets']}\n\n")
            
            f.write("| Property ID | Type | Amount | Holder | Location | Source File |\n")
            f.write("| --- | --- | --- | --- | --- | --- |\n")
            for asset in item["assets"]:
                f.write(f"| {asset['property_id']} | {asset['property_type']} | ${asset['amount']:,.2f} | {asset['holder']} | {asset['location']} | {asset['source']} |\n")
            f.write("\n---\n\n")
            
    print(f"Markdown report generated successfully at: {report_path}")

if __name__ == "__main__":
    find_top_assets()
