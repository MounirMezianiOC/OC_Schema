from rapidfuzz import process, fuzz
from typing import List, Dict, Optional, Tuple
import json
import database

# Thresholds from PRD
AUTO_MATCH_THRESHOLD = 95.0
CANDIDATE_MATCH_THRESHOLD = 75.0

def get_canonical_vendors() -> List[Dict]:
    """Fetch all existing vendor nodes to match against."""
    rows = database.query_db("SELECT node_id, attributes FROM nodes WHERE type = 'Vendor'")
    vendors = []
    for row in rows:
        attrs = json.loads(row['attributes'])
        vendors.append({
            "id": row['node_id'],
            "name": attrs.get("name", ""),
            "aliases": attrs.get("aliases", [])
        })
    return vendors

def resolve_vendor(raw_name: str) -> Tuple[Optional[str], str, float]:
    """
    Attempts to match a raw vendor name against the canonical graph.
    Returns: (match_id, match_type, score)
    match_type: "AUTO", "CANDIDATE", "NEW"
    """
    vendors = get_canonical_vendors()
    
    if not vendors:
        return None, "NEW", 0.0

    # Prepare a list of choices (name and aliases)
    # We map back to ID via a dictionary for lookup
    choices = {}
    for v in vendors:
        choices[v["name"]] = v["id"]
        for alias in v["aliases"]:
            choices[alias] = v["id"]
    
    # Extract best match
    # process.extractOne returns (match_string, score, index)
    result = process.extractOne(raw_name, choices.keys(), scorer=fuzz.token_sort_ratio)
    
    if not result:
        return None, "NEW", 0.0
        
    match_name, score, _ = result
    match_id = choices[match_name]
    
    if score >= AUTO_MATCH_THRESHOLD:
        return match_id, "AUTO", score
    elif score >= CANDIDATE_MATCH_THRESHOLD:
        return match_id, "CANDIDATE", score
    else:
        return None, "NEW", score

def create_reconciliation_task(source_record: Dict, candidate_id: str, score: float):
    """Log a task for manual review."""
    task = {
        "source_record": source_record,
        "candidate_id": candidate_id,
        "score": score,
        "status": "pending"
    }
    # We need a table for this. For now, let's store it in a 'reconciliation_queue' table.
    # I will need to add this to the schema.
    database.execute_db(
        "INSERT INTO reconciliation_queue (task_data, status) VALUES (?, ?)",
        (json.dumps(task), "pending")
    )
