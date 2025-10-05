// Import clients
import { supabase, getStoredSession, clearStoredSession } from './supabase-client.js';
import { beetcodeService } from './BeetcodeServiceClient.js';

// Hardcoded suggested problems
const SUGGESTED_PROBLEMS = [
  {
    id: 'two-sum',
    leetcodeId: '1',
    name: 'Two Sum',
    difficulty: 'easy',
    url: 'https://leetcode.com/problems/two-sum/'
  },
  {
    id: 'add-two-numbers',
    leetcodeId: '2',
    name: 'Add Two Numbers',
    difficulty: 'medium',
    url: 'https://leetcode.com/problems/add-two-numbers/'
  }
];

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

async function checkAuthState() {
  try {
    const session = await getStoredSession();
    const googleSigninBtn = document.getElementById('google-signin-btn');

    if (session) {
      // User is signed in - update dropdown item to show sign out option
      googleSigninBtn.textContent = `Sign out (${session.user.email})`;
      googleSigninBtn.onclick = async () => {
        try {
          console.log('Starting sign out process...');

          // Show loading state
          googleSigninBtn.textContent = 'Signing out...';

          // Perform sign out with enhanced cleanup
          const { error } = await supabase.auth.signOut();

          if (error) {
            console.error('Sign out error:', error);
            alert('Failed to sign out: ' + error.message);
          } else {
            console.log('Extension sign out successful');

            // Open logout page to clear localStorage and show confirmation
            const logoutUrl = chrome.runtime.getURL('logout.html');
            await chrome.tabs.create({ url: logoutUrl });

            // Close the popup
            window.close();
          }
        } catch (error) {
          console.error('Sign out error:', error);
          alert('Failed to sign out: ' + error.message);
          await checkAuthState(); // Reset UI even on error
        }
        // Close settings dropdown
        document.getElementById('settings-dropdown').classList.remove('show');
      };

    } else {
      // User is not signed in
      console.log('User is not signed in');

      // Reset button to sign-in state
      googleSigninBtn.textContent = 'Sign in with Google';

      // Set click handler to sign in
      googleSigninBtn.onclick = async () => {
        try {
          console.log('Starting Google sign-in...');
          const result = await loginWithGoogle();
          console.log('OAuth flow initiated');
        } catch (error) {
          console.error('Google sign-in failed:', error);
          alert('Failed to sign in with Google: ' + error.message);
        }
        // Close settings dropdown
        document.getElementById('settings-dropdown').classList.remove('show');
      };
    }
  } catch (error) {
    console.error('Error checking auth state:', error);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthState();
  await loadProblems();

  // Add close button listener
  const closeBtn = document.getElementById('close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      window.close();
    });
  }

  // Add settings dropdown toggle listener
  const settingsBtn = document.getElementById('settings-btn');
  const settingsDropdown = document.getElementById('settings-dropdown');
  
  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsDropdown.classList.toggle('show');
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!settingsBtn.contains(e.target) && !settingsDropdown.contains(e.target)) {
      settingsDropdown.classList.remove('show');
    }
  });
  
  // Add CSV export listener
  const exportCsvBtn = document.getElementById('export-csv-btn');
  exportCsvBtn.addEventListener('click', async () => {
    await exportToCSV();
    settingsDropdown.classList.remove('show');
  });

  // Add test API call listener
  const testApiBtn = document.getElementById('test-api-btn');
  testApiBtn.addEventListener('click', async () => {
    try {
      console.log('Test API button clicked');
      const result = await beetcodeService.testConnection();

      if (result.success) {
        alert(`API test successful!\n${result.message}\nCheck console for details.`);
      } else {
        alert(`API test failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Test API error:', error);
      alert(`API test error: ${error.message}`);
    }
    settingsDropdown.classList.remove('show');
  });
  
  // Add event listener for remove buttons (using event delegation)
  document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('remove-button')) {
      const problemId = e.target.getAttribute('data-problem-id');
      if (problemId) {
        await removeProblem(problemId);
      }
    }
  });
  
  // Add Track Problem button listener
  const trackButton = document.getElementById('track-problem-btn');
  trackButton.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && tab.url.includes('leetcode.com')) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'TRACK_PROBLEM'
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Runtime error details:', {
              message: chrome.runtime.lastError.message,
              error: chrome.runtime.lastError
            });
            alert('Error: ' + (chrome.runtime.lastError.message || 'Could not communicate with content script. Please refresh the LeetCode page and try again.'));
          } else if (response && response.success) {
            console.log('Problem tracking started successfully');
            // Reload problems to show updated display
            loadProblems();
          } else {
            console.error('Failed to start tracking:', response?.error);
            alert('Failed to start tracking: ' + (response?.error || 'Unknown error'));
          }
        });
      } else {
        console.error('Not on a LeetCode page');
        alert('Please navigate to the LeetCode problem page first');
      }
    } catch (error) {
      console.error('Error sending track message to content script:', error);
      alert('Error: ' + error.message);
    }
  });


  // Listen for storage changes (when auth completes in background)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.session) {
      console.log('Session changed, refreshing auth state');
      checkAuthState();
    }
  });
});

/**
 * Method used to login with google provider.
 */
async function loginWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: chrome.identity.getRedirectURL(),
    },
  });
  if (error) throw error;

  await chrome.tabs.create({ url: data.url });
}

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

function getActiveProblems(problemsArray, status) {
  return problemsArray.filter(p => p && p.status === status && !p.isDeleted);
}

function displayProblems(problems) {
  const problemsList = document.getElementById('problems-list');
  const emptyState = document.getElementById('empty-state');

  const problemsArray = Object.values(problems);
  console.log('All problems:', problemsArray);

  const inProgressProblems = getActiveProblems(problemsArray, 'TRACKING');
  const attemptedProblems = getActiveProblems(problemsArray, 'ATTEMPTED');

  console.log('In-progress problems:', inProgressProblems);
  console.log('Attempted problems:', attemptedProblems);

  // Filter suggested problems - exclude any that are already tracked or attempted
  const trackedProblemIds = problemsArray
    .filter(p => !p.isDeleted)
    .map(p => p.id);
  const suggestedProblems = SUGGESTED_PROBLEMS.filter(
    problem => !trackedProblemIds.includes(problem.id)
  );

  console.log('Suggested problems:', suggestedProblems);
  console.log('Tracked problem IDs:', trackedProblemIds);

  const inProgressSection = document.getElementById('in-progress-section');
  const attemptedSection = document.getElementById('attempted-section');
  const suggestedSection = document.getElementById('suggested-section');
  const inProgressList = document.getElementById('in-progress-list');
  const attemptedList = document.getElementById('attempted-list');
  const suggestedList = document.getElementById('suggested-list');

  if (problemsArray.length === 0) {
    emptyState.style.display = 'block';
    inProgressSection.style.display = 'none';
    attemptedSection.style.display = 'none';
    // Still show suggested even if no problems tracked yet
    suggestedSection.style.display = suggestedProblems.length > 0 ? 'block' : 'none';
  } else {
    emptyState.style.display = 'none';

    // Show/hide sections based on content
    inProgressSection.style.display = inProgressProblems.length > 0 ? 'block' : 'none';
    attemptedSection.style.display = attemptedProblems.length > 0 ? 'block' : 'none';
    suggestedSection.style.display = suggestedProblems.length > 0 ? 'block' : 'none';
  }

  // Populate in-progress problems
  inProgressList.innerHTML = inProgressProblems
    .sort((a, b) => b.lastAttempted - a.lastAttempted)
    .map(problem => `
      <div class="problem-item tracking">
        <div class="problem-header">
          <div class="problem-name">${problem.name}${problem.difficulty ? ` <span class="difficulty difficulty-${problem.difficulty}" style="font-size: 12px; padding: 2px 6px; border-radius: 12px; ${getDifficultyStyle(problem.difficulty)}">${problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}</span>` : ''}</div>
          <div class="problem-actions">
            <a href="${problem.url}" target="_blank" class="problem-link" title="View problem on LeetCode"><img src="icons/beetcode-32.png" style="height: 16px;" alt="View problem"></a>
            <button class="remove-button" data-problem-id="${problem.id}" title="Stop tracking problem">×</button>
          </div>
        </div>
        <div class="problem-meta" style="display: flex; justify-content: space-between; align-items: center;">
          <span class="attempts-count">${problem.timeEntries ? problem.timeEntries.length : 0} attempts</span>
          <span class="shortest-time">${getShortestTimeDisplay(problem.timeEntries) || ''}</span>
        </div>
      </div>
    `).join('');

  // Populate attempted problems
  attemptedList.innerHTML = attemptedProblems
    .sort((a, b) => b.lastAttempted - a.lastAttempted)
    .map(problem => `
      <div class="problem-item ${problem.status ? problem.status.toLowerCase() : 'unknown'}">
        <div class="problem-header">
          <div class="problem-name">${problem.name}${problem.difficulty ? ` <span class="difficulty difficulty-${problem.difficulty}" style="font-size: 12px; padding: 2px 6px; border-radius: 12px; ${getDifficultyStyle(problem.difficulty)}">${problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}</span>` : ''}</div>
          <div class="problem-actions">
            <a href="${problem.url}" target="_blank" class="problem-link" title="View problem on LeetCode"><img src="icons/beetcode-32.png" style="height: 16px;" alt="View problem"></a>
            <button class="remove-button" data-problem-id="${problem.id}" title="Remove problem">×</button>
          </div>
        </div>
        <div class="problem-meta" style="display: flex; justify-content: space-between; align-items: center;">
          <span class="attempts-count">${problem.timeEntries ? problem.timeEntries.length : 0} attempts</span>
          <span class="shortest-time">${getShortestTimeDisplay(problem.timeEntries) || ''}</span>
        </div>
      </div>
    `).join('');

  // Populate suggested problems (filtered to exclude tracked ones)
  suggestedList.innerHTML = suggestedProblems
    .map(problem => `
      <div class="problem-item suggested">
        <div class="problem-header">
          <div class="problem-name">${problem.name}${problem.difficulty ? ` <span class="difficulty difficulty-${problem.difficulty}" style="font-size: 12px; padding: 2px 6px; border-radius: 12px; ${getDifficultyStyle(problem.difficulty)}">${problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}</span>` : ''}</div>
          <div class="problem-actions">
            <a href="${problem.url}" target="_blank" class="problem-link" title="View problem on LeetCode"><img src="icons/beetcode-32.png" style="height: 16px;" alt="View problem"></a>
          </div>
        </div>
      </div>
    `).join('');
}

async function exportToCSV() {
  try {
    const result = await chrome.storage.local.get(['problems']);
    const problems = result.problems || {};
    const problemsArray = Object.values(problems).filter(p => !p.isDeleted);
    
    if (problemsArray.length === 0) {
      alert('No problems to export!');
      return;
    }
    
    // CSV headers
    const headers = [
      'Problem Name',
      'Difficulty',
      'Status',
      'Total Attempts',
      'Best Time (mm:ss)',
      'Average Time (mm:ss)',
      'First Attempted',
      'Last Attempted',
      'Completed Date',
      'URL'
    ];
    
    // Convert problems to CSV rows
    const csvRows = [headers.join(',')];
    
    problemsArray.forEach(problem => {
      const timeEntries = problem.timeEntries || [];
      const totalAttempts = timeEntries.length;
      
      // Calculate best time
      let bestTime = '';
      let averageTime = '';
      
      if (timeEntries.length > 0) {
        const times = timeEntries.map(entry => convertDurationToMinutes(entry.duration));
        const bestMinutes = Math.min(...times);
        const averageMinutes = Math.round(times.reduce((sum, time) => sum + time, 0) / times.length);
        
        bestTime = formatMinutesToDisplay(bestMinutes);
        averageTime = formatMinutesToDisplay(averageMinutes);
      }
      
      // Format dates
      const firstAttempted = timeEntries.length > 0 
        ? new Date(Math.min(...timeEntries.map(e => e.timestamp))).toLocaleDateString()
        : '';
      
      const lastAttempted = problem.lastAttempted 
        ? new Date(problem.lastAttempted).toLocaleDateString()
        : '';
      
      const completedDate = problem.completedAt 
        ? new Date(problem.completedAt).toLocaleDateString()
        : '';
      
      const row = [
        escapeCSVField(problem.name || ''),
        escapeCSVField(problem.difficulty || ''),
        escapeCSVField(problem.status || ''),
        totalAttempts,
        bestTime,
        averageTime,
        firstAttempted,
        lastAttempted,
        completedDate,
        escapeCSVField(problem.url || '')
      ];
      
      csvRows.push(row.join(','));
    });
    
    // Create and download the CSV file
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      // Generate filename with current date
      const now = new Date();
      const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      link.setAttribute('download', `beetcode-export-${dateString}.csv`);
      
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('CSV export completed successfully');
    }
  } catch (error) {
    console.error('Error exporting CSV:', error);
    alert('Error exporting CSV: ' + error.message);
  }
}

function formatMinutesToDisplay(totalMinutes) {
  if (totalMinutes === 0) return '0:00';
  const minutes = Math.floor(totalMinutes);
  const seconds = Math.round((totalMinutes - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function escapeCSVField(field) {
  if (typeof field !== 'string') {
    field = String(field);
  }
  
  // If field contains comma, newline, or quote, wrap in quotes and escape quotes
  if (field.includes(',') || field.includes('\n') || field.includes('\r') || field.includes('"')) {
    return '"' + field.replace(/"/g, '""') + '"';
  }
  
  return field;
}

async function removeProblem(problemId) {
  try {
    // Show confirmation dialog
    const problemName = await getProblemName(problemId);
    const confirmMessage = problemName 
      ? `Are you sure you want to remove "${problemName}" from your tracking list?`
      : `Are you sure you want to remove this problem from your tracking list?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    // Use lazy deletion (soft delete)
    const result = await chrome.storage.local.get(['problems']);
    const problems = result.problems || {};
    
    if (problems[problemId]) {
      problems[problemId].isDeleted = true;
      await chrome.storage.local.set({ problems });
      
      // Reload problems to update display
      await loadProblems();
      
      console.log('BeetCode: Problem removed successfully:', problemId);
    } else {
      console.warn('BeetCode: Problem not found for removal:', problemId);
    }
  } catch (error) {
    console.error('BeetCode: Error removing problem:', error);
    alert('Failed to remove problem. Please try again.');
  }
}

async function getProblemName(problemId) {
  try {
    const result = await chrome.storage.local.get(['problems']);
    const problems = result.problems || {};
    return problems[problemId]?.name || null;
  } catch (error) {
    console.error('BeetCode: Error getting problem name:', error);
    return null;
  }
}