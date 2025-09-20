# Testing Supabase Integration

## Step 1: Set up Supabase Database

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Navigate to your project: `hukfgtczrtllqhlahuar`
3. Go to **SQL Editor**
4. Copy and paste the contents of `supabase-schema.sql`
5. Click **Run** to execute the schema

## Step 2: Test Extension Integration

1. **Load the extension** in Chrome:
   - Open Chrome Extensions (`chrome://extensions/`)
   - Enable Developer mode
   - Click "Load unpacked" and select `beetcode-tracker` folder

2. **Test sign-in flow**:
   - Click the BeetCode extension icon
   - Click "Sign in with Google"
   - Complete the OAuth flow
   - **Check console** for these log messages:
     - "User validation successful: [user object]"
     - "User profile persisted successfully"

3. **Verify in Supabase**:
   - Go to Supabase Dashboard → Table Editor
   - Check the `profiles` table
   - You should see a new row with your user data:
     - `id`: Your user UUID
     - `email`: Your Google email
     - `full_name`: Your name from Google
     - `avatar_url`: Your Google profile picture URL
     - `provider`: "google"
     - `created_at` and `updated_at` timestamps

4. **Test sign-out and sign-in again**:
   - Sign out from the extension
   - Sign in again
   - Verify the profile data gets updated (check `updated_at` timestamp)

## Step 3: Verify Database Operations

You can also test the database functions directly by adding this to your popup.js temporarily:

```javascript
// Add this to test database operations
async function testDatabaseOperations() {
  try {
    // Test getting user profile
    const { data: profiles, error } = await supabase.from('profiles').select('*')

    if (error) {
      console.error('Database test error:', error)
    } else {
      console.log('Database test successful - profiles:', profiles)
    }
  } catch (error) {
    console.error('Database test failed:', error)
  }
}

// Call this after successful sign-in
// testDatabaseOperations()
```

## Expected Results

✅ **Schema creation**: Tables, policies, and triggers created without errors
✅ **Sign-in persistence**: User profile data automatically saved to `profiles` table
✅ **RLS working**: Users can only see their own profile data
✅ **Updates working**: Subsequent sign-ins update the existing profile

## Troubleshooting

**Common issues:**

1. **"HTTP 401" errors**: Check that your API keys are correct
2. **"HTTP 403" errors**: Verify RLS policies are properly set
3. **"No authentication token"**: Ensure user is signed in before database operations
4. **Database permission errors**: Check that the schema was created properly

**Debug steps:**

1. Check browser console for error messages
2. Verify Supabase dashboard shows the `profiles` table
3. Test RLS by trying to access data from different user accounts
4. Check the Supabase logs in the dashboard for detailed error information