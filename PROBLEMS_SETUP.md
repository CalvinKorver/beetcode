# Problems Table Setup Guide

## Quick Start

### 1. Create the Database Table
Run the SQL script in your Supabase SQL Editor:
```bash
# Copy and run this file in Supabase SQL Editor
problems-table-setup.sql
```

### 2. Add Sample Data (Optional)
1. Find your user ID:
   ```sql
   SELECT id FROM auth.users WHERE email = 'your-email@example.com';
   ```

2. Replace `a149fc7f-62e3-448a-bdb1-d211d6360fb8` in the INSERT statement with your actual user ID

3. Uncomment and run the INSERT section in `problems-table-setup.sql`

### 3. Test the Dashboard
- Visit `/protected` in your app
- You should see your problems data with sorting functionality
- Stats cards will show real counts from your data

## File Structure

```
beetcode-dash/beetcode/
├── lib/services/
│   └── problemsService.ts          # Database operations service
├── app/protected/
│   └── page.tsx                    # Dashboard page (updated)
├── components/
│   └── problems-table.tsx          # Table component (updated)
├── problems-table-setup.sql        # Database setup script
└── PROBLEMS_SETUP.md               # This guide
```

## Service Usage

### Basic Operations
```typescript
import { problemsService } from '@/lib/services/problemsService';

// Get all problems for user
const problems = await problemsService.getProblemsForUser();

// Calculate statistics
const stats = problemsService.calculateStats(problems);

// Add a new problem
const newProblem = await problemsService.addProblem({
  problem_name: "Two Sum",
  difficulty: "Easy",
  status: "Completed",
  best_time_ms: 45000,
  leetcode_id: 1,
  // ... other fields
});
```

## Database Schema

### Problems Table Structure
```sql
problems (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  problem_name text NOT NULL,
  leetcode_id integer,
  difficulty text CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  status text CHECK (status IN ('Attempted', 'Completed')),
  best_time_ms integer,
  first_completed_at timestamptz,
  last_attempted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
```

## Features

### Dashboard Features
- ✅ Real-time data from Supabase
- ✅ Sortable columns (name, difficulty, status, time, date)
- ✅ Statistics cards (total, completed, attempted)
- ✅ Row Level Security (users only see their data)
- ✅ Empty state handling
- ✅ Responsive design

### Service Features
- ✅ Type-safe operations
- ✅ Error handling
- ✅ User authentication checks
- ✅ CRUD operations (Create, Read, Update, Delete)
- ✅ Statistics calculation

## Next Steps

1. **Chrome Extension Integration**: Update the extension to sync data with this API
2. **Real-time Updates**: Add subscription to problems table changes
3. **Filtering**: Add difficulty/status filters to the table
4. **Search**: Add problem name search functionality
5. **Export**: Add CSV/JSON export functionality

## Troubleshooting

### No Data Showing?
1. Check if problems table exists: `SELECT * FROM public.problems LIMIT 1;`
2. Verify RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'problems';`
3. Check user authentication in browser dev tools

### Service Errors?
1. Check browser console for error messages
2. Verify Supabase environment variables in `.env.local`
3. Ensure user is authenticated before accessing protected routes