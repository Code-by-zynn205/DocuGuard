/**
 * seed.ts
 *
 * Script chèn dữ liệu mẫu phong phú cho TOÀN BỘ 8 BẢNG DocuGuard lên MongoDB Atlas.
 */

import mongoose from 'mongoose';
import { appConfig } from '../config/app.config.js';

async function seedFull() {
  console.log('🔄 Đang kết nối đến MongoDB Atlas...');
  try {
    await mongoose.connect(appConfig.mongoUri);
    console.log('✅ Đã kết nối thành công!');

    const db = mongoose.connection.db;
    if (!db) throw new Error('Database is undefined');

    // 1. Users
    const userId = new mongoose.Types.ObjectId();
    const reviewerId = new mongoose.Types.ObjectId();
    await db.collection('users').deleteMany({});
    await db.collection('users').insertMany([
      {
        _id: userId,
        email: 'admin@docuguard.internal',
        passwordHash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyGQVvS7v.O6kEaNqI0uGz3.example',
        fullName: 'Nguyễn Văn Quản Trị',
        department: 'Công Nghệ Thông Tin',
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: reviewerId,
        email: 'phapche@docuguard.internal',
        passwordHash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyGQVvS7v.O6kEaNqI0uGz3.example',
        fullName: 'Trần Thị Thẩm Định',
        department: 'Pháp Chế',
        role: 'reviewer',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    console.log('✅ Đã chèn dữ liệu bảng: users');

    // 2. Documents
    const doc1Id = new mongoose.Types.ObjectId();
    const doc2Id = new mongoose.Types.ObjectId();
    await db.collection('documents').deleteMany({});
    await db.collection('documents').insertMany([
      {
        _id: doc1Id,
        title: 'Hợp đồng Cung cấp Dịch vụ Cloud 2026',
        description: 'Hợp đồng hạ tầng server bảo mật giữa DocuGuard và đối tác',
        originalFileName: 'Hop_Dong_Cloud_2026.pdf',
        filePath: '/app/storage/documents/Hop_Dong_Cloud_2026.pdf',
        backupFilePath: '/app/storage/backups/Hop_Dong_Cloud_2026.backup.pdf',
        backupHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        mimeType: 'application/pdf',
        fileSize: 2450120,
        fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        category: 'contract',
        department: 'Công Nghệ Thông Tin',
        issueDate: new Date('2026-01-15'),
        expiresAt: new Date('2027-01-15'),
        status: 'active',
        isConfidential: true,
        healthScore: 95,
        healthStatus: 'healthy',
        integrityStatus: 'intact',
        isMissing: false,
        isDuplicate: false,
        duplicateCount: 0,
        requiredAppendices: ['Phụ lục bảo mật NDA', 'Biên bản nghiệm thu'],
        attachedAppendices: ['Phụ lục bảo mật NDA', 'Biên bản nghiệm thu'],
        missingAppendices: [],
        hasMissingAppendix: false,
        currentVersion: 1,
        uploadedBy: userId,
        tags: ['hop-dong', 'cloud', '2026'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: doc2Id,
        title: 'Báo cáo Kiểm toán Tài chính Quý 3',
        description: '', // Thiếu mô tả -> bị trừ điểm sức khỏe
        originalFileName: 'Bao_Cao_TC_Q3.xlsx',
        filePath: '/app/storage/documents/Bao_Cao_TC_Q3.xlsx',
        backupFilePath: '/app/storage/backups/Bao_Cao_TC_Q3.backup.xlsx',
        backupHash: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileSize: 184500,
        fileHash: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
        category: 'financial',
        department: 'Tài Chính Kế Toán',
        issueDate: new Date('2026-09-30'),
        expiresAt: new Date('2026-10-30'), // Sắp hết hạn trong tháng
        status: 'active',
        isConfidential: false,
        healthScore: 65,
        healthStatus: 'warning',
        healthDeductions: [
          { rule: 'MISSING_DESCRIPTION', reason: 'Tài liệu thiếu mô tả bắt buộc', pointsDeducted: 10, detectedAt: new Date() },
          { rule: 'EXPIRING_SOON', reason: 'Tài liệu sắp hết hạn trong 30 ngày', pointsDeducted: 15, detectedAt: new Date() },
          { rule: 'MISSING_APPENDIX', reason: 'Thiếu phụ lục hóa đơn VAT', pointsDeducted: 10, detectedAt: new Date() },
        ],
        integrityStatus: 'intact',
        isMissing: false,
        isDuplicate: false,
        duplicateCount: 0,
        requiredAppendices: ['Phụ lục hóa đơn VAT'],
        attachedAppendices: [],
        missingAppendices: ['Phụ lục hóa đơn VAT'],
        hasMissingAppendix: true,
        currentVersion: 1,
        uploadedBy: reviewerId,
        tags: ['tai-chinh', 'kiem-toan', 'q3'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    console.log('✅ Đã chèn dữ liệu bảng: documents');

    // 3. Document Versions
    await db.collection('document_versions').deleteMany({});
    await db.collection('document_versions').insertOne({
      documentId: doc1Id,
      versionNumber: 1,
      originalFileName: 'Hop_Dong_Cloud_2026.pdf',
      filePath: '/app/storage/documents/Hop_Dong_Cloud_2026.pdf',
      fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      fileSize: 2450120,
      mimeType: 'application/pdf',
      changeReason: 'Phiên bản gốc ban đầu ký kết',
      uploadedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ Đã chèn dữ liệu bảng: document_versions');

    // 4. Incidents
    const incId = new mongoose.Types.ObjectId();
    await db.collection('incidents').deleteMany({});
    await db.collection('incidents').insertOne({
      _id: incId,
      incidentCode: 'INC-202610-0001',
      documentId: doc2Id,
      title: 'Tài liệu sắp hết hạn và thiếu phụ lục bắt buộc',
      description: 'Báo cáo TC Q3 chỉ còn 16 ngày là hết hạn pháp lý, đồng thời phát hiện thiếu Phụ lục hóa đơn VAT đính kèm.',
      type: 'expiring_soon',
      severity: 'medium',
      status: 'open',
      assignedTo: reviewerId,
      slaDeadline: new Date(Date.now() + 24 * 3600 * 1000), // 24h SLA
      slaBreached: false,
      timeline: [
        { action: 'CREATED', note: 'Hệ thống n8n Scanner tự động phát hiện và mở sự cố', timestamp: new Date() },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ Đã chèn dữ liệu bảng: incidents');

    // 5. Recoveries
    await db.collection('recoveries').deleteMany({});
    await db.collection('recoveries').insertOne({
      documentId: doc1Id,
      incidentId: incId,
      status: 'completed',
      reason: 'Kiểm tra diễn tập khôi phục an toàn (Safe Recovery Drill)',
      sourceBackupPath: '/app/storage/backups/Hop_Dong_Cloud_2026.backup.pdf',
      sourceBackupHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      corruptedFileHash: 'none',
      isConfidentialDocument: true,
      requestedBy: userId,
      approvedBy: userId,
      restoredAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ Đã chèn dữ liệu bảng: recoveries');

    // 6. Audit Logs
    await db.collection('audit_logs').deleteMany({});
    await db.collection('audit_logs').insertMany([
      {
        action: 'document.upload',
        entityType: 'document',
        entityId: doc1Id.toString(),
        userId: userId,
        userEmail: 'admin@docuguard.internal',
        userRole: 'admin',
        ipAddress: '192.168.147.128',
        userAgent: 'DocuGuard-Client/1.0',
        status: 'success',
        metadata: { fileName: 'Hop_Dong_Cloud_2026.pdf', fileSize: 2450120 },
        createdAt: new Date(),
      },
      {
        action: 'document.verify_integrity',
        entityType: 'document',
        entityId: doc1Id.toString(),
        userId: userId,
        userEmail: 'admin@docuguard.internal',
        userRole: 'admin',
        ipAddress: '192.168.147.128',
        userAgent: 'DocuGuard-IntegrityWatch/1.0',
        status: 'success',
        metadata: { hashMatched: true, hash: 'e3b0c44...' },
        createdAt: new Date(),
      },
    ]);
    console.log('✅ Đã chèn dữ liệu bảng: audit_logs');

    // 7. Automation Logs (n8n)
    await db.collection('automation_logs').deleteMany({});
    await db.collection('automation_logs').insertOne({
      workflowType: 'health_scanner',
      workflowName: 'Health Scanner Engine Daily',
      n8nWorkflowId: 'WF-HEALTH-SCAN-01',
      n8nExecutionId: 'EXEC-9921',
      triggerSource: 'cron',
      status: 'success',
      scannedDocumentsCount: 2,
      healthyCount: 1,
      warningCount: 1,
      criticalCount: 0,
      incidentsCreatedCount: 1,
      notificationsSentCount: 1,
      retryCount: 0,
      startedAt: new Date(Date.now() - 5000),
      completedAt: new Date(),
      durationMs: 1420,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ Đã chèn dữ liệu bảng: automation_logs');

    // 8. Health Snapshots (Dashboard Trends)
    await db.collection('health_snapshots').deleteMany({});
    await db.collection('health_snapshots').insertOne({
      snapshotDate: new Date('2026-10-14T00:00:00.000Z'),
      overallHealthScore: 80,
      totalDocuments: 2,
      healthyDocuments: 1,
      warningDocuments: 1,
      criticalDocuments: 0,
      openIncidents: 1,
      expiringIn30DaysDocuments: 1,
      topRiskRadar: [
        {
          documentId: doc2Id,
          title: 'Báo cáo Kiểm toán Tài chính Quý 3',
          department: 'Tài Chính Kế Toán',
          healthScore: 65,
          primaryRiskReason: 'Sắp hết hạn trong tháng & thiếu phụ lục hóa đơn VAT',
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ Đã chèn dữ liệu bảng: health_snapshots');

    console.log('\n🎉 ĐÃ CẬP NHẬT DỮ LIỆU MẪU ĐẦY ĐỦ CHO TẤT CẢ 8 BẢNG TRÊN ATLAS!');
  } catch (err) {
    console.error('❌ Lỗi:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedFull();
