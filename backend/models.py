"""
Pydantic models for API request/response validation.
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class Node(BaseModel):
    node_id: str
    type: str
    attributes: Dict[str, Any]

class Edge(BaseModel):
    edge_id: str
    type: str
    from_node: str
    to_node: str
    attributes: Dict[str, Any]

class InvoiceIngest(BaseModel):
    source: str
    source_id: str
    vendor_name: str
    amount: float
    currency: str = "USD"
    date: str
    job_id: Optional[str] = None
    cost_codes: Optional[List[str]] = None
    description: Optional[str] = None
    attachments: Optional[List[str]] = None

class MergeRequest(BaseModel):
    survivor_id: str
    victim_id: str
    reason: str
    actor: str = "user:default"

class MergeProposal(BaseModel):
    survivor_id: str
    victim_ids: List[str]
    reason: str
    proposed_by: str = "user:default"

class MergeApproval(BaseModel):
    approved_by: str
    notes: Optional[str] = None

class Invoice(BaseModel):
    invoice_id: str
    source: str
    source_id: str
    vendor_node_id: Optional[str]
    job_node_id: Optional[str]
    amount: float
    currency: str
    invoice_date: Optional[str]
    status: str
    cost_codes: Optional[List[str]]
    description: Optional[str]
    edge_id: Optional[str]

class Attachment(BaseModel):
    attachment_id: str
    source: str
    source_id: str
    file_name: Optional[str]
    file_url: Optional[str]
    file_size: Optional[int]
    mime_type: Optional[str]
    related_to_type: str
    related_to_id: str

class GraphLayout(BaseModel):
    node_id: str
    position_x: float
    position_y: float
    user_id: str = "default"

class SystemMetric(BaseModel):
    metric_name: str
    metric_value: float
    labels: Optional[Dict[str, str]] = None

class ReconciliationTask(BaseModel):
    task_id: int
    task_data: Dict[str, Any]
    status: str
    created_at: str
