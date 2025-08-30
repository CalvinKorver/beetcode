document.addEventListener('DOMContentLoaded', async () => {
  await loadProblems();
});

async function loadProblems() {
  try {
    const result = await chrome.storage.local.get(['problems']);
    const problems = result.problems || {};
    
    displayProblems(problems);
  } catch (error) {
    console.error('Error loading problems:', error);
  }
}

function displayProblems(problems) {
  const problemsList = document.getElementById('problems-list');
  const emptyState = document.getElementById('empty-state');
  const completedCount = document.getElementById('completed-count');
  
  const problemsArray = Object.values(problems);
  completedCount.textContent = problemsArray.length;
  
  if (problemsArray.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  
  problemsList.innerHTML = problemsArray
    .sort((a, b) => b.completedAt - a.completedAt)
    .map(problem => `
      <div class="problem-item">
        <div class="problem-name">${problem.name}</div>
        <div class="problem-meta">
          <span class="problem-id">#${problem.id}</span>
          <a href="${problem.url}" target="_blank" class="problem-link">View</a>
        </div>
      </div>
    `).join('');
}