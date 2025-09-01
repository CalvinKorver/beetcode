function convertDurationToMinutes(duration) {
  if (!duration || typeof duration !== 'string') return 0;
  
  const parts = duration.split(':');
  if (parts.length !== 3) return 0;
  
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  const seconds = parseInt(parts[2], 10) || 0;
  
  return hours * 60 + minutes + Math.round(seconds / 60);
}

function getDifficultyStyle(difficulty) {
  switch (difficulty) {
    case 'easy':
      return 'background-color: #dcfce7; color: #15803d;';
    case 'medium':
      return 'background-color: #fef3c7; color: #d97706;';
    case 'hard':
      return 'background-color: #fecaca; color: #dc2626;';
    default:
      return 'background-color: #f3f4f6; color: #374151;';
  }
}

function getShortestTimeDisplay(timeEntries) {
  if (!timeEntries || timeEntries.length === 0) return '';
  
  const shortestEntry = timeEntries
    .map(entry => ({
      ...entry,
      totalMinutes: convertDurationToMinutes(entry.duration)
    }))
    .sort((a, b) => a.totalMinutes - b.totalMinutes)[0];
  
  // Convert hh:mm:ss to mm:ss format
  const parts = shortestEntry.duration.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  const seconds = parts[2] || '00';
  
  const totalMinutes = hours * 60 + minutes;
  const displayTime = `${totalMinutes}:${seconds}`;
  
  return `Best: <strong>${displayTime}</strong> ✓`;
}

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
  
  const problemsArray = Object.values(problems);
  console.log('All problems:', problemsArray);
  
  const completedProblems = problemsArray.filter(p => p && (p.status === 'COMPLETED' || p.completed === true));
  const attemptedProblems = problemsArray.filter(p => p && p.status !== 'COMPLETED' && p.completed !== true);
  
  console.log('Completed problems:', completedProblems);
  console.log('Attempted problems:', attemptedProblems);
  
  
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
          <div class="problem-name">${problem.name}${problem.difficulty ? ` <span class="difficulty difficulty-${problem.difficulty}" style="font-size: 12px; padding: 2px 6px; border-radius: 12px; ${getDifficultyStyle(problem.difficulty)}">${problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}</span>` : ''}</div>
          <a href="${problem.url}" target="_blank" class="problem-link">View</a>
        </div>
        <div class="problem-meta" style="display: flex; justify-content: space-between; align-items: center;">
          <span class="shortest-time">${getShortestTimeDisplay(problem.timeEntries) || ''}</span>
          <img src="clock-regular-full.png" class="log-time-icon" data-problem-id="${problem.id}" style="cursor: pointer; width: 16px; height: 16px; margin-top: 4px; padding-right: 2px;" alt="Log Time">
        </div>
      </div>
    `).join('');
  
  // Populate completed problems
  completedList.innerHTML = completedProblems
    .sort((a, b) => b.lastAttempted - a.lastAttempted)
    .map(problem => `
      <div class="problem-item ${problem.status ? problem.status.toLowerCase() : 'unknown'}">
        <div class="problem-header">
          <div class="problem-name">${problem.name}${problem.difficulty ? ` <span class="difficulty difficulty-${problem.difficulty}" style="font-size: 12px; padding: 2px 6px; border-radius: 12px; ${getDifficultyStyle(problem.difficulty)}">${problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}</span>` : ''}</div>
          <a href="${problem.url}" target="_blank" class="problem-link">View</a>
        </div>
        <div class="problem-meta" style="display: flex; justify-content: space-between; align-items: center;">
          <span class="shortest-time">${getShortestTimeDisplay(problem.timeEntries) || ''}</span>
          <img src="clock-regular-full.png" class="log-time-icon" data-problem-id="${problem.id}" style="cursor: pointer; width: 16px; height: 16px; margin-top: 4px; padding-right: 2px;" alt="Log Time">
        </div>
      </div>
    `).join('');
  
  // Add click listeners to Log Time icons
  document.querySelectorAll('.log-time-icon').forEach(icon => {
    icon.addEventListener('click', async (e) => {
      const problemId = e.target.getAttribute('data-problem-id');
      console.log('Log Time clicked for problem:', problemId);
      
      // Send message to content script to extract duration
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url && tab.url.includes('leetcode.com')) {
          chrome.tabs.sendMessage(tab.id, { 
            type: 'EXTRACT_DURATION',
            problemId: problemId 
          }, (response) => {
            if (response && response.success) {
              console.log('Duration logged successfully:', response.duration);
              // Reload problems to show updated display
              loadProblems();
            } else {
              console.error('Failed to log duration:', response?.error);
            }
          });
        } else {
          console.error('Not on a LeetCode page');
          alert('Please navigate to the LeetCode problem page first');
        }
      } catch (error) {
        console.error('Error sending message to content script:', error);
      }
    });
  });
}