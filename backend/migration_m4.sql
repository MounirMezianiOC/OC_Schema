-- Migration M4: Enhanced Schema for Construction & Attachments

-- Add attachments table
CREATE TABLE IF NOT EXISTS attachments (
    attachment_id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    source_id TEXT NOT NULL,
    file_name TEXT,
    file_url TEXT,
    file_size INTEGER,
    mime_type TEXT,
    checksum TEXT,
    related_to_type TEXT,  -- 'node' or 'edge'
    related_to_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attachments_related ON attachments(related_to_type, related_to_id);

-- Add merge proposals table (two-step approval)
CREATE TABLE IF NOT EXISTS merge_proposals (
    proposal_id INTEGER PRIMARY KEY AUTOINCREMENT,
    survivor_id TEXT NOT NULL,
    victim_ids TEXT NOT NULL,  -- JSON array
    proposed_by TEXT NOT NULL,
    proposed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    status TEXT DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
    approved_by TEXT,
    approved_at TEXT,
    rejection_reason TEXT,
    metadata TEXT  -- JSON for consequences preview
);

-- Add invoice table for detailed tracking
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    source_id TEXT NOT NULL,
    vendor_node_id TEXT,
    job_node_id TEXT,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    invoice_date TEXT,
    status TEXT DEFAULT 'unapproved',
    cost_codes TEXT,  -- JSON array
    description TEXT,
    raw_payload TEXT,  -- JSON blob
    edge_id TEXT,  -- Reference to the edge this created
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_node_id) REFERENCES nodes(node_id),
    FOREIGN KEY (job_node_id) REFERENCES nodes(node_id),
    FOREIGN KEY (edge_id) REFERENCES edges(edge_id)
);

CREATE INDEX IF NOT EXISTS idx_invoices_vendor ON invoices(vendor_node_id);
CREATE INDEX IF NOT EXISTS idx_invoices_job ON invoices(job_node_id);
CREATE INDEX IF NOT EXISTS idx_invoices_edge ON invoices(edge_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Add vendor aliases table for better identity resolution
CREATE TABLE IF NOT EXISTS vendor_aliases (
    alias_id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_node_id TEXT NOT NULL,
    alias TEXT NOT NULL,
    source TEXT,
    score REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_node_id) REFERENCES nodes(node_id)
);

CREATE INDEX IF NOT EXISTS idx_vendor_aliases_vendor ON vendor_aliases(vendor_node_id);
CREATE INDEX IF NOT EXISTS idx_vendor_aliases_alias ON vendor_aliases(alias);

-- Add graph layout persistence
CREATE TABLE IF NOT EXISTS graph_layouts (
    layout_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT DEFAULT 'default',
    node_id TEXT NOT NULL,
    position_x REAL,
    position_y REAL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, node_id)
);

CREATE INDEX IF NOT EXISTS idx_graph_layouts_user ON graph_layouts(user_id);

-- Add metrics table for monitoring
CREATE TABLE IF NOT EXISTS system_metrics (
    metric_id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    labels TEXT,  -- JSON object
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_metrics_name_time ON system_metrics(metric_name, timestamp);
