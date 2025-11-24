-- Migration: Add Central Company and improve schema

-- Add Central Company Node (if not exists)
INSERT OR IGNORE INTO nodes (node_id, type, attributes) 
VALUES (
    'node:company:central',
    'Company',
    json('{
        "company_id": "central",
        "name": "APW Construction Co.",
        "type": "central",
        "status": "active"
    }')
);

-- Create view for aggregate stats
CREATE VIEW IF NOT EXISTS vendor_stats AS
SELECT 
    n.node_id,
    n.type,
    json_extract(n.attributes, '$.name') as vendor_name,
    COALESCE(SUM(CASE WHEN e.to_node_id = n.node_id THEN json_extract(e.attributes, '$.amount') END), 0) as total_inflow,
    COALESCE(SUM(CASE WHEN e.from_node_id = n.node_id THEN json_extract(e.attributes, '$.amount') END), 0) as total_outflow,
    COUNT(CASE WHEN e.to_node_id = n.node_id THEN 1 END) as inflow_count,
    COUNT(CASE WHEN e.from_node_id = n.node_id THEN 1 END) as outflow_count
FROM nodes n
LEFT JOIN edges e ON (e.to_node_id = n.node_id OR e.from_node_id = n.node_id)
WHERE n.type IN ('Vendor', 'Company', 'Job')
GROUP BY n.node_id;
