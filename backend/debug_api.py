import requests

def debug():
    base = "http://localhost:8001"
    
    print("--- Root ---")
    try:
        r = requests.get(f"{base}/")
        print(r.status_code, r.text)
    except Exception as e:
        print("Root failed:", e)

    print("\n--- OpenAPI ---")
    try:
        r = requests.get(f"{base}/openapi.json")
        print(r.status_code, r.text[:200]) # Print first 200 chars
    except Exception as e:
        print("OpenAPI failed:", e)

    print("\n--- Mock Ingest (No Slash) ---")
    try:
        r = requests.post(f"{base}/api/ingest/mock")
        print(r.status_code, r.text)
    except Exception as e:
        print("Mock failed:", e)

    print("\n--- Mock Ingest (With Slash) ---")
    try:
        r = requests.post(f"{base}/api/ingest/mock/")
        print(r.status_code, r.text)
    except Exception as e:
        print("Mock Slash failed:", e)

if __name__ == "__main__":
    debug()
