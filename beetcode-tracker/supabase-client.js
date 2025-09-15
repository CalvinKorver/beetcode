// Minimal Supabase client for Chrome extension
// Since we can't use external CDNs due to CSP, we'll create a minimal auth client

// Supabase project configuration
const supabaseUrl = 'https://hukfgtczrtllqhlahuar.supabase.co'
const supabasePublishableKey = 'sb_publishable_ih7HMgK8RxsNZtyfZ-RzVw_3ycv4y5M'

// Minimal Supabase auth client
export const supabase = {
  auth: {
    async signInWithOAuth({ provider, options }) {
      const params = new URLSearchParams({
        provider,
        redirect_to: options.redirectTo || chrome.identity.getRedirectURL()
      })

      const url = `${supabaseUrl}/auth/v1/authorize?${params}`
      return { data: { url }, error: null }
    },

    async setSession({ access_token, refresh_token }) {
      try {
        console.log('Setting session with tokens:', {
          hasAccessToken: !!access_token,
          hasRefreshToken: !!refresh_token,
          accessTokenStart: access_token?.substring(0, 20) + '...'
        })

        // Validate tokens by making a request to Supabase
        const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'apikey': supabasePublishableKey,
            'Content-Type': 'application/json'
          }
        })

        console.log('Supabase user validation response:', {
          status: response.status,
          statusText: response.statusText
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Supabase validation error:', errorText)
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`)
        }

        const user = await response.json()
        console.log('User validation successful:', user)

        const session = {
          access_token,
          refresh_token,
          user,
          expires_at: Date.now() + (3600 * 1000) // 1 hour from now
        }

        return { data: { session, user }, error: null }
      } catch (error) {
        console.error('setSession error:', error)
        return { data: null, error }
      }
    },

    async getUser() {
      try {
        const { session } = await getStoredSession()
        if (!session || !session.access_token) {
          return { data: { user: null }, error: null }
        }

        const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': supabasePublishableKey
          }
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const user = await response.json()
        return { data: { user }, error: null }
      } catch (error) {
        return { data: { user: null }, error }
      }
    },

    async signOut() {
      try {
        // Clear session from storage
        await clearStoredSession()

        // Optionally call Supabase logout endpoint to invalidate tokens server-side
        // Note: This may not be necessary for all use cases but ensures complete logout
        const session = await getStoredSession()
        if (session && session.access_token) {
          try {
            await fetch(`${supabaseUrl}/auth/v1/logout`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': supabasePublishableKey,
                'Content-Type': 'application/json'
              }
            })
          } catch (logoutError) {
            console.warn('Server-side logout failed (may be expected):', logoutError)
          }
        }

        console.log('User signed out successfully')
        return { error: null }
      } catch (error) {
        console.error('Sign out error:', error)
        return { error }
      }
    },

    // Add auth state change listener
    onAuthStateChange(callback) {
      // Since we're using a minimal client, we'll implement this via storage listener
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.session) {
          if (changes.session.newValue) {
            callback('SIGNED_IN', changes.session.newValue)
          } else {
            callback('SIGNED_OUT', null)
          }
        }
      })
    }
  }
}

// Helper functions for session management
export async function getStoredSession() {
  try {
    const result = await chrome.storage.local.get(['session'])
    return result.session || null
  } catch (error) {
    console.error('Error getting stored session:', error)
    return null
  }
}

export async function storeSession(session) {
  try {
    await chrome.storage.local.set({ session })
    console.log('Session stored successfully')
  } catch (error) {
    console.error('Error storing session:', error)
  }
}

export async function clearStoredSession() {
  try {
    await chrome.storage.local.remove('session')
    console.log('Session cleared from storage')
  } catch (error) {
    console.error('Error clearing stored session:', error)
  }
}

export async function initializeSession() {
  try {
    const storedSession = await getStoredSession()

    if (storedSession) {
      console.log('Restoring session from storage')
      const { error } = await supabase.auth.setSession(storedSession)

      if (error) {
        console.error('Error restoring session:', error)
        await clearStoredSession()
        return null
      }

      return storedSession
    }

    return null
  } catch (error) {
    console.error('Error initializing session:', error)
    return null
  }
}