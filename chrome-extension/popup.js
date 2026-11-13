const defaults = {
  apiBaseUrl: 'http://localhost:3001',
  userEmail: '',
  saveToDrive: true,
  notifyGmail: false,
};

const emailEl = document.getElementById('userEmail');
const apiEl = document.getElementById('apiBaseUrl');
const driveEl = document.getElementById('saveToDrive');
const gmailEl = document.getElementById('notifyGmail');
const statusEl = document.getElementById('status');

chrome.storage.sync.get(defaults, (items) => {
  emailEl.value = items.userEmail || '';
  apiEl.value = items.apiBaseUrl || 'http://localhost:3001';
  driveEl.checked = items.saveToDrive !== false;
  gmailEl.checked = Boolean(items.notifyGmail);
});

document.getElementById('saveSettingsBtn').addEventListener('click', () => {
  chrome.storage.sync.set(
    {
      userEmail: emailEl.value.trim(),
      apiBaseUrl: apiEl.value.trim() || 'http://localhost:3001',
      saveToDrive: driveEl.checked,
      notifyGmail: gmailEl.checked,
    },
    () => {
      statusEl.style.color = '#34d399';
      statusEl.textContent = '✅ Đã lưu cấu hình tiện ích!';
    },
  );
});

document.getElementById('clipActiveBtn').addEventListener('click', async () => {
  statusEl.style.color = '#38bdf8';
  statusEl.textContent = '⏳ Đang đọc đoạn văn bản đang bôi đen...';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  const injected = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.getSelection()?.toString() || '',
  });

  const selectedText = injected?.[0]?.result?.trim() || '';
  if (!selectedText) {
    statusEl.style.color = '#fb7185';
    statusEl.textContent = '⚠️ Hãy bôi đen một đoạn dữ liệu trên trang trước!';
    return;
  }

  chrome.runtime.sendMessage(
    {
      type: 'DOCUGUARD_CLIP_TEXT',
      payload: {
        selectedText,
        pageTitle: tab.title || 'Web Clip',
        sourceUrl: tab.url || '',
      },
    },
    (res) => {
      if (res?.ok) {
        statusEl.style.color = '#34d399';
        statusEl.textContent = `✅ Đã lưu [${res.data?.classification?.category}]: ${res.data?.document?.title}`;
      } else {
        statusEl.style.color = '#fb7185';
        statusEl.textContent = `❌ Lỗi: ${res?.error || 'Không kết nối được backend'}`;
      }
    },
  );
});

