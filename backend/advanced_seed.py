"""
Advanced Seed Script for APW Ontology

Generates realistic construction project data with:
- Multiple general contractors and subcontractors
- Jobs with change orders and budget tracking
- Invoice and payment chains
- Vendor relationships and transaction history
"""

import sqlite3
import json
import random
from datetime import datetime, timedelta

def generate_advanced_seed():
    conn = sqlite3.connect('backend/ontology.db')
    cursor = conn.cursor()
    
    # Clear existing data
    cursor.execute("DELETE FROM nodes")
    cursor.execute("DELETE FROM edges")
    cursor.execute("DELETE FROM audit_logs")
    
    vendors = [
        ("Ace Steel & Supply", "Material Supplier", "Steel, Rebar, Structural"),
        ("Premier Concrete Co", "Subcontractor", "Concrete, Foundation"),
        ("Elite Electric LLC", "Subcontractor", "Electrical, Wiring, Panels"),
        ("ProPlumb Solutions", "Subcontractor", "Plumbing, HVAC"),
        ("Summit Roofing Inc", "Subcontractor", "Roofing, Waterproofing"),
        ("BuildRight GC", "GeneralContractor", "Prime Contractor"),
        ("MegaBuild Corp", "GeneralContractor", "Prime Contractor"),
        ("UrbanScape Landscaping", "Subcontractor", "Site Work, Landscaping"),
        ("SafetyFirst Equipment", "Material Supplier", "Safety Gear, Scaffolding"),
        ("QuickRent Tools", "Equipment Rental", "Heavy Machinery"),
    ]
    
    jobs = [
        ("Downtown Tower Phase 1", "Commercial High-Rise", 12500000, "in_progress"),
        ("Riverside Condos", "Residential Multi-Family", 8200000, "in_progress"),
        ("Tech Campus Building C", "Commercial Office", 15800000, "in_progress"),
        ("Memorial Hospital Wing", "Healthcare Facility", 22000000, "in_progress"),
        ("Lakeside Retail Plaza", "Commercial Retail", 6500000, "planning"),
    ]
    
    # Insert Central Company
    cursor.execute(
        "INSERT INTO nodes (node_id, type, attributes) VALUES (?, ?, ?)",
        ("node:company:main", "CentralCompany", json.dumps({
            "name": "Metro Construction Group",
            "industry": "Construction",
            "established": "2008",
            "headquarters": "Seattle, WA"
        }))
    )
    
    # Insert Vendors
    vendor_ids = []
    for i, (name, vtype, specialty) in enumerate(vendors, 1):
        vid = f"node:vendor:{i:05d}"
        vendor_ids.append(vid)
        cursor.execute(
            "INSERT INTO nodes (node_id, type, attributes) VALUES (?, ?, ?)",
            (vid, "Vendor", json.dumps({
                "name": name,
                "vendor_type": vtype,
                "specialty": specialty,
                "rating": round(random.uniform(3.5, 5.0), 1),
                "since": str(2015 + random.randint(0, 8))
            }))
        )
    
    # Insert Jobs with change orders
    job_ids = []
    for i, (name, jtype, budget, status) in enumerate(jobs, 1):
        jid = f"node:job:{i:04d}"
        job_ids.append(jid)
        
        change_orders = random.randint(0, 5)
        original_budget = budget
        current_budget = budget + (change_orders * random.randint(50000, 500000))
        
        cursor.execute(
            "INSERT INTO nodes (node_id, type, attributes) VALUES (?, ?, ?)",
            (jid, "Job", json.dumps({
                "name": name,
                "job_type": jtype,
                "status": status,
                "start_date": (datetime.now() - timedelta(days=random.randint(30, 365))).strftime("%Y-%m-%d"),
                "original_budget": original_budget,
                "current_budget": current_budget,
                "change_orders": change_orders,
                "completion": random.randint(15, 85) if status == "in_progress" else 0
            }))
        )
        
        # Link GeneralContractor to Job
        gc_vendor = random.choice([v for v, (_, vtype, _) in zip(vendor_ids, vendors) if vtype == "GeneralContractor"])
        cursor.execute(
            "INSERT INTO edges (edge_id, type, from_node_id, to_node_id, attributes) VALUES (?, ?, ?, ?, ?)",
            (f"edge:contract:{i:04d}", "Contract", gc_vendor, jid, json.dumps({
                "role": "Prime Contractor",
                "contract_date": (datetime.now() - timedelta(days=random.randint(60, 400))).strftime("%Y-%m-%d"),
                "contract_value": current_budget
            }))
        )
    
    # Generate Invoices and Payments
    invoice_counter = 1
    payment_counter = 1
    
    for job_id, (job_name, _, budget, status) in zip(job_ids, jobs):
        if status != "in_progress":
            continue
            
        # Select 3-6 vendors per job
        num_vendors = random.randint(3, 6)
        job_vendors = random.sample(vendor_ids, num_vendors)
        
        for vendor_id in job_vendors:
            # Each vendor has 2-8 invoices
            num_invoices = random.randint(2, 8)
            
            for _ in range(num_invoices):
                invoice_amount = random.randint(10000, 500000)
                invoice_date = datetime.now() - timedelta(days=random.randint(1, 180))
                invoice_status = random.choice(["approved", "approved", "approved", "pending", "disputed"])
                
                invoice_id = f"edge:invoice:{invoice_counter:05d}"
                invoice_counter += 1
                
                cursor.execute(
                    "INSERT INTO edges (edge_id, type, from_node_id, to_node_id, attributes) VALUES (?, ?, ?, ?, ?)",
                    (invoice_id, "Invoice", vendor_id, job_id, json.dumps({
                        "amount": invoice_amount,
                        "status": invoice_status,
                        "date": invoice_date.strftime("%Y-%m-%d"),
                        "invoice_number": f"INV-{invoice_counter:06d}",
                        "description": random.choice([
                            "Monthly Progress Billing",
                            "Material Delivery",
                            "Labor - Week Ending",
                            "Change Order Work",
                            "Equipment Rental"
                        ]),
                        "due_date": (invoice_date + timedelta(days=30)).strftime("%Y-%m-%d")
                    }))
                )
                
                # 70% of approved invoices have payments
                if invoice_status == "approved" and random.random() < 0.7:
                    payment_amount = invoice_amount if random.random() < 0.8 else int(invoice_amount * random.uniform(0.3, 0.9))
                    payment_date = invoice_date + timedelta(days=random.randint(15, 45))
                    
                    payment_id = f"edge:payment:{payment_counter:05d}"
                    payment_counter += 1
                    
                    cursor.execute(
                        "INSERT INTO edges (edge_id, type, from_node_id, to_node_id, attributes) VALUES (?, ?, ?, ?, ?)",
                        (payment_id, "Payment", job_id, vendor_id, json.dumps({
                            "amount": payment_amount,
                            "status": "completed",
                            "date": payment_date.strftime("%Y-%m-%d"),
                            "payment_method": random.choice(["ACH", "Wire Transfer", "Check"]),
                            "reference": f"PAY-{payment_counter:06d}",
                            "invoice_ref": f"INV-{invoice_counter:06d}"
                        }))
                    )
    
    conn.commit()
    conn.close()
    
    print(f"✓ Advanced seed complete:")
    print(f"  - {len(vendors)} vendors")
    print(f"  - {len(jobs)} jobs")
    print(f"  - {invoice_counter - 1} invoices")
    print(f"  - {payment_counter - 1} payments")

if __name__ == "__main__":
    generate_advanced_seed()
