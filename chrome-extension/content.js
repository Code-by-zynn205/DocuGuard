(() => {
  let floatingBtn = null;
  let toastEl = null;

  function detectPlatform(url) {
    const lower = (url || '').toLowerCase();
    if (lower.includes('facebook.com') || lower.includes('fb.com')) return 'facebook';
    if (lower.includes('google.com')) return 'google';
    return 'web';
  }

  function showToast(message, isSuccess = true) {
    if (toastEl) toastEl.remove();
    toastEl = document.createElement('div');
    toastEl.textContent = isSuccess ? `🛡️ ${message}` : `⚠️ ${message}`;
    Object.assign(toastEl.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: '2147483647',
      background: isSuccess ? '#0f172a' : '#7f1d1d',
      color: '#f8fafc',
      border: isSuccess ? '1px solid #06b6d4' : '1px solid #fb7185',
      borderRadius: '12px',
      padding: '12px 16px',
      fontSize: '13px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
      maxWidth: '360px',
    });
    document.body.appendChild(toastEl);
    setTimeout(() => {
      if (toastEl) toastEl.remove();
      toastEl = null;
    }, 3800);
  }

  function removeFloatingButton() {
    if (floatingBtn) {
      floatingBtn.remove();
      floatingBtn = null;
    }
  }

  document.addEventListener('mouseup', (event) => {
    if (floatingBtn && floatingBtn.contains(event.target)) return;

    setTimeout(() => {
      const selection = window.getSelection();
      const selectedText = selection ? selection.toString().trim() : '';

      if (!selectedText || selectedText.length < 12) {
        removeFloatingButton();
        return;
      }

      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      const rect = range ? range.getBoundingClientRect() : null;
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        removeFloatingButton();
        return;
      }

      removeFloatingButton();
      floatingBtn = document.createElement('button');
      floatingBtn.type = 'button';
      floatingBtn.textContent = '🛡️ Lưu DocuGuard AI';
      Object.assign(floatingBtn.style, {
        position: 'fixed',
        top: `${Math.max(8, rect.bottom + 8)}px`,
        left: `${Math.min(window.innerWidth - 180, Math.max(8, rect.left))}px`,
        zIndex: '2147483647',
        background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
        color: '#ffffff',
        border: 'none',
        borderRadius: '999px',
        padding: '6px 12px',
        fontSize: '12px',
        fontWeight: '600',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        cursor: 'pointer',
        boxShadow: '0 6px 18px rgba(2,132,199,0.45)',
      });

      floatingBtn.addEventListener('click', () => {
        const textToSave = selectedText;
        removeFloatingButton();
        showToast('Đang gửi AI phân loại & lưu vào DocuGuard...', true);

        chrome.runtime.sendMessage(
          {
            type: 'DOCUGUARD_CLIP_TEXT',
            payload: {
              selectedText: textToSave,
              pageTitle: document.title,
              sourceUrl: window.location.href,
              sourcePlatform: detectPlatform(window.location.href),
            },
          },
          (response) => {
            if (chrome.runtime.lastError || !response?.ok) {
              showToast(
                response?.error || chrome.runtime.lastError?.message || 'Không kết nối được backend',
                false,
              );
              return;
            }
            const cat = response.data?.classification?.category || 'other';
            const title = response.data?.document?.title || 'Tài liệu mới';
            const driveSuffix = response.data?.driveSynced ? ' + Drive' : '';
            showToast(`Đã lưu [${cat}]${driveSuffix}: ${title}`, true);
          },
        );
      });

      document.body.appendChild(floatingBtn);
    }, 10);
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'DOCUGUARD_TOAST') {
      showToast(message.message, message.success);
    }
  });
})();

