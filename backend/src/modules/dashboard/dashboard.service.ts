import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Document, DocumentDocument, DocumentStatus, HealthStatus } from '../../database/schemas/document.schema.js';
import { Incident, IncidentDocument, IncidentStatus } from '../../database/schemas/incident.schema.js';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Document.name) private readonly documentModel: Model<DocumentDocument>,
    @InjectModel(Incident.name) private readonly incidentModel: Model<IncidentDocument>,
  ) {}

  async getStats() {
    const totalDocuments = await this.documentModel.countDocuments({ status: { $ne: DocumentStatus.DELETED } });

    // Điểm sức khỏe trung bình
    const healthAggregate = await this.documentModel.aggregate([
      { $match: { status: { $ne: DocumentStatus.DELETED } } },
      { $group: { _id: null, avgScore: { $avg: '$healthScore' } } },
    ]);
    const averageHealthScore = healthAggregate.length > 0 ? Math.round(healthAggregate[0].avgScore) : 100;

    // Sự cố đang hoạt động
    const activeIncidents = await this.incidentModel.countDocuments({
      status: { $in: [IncidentStatus.OPEN, IncidentStatus.IN_PROGRESS] },
    });

    // Tài liệu sắp hết hạn hoặc đã hết hạn
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringSoonCount = await this.documentModel.countDocuments({
      status: DocumentStatus.ACTIVE,
      expiresAt: { $lte: thirtyDaysFromNow },
    });

    // Risk Radar: Top 5 tài liệu có điểm sức khỏe thấp nhất
    const riskRadar = await this.documentModel
      .find({ status: { $ne: DocumentStatus.DELETED } })
      .sort({ healthScore: 1 })
      .limit(5)
      .select('title originalFileName healthScore healthStatus integrityStatus category expiresAt')
      .exec();

    // Thống kê theo trạng thái sức khỏe
    const [healthyCount, warningCount, criticalCount] = await Promise.all([
      this.documentModel.countDocuments({ status: { $ne: DocumentStatus.DELETED }, healthStatus: HealthStatus.HEALTHY }),
      this.documentModel.countDocuments({ status: { $ne: DocumentStatus.DELETED }, healthStatus: HealthStatus.WARNING }),
      this.documentModel.countDocuments({ status: { $ne: DocumentStatus.DELETED }, healthStatus: HealthStatus.CRITICAL }),
    ]);

    // Các sự cố mới nhất
    const recentIncidents = await this.incidentModel
      .find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('documentId', 'title')
      .exec();

    return {
      totalDocuments,
      averageHealthScore,
      activeIncidents,
      expiringSoonCount,
      healthOverview: {
        healthy: healthyCount,
        warning: warningCount,
        critical: criticalCount,
      },
      riskRadar,
      recentIncidents,
    };
  }
}
