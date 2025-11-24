# Architecture

## High Level Overview

```mermaid
graph TD
    subgraph Client
        UI[React Frontend]
    end

    subgraph Server
        API[FastAPI Backend]
        Ingest[Ingestion Service]
        GraphEngine[Graph Query Engine]
    end

    subgraph Data
        DB[(SQLite / Postgres)]
        Nodes[Nodes Table]
        Edges[Edges Table]
        Audit[Audit Logs]
    end

    UI -- REST API --> API
    API --> GraphEngine
    API --> Ingest
    Ingest -- Writes --> DB
    GraphEngine -- Reads --> DB
```

## Data Flow

1.  **Ingestion**: Invoices arrive via API (mocked for now).
2.  **Processing**: Invoices are normalized and resolved to Vendors/Jobs.
3.  **Storage**: Nodes and Edges are updated in the DB.
4.  **Visualization**: Frontend requests graph data (Nodes/Edges).
5.  **Interaction**: User clicks Edge -> Frontend requests Invoice Details.

## Database Schema

See `backend/schema.sql` for details.
