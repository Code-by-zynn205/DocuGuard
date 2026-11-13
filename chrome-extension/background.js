const DEFAULT_SETTINGS = {
  apiBaseUrl: 'http://localhost:3001',
  userEmail: '',
  saveToDrive: true,
  notifyGmail: false,
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'docuguard-clip-selection',
    title: '🛡️ Phân loại & Lưu vào DocuGuard AI',
    contexts: ['selection'],
  });
});

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => resolve(items));
  });
}

async function sendClipToBackend(payload) {
  const settings = await getSettings();
  const baseUrl = (settings.apiBaseUrl || 'http://localhost:3001').replace(/\/+$/, '');

  const res = await fetch(`${baseUrl}/api/web-clipper/clip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      selectedText: payload.selectedText,
      pageTitle: payload.pageTitle,
      sourceUrl: payload.sourceUrl,
      sourcePlatform: payload.sourcePlatform,
      userEmail: settings.userEmail || undefined,
      saveToDrive: settings.saveToDrive,
      notifyGmail: settings.notifyGmail,
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.message || `HTTP ${res.status}`);
  }
  return json?.data ?? json;
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'docuguard-clip-selection' || !info.selectionText) return;

  try {
    const result = await sendClipToBackend({
      selectedText: info.selectionText,
      pageTitle: tab?.title || 'Web Selection',
      sourceUrl: info.pageUrl || tab?.url || '',
    });

    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'DOCUGUARD_TOAST',
        success: true,
        message: `Đã lưu [${result.classification?.category || 'other'}]: ${result.document?.title || 'Thành công'}`,
      });
    }
  } catch (err) {
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'DOCUGUARD_TOAST',
        success: false,
        message: `Lỗi lưu DocuGuard: ${err.message}`,
      });
    }
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'DOCUGUARD_CLIP_TEXT') {
    sendClipToBackend(message.payload)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
  return false;
});

