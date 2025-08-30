chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PROBLEM_COMPLETED') {
    saveProblem(message.problem);
  }
});

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