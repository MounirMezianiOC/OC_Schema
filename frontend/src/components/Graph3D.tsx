/**
 * Graph3D Component
 * 
 * 3D WebGL-based graph visualization using react-force-graph-3d.
 * Features:
 * - Custom node shapes (Sphere, Box, Cone, etc.) based on type
 * - Text labels using Sprites
 * - Relationship-based edge coloring
 * - Interactive controls for layout and filtering
 * - Screenshot export
 * - Camera Fly-to-Selection
 * - Time Slider (Capital Flow Analysis)
 */

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';
import type { Node, Edge } from '../services/api';
import { useAppStore } from '../store/appStore';

interface Graph3DProps {
    nodes: Node[];
    edges: Edge[];
    onNodeClick: (node: any, isShiftPressed: boolean) => void;
    onEdgeClick: (edge: any) => void;
    selectedIds: string[];
}

const Graph3D: React.FC<Graph3DProps> = ({ nodes, edges, onNodeClick, onEdgeClick, selectedIds }) => {
    const fgRef = useRef<any>(null);
    const { filters } = useAppStore();  // Access global filters

    // Controls State
    const [layoutMode, setLayoutMode] = useState<'td' | 'bu' | 'radialout' | null>(null);
    const [showLabels, setShowLabels] = useState(true);
    const [timeRange, setTimeRange] = useState(12); // Months to show (0-12)

    // Filters State
    const [visibleTypes, setVisibleTypes] = useState({
        CentralCompany: true,
        Job: true,
        Vendor: true,
        Payment: true,
        Invoice: true
    });

    // Filter data based on visibility, time range, and global filters
    const graphData = useMemo(() => {
        // 1. Calculate Date Cutoff (from local time range slider)
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - timeRange);
        const cutoffTime = cutoffDate.getTime();

        // 2. Parse global date filters if they exist
        const globalDateFrom = filters.dateFrom ? new Date(filters.dateFrom).getTime() : null;
        const globalDateTo = filters.dateTo ? new Date(filters.dateTo).getTime() : null;

        // 3. Filter Nodes (Type Visibility)
        const activeNodes = nodes.filter(n => visibleTypes[n.type as keyof typeof visibleTypes] !== false);
        const activeNodeIds = new Set(activeNodes.map(n => n.id));

        // 4. Filter Edges
        const activeEdges = edges.filter(e => {
            // Type visible?
            if (visibleTypes[e.type as keyof typeof visibleTypes] === false) return false;

            // Source/Target visible?
            const sourceId = typeof e.source === 'object' ? (e.source as any).id : e.source;
            const targetId = typeof e.target === 'object' ? (e.target as any).id : e.target;
            if (!activeNodeIds.has(sourceId) || !activeNodeIds.has(targetId)) return false;

            // Time Filter - check edge date against both local time range AND global date filters
            const edgeDateStr = e.attributes?.date || e.metadata?.date;
            if (edgeDateStr) {
                const edgeTime = new Date(edgeDateStr).getTime();

                // Local time range filter (last N months)
                if (edgeTime < cutoffTime) return false;

                // Global date range filter (from dashboard clicks)
                if (globalDateFrom !== null && edgeTime < globalDateFrom) return false;
                if (globalDateTo !== null && edgeTime > globalDateTo) return false;
            }

            return true;
        });

        return {
            nodes: activeNodes.map(n => ({
                ...n,
                id: n.id,
                name: n.label || n.id,
                type: n.type,
                val: n.type === 'CentralCompany' ? 30 : (n.type === 'Job' ? 15 : 10),
                color: getNodeColor(n.type, selectedIds.includes(n.id))
            })),
            links: activeEdges.map(e => ({
                ...e,
                source: e.source,
                target: e.target,
                label: e.label,
                type: e.type,
                color: getEdgeColor(e.type, selectedIds.includes(e.id)),
                opacity: selectedIds.includes(e.id) ? 1.0 : 0.3,
                width: selectedIds.includes(e.id) ? 3 : 1
            })),
        };
    }, [nodes, edges, selectedIds, visibleTypes, timeRange, filters.dateFrom, filters.dateTo]);

    // --- Helper Functions ---

    function getNodeColor(type: string, isSelected: boolean): string {
        if (isSelected) return '#3498DB';
        switch (type) {
            case 'CentralCompany': return '#FFFFFF';
            case 'Job': return '#4A90E2';
            case 'Vendor': return '#F5A623';
            case 'Payment': return '#50E3C2';
            case 'Invoice': return '#B57EDC';
            default: return '#95A5A6';
        }
    }

    function getEdgeColor(type: string, isSelected: boolean): string {
        if (isSelected) return '#3498DB';
        switch (type) {
            case 'Payment': return '#2ECC71';
            case 'Invoice': return '#E74C3C';
            default: return '#5D6D7E';
        }
    }

    const handleScreenshot = () => {
        if (fgRef.current) {
            const renderer = fgRef.current.renderer();
            const scene = fgRef.current.scene();
            const camera = fgRef.current.camera();
            renderer.render(scene, camera);

            const canvas = renderer.domElement;
            const link = document.createElement('a');
            link.download = `ontology-graph-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }
    };

    const toggleType = (type: keyof typeof visibleTypes) => {
        setVisibleTypes(prev => ({ ...prev, [type]: !prev[type] }));
    };

    // --- Custom Node Rendering ---

    const nodeThreeObject = useCallback((node: any) => {
        let geometry;
        const color = node.color;
        const isSelected = selectedIds.includes(node.id);

        switch (node.type) {
            case 'CentralCompany': geometry = new THREE.OctahedronGeometry(12); break;
            case 'Vendor': geometry = new THREE.BoxGeometry(10, 10, 10); break;
            case 'Job': geometry = new THREE.SphereGeometry(7, 16, 16); break;
            case 'Payment': geometry = new THREE.ConeGeometry(4, 8, 8); break;
            case 'Invoice': geometry = new THREE.CylinderGeometry(3, 3, 8, 8); break;
            default: geometry = new THREE.SphereGeometry(4);
        }

        const material = new THREE.MeshLambertMaterial({
            color: color,
            transparent: true,
            opacity: 0.9,
            emissive: isSelected ? color : 0x000000,
            emissiveIntensity: isSelected ? 0.5 : 0,
        });

        const mesh = new THREE.Mesh(geometry, material);

        if (showLabels) {
            const sprite = new SpriteText(node.name);
            sprite.color = isSelected ? '#3498DB' : '#E8EAED';
            sprite.textHeight = isSelected ? 6 : 4;
            sprite.position.y = 12;
            sprite.backgroundColor = 'rgba(0,0,0,0.5)';
            sprite.padding = 2;
            sprite.borderRadius = 4;
            mesh.add(sprite);
        }

        return mesh;
    }, [selectedIds, showLabels]);

    // --- Interaction Handlers ---

    const handleNodeClick = useCallback((node: any, event: MouseEvent) => {
        const isShift = event.shiftKey;
        onNodeClick(node, isShift);
    }, [onNodeClick]);

    // --- Camera & Force Setup ---

    // Fly to selected node
    useEffect(() => {
        if (fgRef.current && selectedIds.length > 0) {
            // Find the node object in the internal graph data
            // Note: graphData.nodes are new objects every render, but we can find by ID
            const node = graphData.nodes.find(n => n.id === selectedIds[0]);
            if (node && (node as any).x !== undefined) {
                const n = node as any;
                const distance = 200;
                const distRatio = 1 + distance / Math.hypot(n.x, n.y, n.z);

                fgRef.current.cameraPosition(
                    { x: n.x * distRatio, y: n.y * distRatio, z: n.z * distRatio },
                    n, // Look at
                    2000  // ms
                );
            }
        }
    }, [selectedIds, graphData]); // Depend on graphData to ensure node coordinates are ready

    useEffect(() => {
        if (fgRef.current) {
            fgRef.current.cameraPosition({ z: 800, y: 200 });
            fgRef.current.d3Force('link')?.distance(100);
            fgRef.current.d3Force('charge')?.strength(-300);
            fgRef.current.d3Force('center')?.strength(0.05);
        }
    }, []);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0B0C10' }}>

            {/* Controls Overlay */}
            <div style={{
                position: 'absolute',
                top: 20,
                left: 20,
                zIndex: 10,
                background: 'rgba(31, 35, 45, 0.95)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #4A515C',
                backdropFilter: 'blur(8px)',
                color: '#E8EAED',
                fontSize: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                minWidth: '220px'
            }}>
                <div style={{ fontWeight: 'bold', color: '#3498DB', fontSize: '14px', letterSpacing: '0.5px' }}>GRAPH CONTROLS</div>

                {/* Layouts */}
                <div>
                    <div style={{ marginBottom: '6px', fontWeight: '600', color: '#95A5A6' }}>LAYOUT</div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {['Force', 'Tree', 'Radial'].map((mode, i) => (
                            <button
                                key={mode}
                                onClick={() => setLayoutMode(i === 0 ? null : (i === 1 ? 'td' : 'radialout'))}
                                style={{
                                    flex: 1,
                                    background: (i === 0 && layoutMode === null) || (i === 1 && layoutMode === 'td') || (i === 2 && layoutMode === 'radialout') ? '#3498DB' : '#2C3E50',
                                    border: 'none', color: 'white', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', transition: 'background 0.2s'
                                }}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Time Slider */}
                <div>
                    <div style={{ marginBottom: '6px', fontWeight: '600', color: '#95A5A6', display: 'flex', justifyContent: 'space-between' }}>
                        <span>TIME RANGE</span>
                        <span style={{ color: '#3498DB' }}>{timeRange} Months</span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="12"
                        value={timeRange}
                        onChange={(e) => setTimeRange(parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: '#3498DB' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#5D6D7E' }}>
                        <span>1 Month</span>
                        <span>1 Year</span>
                    </div>
                </div>

                {/* Filters */}
                <div>
                    <div style={{ marginBottom: '6px', fontWeight: '600', color: '#95A5A6' }}>FILTERS</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {[
                            { id: 'Vendor', label: 'Vendors', color: '#F5A623' },
                            { id: 'Job', label: 'Jobs', color: '#4A90E2' },
                            { id: 'CentralCompany', label: 'Company', color: '#FFFFFF' },
                            { id: 'Invoice', label: 'Invoices', color: '#B57EDC' },
                            { id: 'Payment', label: 'Payments', color: '#50E3C2' }
                        ].map(item => (
                            <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={visibleTypes[item.id as keyof typeof visibleTypes]}
                                    onChange={() => toggleType(item.id as keyof typeof visibleTypes)}
                                    style={{ accentColor: '#3498DB' }}
                                />
                                <span style={{ width: 8, height: 8, background: item.color, borderRadius: '2px' }}></span>
                                {item.label}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Options */}
                <div>
                    <div style={{ marginBottom: '6px', fontWeight: '600', color: '#95A5A6' }}>OPTIONS</div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
                        <input
                            type="checkbox"
                            checked={showLabels}
                            onChange={(e) => setShowLabels(e.target.checked)}
                            style={{ accentColor: '#3498DB' }}
                        />
                        Show Labels
                    </label>

                    <button
                        onClick={handleScreenshot}
                        style={{
                            width: '100%',
                            background: '#2C3E50',
                            border: '1px solid #4A515C',
                            color: '#E8EAED',
                            padding: '8px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#34495E'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#2C3E50'}
                    >
                        <span>📷</span> Save Screenshot
                    </button>
                </div>
            </div>

            <ForceGraph3D
                ref={fgRef}
                graphData={graphData}

                // Layout
                dagMode={layoutMode || undefined}
                dagLevelDistance={100}

                // Rendering
                nodeThreeObject={nodeThreeObject}
                onNodeClick={handleNodeClick}
                onLinkClick={onEdgeClick}
                onNodeRightClick={(node) => {
                    if (fgRef.current) {
                        const n = node as any;
                        const distance = 200;
                        const distRatio = 1 + distance / Math.hypot(n.x, n.y, n.z);
                        fgRef.current.cameraPosition(
                            { x: n.x * distRatio, y: n.y * distRatio, z: n.z * distRatio },
                            node,
                            2000
                        );
                    }
                }}

                // Config
                backgroundColor="#0B0C10"
                showNavInfo={false}
            />
        </div>
    );
};

export default Graph3D;
