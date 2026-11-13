import { DocumentCategory } from '../../../database/schemas/document.schema.js';

export class CreateDocumentDto {
  title!: string;
  description?: string;
  category?: DocumentCategory;
  department?: string;
  issueDate?: string;
  expiresAt?: string;
  isConfidential?: boolean | string;
  requiredAppendices?: string | string[];
  tags?: string | string[];
}

export class UpdateDocumentHealthDto {
  healthScore!: number;
  healthStatus?: 'healthy' | 'warning' | 'critical';
  integrityStatus?: 'intact' | 'tampered' | 'missing';
  healthDeductions?: Array<{
    rule: string;
    reason: string;
    pointsDeducted: number;
  }>;
}
