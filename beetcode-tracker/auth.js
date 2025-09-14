// Google OAuth authentication functions for BeetCode

async function signInWithGoogle() {
  try {
    const manifest = chrome.runtime.getManifest();

    const url = new URL('https://accounts.google.com/o/oauth2/auth');

    url.searchParams.set('client_id', manifest.oauth2.client_id);
    url.searchParams.set('response_type', 'id_token');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('redirect_uri', 'https://pbnjdppmlckmidmnmmnfjhelpalckjlg.chromiumapp.org/');
    url.searchParams.set('scope', manifest.oauth2.scopes.join(' '));

    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        {
          url: url.href,
          interactive: true,
        },
        async (redirectedTo) => {
          if (chrome.runtime.lastError) {
            // auth was not successful
            console.error('Auth error:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            try {
              // auth was successful, extract the ID token from the redirectedTo URL
              const url = new URL(redirectedTo);
              const params = new URLSearchParams(url.hash.substring(1)); // Remove the # and parse
              const idToken = params.get('id_token');

              if (!idToken) {
                throw new Error('No ID token found in redirect URL');
              }

              // Here you would normally call supabase.auth.signInWithIdToken
              // For now, we'll just resolve with the token
              console.log('Successfully obtained ID token');
              resolve({
                success: true,
                idToken: idToken
              });

              // TODO: Integrate with Supabase when available
              // const { data, error } = await supabase.auth.signInWithIdToken({
              //   provider: 'google',
              //   token: idToken,
              // });

            } catch (error) {
              console.error('Error processing auth result:', error);
              reject(error);
            }
          }
        }
      );
    });
  } catch (error) {
    console.error('Error initiating Google sign-in:', error);
    throw error;
  }
}

// Export the function for use in popup.js
window.signInWithGoogle = signInWithGoogle;