import { IncidentSeverity, IncidentStatus, IncidentType } from '../../../database/schemas/incident.schema.js';

export class CreateIncidentDto {
  documentId?: string;
  title!: string;
  description!: string;
  severity?: IncidentSeverity;
  type?: IncidentType;
  assignedTo?: string;
}

export class UpdateIncidentStatusDto {
  status!: IncidentStatus;
  note?: string;
  resolutionNotes?: string;
  assignedTo?: string;
}
