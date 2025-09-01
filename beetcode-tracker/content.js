function extractProblemInfo(isCompleted = false) {
  const status = isCompleted ? 'COMPLETED' : 'ATTEMPTED';
  console.log("BeetCode: Extracting problem info with status:", status);
  const url = window.location.href;
  const problemMatch = url.match(/\/problems\/([^\/]+)/);
  
  if (!problemMatch) return null;
  
  const problemSlug = problemMatch[1];
  const titleElement = document.querySelector('div.text-title-large.font-semibold a[href*="/problems/"]');
  console.log('BeetCode: Title element found:', titleElement);
  console.log('BeetCode: Raw title text:', titleElement?.textContent);
  console.log('BeetCode: Trimmed title text:', titleElement?.textContent?.trim());
  const rawTitle = titleElement?.textContent?.trim() || problemSlug;
  console.log('BeetCode: Raw problem title:', rawTitle);
  console.log('BeetCode: Problem slug fallback:', problemSlug);
  
  // Extract leetcode ID and clean title
  const leetcodeIdMatch = rawTitle.match(/^(\d+)\.\s*/);
  const leetcodeId = leetcodeIdMatch ? leetcodeIdMatch[1] : null;
  const problemTitle = leetcodeId ? rawTitle.replace(/^\d+\.\s*/, '') : rawTitle;
  
  console.log('BeetCode: Extracted leetcodeId:', leetcodeId);
  console.log('BeetCode: Cleaned problem title:', problemTitle);
  
  return {
    id: problemSlug,
    leetcodeId: leetcodeId,
    name: problemTitle,
    url: url.split('?')[0],
    status: status,
    lastAttempted: Date.now(),
    completedAt: status === 'COMPLETED' ? Date.now() : null
  };
}

function waitForResult(maxRetries = 10, currentRetry = 0) {
  console.log(`BeetCode: Checking for submission result (attempt ${currentRetry + 1}/${maxRetries})`);
  
  const resultSpan = document.querySelector('span[data-e2e-locator="submission-result"]');
  
  if (resultSpan && resultSpan.textContent?.trim()) {
    const result = resultSpan.textContent.trim();
    console.log('BeetCode: Found result:', result);
    
    if (result === 'Accepted') {
      handleProblemSubmission(true);
    } else {
      handleProblemSubmission(false);
    }
    return;
  }
  
  if (currentRetry < maxRetries - 1) {
    setTimeout(() => {
      waitForResult(maxRetries, currentRetry + 1);
    }, 500);
  } else {
    console.log('BeetCode: Max retries reached, marking as attempted');
    handleProblemSubmission(false);
  }
}

function handleProblemSubmission(isCompleted) {
  console.log('BeetCode: Handling problem submission with completed:', isCompleted);
  const problemInfo = extractProblemInfo(isCompleted);
  console.log('BeetCode: Problem info:', problemInfo);
  if (!problemInfo) return;
  
  chrome.runtime.sendMessage({
    type: 'PROBLEM_SUBMITTED',
    problem: problemInfo
  });
  console.log('BeetCode: Message sent to background script');
}

function attachSubmitButtonListener() {
  const submitButtons = document.querySelectorAll('button');
  
  submitButtons.forEach(button => {
    const spanElement = button.querySelector('span');
    if (spanElement && spanElement.textContent?.trim() === 'Submit' && !button.hasAttribute('data-beetcode-listener')) {
      button.setAttribute('data-beetcode-listener', 'true');
      button.addEventListener('click', () => {
        console.log('BeetCode: Submit button clicked, waiting for result...');
        setTimeout(() => {
          waitForResult();
        }, 1000);
      });
    }
  });
}

const observer = new MutationObserver(() => {
  attachSubmitButtonListener();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log('BeetCode: Content script loaded');
console.log('BeetCode: Current URL:', window.location.href);

window.addEventListener('load', () => {
  console.log('BeetCode: Page loaded, attaching listeners');
  attachSubmitButtonListener();
});