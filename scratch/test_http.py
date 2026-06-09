import urllib.request
import json

def main():
    url = "http://localhost:3000/api/records/search-bundled?limit=10&offset=0&ownerType=business"
    print(f"Fetching: {url}")
    try:
        response = urllib.request.urlopen(url)
        data = json.loads(response.read().decode('utf-8'))
        
        print(f"Total returned bundles in JSON response: {len(data.get('bundles', []))}")
        print(f"Total count from countSql: {data.get('total')}")
        for i, b in enumerate(data.get('bundles', [])):
            print(f"[{i+1}] {b['ownerName']} - ${b['totalAmount']:,.2f} (Assets: {b['assetCount']})")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()
