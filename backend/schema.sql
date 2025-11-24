-- Enable Foreign Keys
PRAGMA foreign_keys = ON;

-- Nodes Table: The core entities (Vendors, Jobs, Companies)
CREATE TABLE IF NOT EXISTS nodes (
    node_id TEXT PRIMARY KEY, -- e.g., "node:vendor:12345"
    type TEXT NOT NULL,       -- "Vendor", "Job", "CentralCompany"
    attributes JSON NOT NULL, -- Flexible JSON for specific attributes
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

-- Edges Table: The flows of capital
CREATE TABLE IF NOT EXISTS edges (
    edge_id TEXT PRIMARY KEY, -- e.g., "edge:txn:98765"
    type TEXT NOT NULL,       -- "PaymentFlow", "InvoiceFlow"
    from_node_id TEXT NOT NULL,
    to_node_id TEXT NOT NULL,
    attributes JSON NOT NULL, -- Stores amount, currency, status, etc.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_node_id) REFERENCES nodes(node_id),
    FOREIGN KEY (to_node_id) REFERENCES nodes(node_id)
);

-- Invoices Table: The source of truth documents
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id TEXT PRIMARY KEY, -- Source ID (e.g., "VST-9876")
    source TEXT NOT NULL,        -- "VISTA", "AP_WIZARD"
    job_id TEXT,                 -- Reference to Job Node ID (optional if not linked yet)
    vendor_id TEXT,              -- Reference to Vendor Node ID
    amount DECIMAL(20, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT NOT NULL,        -- "approved", "unapproved", "paid"
    invoice_date DATE,
    raw_payload JSON,            -- The original data for audit
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log: Immutable record of all changes
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,      -- "MERGE_PROPOSED", "INVOICE_INGESTED"
    actor TEXT NOT NULL,       -- User ID or System Service
    target_id TEXT,            -- ID of the object affected
    details JSON,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);
CREATE INDEX IF NOT EXISTS idx_edges_from ON edges(from_node_id);
CREATE INDEX IF NOT EXISTS idx_edges_to ON edges(to_node_id);
CREATE INDEX IF NOT EXISTS idx_invoices_vendor ON invoices(vendor_id);
