import { useState, useEffect } from 'react'
import Graph3D from './components/Graph3D'
import { fetchNodes, fetchEdges, manualMerge } from './services/api'
import type { Node } from './services/api'
import ReconciliationPanel from './components/ReconciliationPanel'
import './App.css'

import ErrorBoundary from './components/ErrorBoundary'
import TopBar from './components/TopBar'
import SpotlightSearch from './components/SpotlightSearch'
import NodeDetailsPanel from './components/NodeDetailsPanel'
import DashboardOverlay from './components/DashboardOverlay'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import ExportPanel from './components/ExportPanel'

import { useAppStore } from './store/appStore'
import { generateMediumDemo, generateSmallDemo } from './services/demoDataGenerator'

function App() {
  const {
    nodes,
    edges,
    dataSource,
    setDataset,
    selectedItems,
    setSelectedNode,
    setSelectedEdge,
    toggleSelectItem,
    clearSelection,
    filters,
  } = useAppStore()

  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'reconciliation' | 'analytics' | 'export' | 'details'>('details')

  // Load data based on data source
  const loadData = async () => {
    try {
      if (dataSource === 'real') {
        // Load real data from backend
        const n = await fetchNodes()
        const e = await fetchEdges(filters)
        setDataset(n, e)
        setError(null)
      } else if (dataSource === 'demo') {
        // Load demo data
        const { nodes: demoNodes, edges: demoEdges } = generateMediumDemo()
        setDataset(demoNodes, demoEdges)
        setError(null)
      } else if (dataSource === 'mixed') {
        // Load both
        try {
          const realNodes = await fetchNodes()
          const realEdges = await fetchEdges(filters)
          const { nodes: demoNodes, edges: demoEdges } = generateSmallDemo()
          setDataset([...realNodes, ...demoNodes], [...realEdges, ...demoEdges])
          setError(null)
        } catch {
          // Fallback to demo if backend fails
          const { nodes: demoNodes, edges: demoEdges } = generateMediumDemo()
          setDataset(demoNodes, demoEdges)
          setError('Backend unavailable, showing demo data only')
        }
      }
    } catch (err: any) {
      console.error("Failed to load data", err)
      // Fallback to demo data on error
      if (dataSource === 'real') {
        const { nodes: demoNodes, edges: demoEdges } = generateSmallDemo()
        setDataset(demoNodes, demoEdges)
        setError(`Backend error: ${err.message}. Showing demo data instead.`)
      } else {
        setError(err.message)
      }
    }
  }

  // Load data on mount and when data source changes
  useEffect(() => {
    loadData()
  }, [dataSource])

  // Refresh real data periodically (only if in real/mixed mode)
  useEffect(() => {
    if (dataSource !== 'demo') {
      const interval = setInterval(loadData, 30000) // Every 30s
      return () => clearInterval(interval)
    }
  }, [dataSource])

  const handleNodeClick = (node: any, isShiftPressed: boolean) => {
    if (isShiftPressed) {
      toggleSelectItem(node)
    } else {
      setSelectedNode(node)
    }
  }

  const handleEdgeClick = (edge: any) => {
    setSelectedEdge(edge)
  }

  const handleMerge = async () => {
    if (selectedItems.length !== 2) return
    const [v1, v2] = selectedItems

    const survivor = v1
    const victim = v2

    if (!confirm(`Merge '${victim.label}' INTO '${survivor.label}'?\n\nThis cannot be undone.`)) return

    try {
      await manualMerge(survivor.id, victim.id, "Manual UI Merge")
      alert("Merge successful!")
      setSelectedNode(survivor as Node)
      loadData()
    } catch (e: any) {
      alert("Merge failed: " + e.message)
    }
  }

  const selectedItem = selectedItems.length === 1 ? selectedItems[0] : null
  const canMerge = selectedItems.length === 2 && selectedItems.every(i => i.id.startsWith('node:vendor'))

  return (
    <ErrorBoundary>
      <div className="app-container">
        <TopBar />
        <SpotlightSearch />

        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="error-close">✕</button>
          </div>
        )}

        <div className="main-content">
          <div className="graph-container">
            <DashboardOverlay />
            <Graph3D
              nodes={nodes}
              edges={edges}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              selectedIds={selectedItems.map(i => i.id)}
            />
          </div>

          <div className="side-panel">
            {/* Tab Navigation */}
            <div className="tab-navigation">
              <button
                className={`tab-btn ${activeTab === 'reconciliation' ? 'active' : ''}`}
                onClick={() => setActiveTab('reconciliation')}
              >
                🔄 Reconciliation
              </button>
              <button
                className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => setActiveTab('analytics')}
              >
                📊 Analytics
              </button>
              <button
                className={`tab-btn ${activeTab === 'export' ? 'active' : ''}`}
                onClick={() => setActiveTab('export')}
              >
                📥 Export
              </button>
              <button
                className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                ℹ️ Details
              </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              {activeTab === 'reconciliation' && <ReconciliationPanel />}
              {activeTab === 'analytics' && <AnalyticsDashboard />}
              {activeTab === 'export' && <ExportPanel />}
              {activeTab === 'details' && (
                <>
                  {/* Multi-Selection Header */}
                  {selectedItems.length > 1 && (
                    <div className="multi-select-header">
                      <h3>{selectedItems.length} Items Selected</h3>
                      <ul>
                        {selectedItems.map(i => <li key={i.id}>{i.label || i.id}</li>)}
                      </ul>
                      {canMerge && (
                        <button onClick={handleMerge} className="btn-merge" style={{ width: '100%', marginTop: '1rem' }}>
                          Merge Selected Vendors
                        </button>
                      )}
                    </div>
                  )}

                  {selectedItem ? (
                    <NodeDetailsPanel
                      selectedItem={selectedItem}
                      onClose={clearSelection}
                      onFocus={(id) => {
                        console.log("Focusing on", id);
                      }}
                    />
                  ) : (
                    <div className="placeholder">Select a node or edge to view details</div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default App
