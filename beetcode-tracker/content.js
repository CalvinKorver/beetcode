function getBaseProblemUrl(url) {
  const parts = url.split('/');
  if (parts.length >= 5 && parts[3] === 'problems') {
    return parts.slice(0, 5).join('/') + '/';
  }
  return null;
}

function updateProblemInfo(existingProblem, newData) {
  // Enrich existing problem with new data, only updating null/empty fields
  const updated = { ...existingProblem };
  
  if (!updated.name && newData.name) {
    updated.name = newData.name;
    console.log('BeetCode: Updated problem name:', newData.name);
  }
  
  if (!updated.leetcodeId && newData.leetcodeId) {
    updated.leetcodeId = newData.leetcodeId;
    console.log('BeetCode: Updated leetcode ID:', newData.leetcodeId);
  }
  
  if (!updated.difficulty && newData.difficulty) {
    updated.difficulty = newData.difficulty;
    console.log('BeetCode: Updated difficulty:', newData.difficulty);
  }
  
  // Always update lastAttempted and status if provided
  if (newData.lastAttempted) {
    updated.lastAttempted = newData.lastAttempted;
  }
  
  if (newData.status) {
    updated.status = newData.status;
  }
  
  if (newData.completedAt) {
    updated.completedAt = newData.completedAt;
  }
  
  return updated;
}

function extractProblemInfo(status = 'TRACKING') {
  console.log("BeetCode: Extracting problem info with status:", status);
  const url = window.location.href;
  const normalizedUrl = getBaseProblemUrl(url);
  
  if (!normalizedUrl) {
    console.error('BeetCode: Could not normalize URL:', url);
    return null;
  }
  
  const problemMatch = url.match(/\/problems\/([^\/]+)/);
  
  if (!problemMatch) return null;
  
  const problemSlug = problemMatch[1];
  
  // Try to extract title, leetcodeId, and difficulty - but they might not be available on all pages
  const titleElement = document.querySelector('#qd-content a[href*="/problems/"]:not([href*="/discuss/"])');
  console.log('BeetCode: Title element found:', titleElement);
  
  let leetcodeId = null;
  let problemTitle = null;
  let difficulty = null;
  
  if (titleElement) {
    const rawTitle = titleElement.textContent?.trim();
    if (rawTitle && rawTitle !== problemSlug) {
      // Extract leetcode ID and clean title
      const leetcodeIdMatch = rawTitle.match(/^(\d+)\.\s*/);
      leetcodeId = leetcodeIdMatch ? leetcodeIdMatch[1] : null;
      problemTitle = leetcodeId ? rawTitle.replace(/^\d+\.\s*/, '') : rawTitle;
    }
  }
  
  // Extract difficulty if available
  const difficultyElement = document.querySelector('div[class*="text-difficulty-"]');
  if (difficultyElement) {
    const difficultyText = difficultyElement.textContent?.trim().toLowerCase();
    if (['easy', 'medium', 'hard'].includes(difficultyText)) {
      difficulty = difficultyText;
    }
  }
  
  console.log('BeetCode: Extracted - leetcodeId:', leetcodeId, 'title:', problemTitle, 'difficulty:', difficulty);
  
  return {
    id: problemSlug, // slug is the primary key
    leetcodeId: leetcodeId, // might be null
    name: problemTitle, // might be null
    difficulty: difficulty, // might be null
    url: normalizedUrl,
    status: status,
    lastAttempted: Date.now(),
    completedAt: status === 'COMPLETED' ? Date.now() : null,
    timeEntries: []
  };
}

async function waitForResult(maxRetries = 20, currentRetry = 0) {
  console.log(`BeetCode: Checking for submission result (attempt ${currentRetry + 1}/${maxRetries})`);
  
  // Try multiple selectors to find the result
  const resultSelectors = [
    'span[data-e2e-locator="submission-result"]',
    '[data-e2e-locator="submission-result"]',
    '.text-green-s', // Success result styling
    '.text-red-s',   // Error result styling  
    '[class*="text-green"]', // Generic green text (success)
    '[class*="text-red"]',   // Generic red text (error)
    'div[data-track-load="description_content"] span', // Result in description area
    '.text-lg.font-medium' // Large result text
  ];
  
  let result = null;
  let resultElement = null;
  
  for (const selector of resultSelectors) {
    const elements = document.querySelectorAll(selector);
    console.log(`BeetCode: Checking selector "${selector}", found ${elements.length} elements`);
    
    for (const element of elements) {
      const text = element.textContent?.trim();
      console.log(`BeetCode: Element text: "${text}"`);
      
      if (text && (
        text.includes('Accepted') || 
        text.includes('Wrong Answer') ||
        text.includes('Time Limit Exceeded') ||
        text.includes('Runtime Error') ||
        text.includes('Compilation Error') ||
        text.includes('Memory Limit Exceeded') ||
        text.includes('Output Limit Exceeded')
      )) {
        result = text;
        resultElement = element;
        console.log('BeetCode: Found result with selector:', selector, '-> Result:', result);
        break;
      }
    }
    if (result) break;
  }
  
  if (result) {
    console.log('BeetCode: Final result found:', result);
    const isAccepted = result.includes('Accepted');
    await handleProblemSubmission(isAccepted);
    return;
  }
  
  if (currentRetry < maxRetries - 1) {
    setTimeout(async () => {
      await waitForResult(maxRetries, currentRetry + 1);
    }, 1000); // Increased wait time to 1 second
  } else {
    console.log('BeetCode: Max retries reached, recording attempt as failed');
    await handleProblemSubmission(false);
  }
}

async function handleProblemSubmission(isCompleted) {
  console.log('BeetCode: Handling problem submission with completed:', isCompleted);
  
  // Extract current duration from the page
  const duration = extractDurationFromPage();
  if (!duration) {
    console.error('BeetCode: Could not extract duration from page');
    return;
  }
  
  const url = getBaseProblemUrl(window.location.href);
  
  if (!url) {
    console.error('BeetCode: Could not normalize URL for submission');
    return;
  }
  
  console.log('BeetCode: Submitting with normalized URL:', url);
  
  // Send submission data to background script
  chrome.runtime.sendMessage({
    type: 'PROBLEM_SUBMISSION',
    url: url,
    duration: duration,
    isCompleted: isCompleted,
    timestamp: Date.now()
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('BeetCode: Runtime error in PROBLEM_SUBMISSION:', chrome.runtime.lastError);
    } else if (response && response.success) {
      console.log('BeetCode: Submission successfully recorded in background');
    } else {
      console.error('BeetCode: Failed to record submission:', response?.error || 'Unknown error');
    }
  });
  
  console.log('BeetCode: Submission sent with duration:', duration, 'completed:', isCompleted);
}

function extractDurationFromPage() {
  // Look for the nav element and duration (same logic as before)
  const navElement = document.querySelector('#__next > div.flex.min-w-\\[360px\\].flex-col.text-label-1.dark\\:text-dark-label-1.overflow-x-auto.bg-sd-background-gray.h-\\[100vh\\] > div > div > div.relative > nav');
  
  if (navElement) {
    const durationElement = navElement.querySelector('div.select-none.text-sm.text-sd-blue-400');
    if (durationElement) {
      return durationElement.textContent.trim();
    }
  }
  
  console.log('BeetCode: Duration element not found');
  return null;
}

function attachSubmitButtonListener() {
  // More comprehensive button search - look for multiple possible submit button patterns
  const submitButtons = document.querySelectorAll('button');
  
  console.log('BeetCode: Found', submitButtons.length, 'buttons on page');
  
  submitButtons.forEach((button, index) => {
    const buttonText = button.textContent?.trim().toLowerCase();
    const spanElement = button.querySelector('span');
    const spanText = spanElement?.textContent?.trim().toLowerCase();
    
    console.log(`BeetCode: Button ${index}: "${buttonText}" | Span: "${spanText}"`);
    
    // Check multiple patterns for submit buttons
    const isSubmitButton =
      buttonText === 'submit' ||
      spanText === 'submit' ||
      (buttonText && buttonText.includes('submit')) ||
      (spanText && spanText.includes('submit'));
    
    if (isSubmitButton && !button.hasAttribute('data-beetcode-listener')) {
      console.log('BeetCode: Attaching listener to submit button:', buttonText || spanText);
      button.setAttribute('data-beetcode-listener', 'true');
      
      button.addEventListener('click', async () => {
        console.log('BeetCode: Submit button clicked!', buttonText || spanText);
        
        // Check if there's a problem being tracked for this URL
        const url = getBaseProblemUrl(window.location.href);
        console.log('BeetCode: Checking tracking status for normalized URL:', url);
        
        if (!url) {
          console.error('BeetCode: Could not normalize URL for tracking check');
          return;
        }
        
        try {
          const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
              type: 'CHECK_TRACKING_STATUS',
              url: url
            }, (response) => {
              if (chrome.runtime.lastError) {
                console.error('BeetCode: Runtime error in CHECK_TRACKING_STATUS:', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
              } else {
                resolve(response);
              }
            });
          });
          
          console.log('BeetCode: Tracking status response:', response);
          
          if (response && response.isTracking) {
            console.log('BeetCode: Problem is being tracked, waiting for result...');
            setTimeout(() => {
              waitForResult();
            }, 1000);
          } else {
            console.log('BeetCode: Problem not being tracked, ignoring submission');
          }
        } catch (error) {
          console.error('BeetCode: Error checking tracking status:', error);
        }
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

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'TRACK_PROBLEM') {
    console.log('BeetCode: Track problem requested');
    
    const problemInfo = extractProblemInfo('TRACKING');
    console.log('BeetCode: Extracted problem info:', problemInfo);
    
    if (problemInfo) {
      console.log('BeetCode: Sending START_TRACKING message to background script');
      chrome.runtime.sendMessage({
        type: 'START_TRACKING',
        problem: problemInfo
      }, (response) => {
        console.log('BeetCode: Received response from background script:', response);
        if (chrome.runtime.lastError) {
          console.error('BeetCode: Runtime error:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else if (response && response.success) {
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: response?.error || 'Failed to start tracking' });
        }
      });
    } else {
      console.error('BeetCode: Could not extract problem info');
      sendResponse({ success: false, error: 'Could not extract problem info' });
    }
    
    return true; // Keep the message channel open for async response
  }
});

function checkAndUpdateProblemInfo() {
  // Only try to update if we're on the main problem page (not submissions, discuss, etc.)
  const url = window.location.href;
  const normalizedUrl = getBaseProblemUrl(url);
  
  // Check if this is likely a main problem page (not a subpage)
  if (normalizedUrl && url === normalizedUrl) {
    console.log('BeetCode: On main problem page, checking if we can update problem info');
    
    const problemInfo = extractProblemInfo('ATTEMPTED'); // Don't change status, just get info
    
    if (problemInfo && (problemInfo.name || problemInfo.leetcodeId || problemInfo.difficulty)) {
      console.log('BeetCode: Found problem info to potentially update:', problemInfo);
      
      // Send update request to background script
      chrome.runtime.sendMessage({
        type: 'UPDATE_PROBLEM_INFO',
        problem: problemInfo
      }, (response) => {
        if (response && response.success) {
          console.log('BeetCode: Problem info update sent successfully');
        } else {
          console.log('BeetCode: Problem info update failed or not needed');
        }
      });
    } else {
      console.log('BeetCode: No meaningful problem info found to update');
    }
  } else {
    console.log('BeetCode: Not on main problem page, skipping info update');
  }
}

// Debug function to help understand page state
function debugPageState() {
  console.log('=== BeetCode Debug Info ===');
  console.log('Current URL:', window.location.href);
  console.log('Normalized URL:', getBaseProblemUrl(window.location.href));
  
  const buttons = document.querySelectorAll('button');
  console.log('Found', buttons.length, 'buttons:');
  buttons.forEach((button, i) => {
    if (i < 10) { // Only show first 10 to avoid spam
      const text = button.textContent?.trim();
      const spanText = button.querySelector('span')?.textContent?.trim();
      console.log(`  Button ${i}: "${text}" | Span: "${spanText}"`);
    }
  });
  
  // Check if extension is properly loaded
  console.log('Chrome runtime available:', !!chrome.runtime);
  console.log('Extension ID:', chrome.runtime?.id);
  console.log('========================');
}

// Make debug function available globally
window.beetcodeDebug = debugPageState;

window.addEventListener('load', () => {
  console.log('BeetCode: Page loaded, attaching listeners');
  debugPageState();
  attachSubmitButtonListener();
  
  // Check if we can update problem info for this page
  setTimeout(() => {
    checkAndUpdateProblemInfo();
  }, 1000); // Small delay to ensure page is fully loaded
});