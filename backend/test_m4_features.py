"""
Comprehensive test for all M4+ features.
"""
import requests
import json

API_BASE = "http://localhost:8002/api"

def test_enhanced_ingestion():
    print("=== Testing Enhanced Ingestion with Cost Codes ===")
    
    # Ingest invoice with cost codes and descrip description
    inv = {
        "source": "VISTA",
        "source_id": "INV-2025-001",
        "vendor_name": "Beta Builders",
        "amount": 15000.00,
        "currency": "USD",
        "date": "2025-11-21",
        "job_id": "9900",
        "cost_codes": ["CC-101", "CC-205"],
        "description": "Foundation work and materials"
    }
    
    res = requests.post(f"{API_BASE}/ingest/invoice", json=inv)
    print(f"Ingestion: {res.json()}")
    assert res.json()["status"] == "ingested"
    edge_id = res.json().get("edge_id")
    return edge_id

def test_edge_details(edge_id):
    print("\n=== Testing Edge Details Endpoint ===")
    res = requests.get(f"{API_BASE}/graph/edge/{edge_id}/details")
    details = res.json()
    print(f"Edge ID: {edge_id}")
    print(f"Invoices: {len(details.get('invoices', []))}")
    print(f"Attachments: {len(details.get('attachments', []))}")
    print(json.dumps(details, indent=2))

def test_two_step_merge():
    print("\n=== Testing Two-Step Merge Proposal ===")
    
    # Create two vendors
    inv1 = requests.post(f"{API_BASE}/ingest/invoice", json={
        "source": "TEST", "source_id": "M1", "vendor_name": "Merge Test A",
        "amount": 100.0, "currency": "USD", "date": "2025-11-21", "job_id": "9900"}).json()
    
    inv2 = requests.post(f"{API_BASE}/ingest/invoice", json={
        "source": "TEST", "source_id": "M2", "vendor_name": "Merge Test B",
        "amount": 200.0, "currency": "USD", "date": "2025-11-21", "job_id": "9900"
    }).json()
    
    survivor = inv1['vendor_node']
    victim = inv2['vendor_node']
    
    # Step 1: Propose merge
    proposal_res = requests.post(f"{API_BASE}/graph/merge/propose", json={
        "survivor_id": survivor,
        "victim_ids": [victim],
        "proposed_by": "user:tester",
        "reason": "Duplicate vendor detected"
    })
    
    proposal_data = proposal_res.json()
    print(f"Proposal Created: {proposal_data}")
    proposal_id = proposal_data['proposal_id']
    
    # Get proposal details
    proposal = requests.get(f"{API_BASE}/graph/merge/proposals/{proposal_id}").json()
    print(f"Proposal Metadata: {proposal.get('metadata')}")
    
    # Step 2: Approve merge
    approval_res = requests.post(
        f"{API_BASE}/graph/merge/proposals/{proposal_id}/approve",
        json={"approved_by": "user:approver", "notes": "Confirmed duplicate"}
    )
    
    print(f"Approval Result: {approval_res.json()}")
    
    # Verify merge happened
    survivor_details = requests.get(f"{API_BASE}/graph/node/{survivor}").json()
    print(f"Survivor Total Outflow (should be 300): {survivor_details['attributes']['stats']['total_outflow']}")

def test_layout_persistence():
    print("\n=== Testing Graph Layout Persistence ===")
    
    # Save layout
    layouts = [
        {"user_id": "default", "node_id": "node:job:9900", "position_x": 100.5, "position_y": 200.3},
        {"user_id": "default", "node_id": "node:vendor:12345", "position_x": 300.2, "position_y": 150.8}
    ]
    
    save_res = requests.post(f"{API_BASE}/graph/layout", json=layouts)
    print(f"Layouts Saved: {save_res.json()}")
    
    # Retrieve layout
    get_res = requests.get(f"{API_BASE}/graph/layout?user_id=default")
    saved_layouts = get_res.json()
    print(f"Retrieved {len(saved_layouts)} layouts")
    print(json.dumps(saved_layouts, indent=2))

def test_metrics():
    print("\n=== Testing Metrics Endpoint ===")
    res = requests.get(f"{API_BASE}/metrics")
    metrics = res.json()
    print(json.dumps(metrics, indent=2))

def test_export():
    print("\n=== Testing Export Endpoint ===")
    res = requests.get(f"{API_BASE}/export/csv?entity_type=edges&date_start=2025-01-01&date_end=2025-12-31")
    export_data = res.json()
    print(f"Exported {len(export_data['data'])} records")
    print(f"Sample: {export_data['data'][0] if export_data['data'] else 'None'}")

if __name__ == "__main__":
    print("🚀 APW Ontology - M4+ Comprehensive Test Suite\n")
    
    edge_id = test_enhanced_ingestion()
    test_edge_details(edge_id)
    test_two_step_merge()
    test_layout_persistence()
    test_metrics()
    test_export()
    
    print("\n✅ All tests completed!")
