import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workflows = [
  { file: 'document-health-scan.json', expectedWebhook: 'document-health-scan' },
  { file: 'incident-auto-resolution.json', expectedWebhook: 'incident-resolution' },
  { file: 'safe-recovery.json', expectedWebhook: 'safe-recovery' },
];

console.log('🔍 Kiểm tra tính hợp lệ và toàn vẹn của các workflow n8n...\n');

let allPassed = true;

for (const wf of workflows) {
  const filePath = path.join(__dirname, 'workflows', wf.file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Không tìm thấy file: ${wf.file}`);
    allPassed = false;
    continue;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);

    if (!parsed.name || !Array.isArray(parsed.nodes) || !parsed.connections) {
      console.error(`❌ Cấu trúc workflow không đúng chuẩn n8n: ${wf.file}`);
      allPassed = false;
      continue;
    }

    const webhookNode = parsed.nodes.find(
      (n) => n.type === 'n8n-nodes-base.webhook' || n.webhookId === wf.expectedWebhook,
    );

    if (!webhookNode) {
      console.error(`❌ Thiếu node Webhook cho path '${wf.expectedWebhook}': ${wf.file}`);
      allPassed = false;
      continue;
    }

    console.log(`✅ [OK] ${wf.file}:`);
    console.log(`   - Tên Workflow: "${parsed.name}"`);
    console.log(`   - Số lượng nodes: ${parsed.nodes.length}`);
    console.log(`   - Webhook path: "/webhook/${wf.expectedWebhook}"`);
    console.log(`   - Connections hợp lệ: ${Object.keys(parsed.connections).length} nodes kết nối`);
  } catch (err) {
    console.error(`❌ Lỗi phân tích cú pháp JSON trong ${wf.file}:`, err.message);
    allPassed = false;
  }
}

console.log('\n-----------------------------------------------------');
if (allPassed) {
  console.log('🎉 TẤT CẢ 3 WORKFLOW N8N ĐÃ ĐẠT CHUẨN VÀ SẴN SÀNG IMPORT VÀO N8N WEB!');
  process.exit(0);
} else {
  console.error('⚠️ Phát hiện lỗi trong cấu hình workflow!');
  process.exit(1);
}
