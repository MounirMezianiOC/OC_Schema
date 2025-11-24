import axios from 'axios';

const API_URL = 'http://localhost:8002/api';

// Unified Node interface supporting both backend and demo formats
export interface Node {
  // Compatible with backend format
  node_id?: string;
  attributes?: any;

  // Compatible with demo/UI format
  id: string;
  label: string;
  type: string;
  stats?: {
    total_inflow: number;
    total_outflow: number;
    net_flow: number;
    transaction_count: number;
  };
  metadata?: Record<string, any>;
}

// Unified Edge interface supporting both backend and demo formats
export interface Edge {
  // Compatible with backend format
  edge_id?: string;
  from_node?: string;
  to_node?: string;
  attributes?: any;

  // Compatible with demo/UI format
  id: string;
  source: string;
  target: string;
  label?: string;
  type: string;
  amount?: number;
  metadata?: Record<string, any>;
}

export const fetchNodes = async () => {
  const response = await axios.get<Node[]>(`${API_URL}/graph/nodes`);
  return response.data;
};

export const fetchEdges = async (filters?: any) => {
  const params = new URLSearchParams();
  if (filters) {
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined) {
        params.append(key, filters[key].toString());
      }
    });
  }
  const url = `${API_URL}/graph/edges${params.toString() ? '?' + params.toString() : ''}`;
  const response = await axios.get<Edge[]>(url);
  return response.data;
};

export const fetchNodeDetails = async (nodeId: string) => {
  const response = await axios.get<Node>(`${API_URL}/graph/node/${nodeId}`);
  return response.data;
};

export interface ReconciliationTask {
  task_id: number;
  task_data: {
    source_record: any;
    candidate_id: string;
    score: number;
    status: string;
  };
  status: string;
  created_at: string;
}

export const fetchReconciliationQueue = async () => {
  const response = await axios.get<ReconciliationTask[]>(`${API_URL}/reconciliation/queue`);
  return response.data;
};

export const resolveTask = async (taskId: number, action: 'merge' | 'create_new') => {
  const response = await axios.post(`${API_URL}/reconciliation/resolve/${taskId}?action=${action}`);
  return response.data;
};

export const fetchNodeHistory = async (nodeId: string) => {
  const response = await axios.get<any[]>(`${API_URL}/graph/node/${nodeId}/history`);
  return response.data;
};

export const manualMerge = async (survivorId: string, victimId: string, reason: string) => {
  const response = await axios.post(`${API_URL}/graph/merge`, {
    survivor_id: survivorId,
    victim_id: victimId,
    reason: reason
  });
  return response.data;
};
