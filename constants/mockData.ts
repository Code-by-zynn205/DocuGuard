import { DocumentItem, IncidentItem, DashboardSummary } from '@/types';

export const mockDashboardSummary: DashboardSummary = {
  overallHealthScore: 88,
  totalDocuments: 3,
  openIncidentsCount: 2,
  expiringSoonCount: 1,
};

export const mockDocuments: DocumentItem[] = [
  {
    _id: 'doc-1',
    title: 'Hợp đồng Dịch vụ Công nghệ 2026.pdf',
    category: 'Pháp chế',
    department: 'Công nghệ thông tin',
    fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    healthScore: 95,
    healthStatus: 'healthy',
    expiresAt: '2026-12-31',
    isDuplicate: false,
    createdAt: '2026-01-15',
    description: 'Hợp đồng triển khai hạ tầng đám mây cho doanh nghiệp.',
  },
  {
    _id: 'doc-2',
    title: 'Biên bản Bàn giao Thiết bị Server.docx',
    category: 'Hành chính',
    department: 'Vận hành',
    fileHash: '8f4e2a1b9c3d5e7f6a8b0c2d4e6f8a0b1c3d5e7f6a8b0c2d4e6f8a0b1c3d5e7f',
    healthScore: 45,
    healthStatus: 'critical',
    expiresAt: '2026-05-10',
    isDuplicate: false,
    createdAt: '2026-02-01',
    description: 'Biên bản bàn giao thiết bị phòng máy chủ trung tâm.',
  },
  {
    _id: 'doc-3',
    title: 'Hợp đồng Lao động - Nguyễn Văn A.pdf',
    category: 'Nhân sự',
    department: 'Phòng Nhân sự',
    fileHash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
    healthScore: 72,
    healthStatus: 'warning',
    expiresAt: '2026-11-20',
    isDuplicate: true,
    createdAt: '2026-03-10',
    description: 'Hợp đồng lao động chính thức thời hạn 3 năm.',
  },
];

export const mockIncidents: IncidentItem[] = [
  {
    _id: 'inc-1',
    incidentCode: 'INC-202610-001',
    title: 'Phát hiện sai lệch mã Hash SHA-256 (File bị chỉnh sửa lén)',
    severity: 'critical',
    status: 'open',
    description: 'File Biên bản Bàn giao Thiết bị Server.docx bị phát hiện có nội dung lệch mã băm ban đầu.',
    createdAt: '2026-10-15',
  },
  {
    _id: 'inc-2',
    incidentCode: 'INC-202610-002',
    title: 'Tài liệu sắp hết hạn pháp lý (dưới 30 ngày)',
    severity: 'medium',
    status: 'in_progress',
    description: 'Hợp đồng tư vấn chuẩn bị hết hạn cần làm thủ tục gia hạn.',
    createdAt: '2026-10-16',
  },
];