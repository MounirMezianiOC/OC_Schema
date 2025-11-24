import requests
import json

BASE_URL = "http://localhost:8002/api"

def test_merge():
    print("--- Testing Merge & Audit ---")
    
    # 1. Create two vendors
    v1 = requests.post(f"{BASE_URL}/ingest/invoice", json={
        "source": "TEST", "source_id": "M1", "vendor_name": "Merge Victim", "amount": 100.0, "currency": "USD", "date": "2025-01-01", "job_id": "9900"
    }).json()
    
    v2 = requests.post(f"{BASE_URL}/ingest/invoice", json={
        "source": "TEST", "source_id": "M2", "vendor_name": "Merge Survivor", "amount": 200.0, "currency": "USD", "date": "2025-01-02", "job_id": "9900"
    }).json()

    victim_id = v1['vendor_node']
    survivor_id = v2['vendor_node']
    
    print(f"Victim: {victim_id}, Survivor: {survivor_id}")

    # 2. Check Pre-Merge Stats
    s1 = requests.get(f"{BASE_URL}/graph/node/{survivor_id}").json()
    print(f"Survivor Pre-Merge Outflow: {s1['attributes']['stats']['total_outflow']}")

    # 3. Perform Merge
    merge_res = requests.post(f"{BASE_URL}/graph/merge", json={
        "survivor_id": survivor_id,
        "victim_id": victim_id,
        "reason": "Duplicate vendor cleanup",
        "actor": "user:tester"
    })
    print(f"Merge Result: {merge_res.json()}")

    # 4. Check Post-Merge Stats (Survivor should have 100 + 200 = 300)
    s2 = requests.get(f"{BASE_URL}/graph/node/{survivor_id}").json()
    print(f"Survivor Post-Merge Outflow: {s2['attributes']['stats']['total_outflow']}")

    # 5. Check Audit Logs
    logs = requests.get(f"{BASE_URL}/graph/node/{survivor_id}/history").json()
    print(f"Survivor Logs: {len(logs)} entries")
    print(json.dumps(logs[0], indent=2))

if __name__ == "__main__":
    test_merge()
