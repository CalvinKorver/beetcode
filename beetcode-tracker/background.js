chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_TRACKING') {
    startTracking(message.problem)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('Error in START_TRACKING:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  } else if (message.type === 'CHECK_TRACKING_STATUS') {
    checkTrackingStatus(message.url)
      .then((isTracking) => {
        sendResponse({ isTracking: isTracking });
      })
      .catch((error) => {
        console.error('Error in CHECK_TRACKING_STATUS:', error);
        sendResponse({ isTracking: false });
      });
    return true;
  } else if (message.type === 'PROBLEM_SUBMISSION') {
    handleSubmission(message.url, message.duration, message.isCompleted, message.timestamp)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('Error in PROBLEM_SUBMISSION:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  } else if (message.type === 'UPDATE_PROBLEM_INFO') {
    updateExistingProblemInfo(message.problem)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('Error in UPDATE_PROBLEM_INFO:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

async function updateExistingProblemInfo(problem) {
  try {
    const result = await chrome.storage.local.get(['problems']);
    const problems = result.problems || {};
    
    // Check if this problem exists (using slug as primary key)
    const existingProblem = problems[problem.id];
    
    if (existingProblem) {
      console.log('BeetCode: Updating existing problem info for:', problem.id);
      
      let wasUpdated = false;
      
      // Only update fields that are currently null/empty
      if (!existingProblem.name && problem.name) {
        existingProblem.name = problem.name;
        wasUpdated = true;
        console.log('BeetCode: Updated name to:', problem.name);
      }
      
      if (!existingProblem.leetcodeId && problem.leetcodeId) {
        existingProblem.leetcodeId = problem.leetcodeId;
        wasUpdated = true;
        console.log('BeetCode: Updated leetcodeId to:', problem.leetcodeId);
      }
      
      if (!existingProblem.difficulty && problem.difficulty) {
        existingProblem.difficulty = problem.difficulty;
        wasUpdated = true;
        console.log('BeetCode: Updated difficulty to:', problem.difficulty);
      }
      
      if (wasUpdated) {
        problems[problem.id] = existingProblem;
        await chrome.storage.local.set({ problems });
        console.log('BeetCode: Problem info updated successfully');
      } else {
        console.log('BeetCode: No new info to update');
      }
    } else {
      console.log('BeetCode: Problem does not exist yet, no update needed');
    }
  } catch (error) {
    console.error('Error updating existing problem info:', error);
    throw error;
  }
}

async function startTracking(problem) {
  try {
    const result = await chrome.storage.local.get(['problems']);
    const problems = result.problems || {};
    
    // Clear any existing tracking problems
    Object.keys(problems).forEach(key => {
      if (problems[key].status === 'TRACKING') {
        problems[key].status = 'ATTEMPTED';
      }
    });
    
    // Check if this problem already exists (using slug as primary key)
    const existingProblem = problems[problem.id];
    
    if (existingProblem) {
      console.log('BeetCode: Problem already exists, merging data for:', problem.id);
      
      // Merge new data with existing, keeping existing non-null values
      const mergedProblem = {
        ...existingProblem,
        // Keep existing values if they exist, otherwise use new ones
        name: existingProblem.name || problem.name,
        leetcodeId: existingProblem.leetcodeId || problem.leetcodeId,
        difficulty: existingProblem.difficulty || problem.difficulty,
        // Update status and timing info
        status: 'TRACKING',
        lastAttempted: problem.lastAttempted,
        url: problem.url, // Always use the normalized URL
        // Preserve existing timeEntries
        timeEntries: existingProblem.timeEntries || []
      };
      
      problems[problem.id] = mergedProblem;
      console.log('BeetCode: Merged problem data:', mergedProblem);
    } else {
      // New problem
      problems[problem.id] = problem;
      console.log('BeetCode: Created new problem:', problem.id);
    }
    
    await chrome.storage.local.set({ problems });
    console.log('BeetCode: Started tracking problem:', problem.id);
  } catch (error) {
    console.error('Error starting tracking:', error);
    throw error;
  }
}

function getSlugFromUrl(url) {
  const parts = url.split('/');
  if (parts.length >= 5 && parts[3] === 'problems') {
    return parts[4];
  }
  return null;
}

async function checkTrackingStatus(url) {
  try {
    const slug = getSlugFromUrl(url);
    console.log('BeetCode: Checking tracking status for slug:', slug);
    
    if (!slug) {
      console.error('BeetCode: Could not extract slug from URL:', url);
      return false;
    }
    
    const result = await chrome.storage.local.get(['problems']);
    const problems = result.problems || {};
    
    console.log('BeetCode: Problems in storage:', Object.keys(problems).length);
    
    // Look up problem by slug (primary key)
    const problem = problems[slug];
    if (problem && problem.status === 'TRACKING') {
      console.log('BeetCode: Found tracking problem:', slug);
      return true;
    }
    
    console.log('BeetCode: No tracking problem found for slug:', slug);
    return false;
  } catch (error) {
    console.error('Error checking tracking status:', error);
    return false;
  }
}

async function handleSubmission(url, duration, isCompleted, timestamp) {
  try {
    const slug = getSlugFromUrl(url);
    console.log('BeetCode: Handling submission for slug:', slug, 'Duration:', duration, 'Completed:', isCompleted);
    
    if (!slug) {
      console.error('BeetCode: Could not extract slug from URL:', url);
      return;
    }
    
    const result = await chrome.storage.local.get(['problems']);
    const problems = result.problems || {};
    
    // Look up problem by slug (primary key)
    const trackingProblem = problems[slug];
    
    if (trackingProblem && trackingProblem.status === 'TRACKING') {
      console.log('BeetCode: Found tracking problem for submission:', slug);
      
      // Add time entry
      if (!trackingProblem.timeEntries) {
        trackingProblem.timeEntries = [];
      }
      
      trackingProblem.timeEntries.push({
        duration: duration,
        timestamp: timestamp,
        date: new Date(timestamp).toISOString()
      });
      
      // Update status and completion info
      trackingProblem.lastAttempted = timestamp;
      if (isCompleted) {
        trackingProblem.status = 'COMPLETED';
        trackingProblem.completedAt = timestamp;
        console.log('BeetCode: Problem completed! Moving to COMPLETED status');
      }
      
      problems[slug] = trackingProblem;
      await chrome.storage.local.set({ problems });
      
      console.log('BeetCode: Submission recorded for problem:', slug, 'Duration:', duration, 'Completed:', isCompleted);
      console.log('BeetCode: Total attempts so far:', trackingProblem.timeEntries.length);
    } else {
      console.error('BeetCode: No tracking problem found for slug:', slug);
      console.error('BeetCode: Available problems:', Object.keys(problems));
      if (trackingProblem) {
        console.error('BeetCode: Problem status is:', trackingProblem.status, '(expected TRACKING)');
      }
    }
  } catch (error) {
    console.error('Error handling submission:', error);
    throw error;
  }
}


