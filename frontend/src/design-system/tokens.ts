/**
 * Design System Tokens
 * 
 * Foundry-inspired dark theme design tokens for the APW Ontology Dashboard.
 * These tokens define the visual language of the application.
 */

export const colors = {
    // Base theme colors
    background: {
        primary: '#0B0C10',
        secondary: '#12141A',
        tertiary: '#1A1D26',
        elevated: '#1F232D',
        overlay: 'rgba(11, 12, 16, 0.95)',
    },

    // Node type colors
    node: {
        centralCompany: {
            base: '#E8EAED',
            glow: 'rgba(232, 234, 237, 0.4)',
            hover: '#FFFFFF',
        },
        job: {
            base: '#4A90E2',
            glow: 'rgba(74, 144, 226, 0.4)',
            hover: '#5BA3F5',
            cluster: '#3A7BC8',
        },
        vendor: {
            base: '#F5A623',
            glow: 'rgba(245, 166, 35, 0.4)',
            hover: '#FFB84D',
            cluster: '#D68910',
        },
        payment: {
            base: '#50E3C2',
            glow: 'rgba(80, 227, 194, 0.4)',
            hover: '#6AEFD4',
        },
        invoice: {
            base: '#B57EDC',
            glow: 'rgba(181, 126, 220, 0.4)',
            hover: '#C89EE8',
        },
    },

    // Edge colors (capital flows)
    edge: {
        default: '#45494F',
        active: '#7B8794',
        highlighted: '#9BA5B1',
        approved: '#2ECC71',
        unapproved: '#E74C3C',
        pending: '#F39C12',
    },

    // UI accent colors
    accent: {
        primary: '#3498DB',
        secondary: '#9B59B6',
        success: '#2ECC71',
        warning: '#F39C12',
        danger: '#E74C3C',
        info: '#1ABC9C',
    },

    // Text colors
    text: {
        primary: '#E8EAED',
        secondary: '#9BA5B1',
        tertiary: '#6B7280',
        disabled: '#4B5563',
        inverse: '#0B0C10',
    },

    // Border and separator colors
    border: {
        subtle: '#2A2E38',
        default: '#3A4048',
        strong: '#4A515C',
    },

    // Status colors
    status: {
        active: '#2ECC71',
        inactive: '#95A5A6',
        error: '#E74C3C',
        warning: '#F39C12',
    },
};

export const typography = {
    fontFamily: {
        primary: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
        mono: "'Roboto Mono', 'Courier New', monospace",
    },

    fontSize: {
        xs: '0.75rem',     // 12px
        sm: '0.875rem',    // 14px
        base: '1rem',      // 16px
        lg: '1.125rem',    // 18px
        xl: '1.25rem',     // 20px
        '2xl': '1.5rem',   // 24px
        '3xl': '1.875rem', // 30px
        '4xl': '2.25rem',  // 36px
    },

    fontWeight: {
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
    },

    lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
    },
};

export const spacing = {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
};

export const borderRadius = {
    none: '0',
    sm: '0.25rem',   // 4px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    full: '9999px',
};

export const elevation = {
    // Box shadows for depth
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.6)',

    // Glows for nodes and highlights
    glow: {
        sm: '0 0 10px currentColor',
        md: '0 0 20px currentColor',
        lg: '0 0 30px currentColor',
    },
};

export const animation = {
    // Durations
    duration: {
        instant: '0ms',
        fast: '150ms',
        normal: '300ms',
        slow: '500ms',
        slower: '800ms',
    },

    // Easing functions
    easing: {
        linear: 'linear',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },

    // Transition presets
    transition: {
        default: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        fast: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
        slow: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)',
        spring: 'all 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
};

export const zIndex = {
    background: -1,
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    overlay: 1200,
    modal: 1300,
    popover: 1400,
    tooltip: 1500,
};

// Graph-specific tokens
export const graph = {
    node: {
        size: {
            small: 20,
            medium: 40,
            large: 60,
            cluster: 80,
        },
        borderWidth: 2,
        hoverScale: 1.15,
        selectedScale: 1.2,
    },

    edge: {
        width: {
            min: 1,
            default: 2,
            thick: 4,
            veryThick: 8,
        },
        opacity: {
            default: 0.6,
            hover: 0.9,
            inactive: 0.2,
        },
    },

    layout: {
        padding: 50,
        nodeSpacing: 100,
        clusterPadding: 80,
    },

    animation: {
        layoutTransition: 800,
        nodeFade: 300,
        edgeFade: 200,
        particleSpeed: 2000, // ms for particle to traverse edge
    },
};

// Performance thresholds
export const performance = {
    thresholds: {
        highDensity: 2000,        // Node count for high-density mode
        animationDisable: 5000,   // Node count to disable animations
        particleDisable: 1000,    // Edge count to disable particles
        lodSwitch: 500,           // Node count for LOD switching
    },

    renderBudget: {
        targetFps: 60,
        maxLayoutIterations: 50,
        debounceMs: 150,
    },
};

// Export all tokens as a single object for convenience
export const designTokens = {
    colors,
    typography,
    spacing,
    borderRadius,
    elevation,
    animation,
    zIndex,
    graph,
    performance,
};

export default designTokens;
