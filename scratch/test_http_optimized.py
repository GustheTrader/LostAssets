import urllib.request
import json
import time

def main():
    url = "http://localhost:3000/api/records/search-bundled?limit=5&offset=0&ownerType=business"
    print(f"Fetching: {url}")
    start = time.time()
    try:
        response = urllib.request.urlopen(url, timeout=10)
        data = json.loads(response.read().decode('utf-8'))
        duration = time.time() - start
        
        print(f"Success! Duration: {duration:.3f}s (Expected: <0.5s)")
        print(f"Total count from countSql: {data.get('total')}")
        for i, b in enumerate(data.get('bundles', [])):
            print(f"[{i+1}] {b['ownerName']} - ${b['totalAmount']:,.2f} (Assets: {b['assetCount']})")
    except Exception as e:
        print(f"Error (after {time.time() - start:.2f}s): {e}")

if __name__ == '__main__':
    main()
