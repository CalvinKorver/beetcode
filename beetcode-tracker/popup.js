// Import clients
import { supabase, getStoredSession, clearStoredSession } from './supabase-client.js';
import { backendClient } from './BackendClient.js';
import { config } from './config.js';

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

/**
 * Calculate problem score using the same algorithm as the dashboard
 * @param {Object} problem - Problem object with best_time_seconds, score, last_attempted_at
 * @returns {number} Calculated score
 */
function calculateProblemScore(problem) {
  const now = new Date();
  const lastAttempted = new Date(problem.last_attempted_at);

  // Calculate C_Date
  const daysSinceLastAttempted = Math.floor((now.getTime() - lastAttempted.getTime()) / (1000 * 60 * 60 * 24));
  const minutesSinceLastAttempted = Math.floor((now.getTime() - lastAttempted.getTime()) / (1000 * 60));

  const cDate = daysSinceLastAttempted < 4 ? 1 : minutesSinceLastAttempted;

  // Calculate C_Time
  const timeMinutes = problem.best_time_seconds ? problem.best_time_seconds / 60 : 0;
  let cTime = 0;

  if (timeMinutes < 25) {
    cTime = timeMinutes * 100;
  } else if (timeMinutes < 35) {
    cTime = timeMinutes * 200;
  } else if (timeMinutes < 45) {
    cTime = timeMinutes * 300;
  } else {
    cTime = timeMinutes * 400;
  }

  // Calculate C_Solution
  const cSolution = problem.score === 5 ? 0.5 : (5 - problem.score) + 1;

  // Final formula: round((C_Date + C_Time) * C_Solution)
  return Math.round((cDate + cTime) * cSolution);
}

/**
 * Fetch completed problems from backend API
 * @returns {Promise<Array>} Array of completed problems with metadata
 */
async function fetchCompletedProblems() {
  try {
    const result = await backendClient.getProblems({ status: 'Completed' });
    return result.problems || [];
  } catch (error) {
    console.error('Error fetching completed problems:', error);
    return [];
  }
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

async function checkAuthState() {
  try {
    // Refresh session if we have a refresh token
    let session = await getStoredSession();
    if (session?.refresh_token) {
      console.log('Refreshing session...');
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: session.refresh_token
      });

      if (error) {
        console.error('Failed to refresh session:', error);
        await clearStoredSession();
        session = null;
      } else if (data.session) {
        console.log('Session refreshed successfully');
        session = data.session;
        // Session will be stored by onAuthStateChange handler
      }
    }

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

  // Add logo click listener to open dashboard
  const logoIcon = document.querySelector('.logo-icon');
  if (logoIcon) {
    logoIcon.style.cursor = 'pointer';
    logoIcon.addEventListener('click', () => {
      chrome.tabs.create({ url: config.dashboardUrl });
    });
  }

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
      const result = await backendClient.testConnection();

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
    // Load local problems (in-progress and attempted)
    const result = await chrome.storage.local.get(['problems']);
    const localProblems = result.problems || {};

    console.log('Raw storage result:', result);
    console.log('Problems from storage:', localProblems);
    console.log('Problems keys:', Object.keys(localProblems));

    // Fetch completed problems from backend
    const completedProblems = await fetchCompletedProblems();
    console.log('Completed problems from backend:', completedProblems);

    displayProblems(localProblems, completedProblems);
  } catch (error) {
    console.error('Error loading problems:', error);
  }
}

function getActiveProblems(problemsArray, status) {
  return problemsArray.filter(p => p && p.status === status && !p.isDeleted);
}

function displayProblems(localProblems, completedProblems = []) {
  const emptyState = document.getElementById('empty-state');

  const problemsArray = Object.values(localProblems);
  console.log('All local problems:', problemsArray);
  console.log('Completed problems:', completedProblems);

  const inProgressProblems = getActiveProblems(problemsArray, 'TRACKING');
  const attemptedProblems = getActiveProblems(problemsArray, 'ATTEMPTED');

  console.log('In-progress problems:', inProgressProblems);
  console.log('Attempted problems:', attemptedProblems);

  // Sort completed problems by calculated score (highest first)
  const sortedCompletedProblems = completedProblems
    .map(problem => ({
      ...problem,
      calculatedScore: calculateProblemScore(problem)
    }))
    .sort((a, b) => b.calculatedScore - a.calculatedScore);

  console.log('Sorted completed problems:', sortedCompletedProblems);

  // Filter suggested problems - exclude any that are already tracked or attempted
  const trackedProblemIds = problemsArray
    .filter(p => !p.isDeleted)
    .map(p => p.id);
  const suggestedProblems = SUGGESTED_PROBLEMS.filter(
    problem => !trackedProblemIds.includes(problem.id)
  );

  console.log('Suggested problems:', suggestedProblems);
  console.log('Tracked problem IDs:', trackedProblemIds);

  const completedSection = document.getElementById('completed-section');
  const inProgressSection = document.getElementById('in-progress-section');
  const attemptedSection = document.getElementById('attempted-section');
  const suggestedSection = document.getElementById('suggested-section');
  const completedList = document.getElementById('completed-list');
  const inProgressList = document.getElementById('in-progress-list');
  const attemptedList = document.getElementById('attempted-list');
  const suggestedList = document.getElementById('suggested-list');

  const hasAnyProblems = problemsArray.length > 0 || completedProblems.length > 0;

  if (!hasAnyProblems) {
    emptyState.style.display = 'block';
    completedSection.style.display = 'none';
    inProgressSection.style.display = 'none';
    attemptedSection.style.display = 'none';
    // Still show suggested even if no problems tracked yet
    suggestedSection.style.display = suggestedProblems.length > 0 ? 'block' : 'none';
  } else {
    emptyState.style.display = 'none';

    // Show/hide sections based on content
    completedSection.style.display = sortedCompletedProblems.length > 0 ? 'block' : 'none';
    inProgressSection.style.display = inProgressProblems.length > 0 ? 'block' : 'none';
    attemptedSection.style.display = attemptedProblems.length > 0 ? 'block' : 'none';
    suggestedSection.style.display = suggestedProblems.length > 0 ? 'block' : 'none';
  }

  // Populate completed problems
  completedList.innerHTML = sortedCompletedProblems
    .map(problem => `
      <div class="problem-item completed">
        <div class="problem-header">
          <div class="problem-name">
            ${problem.leetcode_id ? `${problem.leetcode_id}. ` : ''}${problem.problem_name}
            ${problem.difficulty ? ` <span class="difficulty difficulty-${problem.difficulty.toLowerCase()}" style="font-size: 12px; padding: 2px 6px; border-radius: 12px; ${getDifficultyStyle(problem.difficulty.toLowerCase())}">${problem.difficulty}</span>` : ''}
          </div>
          <div class="problem-actions">
            <span class="score-badge">${problem.calculatedScore}</span>
            <a href="${problem.problem_url || `https://leetcode.com/problems/${problem.problem_slug}/`}" target="_blank" class="problem-link" title="View problem on LeetCode"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></a>
          </div>
        </div>
      </div>
    `).join('');

  // Populate in-progress problems
  inProgressList.innerHTML = inProgressProblems
    .sort((a, b) => b.lastAttempted - a.lastAttempted)
    .map(problem => `
      <div class="problem-item tracking">
        <div class="problem-header">
          <div class="problem-name">${problem.leetcodeId ? `${problem.leetcodeId}. ` : ''}${problem.name}${problem.difficulty ? ` <span class="difficulty difficulty-${problem.difficulty}" style="font-size: 12px; padding: 2px 6px; border-radius: 12px; ${getDifficultyStyle(problem.difficulty)}">${problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}</span>` : ''}</div>
          <div class="problem-actions">
            <a href="${problem.url}" target="_blank" class="problem-link" title="View problem on LeetCode"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></a>
            <button class="remove-button" data-problem-id="${problem.id}" title="Stop tracking problem">×</button>
          </div>
        </div>
      </div>
    `).join('');

  // Populate attempted problems
  attemptedList.innerHTML = attemptedProblems
    .sort((a, b) => b.lastAttempted - a.lastAttempted)
    .map(problem => `
      <div class="problem-item ${problem.status ? problem.status.toLowerCase() : 'unknown'}">
        <div class="problem-header">
          <div class="problem-name">${problem.leetcodeId ? `${problem.leetcodeId}. ` : ''}${problem.name}${problem.difficulty ? ` <span class="difficulty difficulty-${problem.difficulty}" style="font-size: 12px; padding: 2px 6px; border-radius: 12px; ${getDifficultyStyle(problem.difficulty)}">${problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}</span>` : ''}</div>
          <div class="problem-actions">
            <a href="${problem.url}" target="_blank" class="problem-link" title="View problem on LeetCode"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></a>
            <button class="remove-button" data-problem-id="${problem.id}" title="Remove problem">×</button>
          </div>
        </div>
      </div>
    `).join('');

  // Populate suggested problems (filtered to exclude tracked ones)
  suggestedList.innerHTML = suggestedProblems
    .map(problem => `
      <div class="problem-item suggested">
        <div class="problem-header">
          <div class="problem-name">${problem.leetcodeId ? `${problem.leetcodeId}. ` : ''}${problem.name}${problem.difficulty ? ` <span class="difficulty difficulty-${problem.difficulty}" style="font-size: 12px; padding: 2px 6px; border-radius: 12px; ${getDifficultyStyle(problem.difficulty)}">${problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}</span>` : ''}</div>
          <div class="problem-actions">
            <a href="${problem.url}" target="_blank" class="problem-link" title="View problem on LeetCode"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></a>
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