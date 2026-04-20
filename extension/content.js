chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PHISHING_ALERT') {
    const result = message.result;
    
    // Create a massive warning overlay
    const overlay = document.createElement('div');
    overlay.id = 'phishguard-warning-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(239, 68, 68, 0.95)'; // Deep red, almost opaque
    overlay.style.zIndex = '2147483647'; // Max z-index
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.color = 'white';
    overlay.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    
    const title = document.createElement('h1');
    title.textContent = '🚨 WARNING: PHISHING SITE DETECTED 🚨';
    title.style.fontSize = '3rem';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '20px';
    title.style.textAlign = 'center';
    
    const desc = document.createElement('p');
    desc.textContent = 'PhishGuard has flagged this website as extremely dangerous.';
    desc.style.fontSize = '1.5rem';
    desc.style.marginBottom = '40px';
    
    const reasonsTitle = document.createElement('h2');
    reasonsTitle.textContent = 'Reasons:';
    reasonsTitle.style.fontSize = '1.2rem';
    reasonsTitle.style.marginBottom = '10px';
    
    const reasonsList = document.createElement('ul');
    reasonsList.style.textAlign = 'left';
    reasonsList.style.marginBottom = '40px';
    reasonsList.style.fontSize = '1.2rem';
    
    result.explanation.forEach(exp => {
      const li = document.createElement('li');
      li.textContent = exp;
      li.style.marginBottom = '5px';
      reasonsList.appendChild(li);
    });
    
    const btnContainer = document.createElement('div');
    btnContainer.style.display = 'flex';
    btnContainer.style.gap = '20px';
    
    const backBtn = document.createElement('button');
    backBtn.textContent = 'Get me out of here (Safe)';
    backBtn.style.padding = '15px 30px';
    backBtn.style.fontSize = '1.2rem';
    backBtn.style.fontWeight = 'bold';
    backBtn.style.backgroundColor = 'white';
    backBtn.style.color = '#ef4444';
    backBtn.style.border = 'none';
    backBtn.style.borderRadius = '8px';
    backBtn.style.cursor = 'pointer';
    backBtn.onclick = () => window.history.back();
    
    const proceedBtn = document.createElement('button');
    proceedBtn.textContent = 'I understand the risks, proceed anyway';
    proceedBtn.style.padding = '15px 30px';
    proceedBtn.style.fontSize = '1rem';
    proceedBtn.style.backgroundColor = 'transparent';
    proceedBtn.style.color = 'white';
    proceedBtn.style.border = '1px solid white';
    proceedBtn.style.borderRadius = '8px';
    proceedBtn.style.cursor = 'pointer';
    proceedBtn.onclick = () => overlay.remove();
    
    btnContainer.appendChild(backBtn);
    btnContainer.appendChild(proceedBtn);
    
    overlay.appendChild(title);
    overlay.appendChild(desc);
    overlay.appendChild(reasonsTitle);
    overlay.appendChild(reasonsList);
    overlay.appendChild(btnContainer);
    
    document.body.appendChild(overlay);
  }
});
