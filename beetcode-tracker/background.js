chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PROBLEM_SUBMITTED') {
    saveProblem(message.problem);
  } else if (message.type === 'LOG_TIME_ENTRY') {
    logTimeEntry(message.problemId, message.duration, message.timestamp)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('Error in LOG_TIME_ENTRY:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  } else if (message.type === 'GET_PROBLEM_BY_URL') {
    getProblemByUrl(message.url)
      .then((problem) => {
        sendResponse({ success: true, problem: problem });
      })
      .catch((error) => {
        console.error('Error in GET_PROBLEM_BY_URL:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }
});

async function logTimeEntry(problemId, duration, timestamp) {
  try {
    const result = await chrome.storage.local.get(['problems']);
    const problems = result.problems || {};
    
    if (problems[problemId]) {
      // Initialize timeEntries if it doesn't exist
      if (!problems[problemId].timeEntries) {
        problems[problemId].timeEntries = [];
      }
      
      // Add new time entry
      problems[problemId].timeEntries.push({
        duration: duration,
        timestamp: timestamp,
        date: new Date(timestamp).toISOString()
      });
      
      await chrome.storage.local.set({ problems });
      console.log('Time entry logged for problem:', problemId, 'Duration:', duration);
    } else {
      console.error('Problem not found:', problemId);
    }
  } catch (error) {
    console.error('Error logging time entry:', error);
  }
}

async function saveProblem(problem) {
  try {
    const result = await chrome.storage.local.get(['problems']);
    const problems = result.problems || {};
    
    const existingProblem = problems[problem.id];
    
    if (existingProblem) {
      // Update existing problem - merge with existing data
      const updatedProblem = {
        ...existingProblem,
        ...problem,
        // Preserve important existing data
        timeEntries: existingProblem.timeEntries || problem.timeEntries || [],
        // Don't downgrade status from COMPLETED to ATTEMPTED
        status: existingProblem.status === 'COMPLETED' && problem.status === 'ATTEMPTED' 
          ? 'COMPLETED' 
          : problem.status,
        // Preserve original completion date if it exists
        completedAt: existingProblem.status === 'COMPLETED' 
          ? existingProblem.completedAt 
          : problem.completedAt,
        // Increment attempt count
        attemptCount: (existingProblem.attemptCount || 0) + 1
      };
      
      problems[problem.id] = updatedProblem;
      console.log('Problem updated:', updatedProblem);
    } else {
      // New problem - initialize attemptCount
      const newProblem = {
        ...problem,
        attemptCount: 1,
        timeEntries: problem.timeEntries || []
      };
      
      problems[problem.id] = newProblem;
      console.log('New problem saved:', newProblem);
    }
    
    await chrome.storage.local.set({ problems });
  } catch (error) {
    console.error('Error saving problem:', error);
  }
}

async function getProblems() {
  try {
    const result = await chrome.storage.local.get(['problems']);
    return result.problems || {};
  } catch (error) {
    console.error('Error getting problems:', error);
    return {};
  }
}

async function getProblemByUrl(url) {
  try {
    const result = await chrome.storage.local.get(['problems']);
    const problems = result.problems || {};
    
    // Clean the URL to match the stored format (remove query params)
    const cleanUrl = url.split('?')[0];
    
    // Search through all problems to find one with matching URL
    for (const problem of Object.values(problems)) {
      if (problem && problem.url === cleanUrl) {
        return problem;
      }
    }
    
    return null; // Problem not found
  } catch (error) {
    console.error('Error getting problem by URL:', error);
    return null;
  }
}