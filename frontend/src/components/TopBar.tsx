/**
 * TopBar Component
 * 
 * Global navigation and controls for the APW Ontology Dashboard.
 * Includes: search, layout selector, data source toggle, filters, settings.
 */

import { type FC } from 'react';
import { useAppStore } from '../store/appStore';
import DataSourceToggle from './DataSourceToggle';
import type { LayoutType } from '../store/appStore';
import './TopBar.css';

const TopBar: FC = () => {
    const {
        layout,
        setLayout,
        toggleSpotlight,
        animationPreferences,
        setAnimationPreferences,
        nodeCount,
        edgeCount,
        isHighDensityMode,
    } = useAppStore();

    const layouts: Array<{ value: LayoutType; label: string; icon: string }> = [
        { value: 'force-directed', label: 'Force', icon: '🔮' },
        { value: 'radial', label: 'Radial', icon: '⭕' },
        { value: 'hierarchical', label: 'Hierarchy', icon: '🌳' },
    ];

    return (
        <div className="top-bar">
            {/* Left section: Brand and stats */}
            <div className="top-bar-left">
                <h1 className="app-title">APW Ontology</h1>
                <div className="graph-stats">
                    <span className="stat">
                        <span className="stat-value">{nodeCount.toLocaleString()}</span>
                        <span className="stat-label">nodes</span>
                    </span>
                    <span className="stat-divider">•</span>
                    <span className="stat">
                        <span className="stat-value">{edgeCount.toLocaleString()}</span>
                        <span className="stat-label">edges</span>
                    </span>
                    {isHighDensityMode && (
                        <>
                            <span className="stat-divider">•</span>
                            <span className="high-density-badge" title="High-density mode active: some visual optimizations applied">
                                ⚡ High Density
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Center section: Controls */}
            <div className="top-bar-center">
                {/* Spotlight Search */}
                <button
                    className="spotlight-trigger"
                    onClick={toggleSpotlight}
                    title="Search (Cmd+K / Ctrl+K)"
                >
                    <span className="spotlight-icon">🔍</span>
                    <span className="spotlight-text">Search nodes...</span>
                    <kbd className="keyboard-shortcut">⌘K</kbd>
                </button>

                {/* Layout Selector */}
                <div className="layout-selector">
                    <label className="control-label">Layout:</label>
                    <div className="layout-buttons">
                        {layouts.map((l) => (
                            <button
                                key={l.value}
                                className={`layout-btn ${layout === l.value ? 'active' : ''}`}
                                onClick={() => setLayout(l.value)}
                                title={`${l.label} layout`}
                            >
                                <span className="layout-icon">{l.icon}</span>
                                <span className="layout-label">{l.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right section: Data source and settings */}
            <div className="top-bar-right">
                <DataSourceToggle />

                {/* Animation settings */}
                <div className="settings-group">
                    <button
                        className={`icon-btn  ${animationPreferences.reducedMotion ? 'active' : ''}`}
                        onClick={() => setAnimationPreferences({
                            reducedMotion: !animationPreferences.reducedMotion,
                        })}
                        title={animationPreferences.reducedMotion ? 'Enable animations' : 'Reduce motion'}
                    >
                        {animationPreferences.reducedMotion ? '🐌' : '⚡'}
                    </button>

                    <button
                        className={`icon-btn ${animationPreferences.particlesEnabled ? 'active' : ''}`}
                        onClick={() => setAnimationPreferences({
                            particlesEnabled: !animationPreferences.particlesEnabled,
                        })}
                        title={animationPreferences.particlesEnabled ? 'Disable edge particles' : 'Enable edge particles'}
                        disabled={isHighDensityMode}
                    >
                        ✨
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TopBar;
