document.addEventListener('DOMContentLoaded', async () => {
  await loadProblems();
});

async function loadProblems() {
  try {
    const result = await chrome.storage.local.get(['problems']);
    const problems = result.problems || {};
    
    console.log('Raw storage result:', result);
    console.log('Problems from storage:', problems);
    console.log('Problems keys:', Object.keys(problems));
    
    displayProblems(problems);
  } catch (error) {
    console.error('Error loading problems:', error);
  }
}

function displayProblems(problems) {
  const problemsList = document.getElementById('problems-list');
  const emptyState = document.getElementById('empty-state');
  const completedCount = document.getElementById('completed-count');
  const attemptedCount = document.getElementById('attempted-count');
  
  const problemsArray = Object.values(problems);
  console.log('All problems:', problemsArray);
  
  const completedProblems = problemsArray.filter(p => p && (p.status === 'COMPLETED' || p.completed === true));
  const attemptedProblems = problemsArray.filter(p => p && p.status !== 'COMPLETED' && p.completed !== true);
  
  console.log('Completed problems:', completedProblems);
  console.log('Attempted problems:', attemptedProblems);
  
  completedCount.textContent = completedProblems.length;
  attemptedCount.textContent = attemptedProblems.length;
  
  const attemptedSection = document.getElementById('attempted-section');
  const completedSection = document.getElementById('completed-section');
  const attemptedList = document.getElementById('attempted-list');
  const completedList = document.getElementById('completed-list');
  
  if (problemsArray.length === 0) {
    emptyState.style.display = 'block';
    attemptedSection.style.display = 'none';
    completedSection.style.display = 'none';
    return;
  }
  
  emptyState.style.display = 'none';
  
  // Show/hide sections based on content
  attemptedSection.style.display = attemptedProblems.length > 0 ? 'block' : 'none';
  completedSection.style.display = completedProblems.length > 0 ? 'block' : 'none';
  
  // Populate attempted problems
  attemptedList.innerHTML = attemptedProblems
    .sort((a, b) => b.lastAttempted - a.lastAttempted)
    .map(problem => `
      <div class="problem-item ${problem.status ? problem.status.toLowerCase() : 'unknown'}">
        <div class="problem-header">
          <div class="problem-name">${problem.name}</div>
        </div>
        <div class="problem-meta">
          <span class="problem-id">#${problem.leetcodeId || 'N/A'}</span>
          <span class="problem-status">Attempted</span>
          <a href="${problem.url}" target="_blank" class="problem-link">View</a>
        </div>
      </div>
    `).join('');
  
  // Populate completed problems
  completedList.innerHTML = completedProblems
    .sort((a, b) => b.lastAttempted - a.lastAttempted)
    .map(problem => `
      <div class="problem-item ${problem.status ? problem.status.toLowerCase() : 'unknown'}">
        <div class="problem-header">
          <div class="problem-name">${problem.name}</div>
          <div class="checkmark">✓</div>
        </div>
        <div class="problem-meta">
          <span class="problem-id">#${problem.leetcodeId || 'N/A'}</span>
          <a href="${problem.url}" target="_blank" class="problem-link">View</a>
        </div>
      </div>
    `).join('');
}