import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
import { CreateIncidentDto, UpdateIncidentStatusDto } from './dto/create-incident.dto.js';

@Injectable()
export class IncidentsService {
  constructor(
    @InjectModel(Incident.name) private readonly incidentModel: Model<IncidentDocument>,
    @InjectModel(Document.name) private readonly documentModel: Model<DocumentDocument>,
  ) {}

  async create(dto: CreateIncidentDto, userId?: string) {
    const incidentCode = `INC-${Date.now().toString().slice(-6)}`;

    let documentObjectId: Types.ObjectId | undefined;
    if (dto.documentId) {
      if (Types.ObjectId.isValid(dto.documentId)) {
        documentObjectId = new Types.ObjectId(dto.documentId);
      }
    }

    const incident = await this.incidentModel.create({
      incidentCode,
      documentId: documentObjectId,
      title: dto.title,
      description: dto.description,
      severity: dto.severity || IncidentSeverity.MEDIUM,
      type: dto.type || IncidentType.LOW_HEALTH_SCORE,
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

    return incident;
  }

  async findAll(query?: { severity?: string; status?: string; type?: string }) {
    const filter: Record<string, unknown> = {};
    if (query?.severity) filter.severity = query.severity;
    if (query?.status) filter.status = query.status;
    if (query?.type) filter.type = query.type;

    return this.incidentModel
      .find(filter)
      .populate('documentId', 'title originalFileName healthScore healthStatus')
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

    incident.status = dto.status;
    if (dto.status === IncidentStatus.RESOLVED || dto.status === IncidentStatus.CLOSED) {
      incident.resolvedAt = new Date();
      if (dto.note) incident.resolutionNotes = dto.note;
    }

    if (dto.assignedTo && Types.ObjectId.isValid(dto.assignedTo)) {
      incident.assignedTo = new Types.ObjectId(dto.assignedTo);
    }

    incident.timeline.push({
      action: 'STATUS_CHANGED',
      note: dto.note || `Trạng thái cập nhật thành: ${dto.status}`,
      performedBy: userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : undefined,
      timestamp: new Date(),
    });

    await incident.save();
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
