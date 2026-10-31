export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface DocumentItem {
  _id: string;
  title: string;
  category: string;
  department: string;
  fileHash: string;
  healthScore: number;
  healthStatus: HealthStatus;
  expiresAt: string;
  isDuplicate: boolean;
  createdAt: string;
  description?: string;
}

export interface IncidentItem {
  _id: string;
  incidentCode: string;
  title: string;
  severity: SeverityLevel;
  status: IncidentStatus;
  description: string;
  createdAt: string;
}

export interface DashboardSummary {
  overallHealthScore: number;
  totalDocuments: number;
  openIncidentsCount: number;
  expiringSoonCount: number;
}