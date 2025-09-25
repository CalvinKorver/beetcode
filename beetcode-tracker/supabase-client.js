// Minimal Supabase client for Chrome extension
// Since we can't use external CDNs due to CSP, we'll create a minimal auth client

import { config } from './config.js';

// Supabase project configuration (for auth only)
const supabaseUrl = config.supabase.url;
const supabasePublishableKey = config.supabase.publishableKey;

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

        // Persist user profile to Supabase database
        try {
          const profileData = {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
            avatar_url: user.user_metadata?.avatar_url,
            provider: user.app_metadata?.provider || 'google',
            provider_id: user.user_metadata?.provider_id || user.user_metadata?.sub
          }

          const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'apikey': supabasePublishableKey,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation,resolution=merge-duplicates'
            },
            body: JSON.stringify(profileData)
          })

          if (profileResponse.ok) {
            console.log('User profile persisted successfully')
          } else {
            console.warn('Failed to persist user profile:', await profileResponse.text())
          }
        } catch (profileError) {
          console.warn('Failed to persist user profile, but continuing with authentication:', profileError)
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
        // Get session before clearing for server-side logout
        const session = await getStoredSession()

        // Revoke Google OAuth access through Chrome Identity API
        await revokeGoogleAccess()

        // Clear session from extension storage
        await clearStoredSession()

        // Clear Chrome identity cache to force Google re-authentication
        if (typeof chrome !== 'undefined' && chrome.identity && chrome.identity.clearAllCachedAuthTokens) {
          try {
            await new Promise((resolve) => {
              chrome.identity.clearAllCachedAuthTokens(resolve)
            })
            console.log('Chrome identity cache cleared')
          } catch (identityError) {
            console.warn('Failed to clear Chrome identity cache:', identityError)
          }
        }

        // Call Supabase logout endpoint to invalidate tokens server-side
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
            console.log('Server-side logout successful')
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
  },

  // Database operations
  from(table) {
    return {
      async select(columns = '*') {
        try {
          const session = await getStoredSession()
          if (!session?.access_token) {
            throw new Error('No authentication token available')
          }

          const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${columns}`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': supabasePublishableKey,
              'Content-Type': 'application/json'
            }
          })

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`HTTP ${response.status}: ${errorText}`)
          }

          const data = await response.json()
          return { data, error: null }
        } catch (error) {
          console.error('Select error:', error)
          return { data: null, error }
        }
      },

      async insert(values) {
        try {
          const session = await getStoredSession()
          if (!session?.access_token) {
            throw new Error('No authentication token available')
          }

          const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': supabasePublishableKey,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(values)
          })

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`HTTP ${response.status}: ${errorText}`)
          }

          const data = await response.json()
          return { data, error: null }
        } catch (error) {
          console.error('Insert error:', error)
          return { data: null, error }
        }
      },

      async upsert(values) {
        try {
          const session = await getStoredSession()
          if (!session?.access_token) {
            throw new Error('No authentication token available')
          }

          const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': supabasePublishableKey,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation,resolution=merge-duplicates'
            },
            body: JSON.stringify(values)
          })

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`HTTP ${response.status}: ${errorText}`)
          }

          const data = await response.json()
          return { data, error: null }
        } catch (error) {
          console.error('Upsert error:', error)
          return { data: null, error }
        }
      }
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

// Function to persist user profile data to Supabase
export async function persistUserProfile(user) {
  try {
    console.log('Persisting user profile to Supabase:', user)

    const profileData = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
      avatar_url: user.user_metadata?.avatar_url,
      provider: user.app_metadata?.provider || 'google',
      provider_id: user.user_metadata?.provider_id || user.user_metadata?.sub
    }

    // Use upsert to insert or update the profile
    const { data, error } = await supabase.from('profiles').upsert(profileData)

    if (error) {
      console.error('Error persisting user profile:', error)
      return { data: null, error }
    }

    console.log('User profile persisted successfully:', data)
    return { data, error: null }
  } catch (error) {
    console.error('Error in persistUserProfile:', error)
    return { data: null, error }
  }
}

// Function to get user profile from Supabase
export async function getUserProfile(userId) {
  try {
    console.log('Fetching user profile from Supabase for userId:', userId)

    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return { data: null, error }
    }

    console.log('User profile fetched successfully:', data)
    return { data, error: null }
  } catch (error) {
    console.error('Error in getUserProfile:', error)
    return { data: null, error }
  }
}


// Function to revoke Google OAuth access using Chrome Identity API
async function revokeGoogleAccess() {
  try {
    console.log('Attempting to revoke Google OAuth access...')

    if (typeof chrome !== 'undefined' && chrome.identity) {
      // First, try to get any cached auth tokens and remove them
      try {
        // Get the OAuth2 client ID from manifest
        const manifest = chrome.runtime.getManifest()
        const clientId = manifest.oauth2?.client_id

        if (clientId) {
          // Try to get a token silently to see if we have cached tokens
          const token = await new Promise((resolve) => {
            chrome.identity.getAuthToken({
              interactive: false,
              scopes: manifest.oauth2?.scopes || ['openid', 'email', 'profile']
            }, (token) => {
              if (chrome.runtime.lastError) {
                resolve(null) // No cached token, which is fine
              } else {
                resolve(token)
              }
            })
          })

          if (token) {
            // Remove the cached token
            await new Promise((resolve) => {
              chrome.identity.removeCachedAuthToken({ token }, resolve)
            })
            console.log('Removed cached Google OAuth token')

            // Also try to revoke it with Google's endpoint
            try {
              const response = await fetch('https://oauth2.googleapis.com/revoke', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `token=${encodeURIComponent(token)}`
              })

              if (response.ok) {
                console.log('Google OAuth token revoked successfully at Google')
              } else {
                console.warn('Could not revoke token at Google, but local cache cleared')
              }
            } catch (revokeError) {
              console.warn('Could not revoke token at Google endpoint:', revokeError)
            }
          } else {
            console.log('No cached Google OAuth tokens found')
          }
        }
      } catch (tokenError) {
        console.warn('Error handling cached tokens:', tokenError)
      }

      // Clear all cached auth tokens as a final step
      await new Promise((resolve) => {
        chrome.identity.clearAllCachedAuthTokens(resolve)
      })
      console.log('All cached auth tokens cleared')
    }
  } catch (error) {
    console.warn('Error revoking Google OAuth access:', error)
    // Don't throw error as this shouldn't prevent logout from completing
  }
}