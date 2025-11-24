# Risks, Consequences & Mitigations

## 1. Data Integrity & Precision
**Risk**: Floating point arithmetic errors causing "penny rounding" discrepancies between the graph aggregates and the source invoices.
**Consequence (2nd Order)**: Loss of trust from accountants; audit failure.
**Consequence (3rd Order)**: Legal liability if financial reporting is based on the dashboard.
**Mitigation**: 
- **Technical**: Use `DECIMAL` (fixed-point) types in Database and Python (e.g., `Decimal('10.00')`), NEVER floats.
- **Process**: Automated reconciliation tests that sum all edge attributes and compare to node aggregates on every write.

## 2. Vendor Merging Side Effects
**Risk**: Incorrectly merging two vendors (e.g., "ACME Inc" and "ACME Ltd" are actually different entities).
**Consequence (2nd Order)**: Payments are routed to the wrong entity or tax reporting is aggregated incorrectly.
**Consequence (3rd Order)**: Tax penalties for the construction company; vendor relationship damage.
**Mitigation**:
- **Technical**: "Soft Merge" capability (grouping without destroying original records).
- **Process**: Two-step approval for merges (Proposer != Approver).
- **Fallback**: "Unmerge" button that restores the previous state using the immutable audit log.

## 3. Stale Graph State
**Risk**: The graph visualization lags behind the real-time invoice ingestion.
**Consequence (2nd Order)**: User makes a decision (e.g., releases payment) based on old data.
**Mitigation**:
- **Technical**: Optimistic UI updates or WebSocket push notifications for graph updates.
- **UX**: Explicit "Last Updated: X seconds ago" badge.

## 4. Performance at Scale
**Risk**: Rendering 10,000 nodes in the browser crashes the client.
**Consequence (2nd Order)**: Application becomes unusable for large projects.
**Mitigation**:
- **Technical**: Server-side clustering/aggregation. Only send the viewport's visible nodes + "supernodes" for clusters.
- **Library**: Use WebGL-based renderers (Cytoscape with WebGL or Sigma.js).

## 5. PII Leakage
**Risk**: Exposing sensitive vendor data (Bank Accounts, Tax IDs) to unauthorized users.
**Consequence (2nd Order)**: GDPR/CCPA violations.
**Mitigation**:
- **Technical**: Field-level masking in the API serializer based on user role.
- **Audit**: Log every access to unmasked fields.

## 6. Dependency Chain Fragility
**Risk**: Reliance on external APIs (Company Vista, AP Wizard) that may change schemas.
**Consequence (2nd Order)**: Ingestion pipeline breaks silently.
**Mitigation**:
- **Technical**: Schema validation (Pydantic) at the ingestion boundary. Reject and alert on malformed data rather than corrupting the graph.
