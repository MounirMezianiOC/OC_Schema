"""
Attachment management service.
"""
import uuid
import database
from typing import List, Dict, Optional

def create_attachment(
    source: str,
    source_id: str,
    file_name: str,
    file_url: str,
    related_to_type: str,
    related_to_id: str,
    file_size: Optional[int] = None,
    mime_type: Optional[str] = None,
    checksum: Optional[str] = None
) -> str:
    """
    Create an attachment record.
    """
    attachment_id = f"attach:{uuid.uuid4()}"
    
    database.execute_db(
        """
        INSERT INTO attachments 
        (attachment_id, source, source_id, file_name, file_url, 
         file_size, mime_type, checksum, related_to_type, related_to_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            attachment_id,
            source,
            source_id,
            file_name,
            file_url,
            file_size,
            mime_type,
            checksum,
            related_to_type,
            related_to_id
        )
    )
    
    return attachment_id

def get_attachments(related_to_type: str, related_to_id: str) -> List[Dict]:
    """
    Get all attachments for a node or edge.
    """
    rows = database.query_db(
        "SELECT * FROM attachments WHERE related_to_type = ? AND related_to_id = ?",
        (related_to_type, related_to_id)
    )
    
    return [dict(row) for row in rows]

def get_attachment(attachment_id: str) -> Optional[Dict]:
    """
    Get a single attachment by ID.
    """
    row = database.query_db(
        "SELECT * FROM attachments WHERE attachment_id = ?",
        (attachment_id,),
        one=True
    )
    
    return dict(row) if row else None
