import database
import json
from datetime import datetime

def log_action(action: str, actor: str, target_id: str, details: dict):
    """
    Logs an immutable audit record.
    """
    database.execute_db(
        "INSERT INTO audit_logs (action, actor, target_id, details, timestamp) VALUES (?, ?, ?, ?, ?)",
        (action, actor, target_id, json.dumps(details), datetime.utcnow().isoformat())
    )

def get_logs_for_node(node_id: str):
    """
    Fetches audit logs for a specific entity.
    """
    rows = database.query_db(
        "SELECT * FROM audit_logs WHERE target_id = ? ORDER BY timestamp DESC", 
        (node_id,)
    )
    return [dict(row) for row in rows]
