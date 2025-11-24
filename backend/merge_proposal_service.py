"""
Two-step merge proposal and approval workflow.
"""
import json
import database
import audit
from typing import List, Dict, Optional

def create_merge_proposal(
    survivor_id: str,
    victim_ids: List[str],
    proposed_by: str,
    reason: str
) -> int:
    """
    Create a merge proposal (step 1 of 2-step approval).
    Returns the proposal_id.
    """
    # Calculate preview of consequences
    metadata = _calculate_merge_consequences(survivor_id, victim_ids)
    
    proposal_id = database.execute_db(
        """
        INSERT INTO merge_proposals 
        (survivor_id, victim_ids, proposed_by, reason, metadata)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            survivor_id,
            json.dumps(victim_ids),
            proposed_by,
            reason,
            json.dumps(metadata)
        )
    )
    
    # Log proposal creation
    audit.log_action(
        "MERGE_PROPOSED",
        proposed_by,
        survivor_id,
        {
            "proposal_id": proposal_id,
            "victim_ids": victim_ids,
            "reason": reason
        }
    )
    
    return proposal_id

def approve_merge_proposal(proposal_id: int, approved_by: str, notes: Optional[str] = None) -> bool:
    """
    Approve a merge proposal (step 2 of 2-step approval).
    Executes the actual merge.
    """
    # Get proposal
    proposal = database.query_db(
        "SELECT * FROM merge_proposals WHERE proposal_id = ?",
        (proposal_id,),
        one=True
    )
    
    if not proposal:
        raise ValueError(f"Proposal {proposal_id} not found")
    
    if proposal['status'] != 'pending':
        raise ValueError(f"Proposal {proposal_id} is not pending (status: {proposal['status']})")
    
    survivor_id = proposal['survivor_id']
    victim_ids = json.loads(proposal['victim_ids'])
    
    # Execute merge for each victim
    import merge_service
    for victim_id in victim_ids:
        merge_service.merge_vendors(
            survivor_id,
            victim_id,
            approved_by,
            f"Approved proposal #{proposal_id}"
        )
    
    # Update proposal status
    database.execute_db(
        "UPDATE merge_proposals SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE proposal_id = ?",
        (approved_by, proposal_id)
    )
    
    # Log approval
    audit.log_action(
        "MERGE_APPROVED",
        approved_by,
        survivor_id,
        {
            "proposal_id": proposal_id,
            "victim_ids": victim_ids,
            "notes": notes
        }
    )
    
    return True

def reject_merge_proposal(proposal_id: int, rejected_by: str, reason: str) -> bool:
    """
    Reject a merge proposal.
    """
    database.execute_db(
        "UPDATE merge_proposals SET status = 'rejected', approved_by = ?, approved_at = CURRENT_TIMESTAMP, rejection_reason = ? WHERE proposal_id = ?",
        (rejected_by, reason, proposal_id)
    )
    
    # Log rejection
    proposal = database.query_db(
        "SELECT * FROM merge_proposals WHERE proposal_id = ?",
        (proposal_id,),
        one=True
    )
    
    audit.log_action(
        "MERGE_REJECTED",
        rejected_by,
        proposal['survivor_id'],
        {
            "proposal_id": proposal_id,
            "reason": reason
        }
    )
    
    return True

def get_pending_proposals() -> List[Dict]:
    """
    Get all pending merge proposals.
    """
    rows = database.query_db(
        "SELECT * FROM merge_proposals WHERE status = 'pending' ORDER BY proposed_at DESC"
    )
    
    results = []
    for row in rows:
        proposal = dict(row)
        proposal['victim_ids'] = json.loads(proposal['victim_ids'])
        if proposal.get('metadata'):
            proposal['metadata'] = json.loads(proposal['metadata'])
        results.append(proposal)
    
    return results

def get_proposal(proposal_id: int) -> Optional[Dict]:
    """
    Get a specific proposal by ID.
    """
    row = database.query_db(
        "SELECT * FROM merge_proposals WHERE proposal_id = ?",
        (proposal_id,),
        one=True
    )
    
    if row:
        proposal = dict(row)
        proposal['victim_ids'] = json.loads(proposal['victim_ids'])
        if proposal.get('metadata'):
            proposal['metadata'] = json.loads(proposal['metadata'])
        return proposal
    
    return None

def _calculate_merge_consequences(survivor_id: str, victim_ids: List[str]) -> Dict:
    """
    Calculate the consequences of a merge for preview.
    """
    consequences = {
        "affected_edges": 0,
        "total_transaction_value": 0.0,
        "affected_invoices": 0
    }
    
    for victim_id in victim_ids:
        # Count edges
        edges_from = database.query_db(
            "SELECT COUNT(*) as cnt FROM edges WHERE from_node_id = ?",
            (victim_id,),
            one=True
        )
        edges_to = database.query_db(
            "SELECT COUNT(*) as cnt FROM edges WHERE to_node_id = ?",
            (victim_id,),
            one=True
        )
        
        consequences["affected_edges"] += (edges_from['cnt'] or 0) + (edges_to['cnt'] or 0)
        
        # Sum transaction values
        total_flow = database.query_db(
            "SELECT SUM(CAST(json_extract(attributes, '$.amount') AS REAL)) as total FROM edges WHERE from_node_id = ? OR to_node_id = ?",
            (victim_id, victim_id),
            one=True
        )
        
        consequences["total_transaction_value"] += total_flow['total'] or 0.0
        
        # Count invoices
        invoices = database.query_db(
            "SELECT COUNT(*) as cnt FROM invoices WHERE vendor_node_id = ?",
            (victim_id,),
            one=True
        )
        
        consequences["affected_invoices"] += invoices['cnt'] or 0
    
    return consequences
