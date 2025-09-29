// Import Supabase client and BeetCode service
import { supabase, storeSession, clearStoredSession } from './supabase-client.js';
import { beetcodeService } from './BeetcodeServiceClient.js';

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

    // Move any currently tracking problems to attempted
    Object.keys(problems).forEach(key => {
      if (problems[key].status === 'TRACKING') {
        problems[key].status = 'ATTEMPTED';
      }
    });

    // Check if this problem already exists (using slug as primary key)
    const existingProblem = problems[problem.id];

    let finalProblem;
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
        timeEntries: existingProblem.timeEntries || [],

        // If it was deleted, un-delete it
        isDeleted: false
      };

      problems[problem.id] = mergedProblem;
      finalProblem = mergedProblem;
      console.log('BeetCode: Merged problem data:', mergedProblem);
    } else {
      // New problem
      problems[problem.id] = problem;
      finalProblem = problem;
      console.log('BeetCode: Created new problem:', problem.id);
    }

    await chrome.storage.local.set({ problems });
    console.log('BeetCode: Started tracking problem:', problem.id);

    // Sync to web application
    try {
      console.log('BeetCode: Syncing problem to web application...');
      const syncResult = await beetcodeService.syncProblem(finalProblem);

      if (syncResult.success) {
        console.log('BeetCode: Problem successfully synced to web application');
      } else {
        console.warn('BeetCode: Failed to sync problem to web application:', syncResult.error);
      }
    } catch (syncError) {
      console.warn('BeetCode: Error syncing to web application (continuing with local storage):', syncError);
    }

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

      // Sync updated problem to web application
      try {
        console.log('BeetCode: Syncing updated problem to web application...');
        const syncResult = await beetcodeService.syncProblem(trackingProblem);

        if (syncResult.success) {
          console.log('BeetCode: Problem submission successfully synced to web application');
        } else {
          console.warn('BeetCode: Failed to sync problem submission to web application:', syncResult.error);
        }
      } catch (syncError) {
        console.warn('BeetCode: Error syncing submission to web application (continuing with local storage):', syncError);
      }
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

// Add tab listener when background script starts
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url?.startsWith(chrome.identity.getRedirectURL())) {
    finishUserOAuth(changeInfo.url);
  }
});

// Handle auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, session ? 'session present' : 'no session');

  if (event === 'SIGNED_OUT') {
    console.log('User signed out, cleaning up extension data');
    // Additional cleanup can be done here if needed
    chrome.notifications?.create({
      type: 'basic',
      iconUrl: 'icons/beetcode-32.png',
      title: 'BeetCode',
      message: 'Successfully signed out'
    });
  } else if (event === 'SIGNED_IN') {
    console.log('User signed in');
    chrome.notifications?.create({
      type: 'basic',
      iconUrl: 'icons/beetcode-32.png',
      title: 'BeetCode',
      message: 'Successfully signed in!'
    });
  }
});

/**
 * Method used to finish OAuth callback for a user authentication.
 */
async function finishUserOAuth(url) {
  try {
    console.log(`handling user OAuth callback ...`);
    console.log('Callback URL:', url);

    // extract tokens from hash
    const hashMap = parseUrlHash(url);
    const access_token = hashMap.get('access_token');
    const refresh_token = hashMap.get('refresh_token');

    console.log('Extracted tokens:', {
      hasAccessToken: !!access_token,
      hasRefreshToken: !!refresh_token,
      accessTokenStart: access_token?.substring(0, 20) + '...',
      refreshTokenStart: refresh_token?.substring(0, 20) + '...',
      allHashParams: Array.from(hashMap.entries())
    });

    if (!access_token || !refresh_token) {
      throw new Error(`no supabase tokens found in URL hash`);
    }

    // check if they work
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error) {
      console.error('Error setting session:', error);
      throw error;
    }

    // persist session to storage using helper function
    await storeSession(data.session);

    // Close the auth tab and show success
    chrome.tabs.query({ url: chrome.identity.getRedirectURL() + '*' }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.remove(tabs[0].id);
      }
    });

    // Optionally show notification
    chrome.notifications?.create({
      type: 'basic',
      iconUrl: 'icons/beetcode-32.png',
      title: 'BeetCode',
      message: 'Successfully signed in with Google!'
    });

    console.log(`finished handling user OAuth callback`);
  } catch (error) {
    console.error('OAuth callback error:', error);

    // Show error notification
    chrome.notifications?.create({
      type: 'basic',
      iconUrl: 'icons/beetcode-32.png',
      title: 'BeetCode',
      message: 'Failed to sign in. Please try again.'
    });
  }
}

/**
 * Helper method used to parse the hash of a redirect URL.
 */
function parseUrlHash(url) {
  const hashParts = new URL(url).hash.slice(1).split('&');
  const hashMap = new Map(
    hashParts.map((part) => {
      const [name, value] = part.split('=');
      return [name, value];
    })
  );

  return hashMap;
}
 