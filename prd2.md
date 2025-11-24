<Prompt>

<instructions>

You are a **UI/UX + front-end engineering agent**. Your primary goal is to transform an existing capital-flow graph app (Jobs, Vendors, Central Company, Invoices) into a **visually impressive, highly interactive, “Foundry‑inspired” experience**.

Assume there is already:

* A backend that exposes nodes/edges/invoices (from a previous PRD),
* A working but unimpressive graph UI (few nodes, minimal animation).

You must:

1. **Focus on UX, visuals, and interaction quality.**

   * Make the graph feel alive, dense, and exploratory like a modern data platform.
   * Add animations, micro‑interactions, smooth transitions, and polished layouts.
   * Do **not** worry about auth, encryption, or production security; ignore Security & Compliance entirely.

2. **Make the graph visually rich and “busy” without overwhelming the user.**

   * Increase the number of visible nodes/edges (via real data and synthetic/demo data).
   * Use clustering, grouping, filtering, and zoom levels so large graphs stay legible.
   * Provide a “demo mode” with synthetic data that looks like a real construction company’s capital flows.

3. **Take inspiration from Palantir Foundry‑style UX (but do not clone it pixel‑perfect).**

   * Aim for: dark theme, clean typography, side panels, dockable panels, fluid motion, contextual overlays.
   * Do **not** copy proprietary layouts or icons; instead, create a similar level of polish and clarity.

4. **Design for performance and motion together.**

   * Many nodes + animations must still feel responsive (60fps target on reasonable machines).
   * Use WebGL-based graph libraries or canvas when appropriate.
   * Plan and implement graceful degradation for large data (fewer animations, simplified visuals).

5. **Think through 2nd/3rd/4th-order consequences.**

   * More nodes → potential cognitive overload → design filters, highlighting, and “spotlight” mode.
   * More animation → possible motion sickness / disorientation → add reduced-motion mode, anchor elements.
   * Dense graph → potential performance issues → add level-of-detail strategies and load boundaries.

6. **Deliver design AND code.**

   * Provide design tokens, layout systems, and component specs.
   * Provide React + TypeScript code for the UI: graph canvas, sidebars, mini‑map, time slider, filters, animation controllers, and storybook/demo pages.

Ignore security, compliance, authentication, and fine-grained RBAC for this iteration.

</instructions>

<Context>

Business context (same as previous PRD, summarized):

* Domain: construction companies, capital flow visualization.
* Company: Olsen Consulting, working on **AP Wizard**, with access to **Company Vista** AP unapproved invoices and an in-progress **AR solution**.
* Entities: Jobs, Vendors, Central Company, Invoices, Payments, Cost Codes.
* Existing backend: Exposes nodes and edges representing money flows between Jobs, Vendors, and the Central Company (and possibly other nodes).

Current state of the UI:

* It renders a graph of nodes (Jobs, Vendors, Central Company) and edges (capital flows).
* It’s **functional but unimpressive**:

  * Only a small number of nodes & vendors visible at any time.
  * Very limited or no animations between nodes.
  * Lacks the dense, rich, “platform” feel similar to Palantir Foundry.
  * Node details and edge details are basic and not visually striking.

Goal for this PRD:

* Take the existing graph app and **elevate the UI to a high-fidelity, Foundry‑inspired explorer** with:

  * Many more nodes on screen (real + synthetic).
  * Smooth animations and transitions.
  * Powerful filters, panels, and visual encodings.
  * Well-structured, reusable React components and a proper design system.
* All backend/graph data can be assumed to exist as described in the previous PRD. You focus on **front-end UX + supporting data utilities** (e.g., data generator, layout configs).

</Context>

<Protocols>

### 1. Visual & Interaction Design Principles

Design a **dark-theme, data-dense, but legible** graph UI:

* **Dark base theme**:

  * Background: deep neutral (`#0B0C10` – `#12141A` range).
  * Accent colors: small, high‑contrast palette for node types:

    * Central Company: neutral grey/white with glow.
    * Jobs: cool blue shades.
    * Vendors: warm amber/orange.
    * Other entities (invoices, payments, etc.): subtle teal/purple.

* **Typography**:

  * Clean, sans-serif (e.g., Inter/Roboto).
  * Clear hierarchy: node titles larger, metrics medium, labels smaller.
  * Avoid clutter; use subtle separators and whitespace.

* **Key visual concepts**:

  * **Emphasis on flows**:

    * Thickness and opacity of edges encode magnitude of capital flow.
    * Subtle edge glow or animated “particles” moving along the edge to show direction & volume.
  * **Hierarchy by zoom**:

    * Zoomed out: show clusters and aggregates (e.g., “Vendor Cluster: Materials Vendors”).
    * Zoomed in: show individual nodes and detailed labels.

* **Micro-interactions**:

  * Hover nodes: highlight connected edges and neighbor nodes; subtle scaling/pulse.
  * Hover edges: show edge label (amount, count of invoices).
  * Select node/edge: smooth camera pan & zoom to center it, open side panel with details.
  * Smooth transitions on filter changes (nodes fade in/out, re-layout with animation).

### 2. Graph Rendering & Layout

Use a **high-performance graph rendering solution** (WebGL or canvas-based), e.g.:

* Libraries: Sigma.js, Cytoscape.js, Graphology-based, or similar WebGL‑optimized solution.
* Requirements:

  * Support tens of thousands of nodes in demo mode without freezing.
  * Expose hooks to control node/edge styling, animation, and layout transitions.

Layouts:

* Implement at least these layout options:

  * **Force-directed** (for exploration).
  * **Radial** around Central Company node (company in center, jobs around it, vendors around jobs).
  * Optional **hierarchical** (Company → Jobs → Vendors).

* Smooth transitions:

  * When switching layouts, animate node movement rather than teleporting.
  * Maintain relative positions as much as possible to avoid disorientation.

Additional features:

* **Mini-map**: small graph overview in a corner showing viewport rectangle.
* **Zoom & pan**:

  * Mouse wheel/touchpad zoom, click‑and‑drag pan.
  * Double-click to zoom into a node and auto-open its detail view.

### 3. Node & Edge Density / Demo Data

Ensure the UI **never looks empty or underwhelming**, even if live data is small.

* **Demo / Synthetic Data Generator**:

  * Implement a deterministic generator that can create:

    * 1 Central Company node.
    * 50–200 Jobs.
    * 300–1000 Vendors.
    * 5k–50k invoices/payments that define edges between these.
  * Parameterize: `NUM_JOBS`, `NUM_VENDORS`, `NUM_INVOICES`, etc.
  * Inject realistic distributions:

    * A few large vendors with many edges; many small vendors with few edges.
    * Job clusters (by region or project type).
* **Data sources toggle**:

  * Toggle in UI: `Real Data | Demo Data | Mixed`.
  * When in Demo mode, clearly label but use realistic names and amounts.

Graph density strategies:

* Show **top N nodes** by activity (e.g., by default top 100 Jobs and their Vendors) with a slider for N.
* Clustering:

  * Automatic community detection for vendors/jobs.
  * Display clusters as super-nodes when zoomed out (e.g., “Concrete Suppliers (32)”).
  * Clicking or zooming into a cluster unrolls it into individual nodes.

### 4. Panels, Details, and Layout

Design a **multi-panel layout**:

* **Top bar**:

  * Global search (node by name/id).
  * Global filters (date range, min/max amount, node type toggles).
  * Layout selector (force, radial, hierarchical).
  * Data source toggle (Real/Demo/Mixed).

* **Left panel (optional)**:

  * Filter presets and saved views:

    * E.g., “High-Risk Vendors”, “Jobs with Overdue Payables”, “Top 10 Cash Sinks”.
  * A collapsible list of nodes (e.g., ranked by net outflow).

* **Main graph canvas**:

  * Full-screen graph with mini-map.
  * Hover states, selection, lasso select (optional).
  * Context menu on right-click (e.g., “Show only this vendor and neighbors”, “Pin node”).

* **Right-side detail panel**:

  * Opens when a node or edge is selected.
  * For **nodes**:

    * Header: name, type, key metrics (total inflow/outflow, open AP/AR).
    * Charts: small sparkline/time series, donut chart of flows by counterparty type.
    * Tabs:

      * “Transactions”: paginated list of related edges (with highlight on hover).
      * “Connections”: table of top neighbors.
      * “Timeline”: slider to filter node’s connections by time.
  * For **edges**:

    * Header: total amount, direction, number of invoices.
    * List: invoices with amount, date, job, vendor, status.
    * Tiny Sankey-like mini chart summarizing how that edge breaks down by job or cost code.

### 5. Animation & Motion Design

Implement **purposeful, controlled animations**:

* Node/edge animations:

  * When a new node appears, fade-in + slight scale‑in.
  * When filters hide nodes, fade them out rather than snapping.
  * When clicking a node:

    * Brief glow or pulse around the node.
    * Smooth camera pan/zoom to focus on it.

* Edge flow animation:

  * Optionally, animate particles traveling along edges from source → target at speed proportional to volume or recency.
  * Allow the user to toggle “edge flow animation” for performance reasons.

* Layout transitions:

  * On layout change, animate positions over ~300–800ms.
  * Use easing functions (e.g., easeInOutQuad) to keep motion smooth.

* Reduced motion mode:

  * A global setting to reduce or disable most animations.
  * When enabled, keep only essential transitions, reduce particle effects, and minimize motion.

### 6. Filters, Spotlight, and Navigation

To prevent **cognitive overload**:

* **Filter bar**:

  * Date range picker.
  * Slider for minimum/maximum edge amount.
  * Toggles for node types (Jobs, Vendors, Central Company, etc.).
  * Checkbox: “Show only nodes with at least N connections”.

* **Spotlight search**:

  * Quick keyboard shortcut (e.g., `Cmd+K`/`Ctrl+K`).
  * Type a node name/id → instantly focus and highlight that node, dim everything else.

* **Path highlighting**:

  * Select a Start node and End node.
  * Compute and highlight paths between them (up to N hops).
  * Dim non-path elements to keep user focused.

* **Time slider / playback**:

  * Global time slider controlling which transactions are visible.
  * Optional “play” button to animate capital flow over time (e.g., month by month).

### 7. Componentization & Code Architecture

Implement the UI in **React + TypeScript**:

* Core components:

  * `<GraphCanvas />`: wraps the graph library, handles layout and interactions.
  * `<NodeDetailPanel />`:

    * Props: `node`, metrics, and related data.
  * `<EdgeDetailPanel />`:

    * Props: `edge`, related invoices.
  * `<FilterBar />`, `<TopBar />`, `<MiniMap />`, `<LayoutSwitcher />`, `<DataSourceToggle />`.
  * `<DemoDataControls />`: controls for generating/regenerating synthetic datasets.

* State management:

  * Use a predictable state manager (Zustand, Redux, or React Query + internal store).
  * Maintain:

    * Selected node/edge.
    * Active filters and layout.
    * Current dataset (Real/Demo/Mixed).
    * Animation preferences (reduced motion on/off).

* Storybook:

  * Each major component should have Storybook stories:

    * Default state.
    * Node with many connections.
    * Edge with many invoices.
    * High-density graph state.

### 8. Performance Strategies (2nd/3rd/4th-order consequences)

Anticipate performance & UX consequences of dense graphs and animations and design mitigations:

* **Level-of-detail rendering**:

  * Zoomed out:

    * Hide labels.
    * Render as small points/cluster icons.
  * Zoomed in:

    * Show labels and richer styling.

* **Sampling & thresholds**:

  * If the graph exceeds a certain node/edge count in view (e.g., >2000 nodes):

    * Automatically switch into “overview mode”:

      * Reduce details and animations.
      * Show a banner: “High density view – details limited; zoom in to see more.”

* **Debounced filtering**:

  * For sliders and search inputs, debounce requests and updates to avoid jitter.

* **Render budget**:

  * Keep animations simple in high-density scenarios (e.g., remove particles, shorten transitions).

* **Orientation & motion side effects**:

  * Large layout jumps can disorient users:

    * Use anchored nodes (e.g., Central Company stays near center).
    * Provide “Reset Camera” button to recenter quickly.
    * Provide breadcrumbs / history of views.

### 9. 2nd/3rd/4th-Order Consequences & Mitigations (UI-focused)

List and explicitly design for at least these consequences:

1. **Too many nodes → user overwhelmed**
   Mitigation: filters, clustering, spotlight mode, saved views.

2. **Too much animation → user frustration or motion sickness**
   Mitigation: reduced-motion mode, shorter transitions, no constant bouncing.

3. **Dense graph → user loses orientation**
   Mitigation: mini-map, reset camera, smooth transitions, anchored central node.

4. **Synthetic demo data misleads stakeholders**
   Mitigation: clear “Demo Data” badge and tooltip describing synthetic nature; ability to switch to real data.

5. **Performance degradation with large data sets**
   Mitigation: LOD strategies, overview mode, animation throttling, progressive load.

6. **Overstyled UI hides important numeric detail**
   Mitigation: easily accessible raw numeric views (tables in side panel, quick export).

7. **Complex controls → steep learning curve**
   Mitigation: onboarding hints, tooltips, a “Guided Tour” overlay for first-time users.

8. **Misinterpretation of edges/flows**
   Mitigation: consistent legends and on-hover explanations for colors, thickness, direction.

9. **Layout changes cause confusion about node identity**
   Mitigation: maintain consistent colors and icons per node type, animate transitions, show node name on selection.

10. **Demo graph looks broken when real data is sparse**
    Mitigation: always default to Demo mode when real data < threshold, with explicit user control.

11. **Front-end codebase becomes tangled**
    Mitigation: modular components, clear props interfaces, typed graph models, Storybook coverage.

12. **Future integration with security might require UI changes**
    Mitigation: keep UI flexible; separate visual components from any assumptions about user identity/permissions.

</Protocols>

<DesireOutput>

Produce artifacts that fully define and implement the improved UI/UX:

1. **Design System & Layout Spec**

   * A documented design system (tokens: colors, typography, spacing, elevation).
   * Component ontology: list of all UI components and their responsibilities.
   * Layout diagrams showing:

     * Main graph view + top bar + side panels.
     * Different states: no selection, node selected, edge selected.

2. **Graph UI Implementation (React + TypeScript)**

   * A working `<GraphCanvas />` integrated with a WebGL/canvas graph library.
   * Layout switching with smooth transitions.
   * Node/edge styling according to node type and flow magnitude.
   * Mini-map, zoom/pan, reset camera.

3. **Node & Edge Detail Panels**

   * React components for node and edge details:

     * Node metrics (in/out, outstanding).
     * Edge invoice list with hovering that highlights corresponding edges in the graph.

4. **Filters, Spotlight, and Time Slider**

   * Top bar with search, filters, layout selector, data source toggle.
   * Spotlight search (`Cmd+K`/`Ctrl+K`).
   * Time slider controlling visible edges with optional playback animation.

5. **Demo Data Generator**

   * A deterministic synthetic data generator:

     * Returns realistic-looking networks with controllable size.
   * UI controls to regenerate demo graph with different parameters.

6. **Animation & Performance Controls**

   * Centralized animation configuration (durations, easing).
   * Reduced-motion toggle that can be tested.
   * Behavior for high-density mode when node/edge thresholds are exceeded.

7. **Storybook / Component Documentation**

   * Storybook stories for:

     * Graph with small and large datasets.
     * NodeDetailPanel and EdgeDetailPanel with sample data.
     * FilterBar, TopBar, TimeSlider, DemoDataControls.

8. **Tests**

   * Unit tests for utility functions (e.g., graph data transformation, demo data generation).
   * Integration tests:

     * Selecting a node focuses the graph & opens the detail panel.
     * Switching layouts animates positions instead of snapping.
     * Filters actually reduce visible nodes/edges and animate their entry/exit.
   * Performance smoke tests (e.g., ensure render with N nodes doesn’t crash).

9. **Usage & Onboarding**

   * README describing:

     * How to run the UI (dev mode).
     * How to toggle Demo/Real data.
     * Key keyboard shortcuts and interaction patterns.
   * Optional “Guided tour” overlay describing key features.

10. **“Impressiveness” Acceptance Criteria**

    * With demo data (e.g., 100 jobs, 500+ vendors, 10k+ edges):

      * Graph remains interactive with smooth zoom/pan.
      * Layout transitions and edge flow animations run without stutter on a typical dev machine.
      * The UI clearly looks like a modern, high-end data platform (dense, animated, but legible).
    * Clicking any node/edge feels immediate and reveals rich context in the side panel.

</DesiredOutput>

</Prompt>

