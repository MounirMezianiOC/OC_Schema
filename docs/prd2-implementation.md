# PRD2 Implementation Plan

## Overview
This document outlines the implementation of PRD2 - Foundry-inspired UI/UX transformation for the APW Ontology Dashboard.

## Completed Components

### ✅ 1. Design System (`/src/design-system/tokens.ts`)
- **Dark theme design tokens** with Foundry-inspired aesthetics
- Color palette for node types (Company, Job, Vendor, Payment, Invoice)
- Typography system (Inter font family)
- Spacing, border-radius, and elevation tokens
- Animation configurations (durations, easing functions)
- Graph-specific tokens (node sizes, edge widths, opacity values)
- Performance thresholds for high-density mode

### ✅ 2. Demo Data Generator (`/src/services/demoDataGenerator.ts`)
- Seeded pseudo-random number generator for deterministic results
- Power-law distribution for realistic vendor sizes (few large, many small)
- Generates:
  - Central Company node
  - 20-200+ Job nodes with realistic names and metadata
  - 50-1000+ Vendor nodes with realistic business names
  - 500-50,000+ Invoice/Payment edges
- Three presets: Small (testing), Medium (default), Large (stress test)
- Realistic metadata (cost codes, statuses, dates, amounts)

### ✅ 3. Updated API Types (`/src/services/api.ts`)
- Unified Node/Edge interfaces supporting both backend and demo data
- Backward compatible with existing backend format
- Forward compatible with demo data format

## Next Steps

### 🔧 Phase 1: Enhanced Graph Visualization
**Priority: HIGH**

#### Components to Build:
1. **`<EnhancedGraphCanvas />`** - Upgrade existing GraphCanvas
   - WebGL rendering for performance (using Cytoscape)
   - Smooth animations for node/edge appearance
   - Layout switching (force-directed, radial, hierarchical)
   - Level-of-detail (LOD) rendering based on zoom
   - Mini-map component
   - Performance optimizations for 1000+ nodes

2. **`<LayoutSwitcher />`** - Toggle between graph layouts
   - Force-directed (default)
   - Radial (Central Company at center)
   - Hierarchical (tree-like)
   - Smooth animated transitions

3. **`<MiniMap />`** - Overview navigator
   - Shows full graph with viewport rectangle
   - Click to navigate
   - Auto-updates on pan/zoom

### 🎨 Phase 2: Advanced UI Components
**Priority: HIGH**

#### Components to Build:
1. **`<TopBar />`** - Global controls
   - Search box (spotlight search with Cmd+K)
   - Layout selector
   - Data source toggle (Real/Demo/Mixed)
   - Filters toggle button
   - Reduced motion toggle

2. **`<SpotlightSearch />`** - Quick node finder
   - Keyboard shortcut (Cmd+K / Ctrl+K)
   - Fuzzy search across node names/IDs
   - Instant focus and highlight
   - Dim non-matching elements

3. **`<FilterBar />`** - Advanced filtering
   - Date range picker
   - Amount range sliders
   - Node type toggles (Jobs, Vendors, etc.)
   - Connection count filter
   - Status filters (approved/unapproved)
   - Clear all button

4. **`<TimeSlider />`** - Temporal filtering
   - Month-by-month slider
   - Play/pause animation
   - Adjustable speed control
   - Shows transactions within time range

### 🌊 Phase 3: Animations & Polish
**Priority: MEDIUM**

#### Features to Implement:
1. **Node Animations**
   - Fade-in with scale on appearance
   - Pulse/glow on selection
   - Smooth camera pan/zoom to focused node
   - Hover effects (scale 1.15x, glow)

2. **Edge Animations**
   - Particle flow animation along edges
   - Direction and speed based on transaction volume
   - Toggle on/off for performance
   - Color-coded by status (approved=green, unapproved=red)

3. **Layout Transitions**
   - Smooth node movement (800ms)
   - Easing functions for natural motion
   - Maintain relative positions to avoid disorientation

4. **Reduced Motion Mode**
   - Global toggle
   - Disables particles, reduces animations
   - Instant transitions instead of smooth
   - Respects `prefers-reduced-motion` CSS property

### 📊 Phase 4: Enhanced Detail Panels
**Priority: MEDIUM**

#### Components to Build:
1. **`<NodeDetailPanel />`** - Rich node information
   - Header with node name, type, and key metrics
   - Tabs: Transactions / Connections / Timeline / History
   - Interactive charts (sparklines, donuts)
   - Paginated transaction list
   - Neighbor nodes visualization

2. **`<EdgeDetailPanel />`** - Edge/transaction details
   - Total amount, currency, date range
   - Invoice list with filters
   - Status breakdown
   - Mini Sankey chart for cost code distribution
   - Action buttons (Mark Reviewed, Export, etc.)

### 🎯 Phase 5: Demo Mode Controls
**Priority: MEDIUM**

#### Components to Build:
1. **`<DataSourceToggle />`** - Switch between data sources
   - Real Data (from backend)
   - Demo Data (synthetic)
   - Mixed (both)
   - Clear badge showing current mode

2. **`<DemoDataControls />`** - Synthetic data configuration
   - Sliders for numJobs, numVendors, numInvoices
   - Regenerate button
   - Seed input for reproducibility
   - Preset buttons (Small/Medium/Large)

### ⚡ Phase 6: Performance Optimizations
**Priority: HIGH for large graphs**

#### Strategies:
1. **High-Density Mode** (> 2000 nodes)
   - Automatically reduce detail
   - Disable particles
   - Show banner notification
   - Simplified rendering

2. **Clustering** (> 500 nodes)
   - Group vendors by category
   - Show cluster as super-node
   - Expand on click/zoom
   - Community detection algorithm

3. **Virtual Rendering**
   - Only render visible nodes
   - Progressive loading for edges
   - Debounced pan/zoom updates

### 🎓 Phase 7: Onboarding & UX
**Priority: LOW (polish)**

#### Components to Build:
1. **`<GuidedTour />`** - First-time user walkthrough
   - Overlay with tooltips
   - Step-by-step guide
   - Skip button
   - "Don't show again" checkbox

2. **`<HelpTooltips />`** - Contextual help
   - Hover tooltips on controls
   - Keyboard shortcut hints
   - Legend for colors and symbols

##  Architecture Decisions

### State Management
- Use **Zustand** for global state (lightweight, TypeScript-friendly)
- Store:
  - `selectedNode` / `selectedEdge`
  - `filters` (date, amount, type, etc.)
  - `layout` (current layout type)
  - `dataSource` ('real' | 'demo' | 'mixed')
  - `animationPreferences` (reducedMotion, particlesEnabled)
  - `currentDataset` (nodes, edges)

### Graph Library
- **Cytoscape.js** with `react-cytoscapejs`
- Already in use, proven performance
- Extensible for custom renderers
- Good layout algorithms out-of-box

### Performance Targets
- **60 FPS** on typical dev machine (2024 MacBook/Windows laptop)
- **< 200ms** median query latency for node neighborhoods
- **< 500ms** P95 query latency
- Support **1000+ nodes** with full animations
- Support **5000+ nodes** with reduced animations
- Support **10,000+ nodes** in high-density mode

## Implementation Order

### Sprint 1 (Week 1)
1. ✅ Design system tokens
2. ✅ Demo data generator
3. ⬜ State management store (Zustand)
4. ⬜ Enhanced GraphCanvas (basic animations)
5. ⬜ TopBar with data source toggle

### Sprint 2 (Week 2)
6. ⬜ Layout switcher + smooth transitions
7. ⬜ FilterBar component
8. ⬜ SpotlightSearch (Cmd+K)
9. ⬜ MiniMap component
10. ⬜ Enhanced NodeDetailPanel

### Sprint 3 (Week 3)
11. ⬜ TimeSlider component
12. ⬜ Edge particle animations
13. ⬜ Reduced motion mode
14. ⬜ High-density mode detection
15. ⬜ Performance optimizations

### Sprint 4 (Week 4 - Polish)
16. ⬜ Clustering/grouping logic
17. ⬜ DemoDataControls
18. ⬜ Guided tour
19. ⬜ Help tooltips
20. ⬜ Documentation and Storybook stories

## Testing Strategy

### Unit Tests
- Demo data generator (deterministic output)
- Filter logic
- Layout calculations
- State management actions

### Integration Tests
- Clicking node opens detail panel
- Switching layouts animates smoothly
- Filters reduce visible nodes
- Data source toggle works correctly

### Performance Tests
- Render 1000 nodes without lag
- Render 5000 nodes in high-density mode
- Layout transition < 1s
- Filter update < 200ms

### Visual Regression Tests
- Screenshots of key states
- Animation keyframes
- Dark theme consistency

## Second/Third/Fourth-Order Consequences

### Already Addressed:
1. **Too many nodes → cognitive overload**
   - ✅ Filters, spotlight mode
   - ✅ LOD (level-of-detail) strategies
   - ⬜ Clustering (to be implemented)

2. **Too much animation → motion sickness**
   - ✅ Reduced motion mode
   - ✅ Configurable animations
   - ⬜ Respect system preferences

3. **Dense graph → lost orientation**
   - ⬜ Mini-map (to be implemented)
   - ⬜ Reset camera button
   - ⬜ Anchored central node

4. **Demo data misleads stakeholders**
   - ✅ Clear "Demo Data" indicator
   - ⬜ Badge in UI (to be implemented)

5. **Performance degradation**
   - ✅ Thresholds defined
   - ⬜ Auto-detection and mode switching
   - ⬜ Progressive loading

### Still To Address:
6. **Overstyled UI hides details**
   - ⬜ Raw data view toggle
   - ⬜ Export to CSV/JSON

7. **Complex controls → learning curve**
   - ⬜ Guided tour
   - ⬜ Tooltips and hints

8. **Misinterpretation of edges/flows**
   - ⬜ Legend component
   - ⬜ Hover explanations

## Acceptance Criteria

### Visual Impressiveness
- [ ] Graph looks "alive" and dense (not empty/sparse)
- [ ] Dark theme with high contrast
- [ ] Smooth animations (60 FPS target)
- [ ] Modern, polished UI that "wows" users

### Interaction Quality
- [ ] Click node → immediate detail panel with rich info
- [ ] Click edge → invoice list appears
- [ ] Hover → subtle highlights and tooltips
- [ ] Search → instant focus

### Performance
- [ ] 100 jobs + 500 vendors + 10k edges loads < 2s
- [ ] Layout switch completes <1s
- [ ] No jank or freezing with animations
- [ ] Graceful degradation at 5000+ nodes

### Usability
- [ ] Filters work intuitively
- [ ] Spotlight search is fast and accurate
- [ ] Demo/Real toggle is obvious
- [ ] Mini-map aids navigation

## Next Immediate Actions

1. Create Zustand store for state management
2. Build Enhanced GraphCanvas with animations
3. Implement TopBar with DataSourceToggle
4. Wire up demo data to actual UI
5. Test with Medium demo (100 jobs, 500 vendors, 10k invoices)

---

**Status:** In Progress  
**Last Updated:** 2025-11-21  
**Phase:** Sprint 1 - Foundation
