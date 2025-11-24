from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
import json
import database
import resolution
import audit
import merge_service
import uuid

# Import new services
import invoice_service
import attachment_service
import merge_proposal_service
from models import (
    Node, Edge, InvoiceIngest, ReconciliationTask, MergeRequest,
    MergeProposal, MergeApproval, Invoice, Attachment, GraphLayout
)
app = FastAPI(title="APW Ontology API", version="1.4.0 - M4+")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Endpoints ---

@app.on_event("startup")
def startup_event():
    database.init_db()

@app.get("/")
def read_root():
    return {"status": "online", "system": "APW Ontology Graph", "version": "M3"}

@app.get("/api/graph/nodes", response_model=List[Node])
def get_nodes(type: Optional[str] = None):
    query = "SELECT * FROM nodes"
    args = ()
    if type:
        query += " WHERE type = ?"
        args = (type,)
    
    rows = database.query_db(query, args)
    results = []
    for row in rows:
        attrs = json.loads(row['attributes'])
        # Filter out merged nodes from main view
        if attrs.get('status') == 'merged':
            continue
            
        results.append(Node(
            node_id=row['node_id'],
            type=row['type'],
            attributes=attrs
        ))
    return results

@app.get("/api/graph/edges", response_model=List[Edge])
def get_edges(
    from_node: Optional[str] = None, 
    to_node: Optional[str] = None,
    date_start: Optional[str] = None,
    date_end: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None
):
    query = "SELECT * FROM edges WHERE 1=1"
    args = []
    
    if from_node:
        query += " AND from_node_id = ?"
        args.append(from_node)
    if to_node:
        query += " AND to_node_id = ?"
        args.append(to_node)
    if date_start:
        query += " AND json_extract(attributes, '$.date') >= ?"
        args.append(date_start)
    if date_end:
        query += " AND json_extract(attributes, '$.date') <= ?"
        args.append(date_end)
    if min_amount:
        query += " AND CAST(json_extract(attributes, '$.amount') AS REAL) >= ?"
        args.append(min_amount)
    if max_amount:
        query += " AND CAST(json_extract(attributes, '$.amount') AS REAL) <= ?"
        args.append(max_amount)
        
    rows = database.query_db(query, tuple(args))
    results = []
    for row in rows:
        results.append(Edge(
            edge_id=row['edge_id'],
            type=row['type'],
            from_node=row['from_node_id'],
            to_node=row['to_node_id'],
            attributes=json.loads(row['attributes'])
        ))
    return results

@app.get("/api/graph/node/{node_id}", response_model=Node)
def get_node_details(node_id: str):
    row = database.query_db("SELECT * FROM nodes WHERE node_id = ?", (node_id,), one=True)
    if not row:
        raise HTTPException(status_code=404, detail="Node not found")
    
    attrs = json.loads(row['attributes'])
    
    # Calculate Aggregates (Real-time)
    # Total Inflow (Edges coming INTO this node)
    inflow = database.query_db(
        "SELECT SUM(json_extract(attributes, '$.amount')) as total FROM edges WHERE to_node_id = ?", 
        (node_id,), one=True
    )
    # Total Outflow (Edges going OUT of this node)
    outflow = database.query_db(
        "SELECT SUM(json_extract(attributes, '$.amount')) as total FROM edges WHERE from_node_id = ?", 
        (node_id,), one=True
    )
    
    attrs['stats'] = {
        "total_inflow": inflow['total'] or 0,
        "total_outflow": outflow['total'] or 0
    }

    return Node(
        node_id=row['node_id'],
        type=row['type'],
        attributes=attrs
    )

@app.get("/api/graph/node/{node_id}/history")
def get_node_history(node_id: str):
    return audit.get_logs_for_node(node_id)

@app.post("/api/graph/merge")
def manual_merge(req: MergeRequest):
    merge_service.merge_vendors(req.survivor_id, req.victim_id, req.actor, req.reason)
    return {"status": "merged", "survivor": req.survivor_id, "victim": req.victim_id}

# --- Ingestion & Resolution ---

@app.post("/api/ingest/invoice")
def ingest_invoice(invoice: InvoiceIngest):
    # 1. Resolve Vendor
    match_id, match_type, score = resolution.resolve_vendor(invoice.vendor_name)
    
    vendor_node_id = None
    
    if match_type == "AUTO":
        vendor_node_id = match_id
    elif match_type == "CANDIDATE":
        resolution.create_reconciliation_task(invoice.dict(), match_id, score)
        return {"status": "queued", "message": "Vendor match uncertain. Added to reconciliation queue."}
    else:
        # Create new vendor
        vendor_id = str(uuid.uuid4())[:8]
        vendor_node_id = f"node:vendor:{vendor_id}"
        vendor_attrs = {
            "vendor_id": vendor_id,
            "name": invoice.vendor_name,
            "aliases": [invoice.vendor_name],
            "status": "active"
        }
        database.execute_db(
            "INSERT INTO nodes (node_id, type, attributes) VALUES (?, ?, ?)",
            (vendor_node_id, "Vendor", json.dumps(vendor_attrs))
        )
        audit.log_action("NODE_CREATED", "system", vendor_node_id, {"reason": "ingestion"})

    # 2. Create/Link Job Node (if provided)
    job_node_id = None
    if invoice.job_id:
        job_node_id = f"node:job:{invoice.job_id}"
        existing = database.query_db("SELECT 1 FROM nodes WHERE node_id = ?", (job_node_id,), one=True)
        if not existing:
            database.execute_db(
                "INSERT INTO nodes (node_id, type, attributes) VALUES (?, ?, ?)",
                (job_node_id, "Job", json.dumps({"job_id": invoice.job_id, "name": f"Job {invoice.job_id}"}))
            )
            audit.log_action("NODE_CREATED", "system", job_node_id, {"reason": "ingestion"})

    # 3. Create Edge (Payment Flow)
    edge_id = None
    if vendor_node_id and job_node_id:
        edge_id = f"edge:txn:{uuid.uuid4()}"
        edge_attrs = {
            "amount": invoice.amount,
            "currency": invoice.currency,
            "date": invoice.date,
            "source_id": invoice.source_id,
            "source": invoice.source,
            "cost_codes": invoice.cost_codes or [],
            "description": invoice.description
        }
        database.execute_db(
            "INSERT INTO edges (edge_id, type, from_node_id, to_node_id, attributes) VALUES (?, ?, ?, ?, ?)",
            (edge_id, "PaymentFlow", vendor_node_id, job_node_id, json.dumps(edge_attrs))
        )
        audit.log_action("EDGE_CREATED", "system", edge_id, {"amount": invoice.amount})

    # 4. Create detailed invoice record
    if vendor_node_id and job_node_id:
        invoice_id = f"inv:{invoice.source}:{invoice.source_id}"
        invoice_service.create_invoice(
            invoice_id=invoice_id,
            source=invoice.source,
            source_id=invoice.source_id,
            vendor_node_id=vendor_node_id,
            job_node_id=job_node_id,
            amount=invoice.amount,
            currency=invoice.currency,
            invoice_date=invoice.date,
            status="unapproved",
            cost_codes=invoice.cost_codes,
            description=invoice.description,
            raw_payload=invoice.dict(),
            edge_id=edge_id
        )

    return {"status": "ingested", "vendor_node": vendor_node_id, "match_type": match_type, "edge_id": edge_id}

@app.get("/api/reconciliation/queue", response_model=List[ReconciliationTask])
def get_reconciliation_queue():
    rows = database.query_db("SELECT * FROM reconciliation_queue WHERE status = 'pending'")
    tasks = []
    for row in rows:
        tasks.append(ReconciliationTask(
            task_id=row['task_id'],
            task_data=json.loads(row['task_data']),
            status=row['status'],
            created_at=row['created_at']
        ))
    return tasks

@app.post("/api/reconciliation/resolve/{task_id}")
def resolve_task(task_id: int, action: str, target_vendor_id: Optional[str] = None):
    task_row = database.query_db("SELECT * FROM reconciliation_queue WHERE task_id = ?", (task_id,), one=True)
    if not task_row:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task_data = json.loads(task_row['task_data'])
    invoice_data = task_data['source_record']
    
    final_vendor_id = None

    if action == 'merge':
        if not target_vendor_id:
             target_vendor_id = task_data['candidate_id']
        final_vendor_id = target_vendor_id
        # Log the decision
        audit.log_action("RECONCILIATION_MERGE", "user:reconciler", final_vendor_id, {"task_id": task_id})
        
    elif action == 'create_new':
        vendor_id = str(uuid.uuid4())[:8]
        final_vendor_id = f"node:vendor:{vendor_id}"
        vendor_attrs = {
            "vendor_id": vendor_id,
            "name": invoice_data['vendor_name'],
            "aliases": [invoice_data['vendor_name']],
            "status": "active"
        }
        database.execute_db(
            "INSERT INTO nodes (node_id, type, attributes) VALUES (?, ?, ?)",
            (final_vendor_id, "Vendor", json.dumps(vendor_attrs))
        )
        audit.log_action("NODE_CREATED", "user:reconciler", final_vendor_id, {"reason": "reconciliation_new"})
    
    # Create Edge
    if invoice_data.get('job_id'):
        job_node_id = f"node:job:{invoice_data['job_id']}"
        edge_id = f"edge:txn:{uuid.uuid4()}"
        edge_attrs = {
            "amount": invoice_data['amount'],
            "currency": invoice_data['currency'],
            "date": invoice_data['date'],
            "source_id": invoice_data['source_id'],
            "source": invoice_data['source']
        }
        database.execute_db(
            "INSERT INTO edges (edge_id, type, from_node_id, to_node_id, attributes) VALUES (?, ?, ?, ?, ?)",
            (edge_id, "PaymentFlow", final_vendor_id, job_node_id, json.dumps(edge_attrs))
        )

    # Update Task Status
    database.execute_db("UPDATE reconciliation_queue SET status = 'resolved' WHERE task_id = ?", (task_id,))
    
    return {"status": "resolved", "vendor_node": final_vendor_id}

# --- Enhanced Endpoints (M4+) ---

@app.get("/api/graph/edge/{edge_id}/details")
def get_edge_details(edge_id: str):
    """
    Get detailed information about an edge, including all invoices that contributed to it.
    """
    edge_row = database.query_db("SELECT * FROM edges WHERE edge_id = ?", (edge_id,), one=True)
    if not edge_row:
        raise HTTPException(status_code=404, detail="Edge not found")
    
    edge_data = {
        "edge_id": edge_row['edge_id'],
        "type": edge_row['type'],
        "from_node": edge_row['from_node_id'],
        "to_node": edge_row['to_node_id'],
        "attributes": json.loads(edge_row['attributes'])
    }
    
    # Get invoices for this edge
    invoices = invoice_service.get_invoices_by_edge(edge_id)
    
    # Get attachments
    attachments = attachment_service.get_attachments('edge', edge_id)
    
    return {
        **edge_data,
        "invoices": invoices,
        "attachments": attachments,
        "invoice_count": len(invoices)
    }

@app.get("/api/invoices", response_model=List[Invoice])
def get_invoices(
    vendor_id: Optional[str] = None,
    job_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100
):
    """
    Get invoices with optional filters.
    """
    if vendor_id:
        invoices = invoice_service.get_invoices_by_vendor(vendor_id, limit)
    elif job_id:
        invoices = invoice_service.get_invoices_by_job(job_id, limit)
    else:
        # Get all invoices
        query = "SELECT * FROM invoices WHERE 1=1"
        args = []
        if status:
            query += " AND status = ?"
            args.append(status)
        query += " ORDER BY invoice_date DESC LIMIT ?"
        args.append(limit)
        
        rows = database.query_db(query, tuple(args))
        invoices = []
        for row in rows:
            inv = dict(row)
            if inv.get('cost_codes'):
                inv['cost_codes'] = json.loads(inv['cost_codes'])
            if inv.get('raw_payload'):
                inv['raw_payload'] = json.loads(inv['raw_payload'])
            invoices.append(inv)
    
    return invoices

@app.post("/api/invoices/{invoice_id}/status")
def update_invoice_status(invoice_id: str, new_status: str, actor: str = "user:default"):
    """
    Update the status of an invoice.
    """
    invoice_service.update_invoice_status(invoice_id, new_status, actor)
    return {"status": "updated", "invoice_id": invoice_id, "new_status": new_status}

@app.get("/api/attachments")
def get_attachments_for_item(related_type: str, related_id: str):
    """
    Get attachments for a node or edge.
    """
    return attachment_service.get_attachments(related_type, related_id)

@app.post("/api/attachments")
def create_attachment(attachment: Attachment):
    """
    Create an attachment record.
    """
    attachment_id = attachment_service.create_attachment(
        source=attachment.source,
        source_id=attachment.source_id,
        file_name=attachment.file_name,
        file_url=attachment.file_url,
        related_to_type=attachment.related_to_type,
        related_to_id=attachment.related_to_id,
        file_size=attachment.file_size,
        mime_type=attachment.mime_type
    )
    return {"attachment_id": attachment_id}

# Two-step Merge Approval Workflow

@app.post("/api/graph/merge/propose")
def propose_merge(proposal: MergeProposal):
    """
    Propose a merge (step 1 of 2-step approval).
    """
    proposal_id = merge_proposal_service.create_merge_proposal(
        survivor_id=proposal.survivor_id,
        victim_ids=proposal.victim_ids,
        proposed_by=proposal.proposed_by,
        reason=proposal.reason
    )
    return {"proposal_id": proposal_id, "status": "pending"}

@app.get("/api/graph/merge/proposals")
def get_merge_proposals():
    """
    Get all pending merge proposals.
    """
    return merge_proposal_service.get_pending_proposals()

@app.get("/api/graph/merge/proposals/{proposal_id}")
def get_merge_proposal(proposal_id: int):
    """
    Get a specific merge proposal.
    """
    proposal = merge_proposal_service.get_proposal(proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return proposal

@app.post("/api/graph/merge/proposals/{proposal_id}/approve")
def approve_merge(proposal_id: int, approval: MergeApproval):
    """
    Approve a merge proposal (step 2 of 2-step approval).
    """
    try:
        merge_proposal_service.approve_merge_proposal(
            proposal_id=proposal_id,
            approved_by=approval.approved_by,
            notes=approval.notes
        )
        return {"status": "approved", "proposal_id": proposal_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/graph/merge/proposals/{proposal_id}/reject")
def reject_merge(proposal_id: int, rejected_by: str, reason: str):
    """
    Reject a merge proposal.
    """
    merge_proposal_service.reject_merge_proposal(proposal_id, rejected_by, reason)
    return {"status": "rejected", "proposal_id": proposal_id}

# Graph Layout Persistence

@app.post("/api/graph/layout")
def save_layout(layouts: List[GraphLayout]):
    """
    Save graph node positions.
    """
    for layout in layouts:
        database.execute_db(
            """
            INSERT OR REPLACE INTO graph_layouts (user_id, node_id, position_x, position_y, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            (layout.user_id, layout.node_id, layout.position_x, layout.position_y)
        )
    return {"status": "saved", "count": len(layouts)}

@app.get("/api/graph/layout")
def get_layout(user_id: str = "default"):
    """
    Get saved graph layout for a user.
    """
    rows = database.query_db(
        "SELECT node_id, position_x, position_y FROM graph_layouts WHERE user_id = ?",
        (user_id,)
    )
    return [dict(row) for row in rows]

# Metrics & Monitoring

@app.get("/api/metrics")
def get_metrics():
    """
    Get system metrics for monitoring.
    """
    # Real-time stats
    node_count = database.query_db("SELECT COUNT(*) as cnt FROM nodes", one=True)
    edge_count = database.query_db("SELECT COUNT(*) as cnt FROM edges", one=True)
    invoice_count = database.query_db("SELECT COUNT(*) as cnt FROM invoices", one=True)
    pending_reconciliation = database.query_db(
        "SELECT COUNT(*) as cnt FROM reconciliation_queue WHERE status = 'pending'",
        one=True
    )
    pending_proposals = database.query_db(
        "SELECT COUNT(*) as cnt FROM merge_proposals WHERE status = 'pending'",
        one=True
    )
    
    return {
        "nodes": {
            "total": node_count['cnt']
        },
        "edges": {
            "total": edge_count['cnt']
        },
        "invoices": {
            "total": invoice_count['cnt']
        },
        "reconciliation": {
            "pending": pending_reconciliation['cnt']
        },
        "merge_proposals": {
            "pending": pending_proposals['cnt']
        }
    }

@app.get("/api/export/csv")
def export_csv(
    entity_type: str = "edges",
    date_start: Optional[str] = None,
    date_end: Optional[str] = None
):
    """
    Export data as CSV (for now, returns JSON - frontend can convert).
    """
    import csv
    from io import StringIO
    
    if entity_type == "edges":
        query = "SELECT * FROM edges WHERE 1=1"
        args = []
        
        if date_start:
            query += " AND json_extract(attributes, '$.date') >= ?"
            args.append(date_start)
        if date_end:
            query += " AND json_extract(attributes, '$.date') <= ?"
            args.append(date_end)
        
        rows = database.query_db(query, tuple(args))
        
        # Convert to CSV-friendly format
        data = []
        for row in rows:
            attrs = json.loads(row['attributes'])
            data.append({
                "edge_id": row['edge_id'],
                "type": row['type'],
                "from_node": row['from_node_id'],
                "to_node": row['to_node_id'],
                "amount": attrs.get('amount', 0),
                "currency": attrs.get('currency', 'USD'),
                "date": attrs.get('date', ''),
                "status": attrs.get('status', '')
            })
        
        return {"data": data, "format": "json"}  # Frontend can convert to CSV
    
    return {"error": "Unsupported entity type"}

@app.post("/api/ingest/mock")
def ingest_mock_data():
    """
    Resets and seeds the database with the PRD example data.
    """
    database.init_db() # Re-init to clear/ensure schema
    
    # 1. Create Vendor Node
    vendor_attrs = {
        "vendor_id": "12345",
        "name": "ACME Supplies Ltd",
        "aliases": ["ACME Supplies", "ACME Supply Co."],
        "tax_id_masked": "XX-XXX",
        "contact": [{"name":"John Doe","email":"j.doe@acme.com"}],
        "primary_bank_last4": "1234"
    }
    database.execute_db(
        "INSERT OR REPLACE INTO nodes (node_id, type, attributes) VALUES (?, ?, ?)",
        ("node:vendor:12345", "Vendor", json.dumps(vendor_attrs))
    )
    
    # 2. Create Job Node
    job_attrs = {
        "job_id": "8899",
        "name": "Skyline Tower Renovation",
        "status": "Active"
    }
    database.execute_db(
        "INSERT OR REPLACE INTO nodes (node_id, type, attributes) VALUES (?, ?, ?)",
        ("node:job:8899", "Job", json.dumps(job_attrs))
    )
    
    # 3. Create Edge (Payment Flow)
    edge_attrs = {
        "amount": 12500.50,
        "currency": "CAD",
        "date": "2025-10-15",
        "status": "unapproved",
        "invoice_ids": ["VST-9876","AP-4001"],
        "cost_codes": ["CC-101","CC-102"],
        "detail": "Partial payment covering material and labor"
    }
    database.execute_db(
        "INSERT OR REPLACE INTO edges (edge_id, type, from_node_id, to_node_id, attributes) VALUES (?, ?, ?, ?, ?)",
        ("edge:txn:98765", "PaymentFlow", "node:vendor:12345", "node:job:8899", json.dumps(edge_attrs))
    )
    
    return {"status": "seeded", "message": "Mock data ingested successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
