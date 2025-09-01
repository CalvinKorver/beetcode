function extractProblemInfo(isCompleted = false) {
  const status = isCompleted ? 'COMPLETED' : 'ATTEMPTED';
  console.log("BeetCode: Extracting problem info with status:", status);
  const url = window.location.href;
  const problemMatch = url.match(/\/problems\/([^\/]+)/);
  
  if (!problemMatch) return null;
  
  const problemSlug = problemMatch[1];
  const titleElement = document.querySelector('#qd-content a[href*="/problems/"]:not([href*="/discuss/"])');
  console.log('BeetCode: Title element found:', titleElement);
  const rawTitle = titleElement?.textContent?.trim() || problemSlug;
  
  // Extract leetcode ID and clean title
  const leetcodeIdMatch = rawTitle.match(/^(\d+)\.\s*/);
  const leetcodeId = leetcodeIdMatch ? leetcodeIdMatch[1] : null;
  const problemTitle = leetcodeId ? rawTitle.replace(/^\d+\.\s*/, '') : rawTitle;
  
  // Extract difficulty
  const difficultyElement = document.querySelector('div[class*="text-difficulty-"]');
  let difficulty = null;
  if (difficultyElement) {
    const difficultyText = difficultyElement.textContent?.trim().toLowerCase();
    if (['easy', 'medium', 'hard'].includes(difficultyText)) {
      difficulty = difficultyText;
    }
  }
  console.log('BeetCode: Difficulty found:', difficulty);
  
  return {
    id: problemSlug,
    leetcodeId: leetcodeId,
    name: problemTitle,
    difficulty: difficulty,
    url: url.split('?')[0],
    status: status,
    lastAttempted: Date.now(),
    completedAt: status === 'COMPLETED' ? Date.now() : null,
    timeEntries: []
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

function attachRunButtonListener() {
  const runButton = document.querySelector('button[data-e2e-locator="console-run-button"]');
  
  if (runButton && !runButton.hasAttribute('data-beetcode-listener')) {
    runButton.setAttribute('data-beetcode-listener', 'true');
    runButton.addEventListener('click', () => {
      console.log('BeetCode: Run button Eclicked, marking as attempted...');
      handleProblemSubmission(false);
    });
  }
}

const observer = new MutationObserver(() => {
  attachSubmitButtonListener();
  attachRunButtonListener();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log('BeetCode: Content script loaded');
console.log('BeetCode: Current URL:', window.location.href);

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_DURATION') {
    console.log('BeetCode: Extract duration requested for problem:', message.problemId);
    
    // Look for the nav element and duration
    const navElement = document.querySelector('#__next > div.flex.min-w-\\[360px\\].flex-col.text-label-1.dark\\:text-dark-label-1.overflow-x-auto.bg-sd-background-gray.h-\\[100vh\\] > div > div > div.relative > nav');
    console.log('BeetCode: Nav element found:', navElement);
    
    if (navElement) {
      const durationElement = navElement.querySelector('div.select-none.text-sm.text-sd-blue-400');
      console.log('BeetCode: Duration element found:', durationElement);
      
      if (durationElement) {
        const duration = durationElement.textContent.trim();
        console.log('BeetCode: Extracted duration:', duration);
        
        // Send the duration back to background script to store
        chrome.runtime.sendMessage({
          type: 'LOG_TIME_ENTRY',
          problemId: message.problemId,
          duration: duration,
          timestamp: Date.now()
        }, (response) => {
          // Wait for background script confirmation before responding
          if (response && response.success) {
            sendResponse({ success: true, duration: duration });
          } else {
            sendResponse({ success: false, error: 'Failed to save time entry' });
          }
        });
      } else {
        console.log('BeetCode: Duration element not found');
        sendResponse({ success: false, error: 'Duration element not found' });
      }
    } else {
      console.log('BeetCode: Nav element not found');
      sendResponse({ success: false, error: 'Nav element not found' });
    }
    
    return true; // Keep the message channel open for async response
  }
});

window.addEventListener('load', () => {
  console.log('BeetCode: Page loaded, attaching listeners');
  attachSubmitButtonListener();
  attachRunButtonListener();
});