document_start
document.addEventListener('DOMContentLoaded', () => {
  const contentDiv = document.getElementById('content');

  function updatePopup() {
    chrome.runtime.sendMessage({ type: 'GET_RESULT' }, (result) => {
      if (chrome.runtime.lastError) {
        contentDiv.innerHTML = '<p class="status-phishing">Communication Error. Please reload the extension.</p>';
        return;
      }

      if (!result) {
        contentDiv.innerHTML = `
          <div class="loader">
            <p>Scanning current page...</p>
            <p style="font-size: 0.7rem; color: #71717a; margin-top: 10px;">
              Note: If this is the first scan today, the Render server might take up to 60 seconds to "wake up".
            </p>
            <button id="retry-btn" style="background: #3f3f46; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-top: 10px;">Refresh Status</button>
          </div>
        `;
        document.getElementById('retry-btn')?.addEventListener('click', updatePopup);
        return;
      }

      const isPhishing = result.status === 'Phishing';
      const isSuspicious = result.status === 'Suspicious';
      const statusClass = isPhishing ? 'status-phishing' : isSuspicious ? 'status-suspicious' : 'status-safe';
      const icon = isPhishing ? '🚨' : isSuspicious ? '⚠️' : '✅';

      let html = `
        <div style="font-size: 2rem">${icon}</div>
        <div class="${statusClass}" style="font-size: 1.2rem; font-weight: bold; margin-top: 8px;">
          ${result.status}
        </div>
        <div class="score ${statusClass}">
          ${result.risk_score} / 100
        </div>
        <div style="font-size: 0.8rem; color: #a1a1aa">Risk Score</div>
      `;

      if (result.explanation && result.explanation.length > 0 && result.status !== 'Safe') {
        html += `
          <div class="reasons">
            <strong>Analysis:</strong>
            <ul>
              ${result.explanation.map(exp => `<li>${exp}</li>`).join('')}
            </ul>
          </div>
        `;
      }

      contentDiv.innerHTML = html;
    });
  }

  updatePopup();
});
