"""
Invoice management service for detailed transaction tracking.
"""
import json
from typing import List, Dict, Optional
import database

def create_invoice(
    invoice_id: str,
    source: str,
    source_id: str,
    vendor_node_id: Optional[str],
    job_node_id: Optional[str],
    amount: float,
    currency: str,
    invoice_date: str,
    status: str = "unapproved",
    cost_codes: Optional[List[str]] = None,
    description: Optional[str] = None,
    raw_payload: Optional[Dict] = None,
    edge_id: Optional[str] = None
) -> str:
    """
    Create a detailed invoice record.
    """
    database.execute_db(
        """
        INSERT INTO invoices 
        (invoice_id, source, source_id, vendor_node_id, job_node_id, 
         amount, currency, invoice_date, status, cost_codes, description, raw_payload, edge_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            invoice_id,
            source,
            source_id,
            vendor_node_id,
            job_node_id,
            amount,
            currency,
            invoice_date,
            status,
            json.dumps(cost_codes) if cost_codes else None,
            description,
            json.dumps(raw_payload) if raw_payload else None,
            edge_id
        )
    )
    return invoice_id

def get_invoices_by_edge(edge_id: str) -> List[Dict]:
    """
    Get all invoices associated with an edge.
    """
    rows = database.query_db(
        "SELECT * FROM invoices WHERE edge_id = ?",
        (edge_id,)
    )
    
    results = []
    for row in rows:
        invoice = dict(row)
        if invoice.get('cost_codes'):
            invoice['cost_codes'] = json.loads(invoice['cost_codes'])
        if invoice.get('raw_payload'):
            invoice['raw_payload'] = json.loads(invoice['raw_payload'])
        results.append(invoice)
    
    return results

def get_invoices_by_vendor(vendor_node_id: str, limit: int = 100) -> List[Dict]:
    """
    Get invoices for a vendor node.
    """
    rows = database.query_db(
        "SELECT * FROM invoices WHERE vendor_node_id = ? ORDER BY invoice_date DESC LIMIT ?",
        (vendor_node_id, limit)
    )
    
    results = []
    for row in rows:
        invoice = dict(row)
        if invoice.get('cost_codes'):
            invoice['cost_codes'] = json.loads(invoice['cost_codes'])
        if invoice.get('raw_payload'):
            invoice['raw_payload'] = json.loads(invoice['raw_payload'])
        results.append(invoice)
    
    return results

def get_invoices_by_job(job_node_id: str, limit: int = 100) -> List[Dict]:
    """
    Get invoices for a job node.
    """
    rows = database.query_db(
        "SELECT * FROM invoices WHERE job_node_id = ? ORDER BY invoice_date DESC LIMIT ?",
        (job_node_id, limit)
    )
    
    results = []
    for row in rows:
        invoice = dict(row)
        if invoice.get('cost_codes'):
            invoice['cost_codes'] = json.loads(invoice['cost_codes'])
        if invoice.get('raw_payload'):
            invoice['raw_payload'] = json.loads(invoice['raw_payload'])
        results.append(invoice)
    
    return results

def update_invoice_status(invoice_id: str, new_status: str, actor: str):
    """
    Update invoice status and log the change.
    """
    database.execute_db(
        "UPDATE invoices SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE invoice_id = ?",
        (new_status, invoice_id)
    )
    
    # Log the change
    import audit
    audit.log_action(
        "INVOICE_STATUS_CHANGE",
        actor,
        invoice_id,
        {"new_status": new_status}
    )
