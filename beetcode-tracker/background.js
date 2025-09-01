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
    
    problems[problem.id] = problem;
    
    await chrome.storage.local.set({ problems });
    console.log('Problem saved:', problem);
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