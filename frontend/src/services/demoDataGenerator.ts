/**
 * Demo Data Generator - Performance Optimized
 * 
 * Generates SMALL, manageable demo datasets for smooth performance.
 * Default: 15 jobs, 30 vendors, 200 invoices, 150 payments
 */

import type { Node, Edge } from './api';

export interface DemoDataConfig {
    numJobs: number;
    numVendors: number;
    numInvoices: number;
    seed?: number;
}

// REDUCED DEFAULTS FOR BETTER PERFORMANCE
export const DEFAULT_DEMO_CONFIG: DemoDataConfig = {
    numJobs: 15,        // Was 100
    numVendors: 30,     // Was 500
    numInvoices: 200,   // Was 10,000 (!)
    seed: 42,
};

// Simple pseudo-random generator
class SeededRandom {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    next(): number {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    choice<T>(array: T[]): T {
        return array[this.nextInt(0, array.length - 1)];
    }
}

const VENDOR_NAMES = [
    'Ace Steel Corp', 'Atlas Concrete LLC', 'Blue Chip Lumber', 'Central Electric Inc',
    'Diamond Construction', 'Eagle Roofing', 'Empire Plumbing', 'Frontier HVAC',
    'Gateway Glass', 'Heritage Masonry', 'Imperial Painting', 'Keystone Tile',
    'Metro Flooring', 'Noble Carpentry', 'Olympic Drywall', 'Peak Insulation',
    'Prime Excavation', 'Royal Landscaping', 'Sierra Paving', 'Summit Grading',
    'Superior Safety', 'Triumph Tools', 'United Supply', 'Vanguard Equipment',
    'Victory Scaffold', 'Vista Asphalt', 'Western Demolition', 'Zenith Materials',
    'Solid Foundation', 'Reliable Framing',
];

const REAL_JOB_NAMES = [
    'Oak Plaza Tower', 'Maple Medical Center', 'Pine Office Complex', 'Cedar Retail Mall',
    'Willow Residential Complex', 'Elm Apartment Building', 'Birch Shopping Center',
    'Aspen Hotel & Spa', 'Main Street Tower', 'Center City Plaza',
    'Park View Condos', 'Lake Shore Building', 'River Park Complex', 'Mountain Valley School',
    'Sunset Hospital', 'Skyline Office Park', 'Harbor Bay Center',
];

/**
 * Generate demo graph data with REDUCED defaults
 */
export function generateDemoData(config: DemoDataConfig = DEFAULT_DEMO_CONFIG): { nodes: Node[]; edges: Edge[] } {
    const rng = new SeededRandom(config.seed || 42);
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    //  Central Company
    nodes.push({
        id: 'node:company:central',
        label: 'Olsen Construction Inc.',
        type: 'CentralCompany',
        stats: { total_inflow: 0, total_outflow: 0, net_flow: 0, transaction_count: 0 },
        metadata: {},
    });

    // Jobs
    const jobs: Node[] = [];
    for (let i = 0; i < config.numJobs; i++) {
        const job: Node = {
            id: `node:job:${1000 + i}`,
            label: REAL_JOB_NAMES[i % REAL_JOB_NAMES.length],
            type: 'Job',
            stats: { total_inflow: 0, total_outflow: 0, net_flow: 0, transaction_count: 0 },
            metadata: { job_code: `JOB-${1000 + i}`, status: 'active' },
        };
        jobs.push(job);
        nodes.push(job);
    }

    // Vendors
    const vendors: Node[] = [];
    for (let i = 0; i < config.numVendors; i++) {
        const vendor: Node = {
            id: `node:vendor:${5000 + i}`,
            label: VENDOR_NAMES[i % VENDOR_NAMES.length] + ` ${i + 1}`,
            type: 'Vendor',
            stats: { total_inflow: 0, total_outflow: 0, net_flow: 0, transaction_count: 0 },
            metadata: { vendor_code: `VEN-${5000 + i}` },
        };
        vendors.push(vendor);
        nodes.push(vendor);
    }

    // Invoices (Vendor -> Job)
    for (let i = 0; i < config.numInvoices; i++) {
        const job = rng.choice(jobs);
        const vendor = rng.choice(vendors);
        const amount = rng.nextInt(5000, 500000);
        // Random date within last year
        const date = new Date(Date.now() - rng.nextInt(0, 365 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];

        edges.push({
            id: `edge:invoice:${i}`,
            source: vendor.id,
            target: job.id,
            label: `Invoice $${(amount / 1000).toFixed(0)}k`,
            type: 'Invoice',
            metadata: { amount, status: i % 3 === 0 ? 'approved' : 'pending', date },
        });

        // Update stats
        if (vendor.stats) vendor.stats.transaction_count++;
        if (job.stats) job.stats.transaction_count++;
    }

    // Payments (Job -> Company) - one per job
    // Actually let's generate more payments to make it interesting
    for (let i = 0; i < 150; i++) {
        const job = rng.choice(jobs);
        const amount = rng.nextInt(100000, 2000000);
        // Random date within last year
        const date = new Date(Date.now() - rng.nextInt(0, 365 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];

        edges.push({
            id: `edge:payment:${i}`,
            source: job.id,
            target: 'node:company:central',
            label: 'Payment',
            type: 'Payment',
            metadata: { amount, status: i % 3 === 0 ? 'approved' : 'pending', date },
        });
    }

    return { nodes, edges };
}

// Preset configurations
export function generateSmallDemo() {
    return generateDemoData({ numJobs: 5, numVendors: 15, numInvoices: 50, seed: 42 });
}

export function generateMediumDemo() {
    return generateDemoData(DEFAULT_DEMO_CONFIG);
}

export function generateLargeDemo() {
    return generateDemoData({ numJobs: 30, numVendors: 75, numInvoices: 500, seed: 42 });
}
