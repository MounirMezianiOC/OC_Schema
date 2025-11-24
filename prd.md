Nice — below is a single, opinionated, **hand-holding “ultimate prompt”** you can drop into an AI coder/engineering agent (or hand to an engineering team) to build the Palantir-style Foundry application for construction companies that you described. I wrote it to be explicit, concrete, and to call out 2nd/3rd/4th-order consequences, acceptance tests, APIs, data models, UX behaviors and everything an AI coder will need to deliver working, auditable software.

You can paste this whole block into your AI-coder prompt window as-is. Replace placeholders like `{{VISTA_API}}`, `{{AP_UNAPPROVED_ENDPOINT}}`, `{{AR_ENDPOINT}}`, and visibility/credential details with your real endpoints and secrets.

---

<Prompt>

<instructions>

You are an engineering agent. Your job is to design and implement a **Foundry-style capital-flow master dashboard for construction companies** (visual graph of Jobs, Vendors, Central Company, and their capital flows). This application will integrate Olsen Consulting’s AP Wizard and Company Vista invoice data (AP unapproved invoices) as well as the AR solution under development. Follow these rules:

1. **Be prescriptive and incremental.** Break the work down into deliverable milestones. For each milestone, produce: architecture diagram, database schema, API contracts, data transformer/ETL code, backend server code (stubs at minimum), front-end components (React/TypeScript preferred), unit/integration tests, data generator/mocks, and e2e acceptance tests.

2. **Design for correctness, auditability, and safety.** Every data mutation (vendor merge, manual override, reconciliation decision) must be recorded with a timestamp, user id, reason, and an immutable audit record. Assume financial/legal consequences for mistakes. Build features to reduce human error: confirmations, staged merges, approval workflows, and revert capability.

3. **Graph as source-of-truth with lineage.** Implement a graph model where nodes are typed (Job, Vendor, CentralCompany, Payment Account, Invoice, Purchase Order) and edges carry monetary flows (with attributes). Keep full provenance to original records (Company Vista invoice id, AP Wizard invoice id, AR invoice id). Maintain versioning of graph states so historic queries reflect the state at any given timestamp.

4. **User interactions must be exact.** When the user clicks a node or an edge, return the exact amount(s), currency, identifiers, raw originating document references, and vendor/job-level metadata. Edges must be clickable and show the list of invoices/payments that produce that flow, with filters (date range, status, currency, cost code).

5. **Plan for scale & performance.** Assume tens of thousands of jobs, hundreds of thousands of vendors, and millions of transactions. Use server-side pagination, pre-aggregations, caching layers, and a graph database or well-indexed relational schema with materialized views. Design for real-time & near-real-time: use CDC / Kafka if available.

6. **Security & compliance first.** Enforce OAuth2/SSO, RBAC and row-level permissions, encryption at rest and in transit, PII minimization for vendor bank/SSN data, and logging for audit/troubleshooting. Provide audit reports for compliance teams.

7. **Handle imperfect data and identity.** Provide automated identity resolution for vendors (fuzzy matching, probabilistic scoring) and a human reconciliation UI for manual merging with approvals (two-step merge: propose + approve). Account for consequences of merges (recompute aggregates; keep revertable changes).

8. **Observability & health checks.** Expose metrics: ingestion lag, graph query latency, cache hit ratio, number of unmatched invoices, number of vendor merges pending approval. Create alert thresholds.

9. **Deliverable format.** Return everything in code and documentation: README, architecture diagrams (SVG/PlantUML), sequence diagrams for click interactions, complete schema SQL, API OpenAPI/GraphQL specs, front-end React components with storybook examples, mock data generator, test suites.

10. **Be explicit about side effects and second/third/fourth-order consequences** and include automated tests and workflow steps to mitigate them (see “Consequences & mitigation” below).

</instructions>

<Context>

Olsen Consulting — AP Wizard.
We have access to Company Vista data for AP unapproved invoices and are building an AR solution. The Foundry app should be the master dashboard for the flow of capital across Jobs, Vendors, and the Central Company (and other entities). The user must be able to click nodes and edges and get full transactional drill-downs.

Available data sources (replace placeholders with real endpoints / credentials):

* Company Vista: `{{VISTA_API}}` — endpoint(s) returning AP unapproved invoices, invoices metadata, vendor references.
* AP Wizard: `{{AP_WIZARD_API}}` — invoices, approval state, attachments.
* AR Solution: `{{AR_ENDPOINT}}` — AR invoices, customers, receipts.
* Central company ledger (ERP/GL): `{{ERP_API}}` — ledger entries, payment runs.
* Additional feeds: bank payment records, PO systems, subcontractor portals (optional).

Important business rules and constraints:

* An invoice may reference a Job and a Vendor; some invoices are unapproved (AP unapproved) or partially approved.
* Vendor names can be inconsistent across systems.
* Payments might be split across jobs or vendors (e.g., bulk payments).
* Construction business logic: cost codes, phases, retains, change orders.

User roles to support:

* Viewer (read-only)
* Accountant/Approver (can change approval state, propose vendor merges)
* Reconciler (can approve merges and corrections)
* Admin (manage mappings, connectors)
* Auditor (read-only, but with access to raw document references and audit trails)

</Context>

<Protocols>

**Data model (canonical):** use these JSON schemas as the canonical graph node & edge formats. Persist them in PostgreSQL + a graph DB (Neo4j) or in PostgreSQL with graph semantics if Neo4j unavailable.

Node (example):

```json
{
  "node_id": "node:vendor:12345",
  "type": "Vendor",
  "attributes": {
    "vendor_id": "12345",
    "name": "ACME Supplies Ltd",
    "aliases": ["ACME Supplies", "ACME Supply Co."],
    "tax_id_masked": "XX-XXX",
    "contact": [{"name":"John Doe","email":"j.doe@acme.com"}],
    "primary_bank_last4": "1234"
  },
  "source_records": [
    {"source":"VISTA","source_id":"VST-9876","raw":true},
    {"source":"AP_WIZARD","source_id":"AP-4001"}
  ],
  "created_at": "2025-01-01T12:00:00Z",
  "created_by": "svc:ingest",
  "version": 3
}
```

Edge (money flow):

```json
{
  "edge_id": "edge:txn:98765",
  "type": "PaymentFlow",
  "from_node": "node:vendor:12345",
  "to_node": "node:job:8899",
  "attributes": {
    "amount": 12500.50,
    "currency": "CAD",
    "date": "2025-10-15",
    "status": "unapproved",
    "invoice_ids": ["VST-9876","AP-4001"],
    "cost_codes": ["CC-101","CC-102"],
    "detail": "Partial payment covering material and labor",
    "approval_history": [
      {"timestamp":"2025-10-16T09:00:00Z","actor":"user:carol","action":"approved"}
    ]
  },
  "source_records": [{"source":"VISTA","source_id":"VST-9876"}],
  "created_at":"2025-10-16T09:00:00Z"
}
```

**Database schema (high level):**

* `nodes (id pk, type, data jsonb, canonical_id, created_at, created_by, version)`
* `edges (id pk, type, from_node_id, to_node_id, data jsonb, created_at, created_by)`
* `invoices (invoice_id pk, source, raw_payload jsonb, job_id fk, vendor_id fk, amount, currency, status, invoice_date, created_at)`
* `vendor_aliases (alias, vendor_id, score, source)`
* `audit_logs (id pk, action, actor, details jsonb, created_at)`
* `merges (id, proposed_by, proposed_at, items jsonb, status, approved_by, approved_at)`
* `attachments (id, source, source_id, url, checksum, created_at)`
  Design indexes:  `nodes(type)`, `nodes((data->>'vendor_id'))`, `edges(from_node_id,to_node_id)`, `invoices((vendor_id)), invoices((job_id))`, and `GIN` on jsonb where needed.

**APIs (REST + optional GraphQL):** Produce OpenAPI. Minimal set:

Public GETs:

* `GET /api/graph/nodes?type=Vendor&query=acme&page=1&size=50`
* `GET /api/graph/node/{node_id}` → returns node JSON + aggregated metrics (total_inflow/outflow)
* `GET /api/graph/edges?from={node_id}&to={node_id}&date_from=&date_to=&status=`
* `GET /api/graph/edge/{edge_id}/details` → returns invoice list, payment entries, attachments, and ledger references (this is the click behavior)
* `GET /api/graph/path?start={node}&end={node}&max_hops=4` → for path highlighting

Mutations:

* `POST /api/graph/vendor_merge` {proposal: [vendor_ids], reason: "...", proposed_by} → returns `merge_id`
* `POST /api/graph/vendor_merge/{merge_id}/approve` {actor, approval_notes}
* `POST /api/graph/edge/{edge_id}/annotate` {annotation}

Ingestion / connectors:

* `POST /api/connectors/vista/fetch` (admin)
* `POST /api/connectors/ap_wizard/fetch`
* `POST /api/connectors/ar/fetch`

**Front-end behavior (user interactions & sequence):** Provide React + TypeScript components with clear props and stories.

* **Main Graph Canvas**

  * Render nodes grouped/colored by type (Vendor: orange, Job: blue, Company: grey)
  * Show aggregate amounts as node badges (e.g., net flow, outstanding AP)
  * Support zoom/pan, search box, keyboard shortcuts
  * Hover: small tooltip with summary (name, net_inflow, outflow, top 3 vendors/jobs)
  * Click node: open right side panel with:

    * Node detail header (name, id, type)
    * Aggregates (total inflow/outflow, outstanding, approved/unapproved)
    * Tabs: Transactions / Documents / History / Connections
    * Transactions tab: paged list of edges referencing that node (date, amount, invoice ids, status). Each row expands to show invoice detail and attachments.
    * Documents tab: thumbnails + link to original attachments (download only if authorized)
    * History: audit log and merges/changes
    * Connections: small subgraph of top N neighbors (expandable)

* **Clicking an edge (connection)**

  * Show modal or inline drawer with:

    * Edge summary (amount, currency, date range, invoice_count, status breakdown)
    * Invoice list with these fields: invoice_id, source, job_id, cost_codes, vendor, amount, status, attachment links, raw payload (toggle)
    * Action buttons: Mark as Reviewed, Propose Merge (if vendor issues), Create Support Ticket, Export CSV, Reconcile with payment (link to payment run)
  * Provide a timeline slider to narrow to subsets

**Identity resolution protocol (vendor matching)**

* Run fuzzy matching using: normalized name, tax id (if present), bank last4, address, phone/email. Use probabilistic scoring (Levenshtein + domain-specific token weight).
* Thresholds:

  * > 0.95 = auto-suggest (safe to auto-link)
  * 0.75-0.95 = flag as probable; create `candidate_match` and surface in reconciliation queue
  * <0.75 = no auto-link
* Provide UI for manual reconcile: show candidate list, side-by-side raw records, allow "merge into" or "create new canonical vendor".
* **Consequences**: merging affects historical aggregates. **Always** create a reversible merge record and re-compute aggregates lazily via a background job; while recomputing, show "recalc in progress" state.

**Ingestion & Transform (ETL/CDC)**

* Prefer CDC (Debezium / connectors) from the source databases or message topics. If not available, schedule incremental API pulls.
* Steps:

  1. Pull new/updated invoices from Company Vista/AP Wizard/AR.
  2. Normalize fields, map to canonical schema (job, vendor, cost codes).
  3. Run identity resolution and assign `canonical_vendor_id`.
  4. Insert/update invoices table; create/update nodes/edges (idempotent by invoice_id).
  5. Emit events to update materialized aggregates.
* Idempotency: all ingestion endpoints must accept idempotency keys or use invoice ids to avoid duplicates.

**Real-time vs Batch**

* Real-time: Use event streaming (Kafka). Stream invoice events → transformer service → graph updater service → notify front-end via websocket.
* Batch: Nightly re-conciliation job that reruns identity resolution and recomputes aggregates to capture corrections.

**Visualization Engine**

* Preferred libs: Cytoscape.js, Sigma.js, or D3 + canvas for large graphs.
* For interactive, large datasets:

  * Server side filtering + fetch subgraph for display.
  * Precompute "neighborhoods" for hot nodes (jobs with many invoices) to avoid client overload.
  * Use progressive rendering for large result sets.
* Provide "Sankey view" for high-level flow and graph view for deep dive.

**Testing & Acceptance**

* Unit tests:

  * Ingestion unit tests for normalization.
  * Vendor matching unit tests with edge cases (same name different tax id; same tax id different name).
* Integration tests:

  * End-to-end ingest from mocked Company Vista → graph builder → front-end mock.
* Acceptance tests:

  * Click on a vendor node and edge: the UI returns the exact invoices that produced the sum.
  * Merge vendor A and B, approve merge: aggregates update and merge is reversible.
  * Ingest a corrected invoice (status changed): graph reflects new state and audit logs record previous state.
* Load tests:

  * Simulate 1M invoices to test ingest throughput and query latency.
* Security tests:

  * Verify RBAC: viewer cannot see bank last4; reconciler can propose merges but cannot approve without the approver role.

**Docs & deliverables**

* For each milestone deliver:

  * README explaining how to run locally with docker-compose.
  * `openapi.yaml` or GraphQL schema.
  * `schema.sql` for DB + sample `seed_data.sql`.
  * Front end stories (storybook).
  * Sequence diagrams for click interactions (PlantUML).
  * Monitoring dashboard (Prometheus/Grafana sample).

</Protocols>

<DesireOutput>

Produce the following artifacts in a git repository layout and in the response:

1. **Architecture + sequence diagrams**

   * High level diagram (SVG or PlantUML).
   * Sequence for "click edge → show invoices".

2. **Canonical data model**

   * Node & edge JSON schema (above).
   * SQL DDL for tables with indexes and comments.

3. **API contract**

   * OpenAPI spec for all endpoints (GET node, GET edge, POST merges, ingestion endpoints).
   * Example API calls with sample request and response payloads.

4. **Back-end skeleton**

   * Node/TypeScript or Python (FastAPI) server with:

     * Ingest endpoint with transformation pipeline (a mocked connector for Company Vista).
     * Graph query endpoints (server side pagination + aggregation).
     * Merge proposal and approve endpoints (with audit log writes).
     * Unit tests & integration tests.

5. **Front-end skeleton**

   * React + TypeScript app with:

     * Graph canvas rendering using Cytoscape or Sigma with zoom/pan.
     * Node detail sidebar and Edge detail drawer that implement the click interactions described.
     * Stories for the graph component using mock data.
     * Tests for the click flow and edge details.

6. **Identity resolution & reconciliation UI**

   * A service implementing fuzzy matching (algorithms + thresholds).
   * Manual reconciliation UI allowing propose & approve merges; show consequences.

7. **Ingestion plan**

   * CDC & fallback batch plan, idempotency, retries, DLQ (dead letter queue), mapping config.

8. **Security & compliance**

   * Auth scheme (OAuth2/SAML), RBAC table, data masking strategy, encryption notes.

9. **Operations**

   * Metrics to expose and alerts to configure.
   * Migration & reindexing strategy to handle merges and re-calculation.

10. **Acceptance Tests with mock data**

    * JSON fixture sets (5–10 vendors with multiple aliases and jobs, 30–100 invoices demonstrating unapproved, approved, split payments, and a bulk payment across jobs).
    * Automated tests demonstrating click → correct invoices, merge → aggregate recalculation, revert → original state.

11. **Risks, second/third/fourth-order consequences and mitigations**

    * Full list of at least 12 concrete risks (data mismatch, vendor duplicate merges, stale cache, unauthorized access, GDPR/Privacy exposure) and for each include automated and procedural mitigations, tests, and fallbacks. Example: vendor merge could cause payment to be associated incorrectly → mitigation: require 2-person approval for merges where either vendor has payments > $100k in last 12 months; automatically flag previously reconciled payments for manual review.

**Acceptance Criteria (explicit):**

* Clicking any edge returns the exact list of invoice ids that sum to the edge’s amount (no rounding surprises) with a source reference to the system of origin.
* All merges are recorded as change events and reversible within 30 days via the UI.
* The graph supports interactive exploration and returns subgraphs for a node with ≤ 200ms median latency on typical queries (target: 95th percentile < 500ms).
* The system reconciles new Company Vista unapproved invoices within 5 minutes of ingestion in real-time mode, or within the nightly batch window otherwise.
* RBAC enforced and verified by automated tests.

**Hand-holding engineering plan (milestones):**

* **M1 (1–2 weeks)**: Proof of concept back end + simple front end.

  * Deliver graph model, ingestion of sample Company Vista payloads, basic node/edge creation, React canvas to show nodes, click edge shows invoice list (from mock data).
* **M2 (2–3 weeks)**: Robust ingestion + matching.

  * Implement identity resolution, seed canonical vendors, integrate AP Wizard mocked endpoints, create reconciliation queue.
* **M3 (2–3 weeks)**: Merge/approval workflow + audit.

  * Implement propose/approve flows with audit logs and background recompute of aggregates.
* **M4 (2–4 weeks)**: Real-time pipeline, RBAC, production hardening.

  * Add CDC connectors, authentication, monitoring, and load testing.
* **M5 (2 weeks)**: UX polish, access controls, compliance artifacts.

  * Finalize UI, export features, Docus, handoff documentation.

**Deliver to me at each milestone:**

* Pull request with code + tests + README
* Demo script (short video or live walk-through notes)
* Performance test summary & remediation plan

</DesiredOutput>

</Prompt>

---

If you’d like, I can now:

* Convert this into a ready-to-paste repository skeleton (folders + placeholder files + minimal working code) in TypeScript/React + FastAPI; **or**
* Generate the OpenAPI spec and SQL schema first as an initial deliverable.

Pick one and I’ll produce the code scaffolding and first milestone artifacts.
