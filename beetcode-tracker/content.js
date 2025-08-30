function extractProblemInfo() {
  const url = window.location.href;
  const problemMatch = url.match(/\/problems\/([^\/]+)/);
  
  if (!problemMatch) return null;
  
  const problemSlug = problemMatch[1];
  const titleElement = document.querySelector('h1[data-cy="question-title"], .css-v3d350');
  const problemTitle = titleElement?.textContent?.trim() || problemSlug;
  
  return {
    id: problemSlug,
    name: problemTitle,
    url: url.split('?')[0],
    completed: true,
    completedAt: Date.now()
  };
}

function detectSubmissionSuccess() {
  const successIndicators = [
    '[data-e2e-locator="console-result"]',
    '.success',
    '[class*="success"]',
    '.text-green-s'
  ];
  
  for (const selector of successIndicators) {
    const element = document.querySelector(selector);
    if (element && element.textContent.toLowerCase().includes('accepted')) {
      return true;
    }
  }
  
  return false;
}

function handleProblemCompletion() {
  const problemInfo = extractProblemInfo();
  if (!problemInfo) return;
  
  chrome.runtime.sendMessage({
    type: 'PROBLEM_COMPLETED',
    problem: problemInfo
  });
}

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList' || mutation.type === 'characterData') {
      if (detectSubmissionSuccess()) {
        handleProblemCompletion();
      }
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true
});

window.addEventListener('load', () => {
  if (detectSubmissionSuccess()) {
    handleProblemCompletion();
  }
});