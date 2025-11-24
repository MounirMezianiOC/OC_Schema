-- Add Reconciliation Queue Table
CREATE TABLE IF NOT EXISTS reconciliation_queue (
    task_id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_data JSON NOT NULL,   -- Stores the incoming record and the candidate match details
    status TEXT DEFAULT 'pending', -- pending, resolved, ignored
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    resolved_by TEXT
);
