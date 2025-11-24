import database
import audit
import json

def merge_vendors(survivor_id: str, victim_id: str, actor: str, reason: str):
    """
    Merges victim_id INTO survivor_id.
    1. Moves all edges from victim to survivor.
    2. Marks victim as merged/inactive.
    3. Logs the action.
    """
    # 1. Move Edges (Incoming and Outgoing)
    # Update edges where victim is the source
    database.execute_db(
        "UPDATE edges SET from_node_id = ? WHERE from_node_id = ?",
        (survivor_id, victim_id)
    )
    # Update edges where victim is the target
    database.execute_db(
        "UPDATE edges SET to_node_id = ? WHERE to_node_id = ?",
        (survivor_id, victim_id)
    )

    # 2. Update Victim Node
    victim = database.query_db("SELECT attributes FROM nodes WHERE node_id = ?", (victim_id,), one=True)
    if victim:
        attrs = json.loads(victim['attributes'])
        attrs['status'] = 'merged'
        attrs['merged_into'] = survivor_id
        database.execute_db(
            "UPDATE nodes SET attributes = ? WHERE node_id = ?",
            (json.dumps(attrs), victim_id)
        )

    # 3. Log Audit
    audit.log_action(
        action="VENDOR_MERGE",
        actor=actor,
        target_id=survivor_id,
        details={
            "merged_node": victim_id,
            "reason": reason
        }
    )
    audit.log_action(
        action="WAS_MERGED",
        actor=actor,
        target_id=victim_id,
        details={
            "merged_into": survivor_id,
            "reason": reason
        }
    )

    return True
