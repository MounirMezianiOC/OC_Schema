import requests
import json

BASE_URL = "http://localhost:8002/api"

def test_ingest():
    # 1. Seed initial data (ACME Supplies Ltd)
    requests.post(f"{BASE_URL}/ingest/mock")
    print("Seeded DB.")

    # 2. Ingest Exact Match (Should be AUTO)
    inv1 = {
        "source": "VISTA",
        "source_id": "INV-101",
        "vendor_name": "ACME Supplies Ltd",
        "amount": 100.0,
        "currency": "USD",
        "date": "2025-11-01",
        "job_id": "8899"
    }
    r1 = requests.post(f"{BASE_URL}/ingest/invoice", json=inv1)
    print(f"Inv1 (Exact): {r1.json()}")

    # 3. Ingest Fuzzy Match (Should be AUTO or CANDIDATE depending on score)
    # "ACME Supply" vs "ACME Supplies Ltd" -> High score
    inv2 = {
        "source": "VISTA",
        "source_id": "INV-102",
        "vendor_name": "ACME Supply",
        "amount": 200.0,
        "currency": "USD",
        "date": "2025-11-02",
        "job_id": "8899"
    }
    r2 = requests.post(f"{BASE_URL}/ingest/invoice", json=inv2)
    print(f"Inv2 (Fuzzy High): {r2.json()}")

    # 4. Ingest Ambiguous Match (Should be CANDIDATE)
    # "ACME" might be too short/generic, or "ACME Inc"
    inv3 = {
        "source": "VISTA",
        "source_id": "INV-103",
        "vendor_name": "ACME Inc",
        "amount": 300.0,
        "currency": "USD",
        "date": "2025-11-03",
        "job_id": "8899"
    }
    r3 = requests.post(f"{BASE_URL}/ingest/invoice", json=inv3)
    print(f"Inv3 (Ambiguous): {r3.json()}")

    # 5. Ingest New Vendor
    inv4 = {
        "source": "VISTA",
        "source_id": "INV-104",
        "vendor_name": "Beta Builders",
        "amount": 400.0,
        "currency": "USD",
        "date": "2025-11-04",
        "job_id": "8899"
    }
    r4 = requests.post(f"{BASE_URL}/ingest/invoice", json=inv4)
    print(f"Inv4 (New): {r4.json()}")

    # 6. Check Queue
    q = requests.get(f"{BASE_URL}/reconciliation/queue")
    print(f"Queue Size: {len(q.json())}")
    print(json.dumps(q.json(), indent=2))

if __name__ == "__main__":
    test_ingest()
