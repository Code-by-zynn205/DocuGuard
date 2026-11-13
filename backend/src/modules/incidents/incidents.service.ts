import { Injectable, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Incident,
  IncidentDocument,
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
} from '../../database/schemas/incident.schema.js';
import { Document, DocumentDocument } from '../../database/schemas/document.schema.js';
import { AuditAction, AuditEntityType } from '../../database/schemas/audit-log.schema.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateIncidentDto, UpdateIncidentStatusDto } from './dto/create-incident.dto.js';

@Injectable()
export class IncidentsService {
  constructor(
    @InjectModel(Incident.name) private readonly incidentModel: Model<IncidentDocument>,
    @InjectModel(Document.name) private readonly documentModel: Model<DocumentDocument>,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  async create(dto: CreateIncidentDto, userId?: string) {
    const incidentCode = `INC-${Date.now().toString().slice(-6)}`;

    let documentObjectId: Types.ObjectId | undefined;
    if (dto.documentId) {
      if (Types.ObjectId.isValid(dto.documentId)) {
        documentObjectId = new Types.ObjectId(dto.documentId);
      }
    }

    const severityRaw = dto.severity ? String(dto.severity).toLowerCase() : 'medium';
    const severity = Object.values(IncidentSeverity).includes(severityRaw as IncidentSeverity)
      ? (severityRaw as IncidentSeverity)
      : IncidentSeverity.MEDIUM;

    const typeRaw = dto.type ? String(dto.type).toLowerCase() : 'low_health_score';
    const type = Object.values(IncidentType).includes(typeRaw as IncidentType)
      ? (typeRaw as IncidentType)
      : IncidentType.LOW_HEALTH_SCORE;

    const incident = await this.incidentModel.create({
      incidentCode,
      documentId: documentObjectId,
      title: dto.title,
      description: dto.description,
      severity,
      type,
      status: IncidentStatus.OPEN,
      assignedTo: dto.assignedTo && Types.ObjectId.isValid(dto.assignedTo) ? new Types.ObjectId(dto.assignedTo) : undefined,
      timeline: [
        {
          action: 'CREATED',
          note: 'Sự cố được khởi tạo trên hệ thống',
          performedBy: userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : undefined,
          timestamp: new Date(),
        },
      ],
    });

    await this.auditService?.logAction({
      action: AuditAction.INCIDENT_CREATED,
      entityType: AuditEntityType.INCIDENT,
      entityId: incident._id,
      entityName: incident.incidentCode,
      actorId: userId,
      actorName: 'Hệ thống DocuGuard',
      severity: severity === IncidentSeverity.CRITICAL ? 'critical' : 'warning',
      description: `Tạo sự cố ${incident.incidentCode}: ${incident.title}`,
    });

    return incident;
  }

  async findAll(query?: { severity?: string; status?: string; type?: string }) {
    const filter: Record<string, unknown> = {};
    if (query?.severity) filter.severity = query.severity;
    if (query?.status) filter.status = query.status;
    if (query?.type) filter.type = query.type;

    return this.incidentModel
      .find(filter)
      .populate('documentId', 'title originalFileName department isConfidential healthScore healthStatus')
      .populate('assignedTo', 'fullName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID sự cố không hợp lệ');
    }
    const incident = await this.incidentModel
      .findById(id)
      .populate('documentId')
      .populate('assignedTo', 'fullName email')
      .exec();

    if (!incident) {
      throw new NotFoundException(`Không tìm thấy sự cố với ID ${id}`);
    }
    return incident;
  }

  async updateStatus(id: string, dto: UpdateIncidentStatusDto, userId?: string) {
    const incident = await this.findOne(id);
    const normalizedStatus = String(dto.status).toLowerCase() as IncidentStatus;
    const validStatus = Object.values(IncidentStatus).includes(normalizedStatus)
      ? normalizedStatus
      : incident.status;

    const noteText = dto.resolutionNotes || dto.note;

    incident.status = validStatus;
    if (validStatus === IncidentStatus.RESOLVED || validStatus === IncidentStatus.CLOSED) {
      incident.resolvedAt = new Date();
      if (noteText) incident.resolutionNotes = noteText;
    } else if (noteText) {
      incident.resolutionNotes = noteText;
    }

    if (dto.assignedTo && Types.ObjectId.isValid(dto.assignedTo)) {
      incident.assignedTo = new Types.ObjectId(dto.assignedTo);
    }

    incident.timeline.push({
      action: 'STATUS_CHANGED',
      note: noteText || `Trạng thái cập nhật thành: ${validStatus}`,
      performedBy: userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : undefined,
      timestamp: new Date(),
    });

    await incident.save();

    await this.auditService?.logAction({
      action:
        validStatus === IncidentStatus.RESOLVED || validStatus === IncidentStatus.CLOSED
          ? AuditAction.INCIDENT_RESOLVED
          : AuditAction.INCIDENT_STATUS_CHANGE,
      entityType: AuditEntityType.INCIDENT,
      entityId: incident._id,
      entityName: incident.incidentCode,
      actorId: userId,
      actorName: 'Quản trị viên DocuGuard',
      severity: 'info',
      description: `Cập nhật sự cố ${incident.incidentCode} -> ${validStatus}${noteText ? `: ${noteText}` : ''}`,
    });

    return incident;
  }

  async getSummary() {
    const [total, open, inProgress, resolved, critical, high] = await Promise.all([
      this.incidentModel.countDocuments(),
      this.incidentModel.countDocuments({ status: IncidentStatus.OPEN }),
      this.incidentModel.countDocuments({ status: IncidentStatus.IN_PROGRESS }),
      this.incidentModel.countDocuments({ status: IncidentStatus.RESOLVED }),
      this.incidentModel.countDocuments({ severity: IncidentSeverity.CRITICAL }),
      this.incidentModel.countDocuments({ severity: IncidentSeverity.HIGH }),
    ]);

    return {
      total,
      open,
      inProgress,
      resolved,
      critical,
      high,
      activeIncidents: open + inProgress,
    };
  }
}
