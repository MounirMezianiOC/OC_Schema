/**
 * SpotlightSearch Component
 * 
 * Keyboard-activated search overlay (Cmd+K / Ctrl+K).
 * Provides fuzzy search across all nodes with instant focus and highlighting.
 */

import { type FC, useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import './SpotlightSearch.css';

const SpotlightSearch: FC = () => {
    const {
        isSpotlightOpen,
        toggleSpotlight,
        nodes,
        setSelectedNode,
        setHighlightedNodeIds,
    } = useAppStore();

    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Fuzzy search implementation
    const searchNodes = (searchQuery: string) => {
        if (!searchQuery.trim()) return nodes.slice(0, 10); // Show first 10 if no query

        const lowerQuery = searchQuery.toLowerCase();

        return nodes
            .filter(node => {
                const label = (node.label || node.id || '').toLowerCase();
                const id = (node.id || '').toLowerCase();
                const type = (node.type || '').toLowerCase();

                // Simple fuzzy match: contains query
                return label.includes(lowerQuery) ||
                    id.includes(lowerQuery) ||
                    type.includes(lowerQuery);
            })
            .sort((a, b) => {
                // Sort by relevance: exact match > starts with > contains
                const aLabel = (a.label || a.id).toLowerCase();
                const bLabel = (b.label || b.id).toLowerCase();

                const aExact = aLabel === lowerQuery;
                const bExact = bLabel === lowerQuery;
                if (aExact && !bExact) return -1;
                if (!aExact && bExact) return 1;

                const aStarts = aLabel.startsWith(lowerQuery);
                const bStarts = bLabel.startsWith(lowerQuery);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;

                return aLabel.localeCompare(bLabel);
            })
            .slice(0, 50); // Limit to 50 results
    };

    const results = searchNodes(query);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd+K or Ctrl+K to toggle
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                toggleSpotlight();
            }

            // Escape to close
            if (e.key === 'Escape' && isSpotlightOpen) {
                e.preventDefault();
                toggleSpotlight();
                setQuery('');
                setSelectedIndex(0);
            }

            // Arrow keys to navigate results
            if (isSpotlightOpen) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex(prev => Math.max(prev - 1, 0));
                } else if (e.key === 'Enter' && results[selectedIndex]) {
                    e.preventDefault();
                    handleSelectNode(results[selectedIndex]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSpotlightOpen, selectedIndex, results, toggleSpotlight]);

    // Focus input when opened
    useEffect(() => {
        if (isSpotlightOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isSpotlightOpen]);

    // Reset selected index when query changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    const handleSelectNode = (node: typeof nodes[0]) => {
        setSelectedNode(node);
        setHighlightedNodeIds([node.id]);
        toggleSpotlight();
        setQuery('');
        setSelectedIndex(0);
    };

    const getNodeTypeEmoji = (type: string) => {
        switch (type) {
            case 'CentralCompany': return '🏢';
            case 'Job': return '🔨';
            case 'Vendor': return '🏭';
            case 'Payment': return '💰';
            case 'Invoice': return '📄';
            default: return '📍';
        }
    };

    if (!isSpotlightOpen) return null;

    return (
        <div className="spotlight-overlay" onClick={() => {
            toggleSpotlight();
            setQuery('');
            setSelectedIndex(0);
        }}>
            <div className="spotlight-container" onClick={(e) => e.stopPropagation()}>
                <div className="spotlight-input-wrapper">
                    <span className="spotlight-input-icon">🔍</span>
                    <input
                        ref={inputRef}
                        type="text"
                        className="spotlight-input"
                        placeholder="Search nodes by name, ID, or type..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <kbd className="spotlight-hint">ESC</kbd>
                </div>

                <div className="spotlight-results">
                    {results.length === 0 ? (
                        <div className="spotlight-empty">
                            <span className="spotlight-empty-icon">🔎</span>
                            <p>No nodes found</p>
                            <small>Try a different search term</small>
                        </div>
                    ) : (
                        results.map((node, index) => (
                            <div
                                key={node.id}
                                className={`spotlight-result ${index === selectedIndex ? 'selected' : ''}`}
                                onClick={() => handleSelectNode(node)}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <span className="spotlight-result-icon">
                                    {getNodeTypeEmoji(node.type)}
                                </span>
                                <div className="spotlight-result-content">
                                    <div className="spotlight-result-label">
                                        {node.label || node.id}
                                    </div>
                                    <div className="spotlight-result-meta">
                                        <span className="spotlight-result-type">{node.type}</span>
                                        {node.stats && (
                                            <>
                                                <span className="spotlight-result-divider">•</span>
                                                <span className="spotlight-result-stat">
                                                    {node.stats.transaction_count} transactions
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {index === selectedIndex && (
                                    <kbd className="spotlight-result-hint">↵</kbd>
                                )}
                            </div>
                        ))
                    )}
                </div>

                <div className="spotlight-footer">
                    <div className="spotlight-footer-hints">
                        <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
                        <span><kbd>↵</kbd> Select</span>
                        <span><kbd>ESC</kbd> Close</span>
                    </div>
                    <div className="spotlight-footer-count">
                        {results.length} of {nodes.length} nodes
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SpotlightSearch;
