document.addEventListener('DOMContentLoaded', () => {
  const contentDiv = document.getElementById('content');

  // Request the status of the current tab from the background script
  chrome.runtime.sendMessage({ type: 'GET_RESULT' }, (result) => {
    if (!result) {
      contentDiv.innerHTML = '<p>No scan data for this page.</p>';
      return;
    }

    const isPhishing = result.status === 'Phishing';
    const isSuspicious = result.status === 'Suspicious';
    const statusClass = isPhishing ? 'status-phishing' : isSuspicious ? 'status-suspicious' : 'status-safe';
    const icon = isPhishing ? '🚨' : isSuspicious ? '⚠️' : '✅';

    let html = `
      <div style=\"font-size: 2rem\">${icon}</div>
      <div class=\"${statusClass}\" style=\"font-size: 1.2rem; font-weight: bold; margin-top: 8px;\">
        ${result.status}
      </div>
      <div class=\"score ${statusClass}\">
        ${result.risk_score} / 100
      </div>
      <div style=\"font-size: 0.8rem; color: #a1a1aa\">Risk Score</div>
    `;

    if (result.explanation && result.explanation.length > 0 && result.status !== 'Safe') {
      html += `
        <div class=\"reasons\">
          <strong>Why?</strong>
          <ul>
            ${result.explanation.map(exp => `<li>${exp}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    contentDiv.innerHTML = html;
  });
});
