# APW Ontology Dashboard - Technical Reference

## Overview
The APW Ontology Dashboard is a Foundry-style capital flow master dashboard for construction companies. It provides a visual graph of Jobs, Vendors, and payment flows with robust entity resolution, audit trails, and reconciliation workflows.

## Architecture

### System Components
```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                   │
│  - Graph Visualization (Cytoscape.js)                       │
│  - Reconciliation UI                                         │
│  - Filter Controls                                           │
│  - History & Audit Viewer                                    │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/JSON
┌────────────────────▼────────────────────────────────────────┐
│                 Backend API (FastAPI)                        │
│  - Graph Endpoints (/api/graph/...)                         │
│  - Ingestion Endpoints (/api/ingest/...)                    │
│  - Reconciliation Queue (/api/reconciliation/...)           │
│  - Merge Service                                             │
│  - Identity Resolution (rapidfuzz)                           │
│  - Audit Logging                                             │
└────────────────────┬────────────────────────────────────────┘
                     │ SQL
┌────────────────────▼────────────────────────────────────────┐
│                   Database (SQLite)                          │
│  - nodes (Vendors, Jobs, Company)                           │
│  - edges (Payment Flows)                                     │
│  - audit_logs                                                │
│  - reconciliation_queue                                      │
│  - vendor_stats (VIEW)                                       │
└──────────────────────────────────────────────────────────────┘
```

## Data Model

### Nodes
Nodes represent entities in the capital flow graph.

**Types:**
- `Vendor`: Subcontractors and suppliers
- `Job`: Construction projects
- `Company`: Central company (APW Construction)

**Schema:**
```sql
CREATE TABLE nodes (
    node_id TEXT PRIMARY KEY,      -- Format: 'node:{type}:{id}'
    type TEXT NOT NULL,
    attributes TEXT NOT NULL,       -- JSON blob
    version INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Attributes (JSON):**
```json
{
  "name": "ACME Supplies Ltd",
  "vendor_id": "12345",
  "aliases": ["ACME Supply", "ACME Supplies"],
  "status": "active",  // or "merged", "inactive"
  "merged_into": null  // If merged, node_id of survivor
}
```

### Edges
Edges represent payment flows and relationships.

**Types:**
- `PaymentFlow`: AP/AR transactions

**Schema:**
```sql
CREATE TABLE edges (
    edge_id TEXT PRIMARY KEY,      -- Format: 'edge:{type}:{uuid}'
    type TEXT NOT NULL,
    from_node_id TEXT NOT NULL,
    to_node_id TEXT NOT NULL,
    attributes TEXT NOT NULL,       -- JSON blob
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_node_id) REFERENCES nodes(node_id),
    FOREIGN KEY (to_node_id) REFERENCES nodes(node_id)
);
```

**Attributes (JSON):**
```json
{
  "amount": 5000.00,
  "currency": "USD",
  "date": "2025-11-21",
  "source": "VISTA",          // Source system
  "source_id": "INV-12345"    // External ID
}
```

### Audit Logs
Immutable record of all data changes.

```sql
CREATE TABLE audit_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,       -- e.g., "NODE_CREATED", "VENDOR_MERGE"
    actor TEXT NOT NULL,        -- e.g., "system", "user:admin"
    target_id TEXT NOT NULL,    -- Node or edge ID
    details TEXT,               -- JSON blob
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Reconciliation Queue
Pending vendor matching tasks.

```sql
CREATE TABLE reconciliation_queue (
    task_id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_data TEXT NOT NULL,    -- JSON: {source_record, candidate_id, score}
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    resolved_at TEXT,
    resolved_by TEXT
);
```

## API Reference

### Graph Endpoints

#### GET /api/graph/nodes
Fetch all nodes, optionally filtered by type.

**Query Parameters:**
- `type` (optional): Filter by node type (e.g., "Vendor", "Job")

**Response:**
```json
[
  {
    "node_id": "node:vendor:12345",
    "type": "Vendor",
    "attributes": {
      "name": "ACME Supplies Ltd",
      "vendor_id": "12345",
      "aliases": ["ACME Supply"],
      "status": "active"
    }
  }
]
```

#### GET /api/graph/edges
Fetch all edges with optional filters.

**Query Parameters:**
- `from_node` (optional): Filter by source node
- `to_node` (optional): Filter by target node
- `date_start` (optional): Minimum date (YYYY-MM-DD)
- `date_end` (optional): Maximum date (YYYY-MM-DD)
- `min_amount` (optional): Minimum transaction amount
- `max_amount` (optional): Maximum transaction amount

**Response:**
```json
[
  {
    "edge_id": "edge:txn:abc-123",
    "type": "PaymentFlow",
    "from_node": "node:vendor:12345",
    "to_node": "node:job:8899",
    "attributes": {
      "amount": 5000.00,
      "currency": "USD",
      "date": "2025-11-21"
    }
  }
]
```

#### GET /api/graph/node/{node_id}
Fetch detailed information about a single node, including real-time aggregates.

**Response:**
```json
{
  "node_id": "node:vendor:12345",
  "type": "Vendor",
  "attributes": {
    "name": "ACME Supplies Ltd",
    "stats": {
      "total_inflow": 10000.00,
      "total_outflow": 50000.00
    }
  }
}
```

#### GET /api/graph/node/{node_id}/history
Fetch audit log for a specific node.

**Response:**
```json
[
  {
    "log_id": 1,
    "action": "NODE_CREATED",
    "actor": "system",
    "target_id": "node:vendor:12345",
    "details": "{\"reason\": \"ingestion\"}",
    "timestamp": "2025-11-21T10:00:00"
  }
]
```

### Ingestion Endpoints

#### POST /api/ingest/invoice
Ingest a new invoice, triggering identity resolution.

**Request Body:**
```json
{
  "source": "VISTA",
  "source_id": "INV-12345",
  "vendor_name": "ACME Supply",
  "amount": 5000.00,
  "currency": "USD",
  "date": "2025-11-21",
  "job_id": "8899"
}
```

**Response:**
```json
{
  "status": "ingested",         // or "queued"
  "vendor_node": "node:vendor:12345",
  "match_type": "AUTO"           // "AUTO", "CANDIDATE", or "NEW"
}
```

### Reconciliation Endpoints

#### GET /api/reconciliation/queue
Fetch pending reconciliation tasks.

**Response:**
```json
[
  {
    "task_id": 1,
    "task_data": {
      "source_record": { "vendor_name": "ACME Supply", ... },
      "candidate_id": "node:vendor:12345",
      "score": 84.6
    },
    "status": "pending",
    "created_at": "2025-11-21T10:00:00"
  }
]
```

#### POST /api/reconciliation/resolve/{task_id}
Resolve a reconciliation task.

**Query Parameters:**
- `action`: "merge" or "create_new"

**Response:**
```json
{
  "status": "resolved",
  "vendor_node": "node:vendor:12345"
}
```

### Merge Endpoint

#### POST /api/graph/merge
Manually merge two vendors.

**Request Body:**
```json
{
  "survivor_id": "node:vendor:12345",
  "victim_id": "node:vendor:67890",
  "reason": "Duplicate vendor cleanup",
  "actor": "user:admin"
}
```

**Response:**
```json
{
  "status": "merged",
  "survivor": "node:vendor:12345",
  "victim": "node:vendor:67890"
}
```

## Identity Resolution

### Fuzzy Matching Algorithm
Uses `rapidfuzz.fuzz.token_sort_ratio` to compare vendor names.

**Thresholds:**
- **AUTO_MATCH_THRESHOLD** = 95.0: Automatically link to existing vendor
- **CANDIDATE_MATCH_THRESHOLD** = 75.0: Queue for manual review
- **Below 75.0**: Create new vendor

**Examples:**
- "ACME Supplies Ltd" vs "ACME Supplies Ltd" → **100.0** (AUTO)
- "ACME Supply" vs "ACME Supplies Ltd" → **84.6** (CANDIDATE)
- "ACME Inc" vs "ACME Supplies Ltd" → **73.3** (NEW)

## Frontend Features

### Multi-Selection (Shift+Click)
- Click: Select single node
- Shift+Click: Toggle multi-selection
- Selected nodes highlighted with red border

### Merge Workflow
1. Shift+Click two vendor nodes
2. Click "Merge Selected Vendors"
3. Confirm action
4. First selected becomes survivor

### Filters
- Date Range: Filter transactions by date
- Amount Range: Filter by $ amount
- Applies in real-time to graph

### History Tab
- View audit logs for any node
- Shows creation, merges, reconciliations
- Timestamped with actor information

## Deployment

### Backend
```bash
cd c:/Users/MounirMeziani/Documents/APW_Ontology
python backend/server.py
# Server runs on http://0.0.0.0:8002
```

### Frontend
```bash
cd c:/Users/MounirMeziani/Documents/APW_Ontology/frontend
npm install
npm run dev
# Dev server runs on http://localhost:5177
```

### Database
SQLite database auto-initializes on first run:
- Location: `c:/Users/MounirMeziani/Documents/APW_Ontology/database/ontology.db`
- Migrations applied automatically (M1, M2, M3)

## Testing

### Test Ingestion
```bash
python backend/test_ingest.py
```

### Test Merge
```bash
python backend/test_merge.py
```

## Future Enhancements (PRD Milestones)

### M4: Scalability
- Migrate to PostgreSQL
- Add indexing for large datasets
- Implement connection pooling

### M5: Security
- OAuth2 authentication
- RBAC (Role-Based Access Control)
- Data masking for sensitive fields

### M6: Advanced Features
- Persistent graph layouts
- AI-powered duplicate detection
- Export to Excel/PDF
- Real-time collaboration

## Troubleshooting

### Backend won't start
- Check port 8002 is available: `netstat -ano | findstr :8002`
- Verify database path exists
- Check logs for migration errors

### Frontend shows black screen
- Open browser console (F12) for errors
- Verify backend is running and accessible
- Check CORS configuration

### Fuzzy matching not working
- Verify `rapidfuzz` is installed: `pip list | findstr rapidfuzz`
- Check vendor name normalization in `resolution.py`

## Contributing

### Code Style
- Python: Follow PEP 8
- TypeScript: Use ESLint config
- SQL: Use uppercase keywords

### Git Workflow
1. Create feature branch
2. Make changes
3. Run tests
4. Submit pull request

### Adding New Migrations
1. Create `backend/migration_mN.sql`
2. Update `database.py` to include new migration
3. Test with fresh database
