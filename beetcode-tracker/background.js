// Import Supabase client and Backend API client
import { supabase, storeSession, clearStoredSession } from './supabase-client.js';
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
 */
async function handleStartTracking(problem) {
  try {
    console.log('BeetCode: Starting tracking for:', problem.id);

    const trackedProblem = await backendClient.trackProblem(problem);

    console.log('BeetCode: Successfully started tracking:', trackedProblem.id);
  } catch (error) {
    console.error('Error starting tracking:', error);
    throw error;
  }
}

/**
 * Check if a problem is being tracked - direct API call
 */
async function handleCheckTrackingStatus(url) {
  try {
    const slug = getSlugFromUrl(url);
    console.log('BeetCode: Checking tracking status for:', slug);

    if (!slug) {
      console.error('BeetCode: Could not extract slug from URL:', url);
      return false;
    }

    const isTracking = await backendClient.checkTrackingStatus(slug);

    console.log('BeetCode: Tracking status for', slug, ':', isTracking);
    return isTracking;
  } catch (error) {
    console.error('Error checking tracking status:', error);
    return false;
  }
}

/**
 * Handle problem submission - direct API call
 */
async function handleProblemSubmission(url, duration, isCompleted, timestamp) {
  try {
    const slug = getSlugFromUrl(url);
    console.log('BeetCode: Handling submission for:', slug, { duration, isCompleted });

    if (!slug) {
      console.error('BeetCode: Could not extract slug from URL:', url);
      return;
    }

    const updatedProblem = await backendClient.submitProblem(
      slug,
      duration,
      isCompleted,
      timestamp
    );

    console.log('BeetCode: Submission recorded successfully:', updatedProblem.id, 'Status:', updatedProblem.status);
  } catch (error) {
    console.error('Error handling submission:', error);
    throw error;
  }
}

/**
 * Update problem metadata - direct API call
 */
async function handleUpdateProblemInfo(problem) {
  try {
    console.log('BeetCode: Updating problem info for:', problem.id);

    const updates = {};
    if (problem.name) updates.name = problem.name;
    if (problem.leetcodeId) updates.leetcodeId = problem.leetcodeId;
    if (problem.difficulty) updates.difficulty = problem.difficulty;

    if (Object.keys(updates).length === 0) {
      console.log('BeetCode: No updates to apply');
      return;
    }

    const updatedProblem = await backendClient.updateProblemInfo(problem.id, updates);

    console.log('BeetCode: Problem info updated successfully:', updatedProblem.id);
  } catch (error) {
    console.error('Error updating problem info:', error);
    throw error;
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

// OAuth and Authentication handlers
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url?.startsWith(chrome.identity.getRedirectURL())) {
    finishUserOAuth(changeInfo.url);
  }
});

// Handle auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, session ? 'session present' : 'no session');

  if (event === 'SIGNED_OUT') {
    console.log('User signed out');
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
