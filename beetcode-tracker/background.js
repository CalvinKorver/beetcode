// Import Supabase client and Backend API client
import { supabase, storeSession, clearStoredSession, getStoredSession } from './supabase-client.js';
import { backendClient } from './BackendClient.js';

// Message handlers - thin wrappers around API calls
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_TRACKING') {
    handleStartTracking(message.problem)
      .then(() => sendResponse({ success: true }))
      .catch((error) => {
        console.error('Error in START_TRACKING:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (message.type === 'CHECK_TRACKING_STATUS') {
    handleCheckTrackingStatus(message.url)
      .then((isTracking) => sendResponse({ isTracking }))
      .catch((error) => {
        console.error('Error in CHECK_TRACKING_STATUS:', error);
        sendResponse({ isTracking: false });
      });
    return true;
  }

  if (message.type === 'PROBLEM_SUBMISSION') {
    handleProblemSubmission(message.url, message.duration, message.isCompleted, message.timestamp)
      .then(() => sendResponse({ success: true }))
      .catch((error) => {
        console.error('Error in PROBLEM_SUBMISSION:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (message.type === 'UPDATE_PROBLEM_INFO') {
    handleUpdateProblemInfo(message.problem)
      .then(() => sendResponse({ success: true }))
      .catch((error) => {
        console.error('Error in UPDATE_PROBLEM_INFO:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

/**
 * Start tracking a problem - direct API call
 * Per API Design: Send problemSlug, backend has metadata via crawler
 */
async function handleStartTracking(problem) {
  try {
    console.log('=== BeetCode: handleStartTracking START ===');
    console.log('Problem object received:', problem);
    console.log('Problem slug (problem.id):', problem.id);

    console.log('Calling backendClient.trackProblem...');
    // Call new API: trackProblem(problemSlug, status, time)
    // Backend returns { success, userProblemId, metadata }
    const result = await backendClient.trackProblem(
      problem.id, // problemSlug
      'Attempted', // status - always start as Attempted
      null // time - no time yet when just starting to track
    );

    console.log('backendClient.trackProblem returned:', result);

    if (!result || !result.success) {
      console.error('Track problem failed - no success in result');
      throw new Error('Failed to track problem - API returned unsuccessful response');
    }

    if (!result.userProblemId) {
      console.error('Track problem failed - no userProblemId in result');
      throw new Error('Failed to track problem - no userProblemId returned');
    }

    // Store the userProblemId and metadata in chrome.storage for later use
    const storageKey = `problem_${problem.id}`;
    console.log('Storing to chrome.storage with key:', storageKey);

    const storageData = {
      userProblemId: result.userProblemId,
      metadata: result.metadata,
      problemSlug: problem.id,
      trackedAt: Date.now()
    };

    console.log('Storage data:', storageData);

    await chrome.storage.local.set({
      [storageKey]: storageData
    });

    console.log('Successfully stored to chrome.storage');

    // Also add to 'problems' dictionary for popup display
    const problemsResult = await chrome.storage.local.get(['problems']);
    const problems = problemsResult.problems || {};

    problems[problem.id] = {
      id: problem.id,
      name: result.metadata.problem_name,
      difficulty: result.metadata.difficulty?.toLowerCase() || 'medium',
      leetcodeId: result.metadata.leetcode_id,
      url: result.metadata.problem_url,
      status: 'TRACKING',
      lastAttempted: Date.now(),
      timeEntries: [],
      isDeleted: false
    };

    await chrome.storage.local.set({ problems });
    console.log('Added problem to problems dictionary for popup display');

    // Verify storage
    const verification = await chrome.storage.local.get(storageKey);
    console.log('Verification - read back from storage:', verification);

    console.log('=== BeetCode: Successfully started tracking ===');
    console.log('Problem slug:', problem.id);
    console.log('User problem ID:', result.userProblemId);
    console.log('Metadata:', result.metadata);
    console.log('=== handleStartTracking END ===');
  } catch (error) {
    console.error('=== BeetCode: handleStartTracking ERROR ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', error);
    console.error('=== handleStartTracking ERROR END ===');
    throw error;
  }
}

/**
 * Check if a problem is being tracked - check chrome.storage
 * We don't need to call the API since we store tracking info locally
 */
async function handleCheckTrackingStatus(url) {
  try {
    const slug = getSlugFromUrl(url);
    console.log('BeetCode: Checking tracking status for:', slug);

    if (!slug) {
      console.error('BeetCode: Could not extract slug from URL:', url);
      return false;
    }

    // Check chrome.storage for tracking info
    const storageKey = `problem_${slug}`;
    const result = await chrome.storage.local.get(storageKey);

    const isTracking = !!result[storageKey]?.userProblemId;

    console.log('BeetCode: Tracking status for', slug, ':', isTracking);
    return isTracking;
  } catch (error) {
    console.error('Error checking tracking status:', error);
    return false;
  }
}

/**
 * Handle problem submission - direct API call
 * Per API Design: Use PUT /api/user-problems/[id] with userProblemId
 */
async function handleProblemSubmission(url, duration, isCompleted, timestamp) {
  try {
    const slug = getSlugFromUrl(url);
    console.log('BeetCode: Handling submission for:', slug, { duration, isCompleted });

    if (!slug) {
      console.error('BeetCode: Could not extract slug from URL:', url);
      return;
    }

    // Get the userProblemId from chrome.storage
    const storageKey = `problem_${slug}`;
    const result = await chrome.storage.local.get(storageKey);
    const userProblemId = result[storageKey]?.userProblemId;

    if (!userProblemId) {
      console.error('BeetCode: No userProblemId found for:', slug);
      console.error('BeetCode: Problem must be tracked before submission');
      return;
    }

    // Convert duration string (e.g., "00:15:23") to milliseconds
    const durationMs = parseDurationToMilliseconds(duration);

    // Call new API: submitProblem(userProblemId, duration, isCompleted)
    const updatedProblem = await backendClient.submitProblem(
      userProblemId,
      durationMs,
      isCompleted
    );

    console.log('BeetCode: Submission recorded successfully');
    console.log('BeetCode: Updated problem:', updatedProblem);

    // Update the 'problems' dictionary for popup display
    const problemsResult = await chrome.storage.local.get(['problems']);
    const problems = problemsResult.problems || {};

    if (problems[slug]) {
      // Add time entry
      if (!problems[slug].timeEntries) {
        problems[slug].timeEntries = [];
      }
      problems[slug].timeEntries.push({
        duration: duration,
        timestamp: timestamp || Date.now()
      });

      // Update status
      problems[slug].status = isCompleted ? 'COMPLETED' : 'ATTEMPTED';
      problems[slug].lastAttempted = timestamp || Date.now();

      if (isCompleted && !problems[slug].completedAt) {
        problems[slug].completedAt = timestamp || Date.now();
      }

      await chrome.storage.local.set({ problems });
      console.log('BeetCode: Updated problem in problems dictionary');
    }

    // Optionally clear tracking data after successful submission
    // await chrome.storage.local.remove(storageKey);
  } catch (error) {
    console.error('Error handling submission:', error);
    throw error;
  }
}

/**
 * Parse duration string (e.g., "00:15:23" or "15:23") to milliseconds
 */
function parseDurationToMilliseconds(duration) {
  if (!duration) return 0;

  const parts = duration.split(':');
  let hours = 0, minutes = 0, seconds = 0;

  if (parts.length === 3) {
    // Format: "HH:MM:SS"
    hours = parseInt(parts[0], 10) || 0;
    minutes = parseInt(parts[1], 10) || 0;
    seconds = parseInt(parts[2], 10) || 0;
  } else if (parts.length === 2) {
    // Format: "MM:SS"
    minutes = parseInt(parts[0], 10) || 0;
    seconds = parseInt(parts[1], 10) || 0;
  }

  return (hours * 3600 + minutes * 60 + seconds) * 1000; // Convert to milliseconds
}

/**
 * Update problem metadata - optional, since metadata comes from crawler
 * Only used if we detect metadata that crawler doesn't have yet
 */
async function handleUpdateProblemInfo(problem) {
  try {
    console.log('BeetCode: Updating problem info for:', problem.id);

    // Get the userProblemId from chrome.storage
    const storageKey = `problem_${problem.id}`;
    const result = await chrome.storage.local.get(storageKey);
    const userProblemId = result[storageKey]?.userProblemId;

    if (!userProblemId) {
      console.log('BeetCode: Problem not being tracked, skipping metadata update');
      return;
    }

    const updates = {};
    if (problem.name) updates.title = problem.name;
    if (problem.leetcodeId) updates.leetcodeId = problem.leetcodeId;
    if (problem.difficulty) updates.difficulty = problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1); // Capitalize

    if (Object.keys(updates).length === 0) {
      console.log('BeetCode: No updates to apply');
      return;
    }

    // Use the new API: updateProblemInfo(userProblemId, updates)
    const updatedProblem = await backendClient.updateProblemInfo(userProblemId, updates);

    console.log('BeetCode: Problem info updated successfully:', updatedProblem);
  } catch (error) {
    console.error('Error updating problem info:', error);
    // Don't throw - this is optional functionality
    console.log('BeetCode: Continuing despite metadata update failure');
  }
}

/**
 * Extract problem slug from LeetCode URL
 */
function getSlugFromUrl(url) {
  const parts = url.split('/');
  if (parts.length >= 5 && parts[3] === 'problems') {
    return parts[4];
  }
  return null;
}

// Token refresh on extension startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('Extension starting up, checking session...');
  try {
    const session = await getStoredSession();
    if (session?.refresh_token) {
      console.log('Refreshing session on startup...');
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: session.refresh_token
      });

      if (error) {
        console.error('Failed to refresh session on startup:', error);
        await clearStoredSession();
      } else if (data.session) {
        console.log('Session refreshed successfully on startup');
        await storeSession(data.session);
      }
    } else {
      console.log('No session to refresh on startup');
    }
  } catch (error) {
    console.error('Error during startup session refresh:', error);
  }
});

// OAuth and Authentication handlers
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url?.startsWith(chrome.identity.getRedirectURL())) {
    finishUserOAuth(changeInfo.url);
  }
});

// Handle auth state changes
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('Auth state changed:', event, session ? 'session present' : 'no session');

  // Store session on sign-in or token refresh
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    if (session) {
      console.log('Storing session after', event);
      await storeSession(session);
    }

    if (event === 'SIGNED_IN') {
      chrome.notifications?.create({
        type: 'basic',
        iconUrl: 'icons/beetcode-32.png',
        title: 'BeetCode',
        message: 'Successfully signed in!'
      });
    } else if (event === 'TOKEN_REFRESHED') {
      console.log('Token refreshed and stored');
    }
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out, clearing session');
    await clearStoredSession();
    chrome.notifications?.create({
      type: 'basic',
      iconUrl: 'icons/beetcode-32.png',
      title: 'BeetCode',
      message: 'Successfully signed out'
    });
  }
});

/**
 * Finish OAuth callback for user authentication
 */
async function finishUserOAuth(url) {
  try {
    console.log('Handling user OAuth callback...');
    console.log('Callback URL:', url);

    // Extract tokens from hash
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
      throw new Error('No supabase tokens found in URL hash');
    }

    // Set session
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error) {
      console.error('Error setting session:', error);
      throw error;
    }

    // Persist session to storage
    await storeSession(data.session);

    // Close the auth tab
    chrome.tabs.query({ url: chrome.identity.getRedirectURL() + '*' }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.remove(tabs[0].id);
      }
    });

    // Show success notification
    chrome.notifications?.create({
      type: 'basic',
      iconUrl: 'icons/beetcode-32.png',
      title: 'BeetCode',
      message: 'Successfully signed in with Google!'
    });

    console.log('Finished handling user OAuth callback');
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
 * Parse URL hash into key-value map
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
