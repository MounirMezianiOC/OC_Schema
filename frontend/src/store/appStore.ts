/**
 * Global Application Store
 * 
 * Zustand-based state management for the APW Ontology Dashboard.
 * Manages: selections, filters, layout, data source, animations, and dataset.
 */

import { create } from 'zustand';
import type { Node, Edge } from '../services/api';

export type DataSource = 'real' | 'demo' | 'mixed';
export type LayoutType = 'force-directed' | 'radial' | 'hierarchical';

export interface Filters {
    dateFrom?: string;
    dateTo?: string;
    amountMin?: number;
    amountMax?: number;
    nodeTypes?: string[]; // ['Job', 'Vendor', 'CentralCompany']
    statuses?: string[]; // ['approved', 'unapproved', 'pending']
    minConnections?: number;
    searchQuery?: string;
}

export interface AnimationPreferences {
    reducedMotion: boolean;
    particlesEnabled: boolean;
    transitionDuration: number; // ms
}

interface AppState {
    // Selection state
    selectedNode: Node | null;
    selectedEdge: Edge | null;
    selectedItems: Array<Node | Edge>;
    highlightedNodeIds: string[];

    // Data state
    nodes: Node[];
    edges: Edge[];
    dataSource: DataSource;

    // UI state
    filters: Filters;
    layout: LayoutType;
    animationPreferences: AnimationPreferences;
    isSpotlightOpen: boolean;
    sidebarOpen: boolean;
    miniMapOpen: boolean;

    // Performance state
    isHighDensityMode: boolean;
    nodeCount: number;
    edgeCount: number;

    // Actions - Selection
    setSelectedNode: (node: Node | null) => void;
    setSelectedEdge: (edge: Edge | null) => void;
    toggleSelectItem: (item: Node | Edge) => void;
    clearSelection: () => void;
    setHighlightedNodeIds: (ids: string[]) => void;

    // Actions - Data
    setNodes: (nodes: Node[]) => void;
    setEdges: (edges: Edge[]) => void;
    setDataSource: (source: DataSource) => void;
    setDataset: (nodes: Node[], edges: Edge[]) => void;

    // Actions - UI
    setFilters: (filters: Partial<Filters>) => void;
    clearFilters: () => void;
    setLayout: (layout: LayoutType) => void;
    setAnimationPreferences: (prefs: Partial<AnimationPreferences>) => void;
    toggleSpotlight: () => void;
    toggleSidebar: () => void;
    toggleMiniMap: () => void;

    // Actions - Performance
    updatePerformanceMetrics: () => void;
}

const DEFAULT_ANIMATION_PREFS: AnimationPreferences = {
    reducedMotion: false,
    particlesEnabled: true,
    transitionDuration: 800,
};

const DEFAULT_FILTERS: Filters = {
    nodeTypes: ['CentralCompany', 'Job', 'Vendor'],
    statuses: ['approved', 'unapproved', 'pending'],
};

export const useAppStore = create<AppState>((set, get) => ({
    // Initial state
    selectedNode: null,
    selectedEdge: null,
    selectedItems: [],
    highlightedNodeIds: [],

    nodes: [],
    edges: [],
    dataSource: 'demo', // Default to demo mode

    filters: DEFAULT_FILTERS,
    layout: 'force-directed',
    animationPreferences: DEFAULT_ANIMATION_PREFS,
    isSpotlightOpen: false,
    sidebarOpen: true,
    miniMapOpen: true,

    isHighDensityMode: false,
    nodeCount: 0,
    edgeCount: 0,

    // Selection actions
    setSelectedNode: (node) => set({
        selectedNode: node,
        selectedEdge: null,
        selectedItems: node ? [node] : [],
        highlightedNodeIds: node ? [node.id] : [],
    }),

    setSelectedEdge: (edge) => set({
        selectedEdge: edge,
        selectedNode: null,
        selectedItems: edge ? [edge] : [],
        highlightedNodeIds: edge ? [edge.source, edge.target] : [],
    }),

    toggleSelectItem: (item) => set((state) => {
        const isNode = 'type' in item && !('source' in item);
        const itemId = item.id;
        const exists = state.selectedItems.find(i => i.id === itemId);

        if (exists) {
            return {
                selectedItems: state.selectedItems.filter(i => i.id !== itemId),
                selectedNode: state.selectedItems.length === 1 ? null : state.selectedNode,
                selectedEdge: state.selectedItems.length === 1 ? null : state.selectedEdge,
            };
        } else {
            return {
                selectedItems: [...state.selectedItems, item],
                selectedNode: isNode ? (item as Node) : state.selectedNode,
            };
        }
    }),

    clearSelection: () => set({
        selectedNode: null,
        selectedEdge: null,
        selectedItems: [],
        highlightedNodeIds: [],
    }),

    setHighlightedNodeIds: (ids) => set({ highlightedNodeIds: ids }),

    // Data actions
    setNodes: (nodes) => {
        set({ nodes, nodeCount: nodes.length });
        get().updatePerformanceMetrics();
    },

    setEdges: (edges) => {
        set({ edges, edgeCount: edges.length });
        get().updatePerformanceMetrics();
    },

    setDataSource: (source) => set({ dataSource: source }),

    setDataset: (nodes, edges) => {
        set({
            nodes,
            edges,
            nodeCount: nodes.length,
            edgeCount: edges.length,
        });
        get().updatePerformanceMetrics();
    },

    // UI actions
    setFilters: (newFilters) => set((state) => ({
        filters: { ...state.filters, ...newFilters },
    })),

    clearFilters: () => set({ filters: DEFAULT_FILTERS }),

    setLayout: (layout) => set({ layout }),

    setAnimationPreferences: (prefs) => set((state) => ({
        animationPreferences: { ...state.animationPreferences, ...prefs },
    })),

    toggleSpotlight: () => set((state) => ({
        isSpotlightOpen: !state.isSpotlightOpen,
    })),

    toggleSidebar: () => set((state) => ({
        sidebarOpen: !state.sidebarOpen,
    })),

    toggleMiniMap: () => set((state) => ({
        miniMapOpen: !state.miniMapOpen,
    })),

    // Performance actions
    updatePerformanceMetrics: () => {
        const { nodeCount, animationPreferences } = get();
        const isHighDensity = nodeCount > 2000;

        set({
            isHighDensityMode: isHighDensity,
            animationPreferences: {
                ...animationPreferences,
                // Auto-disable particles in high density mode
                particlesEnabled: isHighDensity ? false : animationPreferences.particlesEnabled,
            },
        });
    },
}));
